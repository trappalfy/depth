// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AggregatorV3Interface} from "./AggregatorV3Interface.sol";

/// @notice The adapter's own surface, on top of the Chainlink one it replaces.
///
/// This interface is not free to change: the console at /app is written against
/// it (see lib/adapterAbi.ts in the site), and the site ships before the
/// contracts precisely so that mainnet day changes one address and nothing else.
interface IStockOracleAdapter is AggregatorV3Interface {
    /// @dev Declaration order is the on-chain encoding. The site's
    /// lib/adapterStatus.ts carries the same order and says so.
    enum Status {
        NORMAL,
        OFF_HOURS,
        CORPORATE_ACTION,
        DESYNC,
        TOKEN_HALTED,
        SEQUENCER_DOWN,
        UNSAFE
    }

    /// @notice Raised when the protection budget is spent: the adapter refuses
    /// to answer rather than serve a price it can no longer stand behind.
    error ProtectionBudgetExhausted(uint256 heldSince, uint256 endedAt);

    /// @notice Raised by commit() when the market is not in a state whose price
    /// is worth keeping.
    error NotCommittable(Status status);

    /// @notice A new snapshot was taken. Permissionless, and it confers nothing.
    event Committed(int256 answer, uint256 multiplier, uint256 observedAt);

    function status() external view returns (Status);

    /// @notice When the market data behind the current answer was observed.
    /// `latestRoundData().updatedAt` deliberately does not carry this — see the
    /// note on that function.
    function observedAt() external view returns (uint256);

    /// @notice The price frozen before the current protection window opened.
    function heldAnswer() external view returns (int256);

    /// @notice When holding stops being allowed and the adapter starts to
    /// revert instead.
    function protectionEndsAt() external view returns (uint256);

    /// @notice When the snapshot behind heldAnswer() was taken.
    function committedAt() external view returns (uint256);

    /// @notice USD value of a raw ERC-20 balance, 18 decimals.
    function valueOf(uint256 rawAmount) external view returns (uint256);

    /// @notice USD value of a UI balance — balanceOfUI(), multiplier included.
    function valueOfUI(uint256 uiAmount) external view returns (uint256);

    /// @notice Refresh the snapshot. Anyone may call it; it grants nothing.
    function commit() external;

    function token() external view returns (address);

    function feed() external view returns (address);
}
