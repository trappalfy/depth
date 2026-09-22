// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice The part of a Robinhood Chain stock token this adapter reads.
///
/// `uiMultiplier` and its staged successor come from ERC-8056: a corporate
/// action is staged as `newUIMultiplier` and takes effect later, which is the
/// one window where a balance and a price can disagree about which convention
/// they are in. The two pauses are independent — the issuer can pause the
/// oracle without pausing transfers, and the reverse.
interface IStockToken {
    function decimals() external view returns (uint8);

    /// @notice Shares represented by one raw token, 18 decimals. 1e18 = 1.0.
    function uiMultiplier() external view returns (uint256);

    /// @notice The multiplier staged to replace it. Equal to `uiMultiplier`
    /// when nothing is staged.
    function newUIMultiplier() external view returns (uint256);

    /// @notice When the last multiplier change took effect. NOT the time a
    /// staged change is due: a pending action is the difference between the
    /// two multipliers, never this field.
    function effectiveAt() external view returns (uint256);

    /// @notice The issuer has paused price publication for this asset.
    function oraclePaused() external view returns (bool);

    /// @notice Transfers are paused on the token itself.
    function paused() external view returns (bool);
}
