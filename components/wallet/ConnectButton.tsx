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
