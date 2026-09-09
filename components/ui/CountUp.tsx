'use client'

import { useEffect, useRef, useState } from 'react'

/** Brief §11.6: 900 ms, from zero, once. */
const DURATION = 900

/** Ease-out cubic — fast off the mark, settling rather than stopping dead. */
function ease(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Counts a key figure up from zero the first time it enters the frame, then
 * never again. §11.6 permits this for key numbers only, so it is used on the
 * three scale figures and nowhere else.
 */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(value)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    setShown(0)

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        setStarted(true)
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    let raf = 0
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      setShown(Math.round(ease(t) * value))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, value])

  return <span ref={ref}>{shown}</span>
}
