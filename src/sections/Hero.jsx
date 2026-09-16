import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowDown } from 'lucide-react'
import FluidHero from '../components/FluidHero'
import Line from '../components/Line'
import { EASE } from '../lib/motion'
import { useIntro } from '../lib/intro'
import { site } from '../data/site'
import AboutReveal from './AboutReveal'

const PIN_HEIGHT = 280 // svh — total pinned scroll
const POUR_END = 0.82  // most of the pin pours the water; the rest holds About fully revealed

// Phone/tablet photo geometry (must match the classes on the photo below):
// phones: touches the bottom edge, height min(58svh, 100svh - 300px); tablets (md): bottom 136px, height 44svh.
const photoBox = (w, h) =>
  w >= 768 ? { bottom: 136, height: h * 0.44 } : { bottom: 0, height: Math.min(h * 0.58, h - 300) }
// The name is centred between the buttons and the top of the photo.
const portraitBand = (w, h) => {
  const p = photoBox(w, h)
  return [w >= 768 ? 176 : 150, h - p.bottom - p.height - 12]
}

const label = 'text-[10.5px] font-bold uppercase tracking-[0.06em]'

/**
 * Pinned hero: the section is PIN_HEIGHT tall and the surface sticks to the
 * top. Scroll progress pours the water down the surface (fluid "wash"), with
 * splats churning along the waterline so it moves like liquid, not a wipe.
 * Underneath the surface sits the About page, which the pour reveals.
 */
export default function Hero() {
  const wrap = useRef(null)
  const fxRef = useRef(null)
  const uiRef = useRef(null)
  const photoRef = useRef(null)
  const [stage, setStage] = useState(0) // 0 landing, 1 About text in, 2 numbers count, 3 hand-off hint
  // Every entrance waits for the preloader to lift, so name and UI arrive together.
  const play = useIntro()
  const show = (delay) => ({
    initial: { opacity: 0, y: 12 },
    animate: play ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    transition: { duration: 0.8, ease: EASE, delay },
  })

  useEffect(() => {
    let raf
    let last = 0
    let stageRef = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const fx = fxRef.current
      const el = wrap.current
      if (!fx || !el) return
      const r = el.getBoundingClientRect()
      const range = Math.max(1, r.height - window.innerHeight)
      const q = Math.min(1, Math.max(0, -r.top / range))
      const p = Math.min(1, q / POUR_END)
      fx.setWash(p)

      // The landing UI (and the phone/tablet photo) dissolves as the pour starts, so nothing sits over the About page.
      const o = Math.max(0, Math.min(1, 1 - (p - 0.04) / 0.26))
      for (const el of [uiRef.current, photoRef.current]) {
        if (!el) continue
        el.style.opacity = String(o)
        el.style.visibility = o > 0.02 ? 'visible' : 'hidden'
      }
      if (photoRef.current) photoRef.current.style.transform = `translateY(${(1 - o) * 40}px)`

      // About entrances are tied to how far the water has poured.
      const next = q > 0.95 ? 3 : p > 0.62 ? 2 : p > 0.28 ? 1 : 0
      if (next !== stageRef) { stageRef = next; setStage(next) }

      const d = p - last
      if (Math.abs(d) > 0.0006) {
        // Churn the waterline: a few splats along the front, pushed in the scroll direction.
        const front = Math.min(1, Math.max(0, p * 1.35 - 0.12))
        for (let i = 0; i < 3; i++) {
          fx.splat(
            Math.random(),
            front + (Math.random() - 0.5) * 0.14,
            (Math.random() - 0.5) * 0.004,
            Math.sign(d) * 0.012 + (Math.random() - 0.5) * 0.004,
            0.55,
          )
        }
        last = p
      }
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <section id="home" ref={wrap} className="relative" style={{ height: `${PIN_HEIGHT}svh` }}>
      <div className="sticky top-0 h-svh">
        <FluidHero
          words={{ left: site.firstName, right: site.lastName }}
          backdrop={<AboutReveal stage={stage} />}
          play={play}
          portraitBand={site.photoMobile ? portraitBand : null}
          onEngine={(fx) => { fxRef.current = fx }}
        >
          {/* Phones & tablets only: a portrait card fills the tall space under the name (desktop stays type-only) */}
          {site.photoMobile && (
            <div ref={photoRef} className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[min(58svh,calc(100svh-300px))] md:bottom-[136px] md:h-[44svh] lg:hidden">
            <motion.div
              className="flex h-full justify-center"
              initial={{ y: 40, opacity: 0 }}
              animate={play ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
              transition={{ duration: 1.2, ease: EASE, delay: 0.35 }}
            >
              <img
                src={site.photoMobile}
                alt={`${site.firstName} ${site.lastName}`}
                className="h-full w-auto select-none object-contain object-bottom"
                draggable={false}
              />
            </motion.div>
            </div>
          )}
          {/* Landing UI: difference-blend layer; text-diff resolves to espresso over the sand surface */}
          <div ref={uiRef} className="pointer-events-none absolute inset-0 z-30 text-diff mix-blend-difference">
            {/* Top-left: tagline + CTAs (below the fixed header's monogram) */}
            <div className="absolute left-5 top-16 max-w-[24rem] md:top-20">
              <p className="text-[clamp(18px,1.6vw,22px)] font-medium leading-[1.05]">
                {site.tagline.map((t, i) => (
                  <Line key={t} delay={0.15 + i * 0.08} play={play}>{t}</Line>
                ))}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <motion.a
                  href={`mailto:${site.email}`}
                  className={`pointer-events-auto inline-flex items-center gap-3 rounded-full bg-diff px-5 py-3 text-ink ${label}`}
                  {...show(0.45)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Let's talk
                  <ArrowRight size={12} strokeWidth={2.5} />
                </motion.a>
                {site.resume && (
                  <motion.a
                    href={site.resume}
                    target="_blank"
                    rel="noreferrer"
                    className={`pointer-events-auto inline-flex items-center gap-3 rounded-full border border-diff px-5 py-[11px] ${label}`}
                    {...show(0.55)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Résumé
                    <ArrowDown size={12} strokeWidth={2.5} />
                  </motion.a>
                )}
              </div>
            </div>

            {/* Bottom: blurb + stack (left) and links + scroll hint (right); stacked on phones */}
            <div className="absolute inset-x-5 bottom-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="hidden max-w-[30rem] md:block">
                <p className="max-w-[24rem] text-[13px] font-medium leading-snug md:text-[14px]">
                  <Line delay={0.55} play={play}>{site.blurb}</Line>
                </p>
                {site.stack?.length > 0 && (
                  <p className={`mt-2 hidden ${label} opacity-70 sm:block md:mt-3`}>
                    <Line delay={0.65} play={play}>{site.stack.join('  ·  ')}</Line>
                  </p>
                )}
              </div>

              <div className={`pointer-events-auto flex flex-col gap-2.5 text-[10px] md:items-end md:gap-3 md:text-[10.5px] ${label}`}>
                <div className="flex shrink-0 items-center justify-end gap-2">
                  <Line delay={0.8} play={play}>Scroll to pour</Line>
                  <motion.span
                    animate={{ y: [0, 4, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ArrowDown size={12} strokeWidth={2.5} />
                  </motion.span>
                </div>
                <div className="hidden items-center justify-between gap-3 md:flex md:justify-end">
                {[...site.links, { label: 'Email', href: `mailto:${site.email}` }].map((l, i) => (
                  <span key={l.label} className="flex items-center gap-3">
                    {i > 0 && <span aria-hidden="true" className="hidden md:inline">/</span>}
                    <a
                      href={l.href}
                      target={l.href.startsWith('http') ? '_blank' : undefined}
                      rel="noreferrer"
                      className="hover:opacity-60"
                    >
                      <Line delay={0.6 + i * 0.06} play={play}>{l.label}</Line>
                    </a>
                  </span>
                ))}
                </div>
              </div>
            </div>
          </div>
        </FluidHero>
      </div>
    </section>
  )
}
