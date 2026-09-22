// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {AdapterFactory} from "../src/AdapterFactory.sol";
import {StockOracleAdapter} from "../src/StockOracleAdapter.sol";

/// @notice Puts the factory on chain, and adapters in front of it.
///
/// Three entry points, each its own command:
///
///   factory   forge script script/Deploy.s.sol:Deploy --rpc-url robinhood --broadcast
///   one pair  forge script script/Deploy.s.sol:Deploy --rpc-url robinhood --broadcast \
///               --sig "adapter(address,address,address)" $FACTORY $TOKEN $FEED
///   the three forge script script/Deploy.s.sol:Deploy --rpc-url robinhood --broadcast \
///               --sig "seed(address)" $FACTORY
///
/// Add `--verify` where a verifier exists. Everything deployed here is
/// immutable and ownerless: there is no post-deploy configuration step, no
/// owner to transfer and nothing to initialise. What the constructor arguments
/// say is what the contract is, forever.
contract Deploy is Script {
    /// The values in lib/adapterParams.ts, stated here so the two cannot drift
    /// silently — the console displays these until the factory is live, and
    /// reads them off the factory itself afterwards.
    uint64 internal constant QUIET_AFTER = 7_200; // 2 hours
    uint64 internal constant PROTECTION_BUDGET = 259_200; // 72 hours
    uint32 internal constant CONTINUITY_BPS = 200; // 2%
    address internal constant SEQUENCER_FEED = address(0); // this chain publishes none

    // Mainnet, from lib/assets.generated.ts.
    address internal constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;
    address internal constant AAPL_FEED = 0x6B22A786bAa607d76728168703a39Ea9C99f2cD0;
    address internal constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;
    address internal constant TSLA_FEED = 0x4A1166a659A55625345e9515b32adECea5547C38;
    address internal constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address internal constant NVDA_FEED = 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15;

    /// @notice Deploy the factory. Every parameter may be overridden by
    /// environment variable; unset means the documented value above.
    function run() external returns (AdapterFactory factory) {
        uint64 quietAfter = uint64(vm.envOr("QUIET_AFTER", uint256(QUIET_AFTER)));
        uint64 budget = uint64(vm.envOr("PROTECTION_BUDGET", uint256(PROTECTION_BUDGET)));
        uint32 continuityBps = uint32(vm.envOr("CONTINUITY_BPS", uint256(CONTINUITY_BPS)));
        address sequencerFeed = vm.envOr("SEQUENCER_FEED", SEQUENCER_FEED);

        console2.log("chain", block.chainid);
        console2.log("quietAfter (s)", quietAfter);
        console2.log("protectionBudget (s)", budget);
        console2.log("continuityBps", continuityBps);
        console2.log("sequencerFeed", sequencerFeed);

        vm.startBroadcast();
        factory = new AdapterFactory(quietAfter, budget, continuityBps, sequencerFeed);
        vm.stopBroadcast();

        console2.log("AdapterFactory", address(factory));
        console2.log("block", block.number);
        console2.log("");
        console2.log("Wire the console by putting this in lib/deployments.ts:");
        console2.log("  [ACTIVE_CHAIN_ID]: { factory: '%s', deployedAtBlock: %sn },", address(factory), block.number);
    }

    /// @notice Deploy the adapter for one pair. Prints the address first, so a
    /// mistyped argument is caught before it costs anything: the address is
    /// determined by the pair, not by who sends the transaction.
    function adapter(address factory_, address token, address feed) external returns (address deployed) {
        AdapterFactory f = AdapterFactory(factory_);
        address predicted = f.computeAddress(token, feed);
        console2.log("token", token);
        console2.log("feed", feed);
        console2.log("adapter will be at", predicted);

        if (f.isDeployed(token, feed)) {
            console2.log("already deployed; nothing to do");
            return predicted;
        }

        vm.startBroadcast();
        deployed = f.deploy(token, feed);
        vm.stopBroadcast();

        require(deployed == predicted, "address moved: wrong factory or wrong chain");
        console2.log("deployed", deployed);
        console2.log("status", uint8(StockOracleAdapter(deployed).status()));
    }

    /// @notice Deploy the three pairs the site leads with, so the console has
    /// something real to show the first person who opens it. Anyone may deploy
    /// any of the other 32 covered assets from the console itself; paying the
    /// gas buys no rights over the adapter.
    function seed(address factory_) external {
        address[3] memory tokens = [AAPL, TSLA, NVDA];
        address[3] memory feeds = [AAPL_FEED, TSLA_FEED, NVDA_FEED];
        string[3] memory names = ["AAPL", "TSLA", "NVDA"];

        AdapterFactory f = AdapterFactory(factory_);
        for (uint256 i = 0; i < tokens.length; i++) {
            if (f.isDeployed(tokens[i], feeds[i])) {
                console2.log(names[i], "already deployed at", f.computeAddress(tokens[i], feeds[i]));
                continue;
            }
            vm.broadcast();
            address a = f.deploy(tokens[i], feeds[i]);
            console2.log(names[i], "deployed at", a);
        }
    }
}
