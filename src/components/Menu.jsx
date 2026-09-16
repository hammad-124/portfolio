import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ArrowUpRight } from 'lucide-react'
import { DISPLAY_FONT } from './FluidHero'
import { scrollTo } from '../lib/smooth'
import { site } from '../data/site'

const ITEMS = [
  { n: '01', label: 'Home', target: 0 },
  // About lives under the water: its fully-revealed position is the end of the hero's pin.
  { n: '02', label: 'About', target: () => (document.getElementById('home').offsetHeight - window.innerHeight) * 0.82 },
  { n: '03', label: 'Journey', target: () => { const j = document.getElementById('journey'); return j.offsetTop + (j.offsetHeight - window.innerHeight) * 0.08 } },
  { n: '04', label: 'Work', target: '#work' },
  { n: '05', label: 'Contact', target: '#contact' },
]

const label = 'text-[10.5px] font-bold uppercase tracking-[0.06em]'

/**
 * Full-screen menu that blooms out of the badge's corner (clip-path circle)
 * instead of sliding in; items rise from clipped boxes. Picking one scrolls
 * the page smoothly to that section.
 */
export default function Menu({ open, onClose }) {
  const root = useRef(null)
  const items = useRef([])
  const foot = useRef(null)

  useEffect(() => {
    const el = root.current
    const rows = items.current.filter(Boolean)
    gsap.killTweensOf([el, ...rows, foot.current])
    if (open) {
      gsap.set(el, { display: 'block' })
      gsap.set(rows, { yPercent: 110 })
      gsap.set(foot.current, { opacity: 0, y: 10 })
      gsap.timeline()
        .fromTo(el, { clipPath: 'circle(0% at calc(100% - 4rem) 4rem)' },
          { clipPath: 'circle(150% at calc(100% - 4rem) 4rem)', duration: 0.9, ease: 'power4.inOut' })
        .to(rows, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.07 }, '-=0.45')
        .to(foot.current, { opacity: 1, y: 0, duration: 0.6 }, '-=0.6')
    } else {
      gsap.timeline()
        .to(rows, { yPercent: -110, duration: 0.5, ease: 'power3.in', stagger: 0.04 })
        .to(el, { clipPath: 'circle(0% at calc(100% - 4rem) 4rem)', duration: 0.7, ease: 'power4.inOut' }, '-=0.25')
        .set(el, { display: 'none' })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Scroll starts at once: the page glides behind the closing circle.
  const go = (target) => {
    onClose()
    scrollTo(target)
  }

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[70] hidden bg-ink text-paper"
      style={{ clipPath: 'circle(0% at calc(100% - 4rem) 4rem)' }}
      aria-hidden={!open}
    >
      <nav className="absolute inset-x-5 bottom-16 top-24 flex items-center md:inset-x-10" aria-label="Sections">
        <ul className="w-full">
          {ITEMS.map((it, i) => (
            <li key={it.label} className="overflow-hidden border-b border-paper/15 first:border-t">
              <button
                ref={(el) => { items.current[i] = el }}
                type="button"
                onClick={() => go(it.target)}
                className="group flex w-full items-baseline gap-5 py-1.5 text-left md:gap-10 md:py-2"
              >
                <span className={`${label} w-8 opacity-50`}>{it.n}</span>
                <span
                  className="text-[clamp(36px,min(10vw,14svh),124px)] font-black uppercase leading-[0.95] tracking-[-0.03em] transition-[transform,color] duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-4 group-hover:text-accent"
                  style={{ fontFamily: DISPLAY_FONT, fontStretch: '125%' }}
                >
                  {it.label}
                </span>
                <ArrowUpRight
                  size={22}
                  strokeWidth={2.5}
                  className="ml-auto text-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div ref={foot} className={`absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between gap-4 ${label}`}>
        <a href={`mailto:${site.email}`} className="transition-colors hover:text-accent">{site.email}</a>
        <div className="flex items-center gap-4">
          {site.links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="transition-colors hover:text-accent">
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
