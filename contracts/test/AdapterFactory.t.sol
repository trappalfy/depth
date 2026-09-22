// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {AdapterFactory} from "../src/AdapterFactory.sol";
import {StockOracleAdapter} from "../src/StockOracleAdapter.sol";
import {MockFeed, MockStockToken} from "./mocks/Mocks.sol";

contract AdapterFactoryTest is Test {
    AdapterFactory internal factory;
    MockStockToken internal token;
    MockFeed internal feed;

    function setUp() public {
        vm.warp(1_700_000_000);
        token = new MockStockToken(1e18);
        feed = new MockFeed(8, 370e8, block.timestamp);
        factory = new AdapterFactory(2 hours, 72 hours, 200, address(0));
    }

    function test_addressIsKnownBeforeTheAdapterExists() public {
        address predicted = factory.computeAddress(address(token), address(feed));
        assertFalse(factory.isDeployed(address(token), address(feed)));

        address deployed = factory.deploy(address(token), address(feed));

        assertEq(deployed, predicted, "the address a client derived must be the one that appears");
        assertTrue(factory.isDeployed(address(token), address(feed)));
    }

    function test_theAdapterCarriesTheFactorysParameters() public {
        StockOracleAdapter adapter = StockOracleAdapter(factory.deploy(address(token), address(feed)));
        assertEq(adapter.quietAfter(), 2 hours);
        assertEq(adapter.protectionBudget(), 72 hours);
        assertEq(adapter.continuityBps(), 200);
        assertEq(adapter.sequencerFeed(), address(0));
        assertEq(adapter.token(), address(token));
        assertEq(adapter.feed(), address(feed));
    }

    function test_deployIsPermissionless_andConfersNothing() public {
        vm.prank(address(0xBEEF));
        StockOracleAdapter adapter = StockOracleAdapter(factory.deploy(address(token), address(feed)));
        // Nothing on the adapter takes an owner, so there is nothing to check
        // beyond this: the caller got an address back and no rights with it.
        assertEq(adapter.committedAt(), block.timestamp);
    }

    function test_theSamePairCannotBeDeployedTwice() public {
        factory.deploy(address(token), address(feed));
        vm.expectRevert();
        factory.deploy(address(token), address(feed));
    }

    function test_aDifferentPairGetsADifferentAddress() public {
        MockFeed other = new MockFeed(8, 100e8, block.timestamp);
        assertTrue(
            factory.computeAddress(address(token), address(feed))
                != factory.computeAddress(address(token), address(other))
        );
    }

    function test_aDifferentFactoryGetsDifferentAddresses() public {
        // Parameters live in the factory, so changing one cannot silently
        // change an adapter an integration already points at.
        AdapterFactory stricter = new AdapterFactory(2 hours, 72 hours, 100, address(0));
        assertTrue(
            factory.computeAddress(address(token), address(feed))
                != stricter.computeAddress(address(token), address(feed))
        );
    }

    function test_zeroAddressesAreRefused() public {
        vm.expectRevert();
        factory.deploy(address(0), address(feed));
        vm.expectRevert();
        factory.deploy(address(token), address(0));
    }
}
