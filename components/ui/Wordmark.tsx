import Image from 'next/image'
import Link from 'next/link'
import { copy } from '@/content/copy.en'

/**
 * The mark plus the name, as one link home.
 *
 * The mark ships as a white silhouette with a transparent ground, so the
 * diamond in its middle is a real hole and shows whichever ink sits behind it.
 * That only reads on a dark surface — which is every header on this site.
 */
export function Wordmark({
  href = '/',
  markClassName = 'h-[22px]',
  textClassName = 'text-[20px]',
  priority = false,
}: {
  href?: string
  markClassName?: string
  textClassName?: string
  priority?: boolean
}) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <Image
        src="/depth-mark.png"
        alt=""
        width={271}
        height={168}
        priority={priority}
        className={`w-auto ${markClassName}`}
      />
      <span className={`font-semibold tracking-[0.02em] text-white ${textClassName}`}>
        {copy.brand}
      </span>
    </Link>
  )
}
