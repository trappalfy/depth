// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice A Chainlink feed whose round the test drives directly.
contract MockFeed {
    uint8 public decimals;
    int256 public answer;
    uint256 public updatedAt;
    uint80 public roundId = 1;

    constructor(uint8 decimals_, int256 answer_, uint256 updatedAt_) {
        decimals = decimals_;
        answer = answer_;
        updatedAt = updatedAt_;
    }

    function set(int256 answer_, uint256 updatedAt_) external {
        answer = answer_;
        updatedAt = updatedAt_;
        roundId++;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (roundId, answer, updatedAt, updatedAt, roundId);
    }

    function description() external pure returns (string memory) {
        return "mock";
    }

    function version() external pure returns (uint256) {
        return 1;
    }
}

/// @notice A Robinhood Chain stock token, reduced to what the adapter reads.
contract MockStockToken {
    uint8 public decimals = 18;
    uint256 public uiMultiplier;
    uint256 public newUIMultiplier;
    uint256 public effectiveAt;
    bool public oraclePaused;
    bool public paused;

    constructor(uint256 multiplier) {
        uiMultiplier = multiplier;
        newUIMultiplier = multiplier;
    }

    function stageAction(uint256 staged) external {
        newUIMultiplier = staged;
    }

    /// @notice Apply the staged change, the way an issuer would.
    function applyAction() external {
        uiMultiplier = newUIMultiplier;
        effectiveAt = block.timestamp;
    }

    function setOraclePaused(bool v) external {
        oraclePaused = v;
    }

    function setPaused(bool v) external {
        paused = v;
    }
}

/// @notice A Chainlink L2 uptime feed: 0 is up, 1 is down.
contract MockSequencerFeed {
    int256 public answer;
    uint256 public startedAt;

    constructor(int256 answer_, uint256 startedAt_) {
        answer = answer_;
        startedAt = startedAt_;
    }

    function set(int256 answer_, uint256 startedAt_) external {
        answer = answer_;
        startedAt = startedAt_;
    }

    function decimals() external pure returns (uint8) {
        return 0;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, startedAt, startedAt, 1);
    }

    function description() external pure returns (string memory) {
        return "mock sequencer";
    }

    function version() external pure returns (uint256) {
        return 1;
    }
}
