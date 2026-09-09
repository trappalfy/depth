import { ASSETS, COVERED_ASSETS, TOTAL_ASSETS } from '@/lib/assets.generated'
import { aggregatorV3Abi, stockTokenAbi } from '@/lib/abis'
import { publicClient, robinhoodChain } from '@/lib/chain'
import { classify, type Status } from '@/lib/status'

/** Seconds of feed silence after which we call it quiet rather than fresh. */
export const QUIET_AFTER = 7_200

/** Number of contract reads per asset — five on the token, two on the feed. */
const CALLS_PER_ASSET = 7

export interface FeedRow {
  symbol: string
  name: string
  token: string
  feed: string
  heartbeat: number
  price: string
  priceDecimals: number
  updatedAt: number
  uiMultiplier: string
  newUIMultiplier: string
  effectiveAt: number
  oraclePaused: boolean
  paused: boolean
  status: Status
}

export interface Snapshot {
  observedAt: number
  blockNumber: string
  chainId: number
  totalAssets: number
  coveredAssets: number
  rows: FeedRow[]
}

export async function readSnapshot(): Promise<Snapshot> {
  const contracts = ASSETS.flatMap((a) => [
    { address: a.token, abi: stockTokenAbi, functionName: 'uiMultiplier' } as const,
    { address: a.token, abi: stockTokenAbi, functionName: 'newUIMultiplier' } as const,
    { address: a.token, abi: stockTokenAbi, functionName: 'effectiveAt' } as const,
    { address: a.token, abi: stockTokenAbi, functionName: 'oraclePaused' } as const,
    { address: a.token, abi: stockTokenAbi, functionName: 'paused' } as const,
    { address: a.feed, abi: aggregatorV3Abi, functionName: 'latestRoundData' } as const,
    { address: a.feed, abi: aggregatorV3Abi, functionName: 'decimals' } as const,
  ])

  const [results, blockNumber] = await Promise.all([
    publicClient.multicall({ contracts, allowFailure: true }),
    publicClient.getBlockNumber(),
  ])

  const observedAt = Math.floor(Date.now() / 1000)
  const rows: FeedRow[] = []

  ASSETS.forEach((a, index) => {
    const slice = results.slice(index * CALLS_PER_ASSET, index * CALLS_PER_ASSET + CALLS_PER_ASSET)
    // Drop any asset whose reads did not all succeed rather than render a half-row.
    if (slice.some((r) => r.status !== 'success')) return

    const uiMultiplier = slice[0].result as bigint
    const newUIMultiplier = slice[1].result as bigint
    const effectiveAt = Number(slice[2].result as bigint)
    const oraclePaused = slice[3].result as boolean
    const paused = slice[4].result as boolean
    const round = slice[5].result as readonly [bigint, bigint, bigint, bigint, bigint]
    const priceDecimals = Number(slice[6].result as number)

    const updatedAt = Number(round[3])

    rows.push({
      symbol: a.symbol,
      name: a.name,
      token: a.token,
      feed: a.feed,
      heartbeat: a.heartbeat,
      price: round[1].toString(),
      priceDecimals,
      updatedAt,
      uiMultiplier: uiMultiplier.toString(),
      newUIMultiplier: newUIMultiplier.toString(),
      effectiveAt,
      oraclePaused,
      paused,
      status: classify({
        paused,
        oraclePaused,
        uiMultiplier,
        newUIMultiplier,
        updatedAt,
        now: observedAt,
        heartbeat: a.heartbeat,
        quietAfter: QUIET_AFTER,
      }),
    })
  })

  return {
    observedAt,
    blockNumber: blockNumber.toString(),
    chainId: robinhoodChain.id,
    totalAssets: TOTAL_ASSETS,
    coveredAssets: COVERED_ASSETS,
    rows,
  }
}
