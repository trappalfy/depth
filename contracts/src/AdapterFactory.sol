// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {StockOracleAdapter} from "./StockOracleAdapter.sol";

/// @title AdapterFactory
/// @notice Deploys one adapter per (token, feed) pair at an address anyone can
/// derive in advance.
///
/// The factory holds the parameters, so an adapter's address depends on the
/// pair alone. That is the property worth having: a client computes the address
/// itself, points its oracle there, and nobody — including us — can put a
/// different contract at it. There is no registry to trust, no owner to
/// compromise and no upgrade path to worry about, because there is no owner.
///
/// Changing a parameter means deploying a new factory, which produces different
/// addresses. That is a feature: an existing integration cannot be changed
/// underneath the protocol using it.
contract AdapterFactory {
    /// @notice Silence beyond which a feed is quiet rather than fresh.
    uint64 public immutable quietAfter;

    /// @notice How old a held price may get before an adapter reverts.
    uint64 public immutable protectionBudget;

    /// @notice Continuity tolerance across a multiplier change, in bps.
    uint32 public immutable continuityBps;

    /// @notice Sequencer uptime feed, or zero where the chain publishes none.
    address public immutable sequencerFeed;

    error AlreadyDeployed(address adapter);
    error ZeroAddress();

    event AdapterDeployed(address indexed token, address indexed feed, address adapter);

    constructor(uint64 quietAfter_, uint64 protectionBudget_, uint32 continuityBps_, address sequencerFeed_) {
        quietAfter = quietAfter_;
        protectionBudget = protectionBudget_;
        continuityBps = continuityBps_;
        sequencerFeed = sequencerFeed_;
    }

    /// @notice Deploy the adapter for a pair. Permissionless, and paying the
    /// gas buys nothing: the adapter is immutable and ownerless, and its
    /// address was determined before anyone sent the transaction.
    function deploy(address token, address feed) external returns (address adapter) {
        if (token == address(0) || feed == address(0)) revert ZeroAddress();
        address predicted = computeAddress(token, feed);
        if (predicted.code.length != 0) revert AlreadyDeployed(predicted);

        adapter = address(
            new StockOracleAdapter{salt: _salt(token, feed)}(
                token, feed, quietAfter, protectionBudget, continuityBps, sequencerFeed
            )
        );
        emit AdapterDeployed(token, feed, adapter);
    }

    /// @notice Where this pair's adapter lives, whether or not it exists yet.
    function computeAddress(address token, address feed) public view returns (address) {
        bytes32 initCodeHash = keccak256(
            abi.encodePacked(
                type(StockOracleAdapter).creationCode,
                abi.encode(token, feed, quietAfter, protectionBudget, continuityBps, sequencerFeed)
            )
        );
        return address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), _salt(token, feed), initCodeHash))))
        );
    }

    /// @notice Whether that address holds a contract yet.
    function isDeployed(address token, address feed) external view returns (bool) {
        return computeAddress(token, feed).code.length != 0;
    }

    function _salt(address token, address feed) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(token, feed));
    }
}
