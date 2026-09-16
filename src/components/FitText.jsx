import { useLayoutEffect, useRef, useState } from 'react'

const PROBE = 100 // px — measure at this size, then scale linearly

/**
 * Renders `children` (a single line of text) at whatever font-size makes it
 * exactly fill the parent's width. Re-fits on resize and once fonts load.
 * Pass `max` to cap the size.
 */
export default function FitText({ children, className = '', max = 400, as: Tag = 'span' }) {
  const outer = useRef(null)
  const inner = useRef(null)
  const [size, setSize] = useState(PROBE)

  useLayoutEffect(() => {
    const box = outer.current
    const text = inner.current
    if (!box || !text) return
    const parent = box.parentElement

    const fit = () => {
      // Measure the inline text itself (not the block), so the result is the
      // real ink width whether it's narrower or wider than the container.
      box.style.fontSize = `${PROBE}px`
      const w = text.getBoundingClientRect().width
      const avail = parent.clientWidth
      const next = w > 0 && avail > 0 ? Math.min(max, (PROBE * avail) / w) : PROBE
      box.style.fontSize = `${next}px`
      setSize(next)
    }

    fit()
    document.fonts?.ready.then(fit)
    const ro = new ResizeObserver(fit)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [children, max])

  return (
    <Tag ref={outer} className={`block whitespace-nowrap ${className}`} style={{ fontSize: size }}>
      <span ref={inner} className="inline-block">{children}</span>
    </Tag>
  )
}
