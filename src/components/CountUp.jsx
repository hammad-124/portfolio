import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/* Counts "07", "1.5+", "$12k" etc. up from zero, keeping prefix/suffix and zero-padding. */
export default function CountUp({ value, delay = 0, duration = 1.6 }) {
  const ref = useRef(null)

  useEffect(() => {
    const m = String(value).match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/)
    const el = ref.current
    if (!m || !el) return
    const [, pre, num, suf] = m
    const decimals = (num.split('.')[1] || '').length
    const pad = num.split('.')[0].length
    const obj = { v: 0 }
    const tween = gsap.to(obj, {
      v: parseFloat(num),
      duration,
      delay,
      ease: 'power3.out',
      onUpdate: () => {
        const s = decimals
          ? obj.v.toFixed(decimals)
          : String(Math.round(obj.v)).padStart(pad, '0')
        el.textContent = pre + s + suf
      },
    })
    return () => tween.kill()
  }, [value, delay, duration])

  return <span ref={ref}>{value}</span>
}
