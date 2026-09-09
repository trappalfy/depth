# Depth

A corporate action firewall for tokenized equities on Robinhood Chain: one oracle
address that stops splits, oracle pauses and 24-hour heartbeats from liquidating
healthy positions.

Tokenized equities carry two sets of books. Balances stay raw, prices already
carry the corporate-action multiplier, and mixing the two conventions is silent
and expensive — on a 4:1 split it overvalues collateral fourfold or liquidates a
healthy position, and neither case reverts. The adapter makes the convention
explicit and freezes the price while a corporate action is in flight.

## Status

**Stage 1 of 3.** This repository is the site and the console. The contracts are
not written yet, so nothing on chain answers.

What is real today: every figure on the site is read from Robinhood Chain
mainnet (chain 4663) at the time shown — 194 tokenized assets, the 35 with an
on-chain Chainlink feed, their prices, ages and multipliers. The console is
built against the final contract interface; values it cannot read from a
contract are either computed from the live feed by the adapter's own rules and
marked `preview`, or left blank with the reason stated. No address, price or
hash on this site is invented.

Mainnet day is one line: the factory address in [`lib/deployments.ts`](lib/deployments.ts).

| Stage | What | State |
|---|---|---|
| 1 | Site, live data, console | this repository |
| 2 | `StockOracleAdapter`, `ValuationLib`, scenario tests | next, written against [`lib/adapterAbi.ts`](lib/adapterAbi.ts) |
| 3 | `AdapterFactory`, deployment, audit | after stage 2 |

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 86 unit tests, no network
npm run build
```

Both environment variables are optional — see [`.env.example`](.env.example).
`RPC_URL` overrides the public Robinhood Chain endpoint used for server reads,
and `NEXT_PUBLIC_WC_PROJECT_ID` adds WalletConnect to the wallet list; without
it, browser wallets and Coinbase Wallet are offered and WalletConnect simply is
not.

`npm run generate:assets` refreshes the token and feed tables from the public
registries. `npm run generate:mark` derives the white logo mark and the favicons
from `assets/depth-logo.png`.

## Layout

| Path | What lives there |
|---|---|
| `app/` | routes: landing, `/board`, `/docs`, `/app` console |
| `components/` | hero, sections, console, wallet |
| `lib/` | the pure logic — valuation, status classification, snapshot reads, adapter ABI and preview rules |
| `test/` | unit tests for everything in `lib/` |
| `docs/` | the design spec, the visual brief and the implementation plans |

The rules the product argues about live in `lib/` as pure functions with tests,
not in components: [`valuation.ts`](lib/valuation.ts) for the four ways to value
a position, [`status.ts`](lib/status.ts) for the off-chain classifier, and
[`adapterPreview.ts`](lib/adapterPreview.ts) for what the console may claim
before a contract exists.
