// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {StockOracleAdapter} from "../src/StockOracleAdapter.sol";
import {IStockOracleAdapter} from "../src/interfaces/IStockOracleAdapter.sol";
import {MockFeed, MockStockToken} from "./mocks/Mocks.sol";

/// @notice The two claims the product is sold on, checked by machine rather
/// than by argument — spec §10.
contract InvariantsTest is Test {
    MockStockToken internal token;
    MockFeed internal feed;
    StockOracleAdapter internal adapter;

    int256 internal constant PRICE = 370e8;

    function setUp() public {
        vm.warp(1_700_000_000);
        token = new MockStockToken(1e18);
        feed = new MockFeed(8, PRICE, block.timestamp);
        adapter = new StockOracleAdapter(address(token), address(feed), 2 hours, 72 hours, 200, address(0));
    }

    /// @notice Claim one: a protection window changes nobody's valuation.
    ///
    /// The held price is the pre-window price, identical for every caller, so
    /// every position is worth inside the window exactly what it was worth
    /// outside it. Nobody is rescued and nobody is pushed under — which is why
    /// the shield cannot be used to dodge an honest liquidation.
    function testFuzz_windowChangesNoValuation(uint128 balance, int64 shock, uint8 cause) public {
        vm.assume(shock > 0);

        uint256 before = adapter.valueOf(balance);

        // Something makes the current number untrustworthy, and the market
        // moves anywhere at all while it does.
        if (cause % 3 == 0) token.setOraclePaused(true);
        else if (cause % 3 == 1) token.setPaused(true);
        else token.stageAction(4e18);
        feed.set(int256(shock), block.timestamp);

        assertEq(adapter.valueOf(balance), before);
    }

    /// @notice Claim two: whatever the multiplier does, the same position is
    /// worth the same through either convention. The library converts the UI
    /// balance back to raw, so the multiplier can only land once.
    function testFuzz_bothConventionsAgree(uint96 rawBalance, uint256 multiplier) public {
        // Multipliers on this chain sit near 1.0 and only ever rise, with
        // dividends and splits; fuzz a range far wider than that but still a
        // multiplier rather than the whole word.
        multiplier = bound(multiplier, 1e15, 1e21);

        token.stageAction(multiplier);
        token.applyAction();
        feed.set(PRICE, block.timestamp);
        adapter.commit();

        uint256 uiBalance = (uint256(rawBalance) * multiplier) / 1e18;
        uint256 viaRaw = adapter.valueOf(rawBalance);
        uint256 viaUI = adapter.valueOfUI(uiBalance);

        // Both directions floor, so the round trip can lose the raw wei that a
        // single UI unit is too coarse to express: 1e18 / multiplier of them,
        // each worth answer / 10**answerDecimals in 18-decimal USD. Below 1.0
        // the multiplier makes UI units coarser than raw ones, and the loss
        // grows — which is arithmetic, not drift.
        uint256 rawPerUiUnit = 1e18 / multiplier + 1;
        uint256 tolerance = rawPerUiUnit * (uint256(PRICE) / 1e8) + 1;
        assertApproxEqAbs(viaUI, viaRaw, tolerance);
        assertLe(viaUI, viaRaw, "the UI convention must never value a position above the raw one");
    }

    /// @notice A healthy read is always the feed's own number, never a stale
    /// one: the adapter adds protection, it does not add lag.
    function testFuzz_healthyReadIsTheLivePrice(int64 price, uint32 age) public {
        vm.assume(price > 0);
        age = uint32(bound(age, 0, 2 hours));

        vm.warp(block.timestamp + age);
        feed.set(int256(price), block.timestamp - age);

        IStockOracleAdapter.Status s = adapter.status();
        if (s == IStockOracleAdapter.Status.NORMAL || s == IStockOracleAdapter.Status.OFF_HOURS) {
            (, int256 answer,,,) = adapter.latestRoundData();
            assertEq(answer, int256(price));
        }
    }
}
