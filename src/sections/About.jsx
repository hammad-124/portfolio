import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Line from '../components/Line'
import { EASE } from '../lib/motion'
import FitText from '../components/FitText'
import SpinBadge from '../components/SpinBadge'
import CountUp from '../components/CountUp'
import CursorImage from '../components/CursorImage'
import SkillPlayground from '../components/SkillPlayground'
import { useCurtain } from '../lib/curtain'
import { DISPLAY_FONT } from '../components/FluidHero'
import { site } from '../data/site'
import { about } from '../data/about'

const label = 'text-[10.5px] font-bold uppercase tracking-[0.06em]'
const display = { fontFamily: DISPLAY_FONT, fontStretch: '125%' }

// Statement lines share the vertical budget with the bio, so cap their size by viewport height.
function useLineCap() {
  const [cap, setCap] = useState(72)
  useEffect(() => {
    const calc = () => setCap(Math.max(40, window.innerHeight * 0.14))
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return cap
}

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

/* "Lahore · 18:42 PKT", ticking. */
function LocalTime({ city, timeZone }) {
  const [t, setT] = useState('')
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone })
    const tick = () => setT(fmt.format(new Date()))
    tick()
    const id = setInterval(tick, 15000)
    return () => clearInterval(id)
  }, [timeZone])
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-black" />
      </span>
      {city} · {t}
    </span>
  )
}

export default function About() {
  const go = useCurtain()
  const cap = useLineCap()
  const desktop = useMedia('(min-width: 768px)')
  const [hovering, setHovering] = useState(false)
  const D = 0.45 // base delay: lines rise while the curtain lifts

  return (
    <section className="relative h-svh w-full overflow-hidden bg-white text-black">
      {/* Corners */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-5">
        <button type="button" onClick={() => go('/', 'Home')} className="flex items-baseline gap-3">
          <Line delay={D} className="text-[22px] font-black leading-none tracking-[-0.06em]">HH.</Line>
          <Line delay={D + 0.05} className={label}>About — 02</Line>
        </button>
        <SpinBadge text={site.badge} icon="back" label="Back to home" onClick={() => go('/', 'Home')} />
      </header>

      {/* Body */}
      <div className="absolute inset-x-5 bottom-[4.5rem] top-[6.5rem] grid gap-8 overflow-y-auto md:grid-cols-[1.1fr_1fr] md:gap-10 md:overflow-visible">
        {/* Left: statement (hover = portrait follows the cursor), bio, facts */}
        <div className="flex min-w-0 flex-col justify-center pb-6 md:pb-10">
          <h1
            className="cursor-crosshair font-black uppercase leading-[0.86] tracking-[-0.03em]"
            style={display}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            {about.statement.map((t, i) => (
              <Line key={t} delay={D + i * 0.08} duration={1.1}>
                <FitText max={cap} className={i === about.statement.length - 1 ? 'outline-text' : ''}>
                  {t}
                </FitText>
              </Line>
            ))}
          </h1>

          <p className="mt-6 max-w-[34rem] text-[14px] font-medium leading-snug md:text-[15px]">
            <Line delay={D + 0.35}>{about.bio}</Line>
          </p>

          <dl className="mt-6 grid max-w-[36rem] grid-cols-2 gap-x-8 gap-y-4 border-t border-black/15 pt-4">
            {about.facts.map((f, i) => (
              <motion.div
                key={f.k}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE, delay: D + 0.5 + i * 0.07 }}
              >
                <dt className={`${label} opacity-50`}>{f.k}</dt>
                <dd className="mt-1 text-[13px] font-semibold leading-tight">{f.v}</dd>
                <dd className={`mt-0.5 ${label} opacity-50`}>{f.sub}</dd>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: D + 0.5 + about.facts.length * 0.07 }}
            >
              <dt className={`${label} opacity-50`}>Based in</dt>
              <dd className="mt-1 text-[13px] font-semibold leading-tight">
                <LocalTime city={about.city} timeZone={about.timeZone} />
              </dd>
              <dd className={`mt-0.5 ${label} opacity-50`}>Open to remote &amp; on-site</dd>
            </motion.div>
          </dl>
        </div>

        {/* Right: numbers on top, physics playground filling the rest */}
        <div className="flex min-w-0 flex-col">
          <ul className="flex flex-wrap gap-x-8 gap-y-4 border-b border-black/15 pb-4">
            {about.stats.map((s, i) => (
              <li key={s.label}>
                <Line delay={D + 0.3 + i * 0.07}>
                  <span
                    className="block text-[clamp(36px,4.6vw,64px)] font-black leading-none tracking-[-0.03em]"
                    style={display}
                  >
                    <CountUp value={s.value} delay={D + 0.4 + i * 0.1} />
                  </span>
                </Line>
                <Line delay={D + 0.4 + i * 0.07} className={`mt-2 max-w-[9rem] ${label} opacity-60`}>{s.label}</Line>
              </li>
            ))}
          </ul>

          <div className="relative mt-2 min-h-[180px] flex-1">
            {desktop ? (
              <SkillPlayground items={about.skills} delay={D + 0.9} />
            ) : (
              <ul className="flex flex-wrap gap-2 pt-2">
                {about.skills.map((s) => (
                  <li key={s} className={`rounded-full border border-black px-3 py-1.5 ${label}`}>{s}</li>
                ))}
              </ul>
            )}
            <motion.span
              className={`pointer-events-none absolute right-0 top-2 ${label} opacity-40`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: D + 2.5, duration: 1 }}
            >
              {desktop ? 'Drag them ↓' : 'Stack'}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Bottom edge: endless marquee = the floor the pills land on */}
      <motion.div
        className="absolute inset-x-0 bottom-0 flex h-[4.5rem] items-center overflow-hidden border-t border-black bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: D + 0.6 }}
      >
        <div className="marquee flex whitespace-nowrap" style={display}>
          {[...about.marquee, ...about.marquee].map((item, i) => (
            <span key={i} className="flex items-center pr-8 text-[34px] font-black uppercase leading-none tracking-[-0.02em]">
              <span className="outline-text">{item}</span>
              <span className="ml-8 text-[12px]" aria-hidden="true">✦</span>
            </span>
          ))}
        </div>
      </motion.div>

      {desktop && <CursorImage src={about.portrait} active={hovering} />}
    </section>
  )
}
