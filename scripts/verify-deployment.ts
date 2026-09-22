/**
 * Checks a deployed factory against the console's own ABI, from outside the
 * console.
 *
 * The contracts are tested by Foundry and the console is tested by Vitest, but
 * nothing else asks the one question that matters on mainnet day: does the
 * thing on chain answer the calls this site makes, in the shape it expects?
 * That is this script. It is also the rehearsal harness — point it at a local
 * fork before pointing it at mainnet.
 *
 *   FACTORY=0x… npx tsx scripts/verify-deployment.ts
 *   FACTORY=0x… RPC_URL=http://127.0.0.1:8545 npx tsx scripts/verify-deployment.ts
 *
 * It only reads. Nothing here sends a transaction or needs a key.
 */
import { createPublicClient, formatUnits, getAddress, http, type Address } from 'viem'
import { robinhoodChain } from '../lib/chain'
import { adapterFactoryAbi, stockOracleAdapterAbi } from '../lib/adapterAbi'
import { ADAPTER_PARAMS } from '../lib/adapterParams'
import { ASSETS } from '../lib/assets.generated'
import { ADAPTER_STATUS_LABEL, adapterStatusFromEnum } from '../lib/adapterStatus'

const factory = process.env.FACTORY as Address | undefined
if (!factory) {
  console.error('FACTORY=0x… is required — the address the deploy script printed.')
  process.exit(1)
}

const rpc = process.env.RPC_URL ?? robinhoodChain.rpcUrls.default.http[0]
const client = createPublicClient({ chain: robinhoodChain, transport: http(rpc, { batch: true }) })

const failures: string[] = []
function check(ok: boolean, what: string) {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${what}`)
  if (!ok) failures.push(what)
}

/** The same label the console prints, so the two cannot describe one state differently. */
function label(status: number): string {
  const s = adapterStatusFromEnum(status)
  return s ? ADAPTER_STATUS_LABEL[s] : `unmapped status ${status}`
}

async function main() {
  console.log(`rpc      ${rpc}`)
  console.log(`chain    ${await client.getChainId()} (expecting ${robinhoodChain.id})`)
  console.log(`factory  ${getAddress(factory!)}`)
  console.log(`block    ${await client.getBlockNumber()}`)
  console.log('')

  // 1. The factory is there and IS our factory: a view call, not a code check.
  const params = { address: factory!, abi: adapterFactoryAbi } as const
  const [quietAfter, budget, continuityBps, sequencerFeed] = await Promise.all([
    client.readContract({ ...params, functionName: 'quietAfter' }),
    client.readContract({ ...params, functionName: 'protectionBudget' }),
    client.readContract({ ...params, functionName: 'continuityBps' }),
    client.readContract({ ...params, functionName: 'sequencerFeed' }),
  ])

  console.log('parameters on chain, against lib/adapterParams.ts')
  check(quietAfter === ADAPTER_PARAMS.quietAfter, `quietAfter ${quietAfter}s`)
  check(budget === ADAPTER_PARAMS.protectionBudget, `protectionBudget ${budget}s`)
  check(continuityBps === ADAPTER_PARAMS.continuityBps, `continuityBps ${continuityBps}`)
  check(
    getAddress(sequencerFeed) === getAddress(ADAPTER_PARAMS.sequencerFeed),
    `sequencerFeed ${sequencerFeed}`,
  )
  console.log('')

  // 2. Every covered asset has a derivable address, and the ones already
  //    deployed answer every call the console makes about them.
  const addresses = await client.multicall({
    contracts: ASSETS.map((a) => ({
      ...params,
      functionName: 'computeAddress' as const,
      args: [a.token, a.feed] as const,
    })),
    allowFailure: false,
  })
  check(
    new Set(addresses.map((a) => a.toLowerCase())).size === ASSETS.length,
    `${ASSETS.length} assets, ${new Set(addresses.map((a) => a.toLowerCase())).size} distinct adapter addresses`,
  )

  const codes = await Promise.all(addresses.map((a) => client.getCode({ address: a })))
  const live = ASSETS.map((a, i) => ({ asset: a, adapter: addresses[i] })).filter(
    (_, i) => (codes[i]?.length ?? 0) > 2,
  )
  console.log(`\n${live.length} of ${ASSETS.length} adapters deployed\n`)

  for (const { asset, adapter } of live) {
    const a = { address: adapter, abi: stockOracleAdapterAbi } as const
    const [status, decimals, round, observed, held, endsAt, token, feed] = await Promise.all([
      client.readContract({ ...a, functionName: 'status' }),
      client.readContract({ ...a, functionName: 'decimals' }),
      client.readContract({ ...a, functionName: 'latestRoundData' }),
      client.readContract({ ...a, functionName: 'observedAt' }),
      client.readContract({ ...a, functionName: 'heldAnswer' }),
      client.readContract({ ...a, functionName: 'protectionEndsAt' }),
      client.readContract({ ...a, functionName: 'token' }),
      client.readContract({ ...a, functionName: 'feed' }),
    ])
    const value = await client.readContract({
      ...a,
      functionName: 'valueOf',
      args: [10n * 10n ** 18n],
    })

    const age = Math.floor(Date.now() / 1000) - Number(observed)
    console.log(
      `${asset.symbol.padEnd(6)} ${adapter}  ${label(status)}` +
        `  $${formatUnits(round[1], decimals)}  observed ${age}s ago  10 tokens = $${formatUnits(value, 18)}`,
    )
    check(getAddress(token) === getAddress(asset.token), `${asset.symbol} adapter is bound to the right token`)
    check(getAddress(feed) === getAddress(asset.feed), `${asset.symbol} adapter is bound to the right feed`)
    check(round[1] > 0n, `${asset.symbol} answers with a positive price`)
    check(held > 0n, `${asset.symbol} holds a positive snapshot`)
    check(Number(endsAt) > Math.floor(Date.now() / 1000), `${asset.symbol} has protection budget left`)
    check(Number(round[3]) >= Number(observed), `${asset.symbol} vouched no earlier than it observed`)
  }

  console.log('')
  if (failures.length) {
    console.error(`${failures.length} check(s) failed:`)
    failures.forEach((f) => console.error(`  - ${f}`))
    process.exit(1)
  }
  console.log('all checks passed — this factory is what lib/deployments.ts may point at.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
