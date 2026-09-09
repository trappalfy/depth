'use client'

import { useState } from 'react'
import { DeployDialog } from '@/components/app/DeployDialog'
import { ActionButton } from '@/components/ui/ActionButton'
import { copy } from '@/content/copy.en'
import type { FeedRow } from '@/lib/snapshot'

/**
 * Opens the deploy form. The button itself never blocks: what deploying means
 * belongs in the form, next to the pair being wrapped and the parameters being
 * baked in, and a row in a table of thirty-five is no place to explain it.
 *
 * Deploying is permissionless. Whoever pays the gas gets nothing back: the
 * adapter is immutable and ownerless, and its address was determined before
 * anyone pressed anything.
 */
export function DeployButton({ row }: { row: FeedRow }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ActionButton
        variant="secondary"
        onClick={() => setOpen(true)}
        className="h-[38px] px-4 text-[15px]"
      >
        {copy.app.list.deploy}
      </ActionButton>

      {open && <DeployDialog row={row} onClose={() => setOpen(false)} />}
    </>
  )
}
