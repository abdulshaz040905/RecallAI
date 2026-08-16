'use client'

import { useEffect, useRef } from 'react'

/**
 * One IntersectionObserver for the whole document.
 *
 * Every reveal on the page shares it, so scrolling costs nothing per frame:
 * the observer flips a `data-revealed` attribute and CSS transitions take it
 * from there on the compositor. Elements are unobserved once revealed.
 */
let sharedObserver: IntersectionObserver | null = null

function getObserver(): IntersectionObserver | null {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
        return null
    }

    if (!sharedObserver) {
        sharedObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue
                    entry.target.setAttribute('data-revealed', 'true')
                    sharedObserver?.unobserve(entry.target)
                }
            },
            {
                // Fire a little before the element is fully on screen so the
                // motion reads as "already happening" rather than "triggered".
                rootMargin: '0px 0px -10% 0px',
                threshold: 0.08
            }
        )
    }

    return sharedObserver
}

export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Attach to any element to have it reveal once when scrolled into view. */
export function useReveal<T extends HTMLElement>() {
    const ref = useRef<T | null>(null)

    useEffect(() => {
        const element = ref.current
        if (!element) return

        if (prefersReducedMotion()) {
            element.setAttribute('data-revealed', 'true')
            return
        }

        const observer = getObserver()
        if (!observer) {
            element.setAttribute('data-revealed', 'true')
            return
        }

        observer.observe(element)
        return () => observer.unobserve(element)
    }, [])

    return ref
}
