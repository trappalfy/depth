// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {AdapterFactory} from "../src/AdapterFactory.sol";
import {StockOracleAdapter} from "../src/StockOracleAdapter.sol";
import {AggregatorV3Interface} from "../src/interfaces/AggregatorV3Interface.sol";
import {IStockOracleAdapter} from "../src/interfaces/IStockOracleAdapter.sol";
import {IStockToken} from "../src/interfaces/IStockToken.sol";

/// @notice The adapter against the real chain: real tokens, real Chainlink
/// feeds, real multipliers, at whatever block the fork lands on.
///
/// The mocks prove the logic; these prove the assumptions the logic rests on —
/// that these tokens answer `uiMultiplier`, `newUIMultiplier`, `oraclePaused`
/// and `paused`, that the feeds are eight-decimal aggregators, and that an
/// adapter deployed in front of a live feed hands back that feed's own number.
/// Nothing here asserts a price or a state: the chain decides those, and a test
/// that demanded a particular one would fail for being right.
///
/// Every test skips itself when the RPC is unreachable, so an offline
/// `forge test` stays green and honest rather than red and ignored.
contract ForkTest is Test {
    // Mainnet, from lib/assets.generated.ts — the same table the site reads.
    address internal constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;
    address internal constant AAPL_FEED = 0x6B22A786bAa607d76728168703a39Ea9C99f2cD0;
    address internal constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;
    address internal constant TSLA_FEED = 0x4A1166a659A55625345e9515b32adECea5547C38;
    address internal constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address internal constant NVDA_FEED = 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15;

    string internal constant DEFAULT_RPC = "https://rpc.mainnet.chain.robinhood.com";

    // The parameters the factory will actually be deployed with — the values in
    // lib/adapterParams.ts, so this file and the console describe one system.
    uint64 internal constant QUIET_AFTER = 7_200;
    uint64 internal constant BUDGET = 259_200;
    uint32 internal constant CONTINUITY_BPS = 200;

    bool internal forked;
    AdapterFactory internal factory;

    function setUp() public {
        try vm.createSelectFork(vm.envOr("RPC_URL", DEFAULT_RPC)) returns (uint256) {
            forked = true;
            factory = new AdapterFactory(QUIET_AFTER, BUDGET, CONTINUITY_BPS, address(0));
        } catch {
            forked = false;
        }
    }

    modifier onChain() {
        if (!forked) vm.skip(true);
        _;
    }

    // ------------------------------------------------- the chain's own shape

    function test_fork_theChainIsTheOneWeThinkItIs() public onChain {
        assertEq(block.chainid, 4663, "Robinhood Chain");
        console2.log("forked at block", block.number);
    }

    function test_fork_theTokensAnswerTheCallsTheAdapterMakes() public onChain {
        address[3] memory tokens = [AAPL, TSLA, NVDA];
        for (uint256 i = 0; i < tokens.length; i++) {
            IStockToken t = IStockToken(tokens[i]);
            assertEq(t.decimals(), 18, "stock tokens are 18-decimal");
            // A multiplier of zero would mean a token with no shares behind it;
            // it is also the value a non-existent function returns through a
            // silently-succeeding call, so this is a liveness check too.
            assertGt(t.uiMultiplier(), 0, "uiMultiplier must be a real number");
            assertGt(t.newUIMultiplier(), 0, "newUIMultiplier must be a real number");
            t.oraclePaused();
            t.paused();
        }
    }

    function test_fork_theFeedsAreEightDecimalAggregators() public onChain {
        address[3] memory feeds = [AAPL_FEED, TSLA_FEED, NVDA_FEED];
        for (uint256 i = 0; i < feeds.length; i++) {
            AggregatorV3Interface f = AggregatorV3Interface(feeds[i]);
            assertEq(f.decimals(), 8, "the site's maths assumes eight");
            (, int256 answer,, uint256 updatedAt,) = f.latestRoundData();
            assertGt(answer, 0, "a live feed publishes a positive price");
            assertLe(updatedAt, block.timestamp, "a round cannot come from the future");
            console2.log("feed answer", uint256(answer), "age (s)", block.timestamp - updatedAt);
        }
    }

    // ------------------------------------------------------- deployment

    function test_fork_deployedAddressIsTheOneTheConsoleComputes() public onChain {
        address predicted = factory.computeAddress(AAPL, AAPL_FEED);
        assertFalse(factory.isDeployed(AAPL, AAPL_FEED));

        address deployed = factory.deploy(AAPL, AAPL_FEED);

        assertEq(deployed, predicted, "the console shows this address before anyone pays gas");
        assertTrue(factory.isDeployed(AAPL, AAPL_FEED));
        assertTrue(
            factory.computeAddress(AAPL, AAPL_FEED) != factory.computeAddress(TSLA, TSLA_FEED),
            "each pair gets its own adapter"
        );
    }

    function test_fork_everyMajorPairDeploysAndAnswers() public onChain {
        address[3] memory tokens = [AAPL, TSLA, NVDA];
        address[3] memory feeds = [AAPL_FEED, TSLA_FEED, NVDA_FEED];

        for (uint256 i = 0; i < tokens.length; i++) {
            StockOracleAdapter adapter = StockOracleAdapter(factory.deploy(tokens[i], feeds[i]));
            assertEq(adapter.decimals(), 8, "the adapter wears the feed's decimals");

            IStockOracleAdapter.Status s = adapter.status();
            // Any state but UNSAFE: the snapshot was taken in the constructor a
            // moment ago, so the budget cannot already be spent.
            assertTrue(s != IStockOracleAdapter.Status.UNSAFE, "a fresh adapter is never out of budget");

            (, int256 answer,,,) = adapter.latestRoundData();
            assertGt(answer, 0, "an adapter never serves a non-price");
            console2.log("adapter status", uint8(s), "answer", uint256(answer));
        }
    }

    // ---------------------------------------------- healthy pass-through

    function test_fork_aHealthyReadIsTheFeedsOwnNumber() public onChain {
        StockOracleAdapter adapter = StockOracleAdapter(factory.deploy(AAPL, AAPL_FEED));
        (, int256 feedAnswer,, uint256 feedUpdatedAt,) = AggregatorV3Interface(AAPL_FEED).latestRoundData();

        IStockOracleAdapter.Status s = adapter.status();
        if (s != IStockOracleAdapter.Status.NORMAL && s != IStockOracleAdapter.Status.OFF_HOURS) {
            // AAPL is genuinely in a protected state on chain right now. That is
            // the product working, not a failure, and the held-price path is
            // covered below on a state we create deliberately.
            console2.log("AAPL is protected on chain, status", uint8(s));
            return;
        }

        (, int256 answer, uint256 startedAt, uint256 updatedAt,) = adapter.latestRoundData();
        assertEq(answer, feedAnswer, "healthy means pass-through, not lag");
        assertEq(startedAt, feedUpdatedAt, "startedAt carries the market's own time");
        assertEq(updatedAt, block.timestamp, "updatedAt is when the adapter vouched for it");
        assertEq(adapter.observedAt(), feedUpdatedAt, "and the market time stays readable");
    }

    // ------------------------------------------- the window, on real state

    function test_fork_anIssuerPauseHoldsTheRealPreWindowPrice() public onChain {
        StockOracleAdapter adapter = StockOracleAdapter(factory.deploy(TSLA, TSLA_FEED));
        IStockOracleAdapter.Status opening = adapter.status();
        if (opening != IStockOracleAdapter.Status.NORMAL && opening != IStockOracleAdapter.Status.OFF_HOURS) {
            console2.log("TSLA is already protected on chain, status", uint8(opening));
            return;
        }

        (, int256 pre,,,) = adapter.latestRoundData();
        uint256 valueBefore = adapter.valueOf(10e18);

        // The one thing we fake: the issuer's flag. Everything else — the
        // token's decimals and multiplier, the feed's shape — stays real.
        vm.mockCall(TSLA, abi.encodeWithSelector(IStockToken.oraclePaused.selector), abi.encode(true));
        // And the market moves while the flag is up.
        vm.mockCall(
            TSLA_FEED,
            abi.encodeWithSelector(AggregatorV3Interface.latestRoundData.selector),
            abi.encode(uint80(1), pre / 2, block.timestamp, block.timestamp, uint80(1))
        );

        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.CORPORATE_ACTION));
        (, int256 held,,,) = adapter.latestRoundData();
        assertEq(held, pre, "the window serves the price from before it opened");
        assertEq(adapter.valueOf(10e18), valueBefore, "and nobody's valuation moves");
    }

    function test_fork_theBudgetEndsTheHoldOnRealState() public onChain {
        StockOracleAdapter adapter = StockOracleAdapter(factory.deploy(AAPL, AAPL_FEED));
        vm.mockCall(AAPL, abi.encodeWithSelector(IStockToken.oraclePaused.selector), abi.encode(true));

        vm.warp(block.timestamp + BUDGET + 1);
        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.UNSAFE));
        vm.expectRevert();
        adapter.latestRoundData();
    }

    // ------------------------------------------- valuation on real numbers

    function test_fork_bothConventionsAgreeOnTheRealMultiplier() public onChain {
        StockOracleAdapter adapter = StockOracleAdapter(factory.deploy(NVDA, NVDA_FEED));
        uint256 multiplier = IStockToken(NVDA).uiMultiplier();
        console2.log("NVDA uiMultiplier", multiplier);

        uint256 raw = 7e18;
        uint256 ui = (raw * multiplier) / 1e18;

        uint256 viaRaw = adapter.valueOf(raw);
        uint256 viaUI = adapter.valueOfUI(ui);

        (, int256 answer,,,) = adapter.latestRoundData();
        uint256 rawPerUiUnit = 1e18 / multiplier + 1;
        uint256 tolerance = rawPerUiUnit * (uint256(answer) / 1e8) + 1;
        assertApproxEqAbs(viaUI, viaRaw, tolerance, "one position, one value, either convention");
        assertLe(viaUI, viaRaw, "the UI convention must never value a position above the raw one");
        console2.log("7 raw NVDA is worth (1e18 USD)", viaRaw);
    }

    // ----------------------------------------------------------- the cost

    function test_fork_gasAgainstTheRealFeed() public onChain {
        StockOracleAdapter adapter = StockOracleAdapter(factory.deploy(AAPL, AAPL_FEED));

        uint256 g0 = gasleft();
        AggregatorV3Interface(AAPL_FEED).latestRoundData();
        uint256 direct = g0 - gasleft();

        g0 = gasleft();
        adapter.latestRoundData();
        uint256 through = g0 - gasleft();

        console2.log("direct feed read", direct);
        console2.log("through the adapter", through);
        console2.log("the firewall costs", through - direct);
    }
}
