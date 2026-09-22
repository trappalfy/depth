# Deployment

Everything here is reversible except the transactions, and the transactions
are cheap: the factory cost an estimated **0.00025 ETH** to deploy on
Robinhood Chain at 0.106 gwei, and an adapter is a fraction of that.

Nothing deployed has an owner, an admin key, a proxy or an upgrade path.
There is no post-deploy configuration step and nothing to initialise: the
constructor arguments are the contract. A change of mind means a new factory
at a new address, and the old one keeps working for anyone already pointing at
it.

## 0. The rehearsal

Never deploy to mainnet without running this first. It forks the real chain
locally, deploys the real contracts against real tokens and feeds, and drives
them through the console's own ABI.

```bash
# a local copy of mainnet
anvil --fork-url https://rpc.mainnet.chain.robinhood.com --port 8545

# the factory, then the three adapters the site leads with
cd contracts
export PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  # anvil account 0
forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --private-key $PK --broadcast
forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --private-key $PK --broadcast \
  --sig "seed(address)" $FACTORY

# the console's own ABI against what is on the fork
cd ..
FACTORY=$FACTORY RPC_URL=http://127.0.0.1:8545 npx tsx scripts/verify-deployment.ts

# and the console itself, pointed at the fork
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545 npm run build
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545 npm start
```

With `lib/deployments.ts` temporarily pointed at the fork's factory address,
`/app` comes fully alive. **Put that file back to `null` before committing** —
a fork address in the repo is a lie about mainnet.

## 1. The tests

```bash
cd contracts && forge test          # 52 tests: units, scenarios, fuzz, and the fork
cd .. && npx tsc --noEmit && npm test
```

The fork tests run against mainnet as it is right now and skip themselves when
the RPC is unreachable. Run them with the network up, or they prove nothing.

## 2. Mainnet

The deployer needs a little ETH on Robinhood Chain and nothing else — the key
confers no rights over anything it deploys.

```bash
cd contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url robinhood --broadcast --interactives 1     # or --ledger, or --account
```

It prints the factory address, the block, and the exact line for
`lib/deployments.ts`. Parameters come from the constants in the script, which
are the values `lib/adapterParams.ts` documents:

| | |
|---|---|
| `quietAfter` | 7 200 s (2 h) |
| `protectionBudget` | 259 200 s (72 h) |
| `continuityBps` | 200 (2 %) |
| `sequencerFeed` | `address(0)` — this chain publishes none |

Override any of them with `QUIET_AFTER`, `PROTECTION_BUDGET`,
`CONTINUITY_BPS`, `SEQUENCER_FEED` in the environment. Changing one changes
every adapter address, so decide before, not after.

## 3. The first adapters

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url robinhood --broadcast --interactives 1 \
  --sig "seed(address)" 0xTHE_FACTORY
```

That deploys AAPL, TSLA and NVDA. The other 32 covered assets can be deployed
by anyone from the console itself — the Deploy button on `/app` — and paying
the gas buys no rights over the adapter.

## 4. Wiring the console

```bash
FACTORY=0xTHE_FACTORY npx tsx scripts/verify-deployment.ts
```

Checks the factory's parameters against `lib/adapterParams.ts`, that all 35
adapter addresses are distinct, and that every deployed adapter is bound to
the right token and feed and answers every call the console makes. It only
reads; it needs no key.

When it passes, put the printed line into `lib/deployments.ts`:

```ts
[ACTIVE_CHAIN_ID]: { factory: '0x…', deployedAtBlock: …n },
```

That is the only file that changes. Commit, push, and Vercel does the rest.
The console probes the address with a real view call on load, so a wrong
address shows as **absent** rather than silently deploying into nothing.

## 5. The keeper

`test_staleSnapshot_arrivesAtTheWindowWithNoBudgetLeft` states the operational
fact this depends on: **the protection budget is spent by the age of the held
price**. An adapter nobody has committed to for 72 hours arrives at a
corporate action with nothing left to hold and reverts instead of protecting.

So each live adapter needs `commit()` called while the market is healthy —
daily is comfortable against a 72-hour budget. It is permissionless and grants
nothing, so anyone can run it; until a keeper exists, the Commit button on
each adapter's page is the manual path.

`commit()` reverts with `NotCommittable` in any protected state, which is the
point: a snapshot taken mid-window would freeze the very number the window
exists to distrust.

## Addresses

Robinhood Chain mainnet, chain id **4663**, RPC
`https://rpc.mainnet.chain.robinhood.com`.

| | |
|---|---|
| AdapterFactory | `0xcD70a518a78807C355A4B9aB8676Bd7C848806D1` |
| deployed at | block 69,889,995 — 22 September 2026 |
| cost | 1,837,722 gas, 0.0000962 ETH |

Token and feed addresses for all 194 assets live in `lib/assets.generated.ts`,
generated from the chain rather than typed by hand.
