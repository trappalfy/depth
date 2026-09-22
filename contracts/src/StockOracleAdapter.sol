// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";
import {IStockOracleAdapter} from "./interfaces/IStockOracleAdapter.sol";
import {IStockToken} from "./interfaces/IStockToken.sol";
import {ValuationLib} from "./ValuationLib.sol";

/// @title StockOracleAdapter
/// @notice A fuse between a tokenized equity's price and the protocol reading
/// it. One adapter per (token, feed) pair, immutable, ownerless, no proxy, no
/// role that can set a price by hand. A fix is a new deployment and the client
/// switching to it.
///
/// It answers in one of four ways, and every state belongs to exactly one:
///
///   passes it through      NORMAL
///   serves the last price  OFF_HOURS
///   holds the pre-window   CORPORATE_ACTION, DESYNC, TOKEN_HALTED, SEQUENCER_DOWN
///   refuses to answer      UNSAFE
///
/// The held price is the one committed before the window opened, identical for
/// everyone. A position cannot enter a window healthier than it was: whoever
/// was underwater stays underwater and stays liquidatable at the same price.
/// The window removes the artefact, not the debt.
contract StockOracleAdapter is IStockOracleAdapter {
    using ValuationLib for uint256;

    /// @notice The tokenized equity this adapter is bound to.
    address public immutable token;

    /// @notice The Chainlink feed for that equity.
    address public immutable feed;

    /// @notice Silence beyond which a feed is quiet rather than fresh.
    uint64 public immutable quietAfter;

    /// @notice How old a held price may get before the adapter reverts instead
    /// of serving it. Measured from the snapshot the price came from — the
    /// window's own opening moment is not observable on chain, and an age is
    /// the honest thing to bound.
    uint64 public immutable protectionBudget;

    /// @notice How far price × multiplier may drift across a multiplier change
    /// before it is called a desync rather than a market move.
    uint32 public immutable continuityBps;

    /// @notice Chainlink L2 sequencer uptime feed, or zero where none is
    /// published. Zero disables the check rather than pretending it runs.
    address public immutable sequencerFeed;

    uint8 private immutable _tokenDecimals;
    uint8 private immutable _answerDecimals;

    /// @dev How long after a sequencer comes back we still refuse to trust a
    /// price: orders queued during the outage land in that window.
    uint256 private constant SEQUENCER_GRACE = 1 hours;

    struct Snapshot {
        int256 answer;
        uint256 multiplier;
        uint256 observedAt;
        uint256 committedAt;
    }

    /// @notice The last committed observation of a healthy market.
    Snapshot public snapshot;

    constructor(
        address token_,
        address feed_,
        uint64 quietAfter_,
        uint64 protectionBudget_,
        uint32 continuityBps_,
        address sequencerFeed_
    ) {
        token = token_;
        feed = feed_;
        quietAfter = quietAfter_;
        protectionBudget = protectionBudget_;
        continuityBps = continuityBps_;
        sequencerFeed = sequencerFeed_;
        _tokenDecimals = IStockToken(token_).decimals();
        _answerDecimals = AggregatorV3Interface(feed_).decimals();

        // Deploying with no snapshot would leave the adapter with nothing to
        // hold, so the first one is taken here. It also proves at deploy time
        // that both contracts answer the calls this adapter depends on.
        _commit();
    }

    // ---------------------------------------------------------------- reads

    /// @inheritdoc AggregatorV3Interface
    function decimals() external view returns (uint8) {
        return _answerDecimals;
    }

    /// @inheritdoc AggregatorV3Interface
    function description() external pure returns (string memory) {
        return "Depth corporate action firewall";
    }

    /// @inheritdoc AggregatorV3Interface
    function version() external pure returns (uint256) {
        return 1;
    }

    /// @notice The safe answer, in the Chainlink shape a protocol already reads.
    ///
    /// @dev `updatedAt` is the moment this adapter confirmed the value is safe
    /// to use, NOT the moment the market was observed. That redefinition is
    /// deliberate and is the whole point: returning the real round time would
    /// trip the caller's own staleness check during a protection window, and
    /// the DoS we exist to prevent would pass straight through us. The honest
    /// observation time is `observedAt()`, and the mode is `status()`.
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        (Status s, int256 safeAnswer, uint256 observed) = _evaluate();
        if (s == Status.UNSAFE) {
            revert ProtectionBudgetExhausted(snapshot.committedAt, snapshot.committedAt + protectionBudget);
        }
        roundId = uint80(uint256(keccak256(abi.encodePacked(address(this), block.timestamp))) >> 176);
        answer = safeAnswer;
        startedAt = observed;
        updatedAt = block.timestamp;
        answeredInRound = roundId;
    }

    /// @inheritdoc IStockOracleAdapter
    function status() external view returns (Status s) {
        (s,,) = _evaluate();
    }

    /// @inheritdoc IStockOracleAdapter
    function observedAt() external view returns (uint256 observed) {
        (,, observed) = _evaluate();
    }

    /// @inheritdoc IStockOracleAdapter
    function heldAnswer() external view returns (int256) {
        return snapshot.answer;
    }

    /// @inheritdoc IStockOracleAdapter
    function protectionEndsAt() external view returns (uint256) {
        return snapshot.committedAt + protectionBudget;
    }

    /// @inheritdoc IStockOracleAdapter
    function committedAt() external view returns (uint256) {
        return snapshot.committedAt;
    }

    /// @inheritdoc IStockOracleAdapter
    function valueOf(uint256 rawAmount) external view returns (uint256) {
        (Status s, int256 answer,) = _evaluate();
        if (s == Status.UNSAFE) {
            revert ProtectionBudgetExhausted(snapshot.committedAt, snapshot.committedAt + protectionBudget);
        }
        return ValuationLib.valueOfRaw(rawAmount, _tokenDecimals, answer, _answerDecimals);
    }

    /// @inheritdoc IStockOracleAdapter
    function valueOfUI(uint256 uiAmount) external view returns (uint256) {
        (Status s, int256 answer,) = _evaluate();
        if (s == Status.UNSAFE) {
            revert ProtectionBudgetExhausted(snapshot.committedAt, snapshot.committedAt + protectionBudget);
        }
        // The current multiplier converts the UI balance back to raw, so the
        // multiplier inside the answer is the only one that lands.
        return ValuationLib.valueOfUI(
            uiAmount, IStockToken(token).uiMultiplier(), _tokenDecimals, answer, _answerDecimals
        );
    }

    // --------------------------------------------------------------- writes

    /// @inheritdoc IStockOracleAdapter
    function commit() external {
        (Status s,,) = _evaluate();
        // A snapshot taken mid-window would freeze the very number the window
        // exists to distrust. Only a healthy market is worth keeping.
        if (s != Status.NORMAL && s != Status.OFF_HOURS) revert NotCommittable(s);
        _commit();
    }

    function _commit() private {
        (, int256 answer,, uint256 feedUpdatedAt,) = AggregatorV3Interface(feed).latestRoundData();
        uint256 multiplier = IStockToken(token).uiMultiplier();
        snapshot = Snapshot({
            answer: answer,
            multiplier: multiplier,
            observedAt: feedUpdatedAt,
            committedAt: block.timestamp
        });
        emit Committed(answer, multiplier, feedUpdatedAt);
    }

    // ---------------------------------------------------------- the machine

    /// @dev One pass over the chain's own data, in the order a fuse blows:
    /// conduct, hold, refuse. Every branch returns the answer that belongs to
    /// its state, so no caller can read a state and then a mismatched price.
    function _evaluate() private view returns (Status s, int256 answer, uint256 observed) {
        (, int256 feedAnswer,, uint256 feedUpdatedAt,) = AggregatorV3Interface(feed).latestRoundData();

        bool protectedState = false;
        s = Status.NORMAL;

        if (_sequencerDown()) {
            s = Status.SEQUENCER_DOWN;
            protectedState = true;
        } else if (IStockToken(token).paused()) {
            s = Status.TOKEN_HALTED;
            protectedState = true;
        } else if (_corporateActionOpen()) {
            s = Status.CORPORATE_ACTION;
            protectedState = true;
        } else if (_continuityBroken(feedAnswer)) {
            // Checked after the flags on purpose: a desync detected while the
            // issuer has already paused is the same protection either way, and
            // this ordering keeps the reported reason the one a reader can act
            // on. Detection itself does not wait for the issuer.
            s = Status.DESYNC;
            protectedState = true;
        } else if (feedAnswer <= 0) {
            // A feed answering zero or less is not a price. Hold rather than
            // hand a protocol a number that values every position at nothing.
            s = Status.CORPORATE_ACTION;
            protectedState = true;
        } else if (block.timestamp > feedUpdatedAt + quietAfter) {
            // Silent but clean: equities trade 24/5 and this chain runs 24/7,
            // so silence is not breakage. The last price still stands.
            s = Status.OFF_HOURS;
        }

        if (protectedState) {
            if (block.timestamp > snapshot.committedAt + protectionBudget) {
                return (Status.UNSAFE, snapshot.answer, snapshot.observedAt);
            }
            return (s, snapshot.answer, snapshot.observedAt);
        }
        return (s, feedAnswer, feedUpdatedAt);
    }

    /// @dev A staged multiplier is a corporate action in flight. `effectiveAt`
    /// is not a signal: it records the last change that was applied, not one
    /// that is due.
    function _corporateActionOpen() private view returns (bool) {
        IStockToken t = IStockToken(token);
        if (t.oraclePaused()) return true;
        return t.newUIMultiplier() != t.uiMultiplier();
    }

    /// @dev The continuity invariant. A split must leave the price of one raw
    /// token unchanged: the underlying falls tenfold, the multiplier rises
    /// tenfold, the token's own price does not move. So when the multiplier has
    /// changed since the snapshot, the price must not have — and if it did, the
    /// multiplier was applied twice, or applied to the price while the
    /// underlying was not adjusted, or something broke. All three are the same
    /// finding, and none of them wait for the issuer to pause.
    ///
    /// When the multiplier has not changed, there is no continuity claim to
    /// violate: prices move, and that is what prices do.
    function _continuityBroken(int256 feedAnswer) private view returns (bool) {
        Snapshot memory snap = snapshot;
        if (snap.answer <= 0 || snap.multiplier == 0) return false;
        if (IStockToken(token).uiMultiplier() == snap.multiplier) return false;
        return ValuationLib.deviationBps(snap.answer, feedAnswer) > continuityBps;
    }

    /// @dev Dormant where no uptime feed exists: a zero address disables the
    /// check instead of claiming a protection that cannot run.
    function _sequencerDown() private view returns (bool) {
        if (sequencerFeed == address(0)) return false;
        (, int256 up, uint256 startedAt,,) = AggregatorV3Interface(sequencerFeed).latestRoundData();
        if (up != 0) return true;
        // Back up, but not yet trusted: transactions queued during the outage
        // are still landing.
        return block.timestamp - startedAt < SEQUENCER_GRACE;
    }
}
