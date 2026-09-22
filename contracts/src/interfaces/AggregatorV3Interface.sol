// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice The Chainlink read interface, declared here rather than imported:
/// the trusted path takes no external code.
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);

    function description() external view returns (string memory);

    function version() external view returns (uint256);

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
