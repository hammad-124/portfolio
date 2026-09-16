import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import Line from '../components/Line'
import FitText from '../components/FitText'
import CountUp from '../components/CountUp'
import { DISPLAY_FONT } from '../components/FluidHero'
import { about } from '../data/about'

const label = 'text-[10.5px] font-bold uppercase tracking-[0.06em]'
const display = { fontFamily: DISPLAY_FONT, fontStretch: '125%' }

// The heading shares one screen with everything else, so cap its size by viewport height.
function useHeadingCap() {
  const [cap, setCap] = useState(80)
  useEffect(() => {
    const calc = () => setCap(Math.max(34, window.innerHeight * 0.17))
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return cap
}

/* "Lahore · 18:42", ticking. */
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
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      {city} · {t}
    </span>
  )
}

/**
 * The About page, living UNDER the water. It fills the hero's sticky viewport
 * and is revealed as the scroll-driven pour washes the landing away.
 * `stage` follows the pour: 1 = text rises, 2 = numbers count, 3 = hand-off hint.
 */
export default function AboutReveal({ stage = 0 }) {
  const cap = useHeadingCap()
  const textIn = stage >= 1

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink text-paper">
      {/* Warm light drifting behind the content */}
      <div className="blob" style={{ left: '-15%', top: '-30%', width: '55vw', height: '55vw', background: '#7A2E1A', opacity: 0.5 }} />
      <div className="blob" style={{ right: '-20%', bottom: '-40%', width: '60vw', height: '60vw', background: '#B07A4F', opacity: 0.3, animationDelay: '-7s', animationDirection: 'alternate-reverse' }} />

      <div className="absolute inset-x-5 bottom-4 top-[4.5rem] flex flex-col md:top-[5.5rem]">
        {/* Heading */}
        <div className="border-b border-paper/15 pb-3 md:pb-4">
          <h2 className="w-[72%] font-black uppercase leading-[0.86] tracking-[-0.03em] md:w-[44%]" style={display}>
            <Line play={textIn} duration={1.1}>
              <FitText max={cap}>
                About <span className="outline-text-paper">me.</span>
              </FitText>
            </Line>
          </h2>
        </div>

        {/* Body */}
        <div className="mt-5 grid min-h-0 flex-1 gap-8 md:mt-7 md:grid-cols-[1.15fr_1fr] md:gap-16">
          {/* Left: statement, bio, where */}
          <div className="flex min-w-0 flex-col justify-center">
            <p className="max-w-[32rem] text-[clamp(24px,2.6vw,40px)] font-medium leading-[1.06] tracking-[-0.015em]">
              <Line play={textIn} delay={0.15}>{about.quote}</Line>
            </p>
            <p className="mt-5 max-w-[32rem] text-[14px] leading-relaxed opacity-75 md:text-[15.5px]">
              <Line play={textIn} delay={0.25}>{about.bio}</Line>
            </p>
            <p className={`mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 ${label}`}>
              <Line play={textIn} delay={0.32}>
                <LocalTime city={about.city} timeZone={about.timeZone} />
              </Line>
              <Line play={textIn} delay={0.36} className="opacity-50">{about.availability}</Line>
            </p>
          </div>

          {/* Right: the numbers, stacked large */}
          <ul className="flex min-w-0 flex-col justify-center">
            {about.stats.map((s, i) => (
              <li
                key={s.label}
                className="flex items-baseline justify-between gap-6 border-t border-paper/15 py-3 last:border-b md:py-4"
              >
                <Line play={textIn} delay={0.3 + i * 0.08}>
                  <span
                    className="block text-[clamp(40px,5.6vw,84px)] font-black leading-none tracking-[-0.03em]"
                    style={display}
                  >
                    {stage >= 2 ? <CountUp value={s.value} delay={i * 0.1} /> : '000'}
                  </span>
                </Line>
                <Line play={textIn} delay={0.4 + i * 0.08} className={`text-right ${label} opacity-60`}>
                  {s.label}
                </Line>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: hand-off hint once the page is fully poured */}
        <motion.div
          className={`mt-3 flex items-center justify-end gap-2 ${label}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 3 ? 0.6 : 0 }}
          transition={{ duration: 0.6 }}
        >
          Keep scrolling — the journey
          <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
            <ArrowDown size={12} strokeWidth={2.5} />
          </motion.span>
        </motion.div>
      </div>
    </div>
  )
}
