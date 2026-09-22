// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {StockOracleAdapter} from "../src/StockOracleAdapter.sol";
import {IStockOracleAdapter} from "../src/interfaces/IStockOracleAdapter.sol";
import {MockFeed, MockSequencerFeed, MockStockToken} from "./mocks/Mocks.sol";

contract StockOracleAdapterTest is Test {
    MockStockToken internal token;
    MockFeed internal feed;
    StockOracleAdapter internal adapter;

    uint64 internal constant QUIET_AFTER = 2 hours;
    uint64 internal constant BUDGET = 72 hours;
    uint32 internal constant CONTINUITY_BPS = 200;

    int256 internal constant PRICE = 370e8; // $370, eight decimals, as on chain

    function setUp() public {
        vm.warp(1_700_000_000);
        token = new MockStockToken(1e18);
        feed = new MockFeed(8, PRICE, block.timestamp);
        adapter = new StockOracleAdapter(
            address(token), address(feed), QUIET_AFTER, BUDGET, CONTINUITY_BPS, address(0)
        );
    }

    function _status() internal view returns (IStockOracleAdapter.Status) {
        return adapter.status();
    }

    // ------------------------------------------------------------ the states

    function test_normal_passesTheFeedPriceThrough() public view {
        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.NORMAL));
        (, int256 answer,,,) = adapter.latestRoundData();
        assertEq(answer, PRICE);
    }

    function test_quiet_servesTheLastPrice() public {
        vm.warp(block.timestamp + QUIET_AFTER + 1);
        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.OFF_HOURS));
        (, int256 answer,,,) = adapter.latestRoundData();
        // Silence is not breakage: the last published price still stands.
        assertEq(answer, PRICE);
    }

    function test_oraclePause_holdsThePreWindowPrice() public {
        token.setOraclePaused(true);
        feed.set(PRICE / 2, block.timestamp);

        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.CORPORATE_ACTION));
        (, int256 answer,,,) = adapter.latestRoundData();
        assertEq(answer, PRICE, "must answer with the committed price, not the live one");
    }

    function test_stagedMultiplier_isACorporateActionBeforeItApplies() public {
        token.stageAction(4e18);
        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.CORPORATE_ACTION));
    }

    function test_tokenPause_holds() public {
        token.setPaused(true);
        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.TOKEN_HALTED));
    }

    function test_nonPositiveAnswer_isNeverServed() public {
        feed.set(0, block.timestamp);
        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.CORPORATE_ACTION));
        (, int256 answer,,,) = adapter.latestRoundData();
        assertEq(answer, PRICE);
    }

    // ------------------------------------------------------- the invariant

    function test_desync_whenTheMultiplierMovesThePrice() public {
        // A 4:1 split applied to the multiplier AND to the price: the multiplier
        // landed twice. No flag is set, and protection engages anyway.
        token.stageAction(4e18);
        token.applyAction();
        feed.set(PRICE * 4, block.timestamp);

        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.DESYNC));
        (, int256 answer,,,) = adapter.latestRoundData();
        assertEq(answer, PRICE);
    }

    function test_desync_whenTheUnderlyingWasNotAdjusted() public {
        token.stageAction(4e18);
        token.applyAction();
        feed.set(PRICE / 4, block.timestamp);
        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.DESYNC));
    }

    function test_cleanSplit_staysNormal() public {
        // The honest case: multiplier up fourfold, token price continuous.
        token.stageAction(4e18);
        token.applyAction();
        feed.set(PRICE, block.timestamp);
        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.NORMAL));
    }

    function test_marketMoveWithoutAMultiplierChange_isNotADesync() public {
        // Prices move. Without a multiplier change there is no continuity claim
        // to break, however far it moves.
        feed.set(PRICE / 2, block.timestamp);
        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.NORMAL));
    }

    function test_smallDriftAcrossASplit_isTolerated() public {
        token.stageAction(2e18);
        token.applyAction();
        feed.set(PRICE + (PRICE * 100) / 10_000, block.timestamp); // 1%, under 2%
        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.NORMAL));
    }

    // ---------------------------------------------------------- the budget

    function test_unsafe_whenTheHeldPriceOutlivesTheBudget() public {
        token.setOraclePaused(true);
        vm.warp(block.timestamp + BUDGET + 1);

        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.UNSAFE));
        vm.expectRevert();
        adapter.latestRoundData();
    }

    function test_budgetDoesNotBiteWhileHealthy() public {
        // Nothing is being held, so an old snapshot is not a reason to revert.
        vm.warp(block.timestamp + BUDGET + 1 days);
        feed.set(PRICE, block.timestamp);
        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.NORMAL));
    }

    // ---------------------------------------------------------- committing

    function test_commit_refusedWhileProtected() public {
        token.setOraclePaused(true);
        vm.expectRevert();
        adapter.commit();
    }

    function test_commit_movesTheHeldPriceWhenHealthy() public {
        feed.set(PRICE * 2, block.timestamp);
        adapter.commit();
        assertEq(adapter.heldAnswer(), PRICE * 2);

        token.setOraclePaused(true);
        (, int256 answer,,,) = adapter.latestRoundData();
        assertEq(answer, PRICE * 2);
    }

    function test_commit_isPermissionless() public {
        vm.prank(address(0xBEEF));
        adapter.commit();
        assertEq(adapter.committedAt(), block.timestamp);
    }

    function test_commitDuringQuietHours_isAllowed() public {
        vm.warp(block.timestamp + QUIET_AFTER + 1);
        adapter.commit();
        assertEq(adapter.committedAt(), block.timestamp);
    }

    // -------------------------------------------------------- the sequencer

    function test_sequencerDown_holds() public {
        MockSequencerFeed uptime = new MockSequencerFeed(1, block.timestamp);
        StockOracleAdapter guarded = new StockOracleAdapter(
            address(token), address(feed), QUIET_AFTER, BUDGET, CONTINUITY_BPS, address(uptime)
        );
        assertEq(uint8(guarded.status()), uint8(IStockOracleAdapter.Status.SEQUENCER_DOWN));
    }

    function test_sequencerJustBack_isStillNotTrusted() public {
        MockSequencerFeed uptime = new MockSequencerFeed(0, block.timestamp);
        StockOracleAdapter guarded = new StockOracleAdapter(
            address(token), address(feed), QUIET_AFTER, BUDGET, CONTINUITY_BPS, address(uptime)
        );
        assertEq(uint8(guarded.status()), uint8(IStockOracleAdapter.Status.SEQUENCER_DOWN));

        vm.warp(block.timestamp + 1 hours + 1);
        feed.set(PRICE, block.timestamp);
        assertEq(uint8(guarded.status()), uint8(IStockOracleAdapter.Status.NORMAL));
    }

    function test_zeroSequencerFeed_disablesTheCheck() public view {
        assertEq(adapter.sequencerFeed(), address(0));
        assertEq(uint8(_status()), uint8(IStockOracleAdapter.Status.NORMAL));
    }

    // ------------------------------------------------------- the shield's limit

    function test_aHeldPriceCannotRescueAPositionThatWasAlreadyUnderwater() public {
        // The held price is the pre-window price, identical for everyone. A
        // position underwater before the window is underwater inside it.
        uint256 balance = 10e18;
        uint256 valueBefore = adapter.valueOf(balance);

        token.setOraclePaused(true);
        feed.set(PRICE / 2, block.timestamp);
        uint256 valueInside = adapter.valueOf(balance);

        assertEq(valueInside, valueBefore, "the window must not change anyone's valuation");
    }

    // ------------------------------------------------------------- valuation

    function test_valueOf_matchesTheSiteMaths() public view {
        // 10 tokens at $370 is $3,700, in 18-decimal USD.
        assertEq(adapter.valueOf(10e18), 3_700e18);
    }

    function test_valueOfUI_appliesTheMultiplierExactlyOnce() public {
        token.stageAction(4e18);
        token.applyAction();
        feed.set(PRICE, block.timestamp);
        adapter.commit();

        // 40 UI units of a 4x multiplier are 10 raw tokens: the same $3,700.
        assertEq(adapter.valueOfUI(40e18), 3_700e18);
        assertEq(adapter.valueOf(10e18), 3_700e18);
    }

    function test_valueOf_revertsWhenUnsafe() public {
        token.setOraclePaused(true);
        vm.warp(block.timestamp + BUDGET + 1);
        vm.expectRevert();
        adapter.valueOf(1e18);
    }

    // ----------------------------------------------------------- the shape

    function test_updatedAtIsTheConfirmationTime_andObservedAtIsTheMarketTime() public {
        uint256 marketTime = block.timestamp;
        vm.warp(block.timestamp + 30 minutes);

        (,, uint256 startedAt, uint256 updatedAt,) = adapter.latestRoundData();
        assertEq(updatedAt, block.timestamp, "updatedAt is when the adapter vouched for the value");
        assertEq(startedAt, marketTime);
        assertEq(adapter.observedAt(), marketTime, "the market time stays available, honestly labelled");
    }

    function test_decimalsFollowTheFeed() public view {
        assertEq(adapter.decimals(), 8);
    }
}
