# Depth `/app` Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the interactive console at `/app` — wallet connection, adapter list with deploy, adapter detail with `commit()`, collateral calculator, integration snippet — written against the final product interface so that mainnet day changes one address in `lib/deployments.ts` and nothing else.

**Architecture:** Server shells render market truth from the existing cached `readSnapshot()`; client islands own the wallet, adapter reads and transactions. Every transaction button routes through one `TxButton` and one `useDeployment()` hook, so "the factory is not on chain yet" lives in exactly one place.

**Tech Stack:** Next.js 16.3.4 (App Router, Turbopack), React 19.2, TypeScript 7, Tailwind v4, viem 2, **wagmi 3.7.7**, @tanstack/react-query 5, vitest 5.

**Spec:** `docs/superpowers/specs/2026-09-09-app-console-design.md` (parent: `docs/superpowers/specs/2026-09-09-corporate-action-firewall-design.md`; visual authority: `docs/hero-brief-2.md`)

## Global Constraints

- **Project root is `C:\Users\chaiz\Desktop\ca-firewall`.** Never write into `C:\Users\chaiz\Desktop\robinhood` — a different project owned by another agent.
- **wagmi is v3, not v2.** The API differs from most training data. Verified against the official v3 docs:
  - `useAccount` no longer exists → **`useConnection()`**, returning `{ address, addresses, chain, chainId, connector, status, isConnected, isConnecting, isReconnecting, isDisconnected }`.
  - Mutation hooks expose **`mutate` / `mutateAsync`**, never action-named functions. `useConnect().mutate({ connector })`, `useDisconnect().mutate()`, `useSwitchChain().mutate({ chainId })`, `useWriteContract().mutate({ abi, address, functionName, args })`.
  - Connector and chain lists moved out of those hooks: **`useConnectors()`**, `useConnections()`, `useChains()`.
  - `useReadContracts`, `useWaitForTransactionReceipt` keep their v2 names and shapes.
  - `multiInjectedProviderDiscovery` (EIP-6963) defaults to `true`.
- **Exactly two new dependencies:** `wagmi` and `@tanstack/react-query`. No wallet-modal library, no WalletConnect (its `projectId` requires registering an external account on the user's behalf, which is out of scope).
- **All user-visible strings live in `content/copy.en.ts`.** The one established exception is status vocabulary, which lives beside its module (`lib/status.ts` already does this); `lib/adapterStatus.ts` follows that precedent.
- **Language is English** for everything a visitor can read.
- **Colour rule (brief §11.3 / §6.3):** outside the hero object the only permitted colours are `--color-up` (`#4ADE80`) and `--color-down` (`#F87171`) **on a number or arrow only**, and the amber status dot. No red panels, no coloured error backgrounds. An error is text plus a status dot.
- **Two radii only:** `14px` on cards, `var(--radius-pill)` on buttons. **Two font weights only:** 400 and 600.
- **Honesty rule:** never render an invented address, price, or hash. When a value does not exist yet, render an explicit reason, never `0`, `—` alone, or a plausible placeholder.
- **The landing navbar is not touched.** Brief §6.2 fixes it at five items with chevrons on items 2 and 5.
- **`lib/adapterAbi.ts` is a commitment.** It is the interface Stage 2 must implement. Do not "simplify" a signature to make a screen easier.
- Before writing the first line of code, read the relevant guide under `node_modules/next/dist/docs/` — this Next.js has breaking changes relative to common knowledge. Confirmed already: dynamic route `params` and `searchParams` are **Promises** and must be awaited.
- Every task ends with `npx tsc --noEmit` clean, `npm test` green, and `npm run build` succeeding.

---

### Task 1: Dependencies, chain constant, wallet provider, `/app` shell

**Files:**
- Modify: `package.json`
- Modify: `lib/chain.ts`
- Modify: `lib/snapshot.ts:12-27` (tighten two field types)
- Create: `lib/wagmi.ts`
- Create: `components/wallet/useMounted.ts`
- Create: `components/wallet/WalletProvider.tsx`
- Create: `app/app/layout.tsx`
- Create: `app/app/page.tsx`

**Interfaces:**
- Consumes: `robinhoodChain` from `lib/chain.ts`.
- Produces: `ACTIVE_CHAIN_ID: number` (`lib/chain.ts`), `wagmiConfig` (`lib/wagmi.ts`), `useMounted(): boolean`, `<WalletProvider>`, and `FeedRow.token` / `FeedRow.feed` typed as `` `0x${string}` ``.

- [ ] **Step 1: Install the two dependencies**

```bash
cd /c/Users/chaiz/Desktop/ca-firewall
npm install wagmi@^3.7.7 @tanstack/react-query@^5.102.8
```

Expected: installs without peer-dependency errors. wagmi 3 requires `viem 2.x` (already present) and `typescript >=5.9.3` (project is on 7.x).

- [ ] **Step 2: Add the console's single chain constant**

Append to `lib/chain.ts`, after the `robinhoodChain` definition and before `publicClient`:

```ts
/**
 * The only chain the console reads from and writes to.
 *
 * Testnet 46630 is deliberately absent: `lib/assets.generated.ts` is a mainnet
 * asset table, so there would be nothing to display there. Stage 3 verifies on
 * testnet from Foundry, not from this UI.
 */
export const ACTIVE_CHAIN_ID = robinhoodChain.id
```

- [ ] **Step 3: Tighten the two address fields on `FeedRow`**

In `lib/snapshot.ts`, change these two lines inside `export interface FeedRow`:

```ts
  token: string
  feed: string
```

to:

```ts
  token: `0x${string}`
  feed: `0x${string}`
```

Rationale: the values already come from `AssetRow`, which is typed that way. Narrowing here removes a cast at every wagmi call site and cannot break existing consumers, since `` `0x${string}` `` is assignable to `string`.

- [ ] **Step 4: Create the wagmi config**

Create `lib/wagmi.ts`:

```ts
import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { robinhoodChain } from '@/lib/chain'

/**
 * EIP-6963 discovery is on by default and supplies one connector per installed
 * wallet, with its own name and icon. The `injected` connector below is only a
 * fallback for browsers that expose `window.ethereum` without announcing it;
 * `pickWallets` in lib/connectors.ts keeps it from showing as a duplicate.
 */
export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [injected()],
  transports: {
    [robinhoodChain.id]: http(),
  },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
```

- [ ] **Step 5: Create the hydration guard**

Create `components/wallet/useMounted.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'

/**
 * True only after the first client render. Wallet state cannot exist on the
 * server, so every component that branches on it renders its resting state
 * until this flips — otherwise the server and client disagree on first paint.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
```

- [ ] **Step 6: Create the provider**

Create `components/wallet/WalletProvider.tsx`:

```tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from '@/lib/wagmi'

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Created in state, not at module scope: a module-level client would be
  // shared across requests on the server.
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
```

- [ ] **Step 7: Create the `/app` shell**

Create `app/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { WalletProvider } from '@/components/wallet/WalletProvider'

export const metadata: Metadata = {
  title: 'Depth — console',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-ink-800">
        <main className="mx-auto max-w-[1132px] px-6 pb-32 pt-[112px]">{children}</main>
      </div>
    </WalletProvider>
  )
}
```

Create `app/app/page.tsx`:

```tsx
export default function AppPage() {
  return <h1 className="text-[40px] font-semibold tracking-[-0.02em]">Console</h1>
}
```

- [ ] **Step 8: Verify the build**

```bash
cd /c/Users/chaiz/Desktop/ca-firewall && npx tsc --noEmit && npm test && npm run build
```

Expected: no type errors, existing tests still pass, build succeeds and lists `/app` among the routes.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json lib/chain.ts lib/snapshot.ts lib/wagmi.ts components/wallet app/app
git commit -m "feat: wallet provider and the /app shell"
```

---

### Task 2: The valuation library

**Files:**
- Create: `lib/valuation.ts`
- Test: `test/valuation.test.ts`

**Interfaces:**
- Produces: `valuate(input: ValuationInput): Valuation`, `valuationError(v: Valuation, c: Convention): bigint`, and the types `ValuationInput`, `Valuation`, `Convention` (`'correct' | 'doubleCounted' | 'unadjusted'`). All money is USD with 18 decimals.

**Domain note for the implementer:** a Chainlink Robinhood feed publishes the price of **one raw token**, already carrying the ERC-8056 multiplier. The token's UI balance is `balanceOf() × uiMultiplier / 1e18`. Therefore `balanceOf() × Chainlink` is the correct value; `balanceOfUI() × Chainlink` applies the multiplier twice; and `balanceOf() × REST quote` (the unadjusted share price, which equals `Chainlink / uiMultiplier`) never applies it at all.

- [ ] **Step 1: Write the failing test**

Create `test/valuation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { valuate, valuationError } from '@/lib/valuation'

const WAD = 10n ** 18n

/** One whole token of a $364.78 stock, feed at 8 decimals, multiplier 1.0. */
const base = {
  rawBalance: WAD,
  tokenDecimals: 18,
  price: 36_478n * 10n ** 6n,
  priceDecimals: 8,
  uiMultiplier: WAD,
}

describe('valuate', () => {
  it('agrees with itself when the multiplier is 1.0', () => {
    const v = valuate(base)
    expect(v.correct).toBe(36_478n * 10n ** 16n)
    expect(v.doubleCounted).toBe(v.correct)
    expect(v.unadjusted).toBe(v.correct)
  })

  it('applies the multiplier twice on the balanceOfUI path', () => {
    const v = valuate({ ...base, uiMultiplier: 4n * WAD })
    expect(v.doubleCounted).toBe(v.correct * 4n)
  })

  it('drops the multiplier entirely on the REST-price path', () => {
    const v = valuate({ ...base, uiMultiplier: 4n * WAD })
    expect(v.unadjusted).toBe(v.correct / 4n)
  })

  it('handles a fractional balance', () => {
    const v = valuate({ ...base, rawBalance: WAD / 2n })
    expect(v.correct).toBe(36_478n * 10n ** 16n / 2n)
  })

  it('returns zero for a zero balance', () => {
    const v = valuate({ ...base, rawBalance: 0n })
    expect(v).toEqual({ correct: 0n, doubleCounted: 0n, unadjusted: 0n })
  })

  it('refuses a non-positive multiplier rather than dividing by zero', () => {
    expect(() => valuate({ ...base, uiMultiplier: 0n })).toThrow()
  })
})

describe('valuationError', () => {
  it('is zero for the correct convention', () => {
    expect(valuationError(valuate(base), 'correct')).toBe(0n)
  })

  it('is the signed overstatement for the double-counted convention', () => {
    const v = valuate({ ...base, uiMultiplier: 4n * WAD })
    expect(valuationError(v, 'doubleCounted')).toBe(v.correct * 3n)
  })

  it('is the signed understatement for the unadjusted convention', () => {
    const v = valuate({ ...base, uiMultiplier: 4n * WAD })
    expect(valuationError(v, 'unadjusted')).toBe(-(v.correct * 3n) / 4n)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /c/Users/chaiz/Desktop/ca-firewall && npx vitest run test/valuation.test.ts`
Expected: FAIL — cannot resolve `@/lib/valuation`.

- [ ] **Step 3: Write the implementation**

Create `lib/valuation.ts`:

```ts
const WAD = 10n ** 18n

export interface ValuationInput {
  /** Raw ERC-20 balance — what balanceOf() returns, before any UI multiplier. */
  rawBalance: bigint
  /** Token decimals. Robinhood stock tokens use 18. */
  tokenDecimals: number
  /** Chainlink answer: the price of ONE RAW token, multiplier already applied. */
  price: bigint
  /** Decimals of the Chainlink answer. Every Robinhood feed uses 8. */
  priceDecimals: number
  /** ERC-8056 uiMultiplier, 18 decimals. 1e18 = 1.0. */
  uiMultiplier: bigint
}

export interface Valuation {
  /** balanceOf() x Chainlink — the correct answer. USD, 18 decimals. */
  correct: bigint
  /** balanceOfUI() x Chainlink — the multiplier lands twice. */
  doubleCounted: bigint
  /** balanceOf() x the unadjusted REST quote — the multiplier never lands. */
  unadjusted: bigint
}

export type Convention = 'correct' | 'doubleCounted' | 'unadjusted'

export function valuate(i: ValuationInput): Valuation {
  if (i.uiMultiplier <= 0n) {
    throw new Error('uiMultiplier must be positive')
  }

  const correct =
    (i.rawBalance * i.price * WAD) /
    (10n ** BigInt(i.tokenDecimals) * 10n ** BigInt(i.priceDecimals))

  return {
    correct,
    // balanceOfUI() is balanceOf() scaled by the multiplier, so pairing it with
    // a feed price that already carries the multiplier applies it a second time.
    doubleCounted: (correct * i.uiMultiplier) / WAD,
    // The REST quote is the underlying share price: Chainlink / uiMultiplier.
    unadjusted: (correct * WAD) / i.uiMultiplier,
  }
}

/** Signed dollar error a protocol takes on by using `convention`. 18 decimals. */
export function valuationError(v: Valuation, convention: Convention): bigint {
  return v[convention] - v.correct
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /c/Users/chaiz/Desktop/ca-firewall && npx vitest run test/valuation.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/valuation.ts test/valuation.test.ts
git commit -m "feat: convention-matrix valuation with exact bigint maths"
```

---

### Task 3: Late-bound deployment config and its state machine

**Files:**
- Create: `lib/deployments.ts`
- Create: `lib/deployment-state.ts`
- Test: `test/deployment-state.test.ts`

**Interfaces:**
- Consumes: `ACTIVE_CHAIN_ID` from `lib/chain.ts`.
- Produces: `Deployment`, `DEPLOYMENTS`, `deploymentFor(chainId: number)`, `DeploymentState`, `resolveDeployment(input: ResolveInput): DeploymentState`, `canTransact(s: DeploymentState): boolean`.

- [ ] **Step 1: Write the failing test**

Create `test/deployment-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { canTransact, resolveDeployment } from '@/lib/deployment-state'

const factory = '0x1111111111111111111111111111111111111111' as const
const deployment = { factory, deployedAtBlock: 42n }

describe('resolveDeployment', () => {
  it('reports an unsupported chain when the config has no entry at all', () => {
    expect(
      resolveDeployment({ deployment: undefined, probeOk: false, probePending: false }),
    ).toEqual({ kind: 'unsupported' })
  })

  it('reports unconfigured when the chain is known but the factory is not deployed', () => {
    expect(
      resolveDeployment({ deployment: null, probeOk: false, probePending: false }),
    ).toEqual({ kind: 'unconfigured' })
  })

  it('reports checking while the probe is in flight', () => {
    expect(resolveDeployment({ deployment, probeOk: false, probePending: true })).toEqual({
      kind: 'checking',
      factory,
    })
  })

  it('reports absent when the config claims a factory the chain does not answer for', () => {
    expect(resolveDeployment({ deployment, probeOk: false, probePending: false })).toEqual({
      kind: 'absent',
      factory,
    })
  })

  it('reports live when the factory answers a view call', () => {
    expect(resolveDeployment({ deployment, probeOk: true, probePending: false })).toEqual({
      kind: 'live',
      factory,
      deployedAtBlock: 42n,
    })
  })
})

describe('canTransact', () => {
  it('permits transactions only against a live factory', () => {
    expect(canTransact({ kind: 'live', factory, deployedAtBlock: 42n })).toBe(true)
    expect(canTransact({ kind: 'absent', factory })).toBe(false)
    expect(canTransact({ kind: 'checking', factory })).toBe(false)
    expect(canTransact({ kind: 'unconfigured' })).toBe(false)
    expect(canTransact({ kind: 'unsupported' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /c/Users/chaiz/Desktop/ca-firewall && npx vitest run test/deployment-state.test.ts`
Expected: FAIL — cannot resolve `@/lib/deployment-state`.

- [ ] **Step 3: Write the deployment config**

Create `lib/deployments.ts`:

```ts
import type { Address } from 'viem'
import { ACTIVE_CHAIN_ID } from '@/lib/chain'

export interface Deployment {
  /** AdapterFactory address. */
  factory: Address
  /** Block the factory was deployed at — provenance for the explorer link. */
  deployedAtBlock: bigint
}

/**
 * THE ONLY LATE-BOUND VALUE IN THE CONSOLE.
 *
 * `null` means the factory is not on chain yet. On mainnet day this entry
 * becomes `{ factory: '0x…', deployedAtBlock: …n }` and every screen under /app
 * comes alive. Nothing else in the codebase should need to change; if it does,
 * the design spec has been violated.
 *
 * Nothing else belongs in this file — no ABIs, no parameters, no adapter
 * addresses. Adapter addresses are computed by the factory itself.
 */
export const DEPLOYMENTS: Partial<Record<number, Deployment | null>> = {
  [ACTIVE_CHAIN_ID]: null,
}

/** `null` = known chain, no factory. `undefined` = a chain we do not serve. */
export function deploymentFor(chainId: number): Deployment | null | undefined {
  return DEPLOYMENTS[chainId]
}
```

- [ ] **Step 4: Write the state machine**

Create `lib/deployment-state.ts`:

```ts
import type { Address } from 'viem'
import type { Deployment } from '@/lib/deployments'

export type DeploymentState =
  | { kind: 'unsupported' }
  | { kind: 'unconfigured' }
  | { kind: 'checking'; factory: Address }
  | { kind: 'absent'; factory: Address }
  | { kind: 'live'; factory: Address; deployedAtBlock: bigint }

export interface ResolveInput {
  /** `null`: known chain, factory not deployed. `undefined`: chain we do not serve. */
  deployment: Deployment | null | undefined
  /** True when the factory answered a view call. */
  probeOk: boolean
  probePending: boolean
}

/**
 * A flag in a file is not evidence. The console probes the configured address
 * with a real view call, so `live` means "our factory is there", not merely
 * "some code is there". A config that disagrees with the chain becomes `absent`
 * — a loud state — rather than a silent deploy into nothing.
 */
export function resolveDeployment(i: ResolveInput): DeploymentState {
  if (i.deployment === undefined) return { kind: 'unsupported' }
  if (i.deployment === null) return { kind: 'unconfigured' }

  const { factory, deployedAtBlock } = i.deployment
  if (i.probePending) return { kind: 'checking', factory }
  if (!i.probeOk) return { kind: 'absent', factory }
  return { kind: 'live', factory, deployedAtBlock }
}

/** True when a transaction against the factory or an adapter can be sent at all. */
export function canTransact(state: DeploymentState): boolean {
  return state.kind === 'live'
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd /c/Users/chaiz/Desktop/ca-firewall && npx vitest run test/deployment-state.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/deployments.ts lib/deployment-state.ts test/deployment-state.test.ts
git commit -m "feat: single late-bound deployment config with a probed state machine"
```

---

### Task 4: The Stage-2 interface, adapter status vocabulary, and two client helpers

**Files:**
- Create: `lib/adapterAbi.ts`
- Create: `lib/adapterStatus.ts`
- Create: `lib/connectors.ts`
- Create: `lib/txError.ts`
- Test: `test/adapterStatus.test.ts`
- Test: `test/connectors.test.ts`
- Test: `test/txError.test.ts`

**Interfaces:**
- Produces: `adapterFactoryAbi`, `stockOracleAdapterAbi`, `ADAPTER_STATUSES`, `AdapterStatus`, `adapterStatusFromEnum(value: number): AdapterStatus | null`, `ADAPTER_STATUS_LABEL`, `ADAPTER_STATUS_NOTE`, `pickWallets(connectors)`, `WalletChoice`, `isUserRejection(error: unknown): boolean`, `txErrorMessage(error: unknown, fallback: string): string`.

- [ ] **Step 1: Write the ABIs**

Create `lib/adapterAbi.ts`:

```ts
/**
 * THE INTERFACE STAGE 2 MUST IMPLEMENT.
 *
 * The console is written against this today so that mainnet day changes only
 * lib/deployments.ts. Changing a signature here means changing the contracts and
 * the design spec together — see
 * docs/superpowers/specs/2026-09-09-app-console-design.md §1 and §5.5.
 */

export const adapterFactoryAbi = [
  {
    type: 'function',
    name: 'computeAddress',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'feed', type: 'address' },
    ],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isDeployed',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'feed', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deploy',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'feed', type: 'address' },
    ],
    outputs: [{ type: 'address' }],
    stateMutability: 'nonpayable',
  },
  // The factory is immutable and IS the canonical parameter set: adapter
  // addresses depend on (token, feed) alone. The console reads these rather
  // than holding a second copy that could silently drift.
  {
    type: 'function',
    name: 'quietAfter',
    inputs: [],
    outputs: [{ type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'protectionBudget',
    inputs: [],
    outputs: [{ type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'continuityBps',
    inputs: [],
    outputs: [{ type: 'uint32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'sequencerFeed',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
] as const

export const stockOracleAdapterAbi = [
  {
    type: 'function',
    name: 'latestRoundData',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'status',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'observedAt',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'heldAnswer',
    inputs: [],
    outputs: [{ type: 'int256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'protectionEndsAt',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'committedAt',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'valueOf',
    inputs: [{ name: 'rawAmount', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'valueOfUI',
    inputs: [{ name: 'uiAmount', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'commit',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'token',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'feed',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
] as const
```

- [ ] **Step 2: Write the failing tests for the three helpers**

Create `test/adapterStatus.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  ADAPTER_STATUSES,
  ADAPTER_STATUS_LABEL,
  ADAPTER_STATUS_NOTE,
  adapterStatusFromEnum,
} from '@/lib/adapterStatus'

describe('adapterStatusFromEnum', () => {
  it('maps the Solidity enum by declaration order', () => {
    expect(adapterStatusFromEnum(0)).toBe('NORMAL')
    expect(adapterStatusFromEnum(3)).toBe('DESYNC')
    expect(adapterStatusFromEnum(6)).toBe('UNSAFE')
  })

  it('returns null for a value the interface does not define', () => {
    expect(adapterStatusFromEnum(7)).toBeNull()
    expect(adapterStatusFromEnum(-1)).toBeNull()
  })
})

describe('status vocabulary', () => {
  it('gives every status a label and a note', () => {
    for (const status of ADAPTER_STATUSES) {
      expect(ADAPTER_STATUS_LABEL[status]).toBeTruthy()
      expect(ADAPTER_STATUS_NOTE[status]).toBeTruthy()
    }
  })

  it('covers all seven states of the interface', () => {
    expect(ADAPTER_STATUSES).toHaveLength(7)
  })
})
```

Create `test/connectors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { pickWallets } from '@/lib/connectors'

const fallback = { id: 'injected', name: 'Browser Wallet', type: 'injected' }
const rabby = { id: 'io.rabby', name: 'Rabby', type: 'injected', icon: 'data:image/svg+xml,x' }
const metamask = { id: 'io.metamask', name: 'MetaMask', type: 'injected' }

describe('pickWallets', () => {
  it('hides the generic fallback when EIP-6963 discovered real wallets', () => {
    expect(pickWallets([fallback, rabby, metamask]).map((w) => w.id)).toEqual([
      'io.rabby',
      'io.metamask',
    ])
  })

  it('keeps the fallback when discovery found nothing', () => {
    expect(pickWallets([fallback]).map((w) => w.id)).toEqual(['injected'])
  })

  it('carries the icon through when the wallet announced one', () => {
    expect(pickWallets([fallback, rabby])[0].icon).toBe('data:image/svg+xml,x')
  })

  it('returns an empty list when no connector exists at all', () => {
    expect(pickWallets([])).toEqual([])
  })
})
```

Create `test/txError.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isUserRejection, txErrorMessage } from '@/lib/txError'

describe('isUserRejection', () => {
  it('recognises the viem error by name', () => {
    expect(isUserRejection({ name: 'UserRejectedRequestError' })).toBe(true)
  })

  it('recognises the EIP-1193 code nested in the cause chain', () => {
    expect(isUserRejection({ name: 'ContractFunctionExecutionError', cause: { code: 4001 } })).toBe(
      true,
    )
  })

  it('does not mistake a revert for a rejection', () => {
    expect(isUserRejection({ name: 'ContractFunctionRevertedError' })).toBe(false)
  })

  it('tolerates null and primitives', () => {
    expect(isUserRejection(null)).toBe(false)
    expect(isUserRejection('boom')).toBe(false)
  })
})

describe('txErrorMessage', () => {
  it('prefers viem shortMessage', () => {
    expect(txErrorMessage({ shortMessage: 'Execution reverted.', message: 'long' }, 'fb')).toBe(
      'Execution reverted.',
    )
  })

  it('falls back to the first line of message', () => {
    expect(txErrorMessage({ message: 'first line\nsecond line' }, 'fb')).toBe('first line')
  })

  it('uses the supplied fallback for anything unreadable', () => {
    expect(txErrorMessage(undefined, 'Transaction failed.')).toBe('Transaction failed.')
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd /c/Users/chaiz/Desktop/ca-firewall && npx vitest run test/adapterStatus.test.ts test/connectors.test.ts test/txError.test.ts`
Expected: FAIL — three unresolved modules.

- [ ] **Step 4: Write the three helpers**

Create `lib/adapterStatus.ts`:

```ts
/**
 * The adapter's on-chain Status enum. Order is load-bearing: Solidity encodes
 * enums as uint8 by declaration order, and this array must match the order in
 * IStockOracleAdapter exactly.
 *
 * Kept beside its module rather than in content/copy.en.ts, following the
 * precedent set by lib/status.ts for the off-chain classifier.
 */
export const ADAPTER_STATUSES = [
  'NORMAL',
  'OFF_HOURS',
  'CORPORATE_ACTION',
  'DESYNC',
  'TOKEN_HALTED',
  'SEQUENCER_DOWN',
  'UNSAFE',
] as const

export type AdapterStatus = (typeof ADAPTER_STATUSES)[number]

export function adapterStatusFromEnum(value: number): AdapterStatus | null {
  if (!Number.isInteger(value) || value < 0 || value >= ADAPTER_STATUSES.length) return null
  return ADAPTER_STATUSES[value]
}

export const ADAPTER_STATUS_LABEL: Record<AdapterStatus, string> = {
  NORMAL: 'Normal',
  OFF_HOURS: 'Quiet',
  CORPORATE_ACTION: 'Corporate action',
  DESYNC: 'Desync',
  TOKEN_HALTED: 'Token halted',
  SEQUENCER_DOWN: 'Sequencer down',
  UNSAFE: 'Unsafe',
}

export const ADAPTER_STATUS_NOTE: Record<AdapterStatus, string> = {
  NORMAL: 'The feed is fresh and no corporate action is in progress. The price passes through.',
  OFF_HOURS:
    'The feed is silent but every flag is clean and the continuity invariant holds. Equities trade 24/5; this chain runs 24/7. The last price stands.',
  CORPORATE_ACTION:
    'The oracle is paused or a multiplier change is staged. The adapter serves the price held from before the window opened.',
  DESYNC:
    'The continuity invariant broke: the price moved against the multiplier in a way a split cannot explain. The held price stands regardless of any flag.',
  TOKEN_HALTED: 'Transfers on the token contract are paused. The held price stands.',
  SEQUENCER_DOWN:
    'Dormant. No sequencer uptime feed exists on this chain, so the check is disabled unless one is supplied at construction.',
  UNSAFE:
    'The protection budget is exhausted. The adapter reverts. Breaking loudly beats lying quietly.',
}
```

Create `lib/connectors.ts`:

```ts
export interface WalletChoice {
  id: string
  name: string
  icon?: string
}

interface ConnectorLike {
  id: string
  name: string
  type: string
  icon?: string
}

/**
 * EIP-6963 gives one connector per installed wallet, each announcing its own
 * name and icon. The configured `injected` fallback only exists for browsers
 * that expose `window.ethereum` without announcing it — listing it beside the
 * discovered wallets would show the same wallet twice, so it appears only when
 * discovery found nothing.
 */
export function pickWallets(connectors: readonly ConnectorLike[]): WalletChoice[] {
  const discovered = connectors.filter((c) => c.id !== 'injected')
  const source = discovered.length > 0 ? discovered : connectors
  return source.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))
}
```

Create `lib/txError.ts`:

```ts
/** How deep to walk a viem error's cause chain before giving up. */
const MAX_DEPTH = 5

/**
 * A user closing the wallet prompt is not a failure and must not be rendered as
 * one. viem surfaces it as UserRejectedRequestError, sometimes only as the
 * EIP-1193 code 4001 somewhere down the cause chain.
 */
export function isUserRejection(error: unknown): boolean {
  let node: unknown = error
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (typeof node !== 'object' || node === null) return false
    const record = node as { name?: unknown; code?: unknown; cause?: unknown }
    if (record.name === 'UserRejectedRequestError' || record.code === 4001) return true
    node = record.cause
  }
  return false
}

/** The shortest honest sentence about a failed transaction. No interpretation. */
export function txErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const record = error as { shortMessage?: unknown; message?: unknown }
    if (typeof record.shortMessage === 'string' && record.shortMessage.length > 0) {
      return record.shortMessage
    }
    if (typeof record.message === 'string' && record.message.length > 0) {
      return record.message.split('\n')[0]
    }
  }
  return fallback
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd /c/Users/chaiz/Desktop/ca-firewall && npx vitest run && npx tsc --noEmit`
Expected: all suites PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add lib/adapterAbi.ts lib/adapterStatus.ts lib/connectors.ts lib/txError.ts test/adapterStatus.test.ts test/connectors.test.ts test/txError.test.ts
git commit -m "feat: stage-2 adapter interface, status vocabulary and client helpers"
```

---

### Task 5: Copy strings, action button, connect modal, connect button, console nav

**Files:**
- Modify: `content/copy.en.ts`
- Create: `components/ui/buttonStyles.ts`
- Modify: `components/ui/Button.tsx`
- Create: `components/ui/ActionButton.tsx`
- Create: `components/wallet/ConnectModal.tsx`
- Create: `components/wallet/ConnectButton.tsx`
- Create: `components/app/AppNav.tsx`
- Modify: `app/app/layout.tsx`

**Interfaces:**
- Consumes: `pickWallets` (Task 4), `useMounted`, `ACTIVE_CHAIN_ID`, `shortAddress` from `lib/format.ts`.
- Produces: `copy.app.*`, `<ActionButton>`, `<ConnectButton />`, `<AppNav />`, `buttonBase` and `buttonVariants`.

- [ ] **Step 1: Add the console copy block**

In `content/copy.en.ts`, insert this key inside the top-level `copy` object, after `sections` and before `footer`:

```ts
  app: {
    title: 'Console',
    lede: 'Deploy an adapter, watch what it would hold, and see what a convention mistake costs. Market data is live from Robinhood Chain mainnet; adapter data appears when the contracts are on chain.',
    nav: [
      { label: 'Adapters', href: '/app' },
      { label: 'Calculator', href: '/app/calculator' },
      { label: 'Live data', href: '/board' },
      { label: 'Docs', href: '/docs' },
    ],
    wallet: {
      connect: 'Connect wallet',
      switch: 'Switch network',
      disconnect: 'Disconnect',
      modalTitle: 'Connect a wallet',
      modalNote:
        'Browser wallets only. Depth never asks for a signature to read data — a wallet is needed solely to send the permissionless deploy and commit transactions.',
      none: 'No wallet extension announced itself in this browser.',
      noneCta: 'Install a browser wallet',
      noneHref: 'https://ethereum.org/en/wallets/find-wallet/',
      close: 'Close',
    },
    blocked: {
      notConnected: 'Connect a wallet to send this transaction.',
      wrongNetwork: 'Switch to Robinhood Chain to send this transaction.',
      notDeployed: 'AdapterFactory is not deployed yet.',
      checking: 'Checking the factory on chain…',
      absent: 'The configured factory address holds no factory. Nothing will be sent.',
      unsupported: 'This network is not served by Depth.',
    },
    tx: {
      confirm: 'Confirm in your wallet…',
      pending: 'Pending…',
      done: 'Done',
      failed: 'Transaction failed.',
    },
    notDeployed: {
      heading: 'The adapter contracts are not on chain yet',
      body: 'Every control on this page is written against the final interface. When AdapterFactory is deployed, one address in lib/deployments.ts changes and these controls come alive. Until then the market data is live and the adapter columns read as unavailable rather than as zero.',
    },
    list: {
      heading: 'Adapters',
      lede: 'One adapter per token-and-feed pair. Addresses are deterministic: the factory derives them, so nobody can substitute a different contract at the same address.',
      columns: {
        ticker: 'Ticker',
        offchain: 'Off-chain status',
        age: 'Price age',
        adapter: 'Adapter',
        action: '',
      },
      deploy: 'Deploy',
      deployed: 'Deployed',
      factoryLabel: 'Factory',
      paramQuiet: 'quiet after',
      paramBudget: 'protection budget',
      paramContinuity: 'continuity tolerance',
      paramSequencer: 'sequencer feed',
      sequencerDisabled: 'disabled (none exists on this chain)',
      addressPending: 'Available once the factory is deployed',
      openDetail: 'Open',
    },
    detail: {
      backLabel: 'All adapters',
      livePrice: 'Live feed price',
      livePriceSource: 'Chainlink, on chain',
      heldPrice: 'Held price',
      heldPriceNote: 'What the adapter would serve inside a protection window.',
      budget: 'Protection budget remaining',
      budgetNote: 'When this reaches zero the adapter reverts rather than keep holding.',
      multiplier: 'uiMultiplier',
      stagedMultiplier: 'Staged multiplier',
      multiplierNote: 'A difference between these two is a corporate action in progress.',
      onchainStatus: 'Adapter status (on chain)',
      offchainStatus: 'Classified off chain',
      offchainNote: 'The same rules the adapter applies, run against live data by this site.',
      commit: 'Commit snapshot',
      commitNote:
        'Permissionless and grants nothing. The continuity invariant compares the current round against this snapshot, so its freshness is what the check depends on.',
      committedAt: 'Snapshot age',
      unavailable: 'Not available until the adapter is deployed',
      calculatorLink: 'Open this asset in the calculator',
    },
    calculator: {
      heading: 'What a convention mistake costs',
      lede: 'The same balance, valued three ways. Two of them are wrong, and neither reverts.',
      asset: 'Asset',
      amount: 'Token amount',
      convention: 'The convention your protocol uses',
      correct: 'balanceOf() x Chainlink',
      doubleCounted: 'balanceOfUI() x Chainlink',
      unadjusted: 'balanceOf() x REST quote',
      correctVerdict: 'Correct',
      doubleCountedVerdict: 'Multiplier applied twice',
      unadjustedVerdict: 'Multiplier never applied',
      error: 'Error against the correct valuation',
      exact: 'Both wrong conventions agree with the correct one while the multiplier is 1.0. They diverge the moment a corporate action lands.',
    },
    snippet: {
      heading: 'Integration',
      lede: 'One address, changed through your existing oracle governance. No code change, no new audit surface.',
      copy: 'Copy',
      copied: 'Copied',
      gateHeading: 'Optional: gate new borrows',
      gateNote:
        'Liquidation protection needs no code change. Preventing new risk from being taken on a held price does, and it is three lines.',
      // The single copy of this snippet. app/docs/page.tsx reads it from here
      // too, so the two pages cannot drift apart.
      gateCode: [
        'require(',
        '  IStockOracleAdapter(oracle).status() == IStockOracleAdapter.Status.NORMAL,',
        '  "market not in normal state"',
        ');',
      ].join('\n'),
    },
  },
```

- [ ] **Step 2: Extract the shared button styles**

Create `components/ui/buttonStyles.ts`:

```ts
export type ButtonVariant = 'primary' | 'secondary' | 'text'

export const buttonBase = 'inline-flex items-center justify-center transition-colors duration-[160ms]'

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'rounded-[var(--radius-pill)] bg-white text-ink-900 hover:bg-[#EDEDED] active:scale-[.985] font-semibold',
  secondary:
    'rounded-[var(--radius-pill)] bg-white/[0.06] text-white hover:bg-white/[0.10] font-semibold',
  text: 'text-white underline decoration-white/25 hover:decoration-white underline-offset-4',
}
```

- [ ] **Step 3: Point `Button` at the shared styles**

Replace the whole of `components/ui/Button.tsx` with:

```tsx
import Link from 'next/link'
import { buttonBase, buttonVariants, type ButtonVariant } from '@/components/ui/buttonStyles'

export function Button({
  href,
  variant = 'primary',
  className = '',
  children,
}: {
  href: string
  variant?: ButtonVariant
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className={`${buttonBase} ${buttonVariants[variant]} ${className}`}>
      {children}
    </Link>
  )
}
```

- [ ] **Step 4: Add the action button**

Create `components/ui/ActionButton.tsx`:

```tsx
'use client'

import { buttonBase, buttonVariants, type ButtonVariant } from '@/components/ui/buttonStyles'

export function ActionButton({
  variant = 'primary',
  disabled = false,
  title,
  onClick,
  className = '',
  children,
}: {
  variant?: ButtonVariant
  disabled?: boolean
  /** Native tooltip carrying the reason a disabled button is disabled. */
  title?: string
  onClick?: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${buttonBase} ${buttonVariants[variant]} disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 5: Build the connect modal**

Create `components/wallet/ConnectModal.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useConnect, useConnectors } from 'wagmi'
import { copy } from '@/content/copy.en'
import { pickWallets } from '@/lib/connectors'

export function ConnectModal({ onClose }: { onClose: () => void }) {
  const connect = useConnect()
  const connectors = useConnectors()
  const wallets = pickWallets(connectors)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.app.wallet.modalTitle}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6 shadow-[0_24px_60px_rgba(0,0,0,.55)]"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-[17px] font-semibold">{copy.app.wallet.modalTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.app.wallet.close}
            className="text-fg-faint transition-colors hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" fill="none" />
            </svg>
          </button>
        </div>

        {wallets.length === 0 ? (
          <div className="mt-5">
            <p className="text-[15px] text-fg-muted">{copy.app.wallet.none}</p>
            <a
              href={copy.app.wallet.noneHref}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-[15px] text-white underline decoration-white/25 underline-offset-4 hover:decoration-white"
            >
              {copy.app.wallet.noneCta}
            </a>
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {wallets.map((wallet) => (
              <li key={wallet.id}>
                <button
                  type="button"
                  disabled={connect.isPending}
                  onClick={() => {
                    const connector = connectors.find((c) => c.id === wallet.id)
                    if (!connector) return
                    connect.mutate({ connector }, { onSuccess: onClose })
                  }}
                  className="flex w-full items-center gap-3 rounded-[14px] border border-[var(--color-glass-border)] bg-ink-800 px-4 py-3 text-left text-[15px] transition-colors duration-[160ms] hover:border-white/[0.14] hover:bg-ink-600 disabled:opacity-40"
                >
                  {wallet.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={wallet.icon} alt="" width={20} height={20} className="rounded-[4px]" />
                  ) : (
                    <span className="h-5 w-5 rounded-[4px] bg-white/[0.10]" />
                  )}
                  {wallet.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-5 text-[12px] text-fg-faint">{copy.app.wallet.modalNote}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Build the connect button (brief §6.3, three states)**

Create `components/wallet/ConnectButton.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useConnection, useDisconnect, useSwitchChain } from 'wagmi'
import { ConnectModal } from '@/components/wallet/ConnectModal'
import { useMounted } from '@/components/wallet/useMounted'
import { copy } from '@/content/copy.en'
import { ACTIVE_CHAIN_ID } from '@/lib/chain'
import { shortAddress } from '@/lib/format'

const pill =
  'inline-flex h-[38px] items-center gap-2 rounded-[var(--radius-pill)] px-4 text-[15px] font-semibold transition-colors duration-[160ms]'

export function ConnectButton() {
  const mounted = useMounted()
  const connection = useConnection()
  const switchChain = useSwitchChain()
  const disconnect = useDisconnect()
  const [open, setOpen] = useState(false)

  // Before hydration the wallet state is unknowable, so render the resting
  // state and let the client correct it.
  if (!mounted || connection.status !== 'connected') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${pill} bg-white text-ink-900 hover:bg-[#EDEDED]`}
        >
          {copy.app.wallet.connect}
        </button>
        {open && <ConnectModal onClose={() => setOpen(false)} />}
      </>
    )
  }

  if (connection.chainId !== ACTIVE_CHAIN_ID) {
    return (
      <button
        type="button"
        onClick={() => switchChain.mutate({ chainId: ACTIVE_CHAIN_ID })}
        className={`${pill} bg-white/[0.06] text-white hover:bg-white/[0.10]`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
        {copy.app.wallet.switch}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => disconnect.mutate()}
      title={copy.app.wallet.disconnect}
      className={`${pill} bg-white/[0.06] font-mono tabular-nums text-white hover:bg-white/[0.10]`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
      {shortAddress(connection.address)}
    </button>
  )
}
```

- [ ] **Step 7: Build the console nav**

Create `components/app/AppNav.tsx`:

```tsx
import Link from 'next/link'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { copy } from '@/content/copy.en'

export function AppNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--color-glass-border)] bg-ink-900/95 backdrop-blur">
      <div className="mx-auto flex h-[64px] max-w-[1132px] items-center gap-8 px-6">
        <Link href="/" className="text-[17px] font-semibold tracking-[0.02em] text-white">
          {copy.brand}
        </Link>

        <nav className="flex items-center gap-6 max-md:hidden">
          {copy.app.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-[15px] text-fg-muted transition-colors duration-[160ms] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto">
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 8: Mount the nav in the console layout**

In `app/app/layout.tsx`, add the import and render `<AppNav />` above `<main>`:

```tsx
import type { Metadata } from 'next'
import { AppNav } from '@/components/app/AppNav'
import { WalletProvider } from '@/components/wallet/WalletProvider'

export const metadata: Metadata = {
  title: 'Depth — console',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-ink-800">
        <AppNav />
        <main className="mx-auto max-w-[1132px] px-6 pb-32 pt-[112px]">{children}</main>
      </div>
    </WalletProvider>
  )
}
```

- [ ] **Step 9: Verify**

```bash
cd /c/Users/chaiz/Desktop/ca-firewall && npx tsc --noEmit && npm test && npm run build
```

Expected: clean. Then run `npm run dev`, open `/app`, and confirm: the wallet button renders as a white pill, clicking it opens the modal, Escape and the backdrop close it, and with no extension installed the modal shows the "no wallet announced itself" copy rather than an empty list.

- [ ] **Step 10: Commit**

```bash
git add content/copy.en.ts components/ui components/wallet components/app app/app/layout.tsx
git commit -m "feat: wallet connect button, custom modal and console nav"
```

---

### Task 6: The deployment hook, the not-deployed notice, and the one transaction button

**Files:**
- Create: `components/wallet/useDeployment.ts`
- Create: `components/app/NotDeployedNotice.tsx`
- Create: `components/app/TxButton.tsx`

**Interfaces:**
- Consumes: `resolveDeployment`, `canTransact`, `deploymentFor`, `adapterFactoryAbi`, `isUserRejection`, `txErrorMessage`, `ActionButton`, `useMounted`, `ACTIVE_CHAIN_ID`.
- Produces:
  - `useDeployment(): { state: DeploymentState; params: FactoryParams | null }` where `FactoryParams = { quietAfter: bigint; protectionBudget: bigint; continuityBps: number; sequencerFeed: Address }`.
  - `useBlockedReason(state: DeploymentState): string | null` — the single source of "why this button cannot be pressed".
  - `<NotDeployedNotice />`
  - `<TxButton label request blockedReason onSuccess? />` with `TxRequest = { address: Address; abi: Abi; functionName: string; args?: readonly unknown[] }`.

- [ ] **Step 1: Write the deployment hook**

Create `components/wallet/useDeployment.ts`:

```tsx
'use client'

import type { Address } from 'viem'
import { useConnection, useReadContracts } from 'wagmi'
import { useMounted } from '@/components/wallet/useMounted'
import { copy } from '@/content/copy.en'
import { adapterFactoryAbi } from '@/lib/adapterAbi'
import { ACTIVE_CHAIN_ID } from '@/lib/chain'
import { resolveDeployment, type DeploymentState } from '@/lib/deployment-state'
import { deploymentFor } from '@/lib/deployments'

export interface FactoryParams {
  quietAfter: bigint
  protectionBudget: bigint
  continuityBps: number
  sequencerFeed: Address
}

/**
 * The single place that answers "is the factory really there, and what is it
 * configured with". Every transaction button in the console goes through it, so
 * the pre-mainnet condition lives here instead of leaking into components.
 *
 * The probe is a real view call rather than a bytecode read: it proves our
 * factory is at that address, not merely that some code is.
 */
export function useDeployment(): { state: DeploymentState; params: FactoryParams | null } {
  const deployment = deploymentFor(ACTIVE_CHAIN_ID)
  const factory = deployment?.factory

  const probe = useReadContracts({
    allowFailure: true,
    contracts: factory
      ? ([
          { address: factory, abi: adapterFactoryAbi, functionName: 'quietAfter' },
          { address: factory, abi: adapterFactoryAbi, functionName: 'protectionBudget' },
          { address: factory, abi: adapterFactoryAbi, functionName: 'continuityBps' },
          { address: factory, abi: adapterFactoryAbi, functionName: 'sequencerFeed' },
        ] as const)
      : [],
    query: { enabled: Boolean(factory) },
  })

  const results = probe.data

  // Read one result at a time through a local, so TypeScript can narrow the
  // success/failure union. Narrowing through .every() or a chained index does
  // not survive, and casting past it would defeat the point of allowFailure.
  const valueAt = (index: number): unknown => {
    const entry = results?.[index]
    return entry && entry.status === 'success' ? entry.result : undefined
  }

  const quietAfter = valueAt(0)
  const protectionBudget = valueAt(1)
  const continuityBps = valueAt(2)
  const sequencerFeed = valueAt(3)

  const state = resolveDeployment({
    deployment,
    probeOk: quietAfter !== undefined,
    probePending: Boolean(factory) && probe.isPending,
  })

  const params: FactoryParams | null =
    state.kind === 'live' &&
    typeof quietAfter === 'bigint' &&
    typeof protectionBudget === 'bigint' &&
    typeof continuityBps === 'number' &&
    typeof sequencerFeed === 'string'
      ? {
          quietAfter,
          protectionBudget,
          continuityBps,
          sequencerFeed: sequencerFeed as Address,
        }
      : null

  return { state, params }
}

/**
 * Why a transaction cannot be sent right now, or null when it can.
 * Order matters: report the condition the user can act on first.
 */
export function useBlockedReason(state: DeploymentState): string | null {
  const mounted = useMounted()
  const connection = useConnection()

  if (!mounted || connection.status !== 'connected') return copy.app.blocked.notConnected
  if (connection.chainId !== ACTIVE_CHAIN_ID) return copy.app.blocked.wrongNetwork

  switch (state.kind) {
    case 'unsupported':
      return copy.app.blocked.unsupported
    case 'unconfigured':
      return copy.app.blocked.notDeployed
    case 'checking':
      return copy.app.blocked.checking
    case 'absent':
      return copy.app.blocked.absent
    case 'live':
      return null
  }
}
```

- [ ] **Step 2: Write the not-deployed notice**

Create `components/app/NotDeployedNotice.tsx`:

```tsx
import { copy } from '@/content/copy.en'

/**
 * The one place the pre-mainnet situation is explained in prose. Blocked
 * buttons carry a one-line reason; this carries the why.
 */
export function NotDeployedNotice() {
  return (
    <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
        <p className="text-[15px] font-semibold">{copy.app.notDeployed.heading}</p>
      </div>
      <p className="mt-3 max-w-[68ch] text-[15px] text-fg-muted">{copy.app.notDeployed.body}</p>
    </div>
  )
}
```

- [ ] **Step 3: Write the transaction button**

Create `components/app/TxButton.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import type { Abi, Address } from 'viem'
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { ActionButton } from '@/components/ui/ActionButton'
import { copy } from '@/content/copy.en'
import { isUserRejection, txErrorMessage } from '@/lib/txError'

export interface TxRequest {
  address: Address
  abi: Abi
  functionName: string
  args?: readonly unknown[]
}

/**
 * The only transaction lifecycle in the console. Every write goes through it, so
 * "confirm in wallet", "pending", "done" and "failed" look and behave the same
 * everywhere, and a blocked button always states its reason instead of vanishing.
 */
export function TxButton({
  label,
  request,
  blockedReason,
  variant = 'secondary',
  className = '',
  onSuccess,
}: {
  label: string
  /** null when there is nothing to send yet — always paired with a reason. */
  request: TxRequest | null
  blockedReason: string | null
  variant?: 'primary' | 'secondary'
  className?: string
  onSuccess?: () => void
}) {
  const write = useWriteContract()
  const receipt = useWaitForTransactionReceipt({
    hash: write.data,
    query: { enabled: Boolean(write.data) },
  })

  // A closed wallet prompt is not a failure; clear it rather than render it.
  useEffect(() => {
    if (write.error && isUserRejection(write.error)) write.reset()
  }, [write.error, write])

  useEffect(() => {
    if (receipt.status === 'success') onSuccess?.()
  }, [receipt.status, onSuccess])

  const blocked = blockedReason !== null || request === null
  const busy = write.isPending || (Boolean(write.data) && receipt.status === 'pending')

  let text = label
  if (write.isPending) text = copy.app.tx.confirm
  else if (busy) text = copy.app.tx.pending
  else if (receipt.status === 'success') text = copy.app.tx.done

  const failure =
    write.error && !isUserRejection(write.error)
      ? txErrorMessage(write.error, copy.app.tx.failed)
      : receipt.status === 'error'
        ? txErrorMessage(receipt.error, copy.app.tx.failed)
        : null

  return (
    <div className={className}>
      <ActionButton
        variant={variant}
        disabled={blocked || busy}
        title={blockedReason ?? undefined}
        onClick={() => {
          if (!request) return
          write.mutate({
            abi: request.abi,
            address: request.address,
            functionName: request.functionName,
            args: request.args,
          })
        }}
        className="h-[38px] px-4 text-[15px]"
      >
        {text}
      </ActionButton>

      {blockedReason && <p className="mt-2 text-[12px] text-fg-faint">{blockedReason}</p>}
      {failure && <p className="mt-2 text-[12px] text-fg-muted">{failure}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Verify**

```bash
cd /c/Users/chaiz/Desktop/ca-firewall && npx tsc --noEmit && npm test && npm run build
```

Expected: clean. `write.mutate` types accept a loose `Abi`; if TypeScript objects to the generic parameter, cast the request at the call site with `as never` only inside `TxButton` — never in a caller.

- [ ] **Step 5: Commit**

```bash
git add components/wallet/useDeployment.ts components/app/NotDeployedNotice.tsx components/app/TxButton.tsx
git commit -m "feat: one deployment hook and one transaction button for the whole console"
```

---

### Task 7: The adapter list with deploy

**Files:**
- Create: `components/app/AdapterList.tsx`
- Create: `components/app/DeployButton.tsx`
- Modify: `app/app/page.tsx`

**Interfaces:**
- Consumes: `readSnapshot`, `Snapshot`, `FeedRow` (with `` `0x${string}` `` addresses), `useDeployment`, `useBlockedReason`, `TxButton`, `NotDeployedNotice`, `StatusPill`, `formatAge`, `shortAddress`, `adapterFactoryAbi`.
- Produces: `<AdapterList initial={snapshot} />`, `<DeployButton token feed />`.

- [ ] **Step 1: Write the deploy button**

Create `components/app/DeployButton.tsx`:

```tsx
'use client'

import type { Address } from 'viem'
import { TxButton } from '@/components/app/TxButton'
import { useBlockedReason, useDeployment } from '@/components/wallet/useDeployment'
import { copy } from '@/content/copy.en'
import { adapterFactoryAbi } from '@/lib/adapterAbi'

/**
 * Permissionless. Whoever pays the gas gets nothing: the adapter is immutable
 * and ownerless, and its address was determined before anyone pressed anything.
 */
export function DeployButton({ token, feed }: { token: Address; feed: Address }) {
  const { state } = useDeployment()
  const blockedReason = useBlockedReason(state)

  return (
    <TxButton
      label={copy.app.list.deploy}
      blockedReason={blockedReason}
      request={
        state.kind === 'live'
          ? {
              address: state.factory,
              abi: adapterFactoryAbi as unknown as import('viem').Abi,
              functionName: 'deploy',
              args: [token, feed],
            }
          : null
      }
    />
  )
}
```

- [ ] **Step 2: Write the list**

Create `components/app/AdapterList.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import { useReadContracts } from 'wagmi'
import { DeployButton } from '@/components/app/DeployButton'
import { NotDeployedNotice } from '@/components/app/NotDeployedNotice'
import { StatusPill } from '@/components/ui/StatusPill'
import { useDeployment } from '@/components/wallet/useDeployment'
import { copy } from '@/content/copy.en'
import { adapterFactoryAbi } from '@/lib/adapterAbi'
import { formatAge, shortAddress } from '@/lib/format'
import type { Snapshot } from '@/lib/snapshot'

/** Two reads per asset: the deterministic address, and whether it exists yet. */
const CALLS_PER_ROW = 2

export function AdapterList({ initial }: { initial: Snapshot }) {
  const [now, setNow] = useState(initial.observedAt)
  const { state, params } = useDeployment()
  const factory = state.kind === 'live' ? state.factory : undefined
  const rows = initial.rows

  useEffect(() => {
    const tick = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(tick)
  }, [])

  const adapters = useReadContracts({
    allowFailure: true,
    contracts: factory
      ? rows.flatMap((row) => [
          {
            address: factory,
            abi: adapterFactoryAbi,
            functionName: 'computeAddress',
            args: [row.token, row.feed],
          } as const,
          {
            address: factory,
            abi: adapterFactoryAbi,
            functionName: 'isDeployed',
            args: [row.token, row.feed],
          } as const,
        ])
      : [],
    query: { enabled: Boolean(factory) },
  })

  const adapterAt = (index: number): { address: Address; deployed: boolean } | null => {
    const results = adapters.data
    if (!results) return null
    const address = results[index * CALLS_PER_ROW]
    const deployed = results[index * CALLS_PER_ROW + 1]
    if (!address || address.status !== 'success') return null
    if (!deployed || deployed.status !== 'success') return null
    return { address: address.result as Address, deployed: deployed.result as boolean }
  }

  return (
    <div>
      <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
        {copy.app.list.heading}
      </h1>
      <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">{copy.app.list.lede}</p>

      {state.kind !== 'live' && (
        <div className="mt-10">
          <NotDeployedNotice />
        </div>
      )}

      {/* The factory IS the canonical parameter set, so the console reads these
          off chain rather than keeping a second copy that could drift. */}
      {state.kind === 'live' && params && (
        <p className="mt-10 text-[12px] text-fg-faint">
          {copy.app.list.factoryLabel} <span className="font-mono">{state.factory}</span> ·{' '}
          {copy.app.list.paramQuiet} {formatAge(Number(params.quietAfter))} ·{' '}
          {copy.app.list.paramBudget} {formatAge(Number(params.protectionBudget))} ·{' '}
          {copy.app.list.paramContinuity} {params.continuityBps} bps ·{' '}
          {copy.app.list.paramSequencer}{' '}
          {params.sequencerFeed === '0x0000000000000000000000000000000000000000'
            ? copy.app.list.sequencerDisabled
            : shortAddress(params.sequencerFeed)}
        </p>
      )}

      <p className="mt-10 text-[12px] text-fg-faint">
        Read from Robinhood Chain mainnet (chain {initial.chainId}) at block{' '}
        <span className="font-mono">{initial.blockNumber}</span>,{' '}
        {formatAge(Math.max(0, now - initial.observedAt))} ago.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="text-[12px] text-fg-faint">
              <th className="pb-3 font-normal">{copy.app.list.columns.ticker}</th>
              <th className="pb-3 font-normal">{copy.app.list.columns.offchain}</th>
              <th className="pb-3 font-normal">{copy.app.list.columns.age}</th>
              <th className="pb-3 font-normal">{copy.app.list.columns.adapter}</th>
              <th className="pb-3 font-normal" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const adapter = adapterAt(index)
              return (
                <tr key={row.symbol} className="border-t border-white/[0.06]">
                  <td className="py-3">
                    <Link href={`/app/${row.symbol}`} className="font-semibold hover:underline">
                      {row.symbol}
                    </Link>
                    <span className="ml-2 text-[12px] text-fg-faint">{row.name}</span>
                  </td>
                  <td className="py-3">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="py-3 font-mono text-[13px] tabular-nums text-fg-muted">
                    {formatAge(Math.max(0, now - row.updatedAt))}
                  </td>
                  <td className="py-3 font-mono text-[12px] text-fg-faint">
                    {adapter ? (
                      <>
                        {shortAddress(adapter.address)}
                        <span className="ml-2 font-sans text-[12px] text-fg-muted">
                          {adapter.deployed ? copy.app.list.deployed : ''}
                        </span>
                      </>
                    ) : (
                      <span className="font-sans">{copy.app.list.addressPending}</span>
                    )}
                  </td>
                  <td className="py-3">
                    {adapter?.deployed ? (
                      <Link
                        href={`/app/${row.symbol}`}
                        className="text-[15px] text-white underline decoration-white/25 underline-offset-4 hover:decoration-white"
                      >
                        {copy.app.list.openDetail}
                      </Link>
                    ) : (
                      <DeployButton token={row.token} feed={row.feed} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire the page**

Replace `app/app/page.tsx` with:

```tsx
import { AdapterList } from '@/components/app/AdapterList'
import { readSnapshot } from '@/lib/snapshot'

export const revalidate = 30

export default async function AppPage() {
  const snapshot = await readSnapshot()
  return <AdapterList initial={snapshot} />
}
```

- [ ] **Step 4: Verify**

```bash
cd /c/Users/chaiz/Desktop/ca-firewall && npx tsc --noEmit && npm test && npm run build
```

Then `npm run dev` and open `/app`: 35 rows render with live off-chain statuses and ages, the not-deployed notice appears once at the top, every adapter cell reads "Available once the factory is deployed", and every Deploy button is disabled carrying a reason. No zeros, no invented addresses.

- [ ] **Step 5: Commit**

```bash
git add components/app/AdapterList.tsx components/app/DeployButton.tsx app/app/page.tsx
git commit -m "feat: adapter list with deterministic addresses and permissionless deploy"
```

---

### Task 8: The adapter detail page with commit and the integration snippet

**Files:**
- Create: `components/app/PriceNumbers.tsx`
- Create: `components/app/StatusPanel.tsx`
- Create: `components/app/CommitButton.tsx`
- Create: `components/app/IntegrationSnippet.tsx`
- Create: `components/app/AdapterDetail.tsx`
- Create: `app/app/[symbol]/page.tsx`

**Interfaces:**
- Consumes: everything produced in Tasks 4-7, plus `formatPrice`, `formatMultiplier`, `formatAge`, `heartbeatFraction` from `lib/format.ts`, and `STATUS_NOTE` from `lib/status.ts`.
- Produces: `<AdapterDetail row={FeedRow} observedAt={number} />` and the four presentational pieces it composes.

- [ ] **Step 1: Write the number block**

Create `components/app/PriceNumbers.tsx`:

```tsx
/**
 * Brief §11.3: label 12px, value 33px, then a bar or a delta.
 * `delta` is the only place colour is allowed outside the hero object, and only
 * on the digits themselves.
 */
export function StatNumber({
  label,
  value,
  source,
  fraction,
  delta,
  note,
}: {
  label: string
  value: string
  source?: string
  /** 0..1 — renders a progress bar when supplied. */
  fraction?: number
  /** Signed, already formatted, e.g. "+3.42" — sign drives the colour. */
  delta?: string
  note?: string
}) {
  const rising = delta?.startsWith('+')
  return (
    <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
      <p className="text-[12px] text-fg-faint">{label}</p>
      <p className="mt-2 font-mono text-[33px] leading-none tabular-nums">{value}</p>

      {typeof fraction === 'number' && (
        <div className="mt-4 h-[3px] w-full rounded-[var(--radius-pill)] bg-white/[0.06]">
          <div
            className="h-full rounded-[var(--radius-pill)] bg-white/60"
            style={{ width: `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%` }}
          />
        </div>
      )}

      {delta && (
        <p
          className={`mt-4 font-mono text-[13px] tabular-nums ${rising ? 'text-up' : 'text-down'}`}
        >
          {delta}
        </p>
      )}

      {source && <p className="mt-4 text-[12px] text-fg-faint">{source}</p>}
      {note && <p className="mt-2 text-[12px] text-fg-faint">{note}</p>}
    </div>
  )
}

/** A value the adapter would provide but cannot yet. Never a zero. */
export function StatUnavailable({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
      <p className="text-[12px] text-fg-faint">{label}</p>
      <p className="mt-2 text-[15px] text-fg-muted">{reason}</p>
    </div>
  )
}
```

- [ ] **Step 2: Write the status panel**

Create `components/app/StatusPanel.tsx`:

```tsx
import { StatusPill } from '@/components/ui/StatusPill'
import { copy } from '@/content/copy.en'
import {
  ADAPTER_STATUS_LABEL,
  ADAPTER_STATUS_NOTE,
  type AdapterStatus,
} from '@/lib/adapterStatus'
import { STATUS_NOTE, type Status } from '@/lib/status'

/**
 * Both statuses, each labelled with where it came from. Before the adapter
 * exists only the off-chain one is real, and saying so is the point.
 */
export function StatusPanel({
  offchain,
  onchain,
}: {
  offchain: Status
  onchain: AdapterStatus | null
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
        <p className="text-[12px] text-fg-faint">{copy.app.detail.onchainStatus}</p>
        {onchain ? (
          <>
            <p className="mt-3 text-[17px] font-semibold">{ADAPTER_STATUS_LABEL[onchain]}</p>
            <p className="mt-2 text-[15px] text-fg-muted">{ADAPTER_STATUS_NOTE[onchain]}</p>
          </>
        ) : (
          <p className="mt-3 text-[15px] text-fg-muted">{copy.app.detail.unavailable}</p>
        )}
      </div>

      <div className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
        <p className="text-[12px] text-fg-faint">{copy.app.detail.offchainStatus}</p>
        <div className="mt-3">
          <StatusPill status={offchain} />
        </div>
        <p className="mt-3 text-[15px] text-fg-muted">{STATUS_NOTE[offchain]}</p>
        <p className="mt-2 text-[12px] text-fg-faint">{copy.app.detail.offchainNote}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write the commit button**

Create `components/app/CommitButton.tsx`:

```tsx
'use client'

import type { Abi, Address } from 'viem'
import { TxButton } from '@/components/app/TxButton'
import { useBlockedReason, useDeployment } from '@/components/wallet/useDeployment'
import { copy } from '@/content/copy.en'
import { stockOracleAdapterAbi } from '@/lib/adapterAbi'

export function CommitButton({ adapter }: { adapter: Address | null }) {
  const { state } = useDeployment()
  const blockedReason = useBlockedReason(state)

  return (
    <div>
      <TxButton
        label={copy.app.detail.commit}
        blockedReason={blockedReason ?? (adapter ? null : copy.app.blocked.notDeployed)}
        request={
          adapter
            ? {
                address: adapter,
                abi: stockOracleAdapterAbi as unknown as Abi,
                functionName: 'commit',
              }
            : null
        }
      />
      <p className="mt-3 max-w-[68ch] text-[12px] text-fg-faint">{copy.app.detail.commitNote}</p>
    </div>
  )
}
```

- [ ] **Step 4: Write the integration snippet**

Create `components/app/IntegrationSnippet.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Address } from 'viem'
import { ActionButton } from '@/components/ui/ActionButton'
import { copy } from '@/content/copy.en'

export function IntegrationSnippet({ feed, adapter }: { feed: Address; adapter: Address | null }) {
  const [copied, setCopied] = useState(false)

  const adapterLine = adapter ?? `<${copy.app.list.addressPending}>`
  const snippet = [
    '// Before — the raw Chainlink feed',
    `AggregatorV3Interface oracle = AggregatorV3Interface(${feed});`,
    '',
    '// After — one governance change, no code change',
    `AggregatorV3Interface oracle = AggregatorV3Interface(${adapterLine});`,
  ].join('\n')

  return (
    <section>
      <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{copy.app.snippet.heading}</h2>
      <p className="mt-3 max-w-[68ch] text-[15px] text-fg-muted">{copy.app.snippet.lede}</p>

      <div className="mt-6 rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700">
        <div className="flex items-center justify-end border-b border-white/[0.06] px-4 py-2">
          <ActionButton
            variant="secondary"
            disabled={adapter === null}
            title={adapter === null ? copy.app.blocked.notDeployed : undefined}
            onClick={() => {
              navigator.clipboard.writeText(snippet).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1600)
              })
            }}
            className="h-[30px] px-3 text-[13px]"
          >
            {copied ? copy.app.snippet.copied : copy.app.snippet.copy}
          </ActionButton>
        </div>
        <pre className="overflow-x-auto p-6 font-mono text-[13px] leading-relaxed">
          <code>{snippet}</code>
        </pre>
      </div>

      <h3 className="mt-10 text-[17px] font-semibold">{copy.app.snippet.gateHeading}</h3>
      <p className="mt-3 max-w-[68ch] text-[15px] text-fg-muted">{copy.app.snippet.gateNote}</p>
      <pre className="mt-4 overflow-x-auto rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6 font-mono text-[13px] leading-relaxed">
        <code>{copy.app.snippet.gateCode}</code>
      </pre>
    </section>
  )
}
```

- [ ] **Step 5: Write the detail component**

Create `components/app/AdapterDetail.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import { useReadContracts } from 'wagmi'
import { CommitButton } from '@/components/app/CommitButton'
import { IntegrationSnippet } from '@/components/app/IntegrationSnippet'
import { NotDeployedNotice } from '@/components/app/NotDeployedNotice'
import { StatNumber, StatUnavailable } from '@/components/app/PriceNumbers'
import { StatusPanel } from '@/components/app/StatusPanel'
import { useDeployment } from '@/components/wallet/useDeployment'
import { copy } from '@/content/copy.en'
import { adapterFactoryAbi, stockOracleAdapterAbi } from '@/lib/adapterAbi'
import { adapterStatusFromEnum } from '@/lib/adapterStatus'
import { formatAge, formatMultiplier, formatPrice, heartbeatFraction } from '@/lib/format'
import type { FeedRow } from '@/lib/snapshot'

export function AdapterDetail({ row, observedAt }: { row: FeedRow; observedAt: number }) {
  const [now, setNow] = useState(observedAt)
  const { state } = useDeployment()
  const factory = state.kind === 'live' ? state.factory : undefined

  useEffect(() => {
    const tick = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(tick)
  }, [])

  const addressRead = useReadContracts({
    allowFailure: true,
    contracts: factory
      ? ([
          {
            address: factory,
            abi: adapterFactoryAbi,
            functionName: 'computeAddress',
            args: [row.token, row.feed],
          },
        ] as const)
      : [],
    query: { enabled: Boolean(factory) },
  })

  const adapter =
    addressRead.data?.[0]?.status === 'success'
      ? (addressRead.data[0].result as Address)
      : null

  const adapterRead = useReadContracts({
    allowFailure: true,
    contracts: adapter
      ? ([
          { address: adapter, abi: stockOracleAdapterAbi, functionName: 'status' },
          { address: adapter, abi: stockOracleAdapterAbi, functionName: 'heldAnswer' },
          { address: adapter, abi: stockOracleAdapterAbi, functionName: 'protectionEndsAt' },
          { address: adapter, abi: stockOracleAdapterAbi, functionName: 'committedAt' },
        ] as const)
      : [],
    query: { enabled: Boolean(adapter) },
  })

  const at = (index: number): unknown => {
    const entry = adapterRead.data?.[index]
    return entry?.status === 'success' ? entry.result : undefined
  }

  const onchainStatus =
    typeof at(0) === 'number' ? adapterStatusFromEnum(at(0) as number) : null
  const held = typeof at(1) === 'bigint' ? (at(1) as bigint) : null
  const endsAt = typeof at(2) === 'bigint' ? Number(at(2) as bigint) : null
  const committedAt = typeof at(3) === 'bigint' ? Number(at(3) as bigint) : null

  const live = BigInt(row.price)
  const age = Math.max(0, now - row.updatedAt)

  // Percent difference between held and live, to two decimals, signed.
  const delta =
    held !== null && held !== 0n
      ? (() => {
          const bps = ((live - held) * 10_000n) / held
          const sign = bps >= 0n ? '+' : '-'
          const abs = bps < 0n ? -bps : bps
          return `${sign}${(Number(abs) / 100).toFixed(2)}% against the held price`
        })()
      : null

  return (
    <div>
      <Link href="/app" className="text-[15px] text-fg-muted hover:text-white">
        {copy.app.detail.backLabel}
      </Link>

      <h1 className="mt-10 text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
        {row.symbol}
        <span className="ml-3 text-[17px] font-normal text-fg-muted">{row.name}</span>
      </h1>

      <p className="mt-6 font-mono text-[12px] text-fg-faint">
        token {row.token} · feed {row.feed}
        {adapter ? ` · adapter ${adapter}` : ''}
      </p>

      {state.kind !== 'live' && (
        <div className="mt-10">
          <NotDeployedNotice />
        </div>
      )}

      <div className="mt-10">
        <StatusPanel offchain={row.status} onchain={onchainStatus} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <StatNumber
          label={copy.app.detail.livePrice}
          value={`$${formatPrice(live, row.priceDecimals)}`}
          fraction={heartbeatFraction(age, row.heartbeat)}
          source={`${copy.app.detail.livePriceSource} · ${formatAge(age)} old of a ${formatAge(
            row.heartbeat,
          )} heartbeat`}
        />

        {held !== null ? (
          <StatNumber
            label={copy.app.detail.heldPrice}
            value={`$${formatPrice(held, row.priceDecimals)}`}
            delta={delta ?? undefined}
            note={copy.app.detail.heldPriceNote}
          />
        ) : (
          <StatUnavailable
            label={copy.app.detail.heldPrice}
            reason={copy.app.detail.unavailable}
          />
        )}

        {endsAt !== null ? (
          <StatNumber
            label={copy.app.detail.budget}
            value={formatAge(Math.max(0, endsAt - now))}
            note={copy.app.detail.budgetNote}
          />
        ) : (
          <StatUnavailable label={copy.app.detail.budget} reason={copy.app.detail.unavailable} />
        )}

        <StatNumber
          label={copy.app.detail.multiplier}
          value={formatMultiplier(BigInt(row.uiMultiplier))}
          note={`${copy.app.detail.stagedMultiplier}: ${formatMultiplier(
            BigInt(row.newUIMultiplier),
          )}. ${copy.app.detail.multiplierNote}`}
        />
      </div>

      <div className="mt-10">
        {committedAt !== null && (
          <p className="mb-4 text-[12px] text-fg-faint">
            {copy.app.detail.committedAt}: {formatAge(Math.max(0, now - committedAt))}
          </p>
        )}
        <CommitButton adapter={adapter} />
      </div>

      <div className="mt-16">
        <IntegrationSnippet feed={row.feed} adapter={adapter} />
      </div>

      <p className="mt-10">
        <Link
          href={`/app/calculator?asset=${row.symbol}`}
          className="text-[15px] text-white underline decoration-white/25 underline-offset-4 hover:decoration-white"
        >
          {copy.app.detail.calculatorLink}
        </Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 6: Write the route**

Create `app/app/[symbol]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { AdapterDetail } from '@/components/app/AdapterDetail'
import { readSnapshot } from '@/lib/snapshot'

export const revalidate = 30

// `params` is a Promise in this version of Next.js and must be awaited.
export default async function AdapterPage({ params }: { params: Promise<{ symbol: string }> }) {
  const [{ symbol }, snapshot] = await Promise.all([params, readSnapshot()])
  const row = snapshot.rows.find((r) => r.symbol === symbol.toUpperCase())
  if (!row) notFound()

  return <AdapterDetail row={row} observedAt={snapshot.observedAt} />
}
```

- [ ] **Step 7: Verify**

```bash
cd /c/Users/chaiz/Desktop/ca-firewall && npx tsc --noEmit && npm test && npm run build
```

Then `npm run dev` and open `/app/TSLA`: the live price, its age and heartbeat bar are real; held price, protection budget and on-chain status all read "Not available until the adapter is deployed"; the off-chain status is live; `Commit snapshot` is disabled with a reason; the snippet renders the real feed address and the honest adapter placeholder. Open `/app/NOPE` and confirm a 404.

- [ ] **Step 8: Commit**

```bash
git add components/app app/app/[symbol]
git commit -m "feat: adapter detail with commit, held-vs-live and the integration snippet"
```

---

### Task 9: The convention calculator

**Files:**
- Create: `components/app/Calculator.tsx`
- Create: `app/app/calculator/page.tsx`

**Interfaces:**
- Consumes: `valuate`, `valuationError`, `Convention`, `Snapshot`, `formatPrice`.
- Produces: `<Calculator snapshot={Snapshot} initialSymbol={string | undefined} />`.

- [ ] **Step 1: Write the calculator**

Create `components/app/Calculator.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { parseUnits } from 'viem'
import { copy } from '@/content/copy.en'
import { formatPrice } from '@/lib/format'
import type { Snapshot } from '@/lib/snapshot'
import { valuate, valuationError, type Convention } from '@/lib/valuation'

const TOKEN_DECIMALS = 18

/** USD with 18 decimals, rendered to cents by reusing the price formatter. */
function usd(value: bigint): string {
  const negative = value < 0n
  const text = formatPrice(negative ? -value : value, 18)
  return `${negative ? '-' : ''}$${text}`
}

export function Calculator({
  snapshot,
  initialSymbol,
}: {
  snapshot: Snapshot
  initialSymbol?: string
}) {
  const rows = snapshot.rows
  const firstMatch = rows.find((r) => r.symbol === initialSymbol?.toUpperCase())
  const [symbol, setSymbol] = useState(firstMatch?.symbol ?? rows[0]?.symbol ?? '')
  const [amount, setAmount] = useState('100')
  const [convention, setConvention] = useState<Convention>('doubleCounted')

  const row = rows.find((r) => r.symbol === symbol)

  const result = useMemo(() => {
    if (!row) return null
    let rawBalance: bigint
    try {
      rawBalance = parseUnits(amount.trim() === '' ? '0' : amount.trim(), TOKEN_DECIMALS)
    } catch {
      return null
    }
    if (rawBalance < 0n) return null

    const valuation = valuate({
      rawBalance,
      tokenDecimals: TOKEN_DECIMALS,
      price: BigInt(row.price),
      priceDecimals: row.priceDecimals,
      uiMultiplier: BigInt(row.uiMultiplier),
    })
    return { valuation, error: valuationError(valuation, convention) }
  }, [row, amount, convention])

  const field =
    'mt-2 w-full rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 px-4 py-3 text-[15px] text-white outline-none focus:border-white/[0.24]'

  const cells: { key: Convention; label: string; verdict: string }[] = [
    { key: 'correct', label: copy.app.calculator.correct, verdict: copy.app.calculator.correctVerdict },
    {
      key: 'doubleCounted',
      label: copy.app.calculator.doubleCounted,
      verdict: copy.app.calculator.doubleCountedVerdict,
    },
    {
      key: 'unadjusted',
      label: copy.app.calculator.unadjusted,
      verdict: copy.app.calculator.unadjustedVerdict,
    },
  ]

  return (
    <div>
      <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] max-md:text-[28px]">
        {copy.app.calculator.heading}
      </h1>
      <p className="mt-6 max-w-[68ch] text-[17px] text-fg-muted">{copy.app.calculator.lede}</p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <label className="block">
          <span className="text-[12px] text-fg-faint">{copy.app.calculator.asset}</span>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className={field}>
            {rows.map((r) => (
              <option key={r.symbol} value={r.symbol} className="bg-ink-700">
                {r.symbol} — {r.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[12px] text-fg-faint">{copy.app.calculator.amount}</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${field} font-mono tabular-nums`}
          />
        </label>

        <label className="block">
          <span className="text-[12px] text-fg-faint">{copy.app.calculator.convention}</span>
          <select
            value={convention}
            onChange={(e) => setConvention(e.target.value as Convention)}
            className={field}
          >
            {cells.map((c) => (
              <option key={c.key} value={c.key} className="bg-ink-700">
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {result && row && (
        <>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {cells.map((cell) => (
              <div
                key={cell.key}
                className="rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6"
              >
                <p className="font-mono text-[12px] text-fg-faint">{cell.label}</p>
                <p className="mt-2 font-mono text-[33px] leading-none tabular-nums">
                  {usd(result.valuation[cell.key])}
                </p>
                <p className="mt-4 text-[12px] text-fg-muted">{cell.verdict}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[14px] border border-[var(--color-glass-border)] bg-ink-700 p-6">
            <p className="text-[12px] text-fg-faint">{copy.app.calculator.error}</p>
            <p
              className={`mt-2 font-mono text-[33px] leading-none tabular-nums ${
                result.error === 0n ? '' : result.error > 0n ? 'text-up' : 'text-down'
              }`}
            >
              {result.error === 0n ? usd(0n) : `${result.error > 0n ? '+' : ''}${usd(result.error)}`}
            </p>
            {BigInt(row.uiMultiplier) === 10n ** 18n && (
              <p className="mt-4 max-w-[68ch] text-[12px] text-fg-faint">
                {copy.app.calculator.exact}
              </p>
            )}
          </div>
        </>
      )}

      <p className="mt-10 text-[12px] text-fg-faint">{copy.footer.sourceNote}</p>
    </div>
  )
}
```

- [ ] **Step 2: Write the route**

Create `app/app/calculator/page.tsx`:

```tsx
import { Calculator } from '@/components/app/Calculator'
import { readSnapshot } from '@/lib/snapshot'

export const revalidate = 30

// Reading `?asset=` from the server prop rather than useSearchParams keeps the
// page out of a Suspense boundary and off a client-only render path.
export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string }>
}) {
  const [{ asset }, snapshot] = await Promise.all([searchParams, readSnapshot()])
  return <Calculator snapshot={snapshot} initialSymbol={asset} />
}
```

- [ ] **Step 3: Verify**

```bash
cd /c/Users/chaiz/Desktop/ca-firewall && npx tsc --noEmit && npm test && npm run build
```

Then `npm run dev` and check the calculator. Note against live data: CRWD is NOT a covered asset — it has no on-chain feed, which is exactly the landing page argument — so `?asset=CRWD` must say so rather than silently swap in another ticker. Use `?asset=SGOV` for a real non-unit multiplier (~1.0051 today; only six of the 35 differ from 1.0 at all, and all are small dividend adjustments). Typing letters into the amount field must not crash the page. On an asset whose multiplier is exactly 1.0, all three columns agree and the explanatory line appears.

- [ ] **Step 4: Commit**

```bash
git add components/app/Calculator.tsx app/app/calculator
git commit -m "feat: convention calculator showing what a multiplier mistake costs"
```

---

### Task 10: Entry points and final verification

**Files:**
- Modify: `content/copy.en.ts` (three link strings)
- Modify: `components/sections/Integration.tsx`
- Modify: `app/board/page.tsx`
- Modify: `app/docs/page.tsx`

**Interfaces:**
- Consumes: everything above. Produces no new interface.

- [ ] **Step 1: Add the entry-point strings**

In `content/copy.en.ts`, add to the `sections.integration` object:

```ts
      consoleCta: 'Open the console',
```

and add to the `app` object, at the end:

```ts
    entry: {
      fromBoard: 'Open the console to deploy an adapter for any of these',
      fromDocs: 'Open the console',
    },
```

- [ ] **Step 2: Add the landing CTA**

In `components/sections/Integration.tsx`, add the import:

```tsx
import { Button } from '@/components/ui/Button'
```

and insert this immediately after the `<p>` carrying `copy.sections.integration.note`, still inside the second `<Reveal>`:

```tsx
          <div className="mt-10">
            <Button href="/app" variant="secondary" className="h-[38px] px-4 text-[15px]">
              {copy.sections.integration.consoleCta}
            </Button>
          </div>
```

- [ ] **Step 3: Add the board link**

In `app/board/page.tsx`, insert this immediately after the `<p>` that explains the adapter is not deployed yet:

```tsx
        <p className="mt-6">
          <Link
            href="/app"
            className="text-[15px] text-white underline decoration-white/25 underline-offset-4 hover:decoration-white"
          >
            {copy.app.entry.fromBoard}
          </Link>
        </p>
```

- [ ] **Step 4: Add the docs link**

In `app/docs/page.tsx`, inside the "Status of this work" `<section>` and after its `<p>`, insert:

```tsx
            <p className="mt-4">
              <Link
                href="/app"
                className="text-[15px] text-white underline decoration-white/25 underline-offset-4 hover:decoration-white"
              >
                {copy.app.entry.fromDocs}
              </Link>
            </p>
```

- [ ] **Step 5: Remove the duplicated gate snippet from the docs page**

In `app/docs/page.tsx`, delete the local `GATE` constant and render the shared string
instead, so the console and the docs page cannot drift apart:

```tsx
              <code>{copy.app.snippet.gateCode}</code>
```

- [ ] **Step 6: Full verification**

```bash
cd /c/Users/chaiz/Desktop/ca-firewall && npx tsc --noEmit && npm test && npm run build
```

Expected: no type errors, every suite green, build succeeds listing `/app`, `/app/[symbol]` and `/app/calculator`.

- [ ] **Step 7: Manual wallet checklist**

Start the production server on a fresh port and walk the wallet path, which has no automated coverage by design (there is no headless wallet in this project):

```bash
cd /c/Users/chaiz/Desktop/ca-firewall && npx next start -p 4100
```

Confirm each of:
1. `/app` renders the list with the not-deployed notice and disabled Deploy buttons.
2. Connect wallet → the modal lists the installed wallets by name and icon.
3. Cancelling the wallet prompt returns the button to rest with no error text.
4. Connected on Robinhood Chain → the button shows `0x1234…9abc` in mono with a white dot.
5. Connected on any other chain → amber dot and "Switch network"; pressing it switches.
6. Reload with a connected wallet → no hydration warning in the console, the address returns.
7. Disconnect → the button returns to the white "Connect wallet" pill.
8. With no wallet extension at all → the modal states that plainly and links out.

Kill the server by resolving the listening PID rather than the wrapper:

```bash
netstat -ano | grep :4100 | head -1
taskkill //PID <pid> //F
```

- [ ] **Step 8: Commit**

```bash
git add content/copy.en.ts components/sections/Integration.tsx app/board/page.tsx app/docs/page.tsx
git commit -m "feat: entry points into the console from the landing, board and docs"
```

---

## Notes for the implementer

**On `as const` ABIs and wagmi generics.** `useReadContracts` infers return types from an `as const` ABI, which is why the ABI arrays end that way. Write hooks are looser: `TxButton` accepts a plain `Abi`, so callers cast at the boundary (`stockOracleAdapterAbi as unknown as Abi`). Do not spread that cast into read paths — it would throw away the inference that makes the read results type-safe.

**On result narrowing.** With `allowFailure: true`, every entry is `{ status: 'success', result } | { status: 'failure', error }`. Always check `status` before touching `result`; a failed read must fall through to the "not available" rendering, never to a zero.

**On what must never appear on screen.** A zero price, a zero address, a fabricated adapter address, or a status pill for an adapter that does not exist. If a value is unknown, the screen says why.
