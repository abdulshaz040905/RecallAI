'use client'

import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from './use-reveal'

type CounterProps = {
    to: number
    /** Milliseconds for the whole count. */
    duration?: number
    decimals?: number
    prefix?: string
    suffix?: string
    className?: string
}

/**
 * Number that counts up once, when it first scrolls into view.
 *
 * Its own observer + RAF loop, both torn down the moment the count finishes,
 * so nothing lingers on the main thread.
 */
export function Counter({
    to,
    duration = 1600,
    decimals = 0,
    prefix = '',
    suffix = '',
    className
}: CounterProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const [value, setValue] = useState(0)

    useEffect(() => {
        const element = ref.current
        if (!element) return

        if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
            setValue(to)
            return
        }

        let frame = 0
        let start = 0

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting) return
                observer.disconnect()

                const step = (now: number) => {
                    if (!start) start = now
                    const progress = Math.min((now - start) / duration, 1)
                    // easeOutExpo — fast out of the gate, settles gently.
                    const eased =
                        progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
                    setValue(to * eased)
                    if (progress < 1) frame = requestAnimationFrame(step)
                }

                frame = requestAnimationFrame(step)
            },
            { threshold: 0.4 }
        )

        observer.observe(element)

        return () => {
            observer.disconnect()
            cancelAnimationFrame(frame)
        }
    }, [to, duration])

    return (
        <span ref={ref} className={className}>
            {prefix}
            {value.toFixed(decimals)}
            {suffix}
        </span>
    )
}
