// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice The convention matrix, closed by construction.
///
/// A Chainlink answer on this chain prices ONE RAW TOKEN and already carries
/// the corporate-action multiplier. A raw balance does not. Pairing a UI
/// balance with that answer applies the multiplier twice; pairing a raw balance
/// with an unadjusted quote applies it zero times. Neither mistake reverts —
/// one overvalues collateral, the other liquidates a healthy position.
///
/// So the library takes the balance and the convention it is in, and applies
/// the multiplier exactly once, in one direction. There is no argument order
/// that can double it.
///
/// Mirrors lib/valuation.ts in the site, which is unit-tested against the same
/// expectations; the two must not drift.
library ValuationLib {
    /// @dev USD is reported with 18 decimals throughout.
    uint256 internal constant WAD = 1e18;

    error MultiplierMustBePositive();

    /// @notice USD value of a raw balance. The answer already carries the
    /// multiplier, so nothing else may apply it.
    /// @param rawAmount balanceOf(), before any UI scaling
    /// @param tokenDecimals decimals of the token (18 on this chain)
    /// @param answer Chainlink answer for one raw token
    /// @param answerDecimals decimals of that answer (8 on this chain)
    function valueOfRaw(uint256 rawAmount, uint8 tokenDecimals, int256 answer, uint8 answerDecimals)
        internal
        pure
        returns (uint256)
    {
        if (answer <= 0) return 0;
        // Multiply before dividing: the division is the only place precision is
        // lost, and it happens once, at the end.
        return (rawAmount * uint256(answer) * WAD) / (10 ** tokenDecimals * 10 ** answerDecimals);
    }

    /// @notice USD value of a UI balance — balanceOfUI(), which is the raw
    /// balance already scaled by the multiplier. Converting back to raw is what
    /// keeps the multiplier from landing a second time.
    function valueOfUI(
        uint256 uiAmount,
        uint256 uiMultiplier,
        uint8 tokenDecimals,
        int256 answer,
        uint8 answerDecimals
    ) internal pure returns (uint256) {
        if (uiMultiplier == 0) revert MultiplierMustBePositive();
        uint256 rawAmount = (uiAmount * WAD) / uiMultiplier;
        return valueOfRaw(rawAmount, tokenDecimals, answer, answerDecimals);
    }

    /// @notice Absolute difference in basis points between two prices.
    /// @dev Used by the continuity invariant. `previous` must be positive; the
    /// caller has already rejected a non-positive snapshot.
    function deviationBps(int256 previous, int256 current) internal pure returns (uint256) {
        uint256 p = uint256(previous);
        uint256 c = current > 0 ? uint256(current) : 0;
        uint256 diff = c > p ? c - p : p - c;
        return (diff * 10_000) / p;
    }
}
