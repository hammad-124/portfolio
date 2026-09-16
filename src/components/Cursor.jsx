import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * Custom cursor: a small dot in difference-blend (inverts over anything),
 * trailing the pointer slightly and growing over interactive elements.
 * Desktop (fine pointer) only; the native cursor is hidden via a class on <html>.
 */
export default function Cursor() {
  const dot = useRef(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const el = dot.current
    document.documentElement.classList.add('custom-cursor')

    const xTo = gsap.quickTo(el, 'x', { duration: 0.18, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.18, ease: 'power3' })
    const sTo = gsap.quickTo(el, 'scale', { duration: 0.3, ease: 'power3' })

    const move = (e) => {
      xTo(e.clientX)
      yTo(e.clientY)
      gsap.set(el, { opacity: 1 })
    }
    const over = (e) => {
      const hot = e.target.closest?.('a, button, [data-cursor]')
      sTo(hot ? 3.2 : 1)
    }
    const leave = () => gsap.set(el, { opacity: 0 })

    window.addEventListener('mousemove', move, { passive: true })
    window.addEventListener('mouseover', over, { passive: true })
    document.documentElement.addEventListener('mouseleave', leave)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseover', over)
      document.documentElement.removeEventListener('mouseleave', leave)
      document.documentElement.classList.remove('custom-cursor')
    }
  }, [])

  return (
    <div
      ref={dot}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[130] -ml-[6px] -mt-[6px] h-3 w-3 rounded-full bg-diff opacity-0 mix-blend-difference"
    />
  )
}
