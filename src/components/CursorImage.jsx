import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'

/**
 * A portrait card that trails the mouse (with lag) and tilts with its speed.
 * Visible only while `active`. Positioning is GSAP on the outer node,
 * show/hide is Framer on the inner one, so the transforms don't fight.
 */
export default function CursorImage({ src, active, width = 220, height = 280 }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' })
    const rTo = gsap.quickTo(el, 'rotation', { duration: 0.8, ease: 'power3' })
    let lastX = null
    const move = (e) => {
      xTo(e.clientX)
      yTo(e.clientY)
      if (lastX !== null) rTo(Math.max(-14, Math.min(14, (e.clientX - lastX) * 0.5)))
      lastX = e.clientX
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed left-0 top-0 z-40"
      style={{ marginLeft: -width / 2, marginTop: -height / 2 }}
    >
      <motion.div
        className="overflow-hidden rounded-2xl bg-black shadow-2xl"
        style={{ width, height }}
        initial={false}
        animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.7 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <img src={src} alt="" className="h-full w-full object-cover object-top grayscale" draggable={false} />
      </motion.div>
    </div>
  )
}
