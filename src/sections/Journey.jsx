import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import Line from '../components/Line'
import FitText from '../components/FitText'
import { DISPLAY_FONT } from '../components/FluidHero'
import { EASE } from '../lib/motion'
import { about } from '../data/about'

const PIN_HEIGHT = 300 // svh of pinned scroll
const ROUTE_END = 0.86 // the route completes here; the rest holds the finished map before Work slides in

const label = 'text-[10.5px] font-bold uppercase tracking-[0.06em]'
const display = { fontFamily: DISPLAY_FONT, fontStretch: '125%' }

// Stop positions as fractions of the stage. Desktop: a rising route, left -> right.
// Mobile: a vertical run down the left edge.
const DESKTOP = [[0.12, 0.72], [0.5, 0.48], [0.88, 0.2]]
const MOBILE = [[0.1, 0.12], [0.1, 0.5], [0.1, 0.88]]

// Card placement relative to each stop (desktop): above-right, below-right, above-left.
const CARD_DESKTOP = [
  { left: 28, bottom: 28 },
  { left: 28, top: 28 },
  { right: 28, bottom: 16 },
]

function useMedia(query) {
  const [ok, setOk] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setOk(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return ok
}

/* Smooth route through the stops: cubic segments with horizontal tangents (S-curves). */
function routePath(pts) {
  return pts
    .map(([x, y], i) => {
      if (!i) return `M ${x.toFixed(1)} ${y.toFixed(1)}`
      const [x0, y0] = pts[i - 1]
      const cx = (x - x0) * 0.5
      return `C ${(x0 + cx).toFixed(1)} ${y0.toFixed(1)}, ${(x - cx).toFixed(1)} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

/**
 * Full-page journey: pinned while a route is drawn across the screen by
 * scroll. A glowing head travels Education -> MAGMA3C -> Axtra; stops light
 * up and their cards rise in as the head reaches them. Fully reversible.
 */
export default function Journey() {
  const wrap = useRef(null)
  const stageRef = useRef(null)
  const pathRef = useRef(null)
  const headRef = useRef(null)
  const barRef = useRef(null)
  const desktop = useMedia('(min-width: 768px)')
  const inView = useInView(stageRef, { once: true, amount: 0.3 })
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [geom, setGeom] = useState(null) // { L, anchors }
  const [reached, setReached] = useState(0)

  const stops = about.timeline
  const frac = desktop ? DESKTOP : MOBILE
  const pts = frac.map(([fx, fy]) => [fx * size.w, fy * size.h])
  const d = size.w ? routePath(pts) : ''

  // Stage size drives the route geometry.
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Where along the route each stop sits (arc length), found by sampling.
  useEffect(() => {
    const path = pathRef.current
    if (!path || !d) return
    const L = path.getTotalLength()
    const anchors = pts.map(([x, y]) => {
      let best = 0
      let bd = Infinity
      for (let i = 0; i <= 400; i++) {
        const l = (L * i) / 400
        const p = path.getPointAtLength(l)
        const dist = Math.hypot(p.x - x, p.y - y)
        if (dist < bd) { bd = dist; best = l }
      }
      return best
    })
    setGeom({ L, anchors })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d])

  // Scroll -> route progress. Draws the line, moves the head, lights stops.
  useEffect(() => {
    if (!geom) return
    let raf
    let last = -1
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = wrap.current
      const path = pathRef.current
      const head = headRef.current
      if (!el || !path || !head) return
      const r = el.getBoundingClientRect()
      const range = Math.max(1, r.height - window.innerHeight)
      const q = Math.min(1, Math.max(0, -r.top / range))
      const t = Math.min(1, q / ROUTE_END)
      const { L, anchors } = geom
      path.style.strokeDasharray = `${L}`
      path.style.strokeDashoffset = `${L * (1 - t)}`
      const p = path.getPointAtLength(L * t)
      head.setAttribute('transform', `translate(${p.x} ${p.y})`)
      head.style.opacity = t > 0.005 ? '1' : '0'
      if (barRef.current) barRef.current.style.transform = `scaleX(${t})`
      const n = t < 0.01 ? 0 : anchors.filter((a) => L * t >= a - 4).length
      if (n !== last) { last = n; setReached(n) }
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [geom])

  const current = stops[Math.max(0, reached - 1)]

  return (
    <section id="journey" ref={wrap} className="relative" style={{ height: `${PIN_HEIGHT}svh` }}>
      <div className="sticky top-0 h-svh overflow-hidden bg-paper text-ink">
        {/* Heading */}
        <div className="absolute left-5 right-5 top-[4.5rem] md:top-[5.5rem]">
          <h2 className="w-[60%] font-black uppercase leading-[0.86] tracking-[-0.03em] md:w-[34%]" style={display}>
            <Line play={inView} duration={1.1}>
              <FitText max={Math.max(36, size.h * 0.16)}>
                The <span className="outline-text">journey.</span>
              </FitText>
            </Line>
          </h2>
        </div>

        {/* Stage: route + stops + cards */}
        <div ref={stageRef} className="absolute inset-x-5 bottom-[4.5rem] top-[11rem] md:top-[13rem]">
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {d && (
              <>
                {/* dotted track */}
                <path d={d} fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
                {/* drawn route */}
                <path ref={pathRef} d={d} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" />
                {/* travelling head */}
                <g ref={headRef} style={{ opacity: 0 }}>
                  <circle r="18" fill="var(--color-accent)" opacity="0.14" />
                  <circle r="9" fill="var(--color-accent)" opacity="0.35" />
                  <circle r="5" fill="var(--color-accent)" />
                </g>
              </>
            )}
          </svg>

          {stops.map((s, i) => {
            const lit = reached > i
            const [x, y] = pts[i] ?? [0, 0]
            const place = desktop ? CARD_DESKTOP[i] : { left: 28, top: -8 }
            return (
              <div key={s.title}>
                {/* Stop marker */}
                <div className="absolute" style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}>
                  <span className="relative flex h-6 w-6 items-center justify-center">
                    {lit && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-30" />}
                    <span
                      className={`relative block h-3.5 w-3.5 rounded-full border-2 transition-colors duration-500 ${
                        lit ? 'border-accent bg-accent' : 'border-ink/40 bg-paper'
                      }`}
                    />
                  </span>
                </div>

                {/* Card */}
                <motion.div
                  className="absolute w-[min(22rem,60vw)]"
                  style={{
                    left: place.left != null ? x + place.left : undefined,
                    right: place.right != null ? size.w - x + place.right : undefined,
                    top: place.top != null ? y + place.top : undefined,
                    bottom: place.bottom != null ? size.h - y + place.bottom : undefined,
                  }}
                  initial={{ opacity: 0, y: 14 }}
                  animate={lit ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                  transition={{ duration: 0.8, ease: EASE }}
                >
                  <p className="text-[clamp(28px,4vw,56px)] font-black leading-none tracking-[-0.03em] text-accent" style={display}>
                    {s.year}
                  </p>
                  <p className={`mt-2 ${label} opacity-50`}>{s.label}</p>
                  <p className="mt-1 text-[16px] font-semibold leading-tight md:text-[18px]">{s.title}</p>
                  <p className={`mt-1 ${label} opacity-60`}>{s.org} · {s.period}</p>
                  {s.note && (
                    <p className="mt-2 max-w-[20rem] text-[13px] leading-snug opacity-70 [@media(max-height:640px)]:hidden">
                      {s.note}
                    </p>
                  )}
                </motion.div>
              </div>
            )
          })}
        </div>

        {/* Footer: readout + progress bar + hint */}
        <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-6">
          <div className={label}>
            <p className="opacity-50">
              {String(Math.max(1, reached)).padStart(2, '0')} / {String(stops.length).padStart(2, '0')}
            </p>
            <p className="mt-1 text-[13px] font-semibold normal-case tracking-normal">
              {reached ? `${current.title} — ${current.org}` : 'Start of the route'}
            </p>
          </div>
          <div className="flex w-[40%] max-w-[22rem] flex-col items-end gap-2">
            <motion.p
              className={`flex items-center gap-2 ${label}`}
              animate={{ opacity: reached >= stops.length ? 0.7 : 0 }}
              transition={{ duration: 0.5 }}
            >
              Keep scrolling for work
              <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
                <ArrowDown size={12} strokeWidth={2.5} />
              </motion.span>
            </motion.p>
            <div className="h-px w-full bg-ink/15">
              <div ref={barRef} className="h-full origin-left bg-accent" style={{ transform: 'scaleX(0)' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
