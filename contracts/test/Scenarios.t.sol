// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {StockOracleAdapter} from "../src/StockOracleAdapter.sol";
import {IStockOracleAdapter} from "../src/interfaces/IStockOracleAdapter.sol";
import {MockFeed, MockStockToken} from "./mocks/Mocks.sol";

/// @notice Whole events, played out in order, rather than single states.
///
/// The unit tests ask what the adapter does in a state. These ask what happens
/// to a holder across a day: a dividend that arrives as more tokens, and an
/// adapter nobody has committed to in a while when the window finally opens.
contract ScenariosTest is Test {
    MockStockToken internal token;
    MockFeed internal feed;
    StockOracleAdapter internal adapter;

    uint64 internal constant QUIET_AFTER = 7_200;
    uint64 internal constant BUDGET = 259_200; // 72 hours
    uint32 internal constant CONTINUITY_BPS = 200;

    int256 internal constant PRICE = 370e8;

    function setUp() public {
        vm.warp(1_700_000_000);
        token = new MockStockToken(1e18);
        feed = new MockFeed(8, PRICE, block.timestamp);
        adapter = new StockOracleAdapter(
            address(token), address(feed), QUIET_AFTER, BUDGET, CONTINUITY_BPS, address(0)
        );
    }

    // ------------------------------------------------- a reinvested dividend

    /// @notice A cash dividend on this chain arrives as a higher multiplier:
    /// the holder's raw balance never moves, their UI balance grows, and the
    /// underlying goes ex-dividend by the same proportion on the same day. The
    /// price of one raw token is therefore continuous — which is exactly what
    /// the adapter checks, so an honest dividend must pass straight through.
    function test_dividend_reinvested_passesThrough() public {
        uint256 rawBalance = 100e18;
        uint256 valueBefore = adapter.valueOf(rawBalance);

        // Declared: 0.5% of the position, payable in tokens. The flag goes up
        // the moment the change is staged, before it applies.
        token.stageAction(1.005e18);
        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.CORPORATE_ACTION));
        assertEq(adapter.valueOf(rawBalance), valueBefore, "the announcement changes nobody's value");

        // Pay date: the multiplier rises and the share goes ex-dividend, so one
        // raw token is worth what it was worth yesterday.
        token.applyAction();
        vm.warp(block.timestamp + 1 hours);
        feed.set(PRICE, block.timestamp);

        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.NORMAL), "an honest dividend is not an incident");
        assertEq(adapter.valueOf(rawBalance), valueBefore, "and the position is worth the same either side");

        // The holder now sees 0.5% more units in the app, each worth 0.5% less
        // of the underlying. Same money, counted differently.
        uint256 uiBalance = (rawBalance * 1.005e18) / 1e18;
        assertApproxEqAbs(adapter.valueOfUI(uiBalance), valueBefore, 1e12);
    }

    /// @notice The same dividend booked wrong: the multiplier rises and the
    /// feed's price rises with it, so the payment is counted twice. Nobody
    /// pauses anything — the issuer has no idea — and protection engages on the
    /// arithmetic alone.
    function test_dividend_countedTwice_isCaught() public {
        token.stageAction(1.005e18);
        token.applyAction();
        feed.set(PRICE + (PRICE * 500) / 10_000, block.timestamp); // 5%: far past tolerance

        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.DESYNC));
        (, int256 answer,,,) = adapter.latestRoundData();
        assertEq(answer, PRICE, "the pre-dividend price, not the doubled one");
    }

    // --------------------------------------------------- a stale snapshot

    /// @notice The operational fact that decides whether this product works in
    /// production: the budget is spent by the AGE of the held price, so an
    /// adapter nobody commits to arrives at the window with nothing left. A
    /// weekly keeper is not optional decoration — it is what buys the 72 hours.
    function test_staleSnapshot_arrivesAtTheWindowWithNoBudgetLeft() public {
        // Four days pass. The feed keeps publishing, the market is healthy, and
        // no one calls commit().
        vm.warp(block.timestamp + 4 days);
        feed.set(PRICE, block.timestamp);
        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.NORMAL), "an old snapshot is not itself a problem");

        // Now the issuer pauses the oracle. The only price the adapter can hold
        // is four days old — already past the budget.
        token.setOraclePaused(true);
        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.UNSAFE));
        vm.expectRevert();
        adapter.latestRoundData();
    }

    /// @notice The same four days with a keeper running. One call before the
    /// window and the full 72 hours is there.
    function test_aCommitBeforeTheWindowBuysTheWholeBudget() public {
        vm.warp(block.timestamp + 4 days);
        feed.set(PRICE, block.timestamp);
        adapter.commit();

        token.setOraclePaused(true);
        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.CORPORATE_ACTION));

        // Held right up to the deadline...
        vm.warp(block.timestamp + BUDGET);
        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.CORPORATE_ACTION));
        (, int256 answer,,,) = adapter.latestRoundData();
        assertEq(answer, PRICE);

        // ...and not one second past it.
        vm.warp(block.timestamp + 1);
        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.UNSAFE));
    }

    /// @notice And the exhausted adapter comes back by itself when the market
    /// does: UNSAFE is a state, not a tombstone. No owner is needed to reset it.
    function test_anExhaustedAdapterRecoversWhenTheWindowCloses() public {
        token.setOraclePaused(true);
        vm.warp(block.timestamp + BUDGET + 1 days);
        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.UNSAFE));

        token.setOraclePaused(false);
        feed.set(PRICE * 2, block.timestamp);

        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.NORMAL));
        (, int256 answer,,,) = adapter.latestRoundData();
        assertEq(answer, PRICE * 2, "back to pass-through, at the market's real price");

        // And committing now re-arms the shield for the next window.
        adapter.commit();
        assertEq(adapter.committedAt(), block.timestamp);
    }

    // ------------------------------------------------------- a whole split

    /// @notice A 4:1 split from announcement to settlement, the way it actually
    /// runs: announced, staged, oracle paused, applied, unpaused, re-committed.
    function test_split_endToEnd() public {
        uint256 rawBalance = 25e18;
        uint256 valueBefore = adapter.valueOf(rawBalance);

        // 1. Staged on chain the day before. The window opens here, not when
        //    the issuer gets round to pausing.
        token.stageAction(4e18);
        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.CORPORATE_ACTION));

        // 2. The issuer pauses the oracle for the transition.
        token.setOraclePaused(true);
        vm.warp(block.timestamp + 6 hours);

        // 3. The feed re-prices the underlying mid-transition. Held, not served.
        feed.set(PRICE / 4, block.timestamp);
        (, int256 during,,,) = adapter.latestRoundData();
        assertEq(during, PRICE, "nothing a protocol reads moves during the transition");
        assertEq(adapter.valueOf(rawBalance), valueBefore);

        // 4. The multiplier applies and the token's own price is continuous
        //    again: one raw token is still worth $370.
        token.applyAction();
        feed.set(PRICE, block.timestamp);
        token.setOraclePaused(false);

        assertEq(uint8(adapter.status()), uint8(IStockOracleAdapter.Status.NORMAL));
        assertEq(adapter.valueOf(rawBalance), valueBefore, "a split moved no wealth, and the oracle agrees");

        // 5. The keeper re-commits, and the shield is armed for the next one.
        adapter.commit();
        assertEq(adapter.heldAnswer(), PRICE);
        assertEq(adapter.protectionEndsAt(), block.timestamp + BUDGET);
    }
}
