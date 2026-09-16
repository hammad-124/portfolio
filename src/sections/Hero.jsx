import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowDown, User } from 'lucide-react'
import FluidHero from '../components/FluidHero'
import Line from '../components/Line'
import { EASE } from '../lib/motion'
import SpinBadge from '../components/SpinBadge'
import { useCurtain } from '../lib/curtain'
import { site } from '../data/site'

/* What shows through when the water washes the white surface away. */
function Backdrop() {
  return (
    // Monochrome to match the white-paper / black-ink page: near-black with a
    // little drifting grey light so the reveal isn't a flat void.
    <div className="absolute inset-0 overflow-hidden bg-[#0a0a0a]">
      <div className="blob" style={{ left: '-10%', top: '-25%', width: '55vw', height: '55vw', background: '#3a3a3a' }} />
      <div className="blob" style={{ right: '-15%', top: '-10%', width: '50vw', height: '50vw', background: '#222', animationDelay: '-6s', animationDirection: 'alternate-reverse' }} />
      <div className="blob" style={{ left: '25%', bottom: '-35%', width: '60vw', height: '60vw', background: '#4a4a4a', animationDelay: '-10s' }} />
      {/* Full-bleed portrait revealed by the water. Wide image for desktop, tall one for phones.
          Rendered in black & white so any colour cast in the render (warm glow, etc.) disappears. */}
      {site.backdrop?.desktop && (
        <picture>
          {site.backdrop.mobile && (
            <source media="(max-width: 767px)" srcSet={site.backdrop.mobile} />
          )}
          <img
            src={site.backdrop.desktop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[center_top] grayscale contrast-110"
            draggable={false}
          />
        </picture>
      )}
      {site.video && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={site.video}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
    </div>
  )
}

function PhotoPlaceholder() {
  return (
    <div className="flex aspect-[3/4] h-full flex-col items-center justify-center gap-3 rounded-t-3xl border-2 border-dashed border-black/30 bg-black/[0.04] px-6 text-center text-black/60">
      <User size={40} strokeWidth={1.25} />
      <p className="text-sm font-medium">Your photo goes here</p>
      <p className="text-xs">
        Save a transparent PNG cutout as <code className="rounded bg-black/10 px-1">public/me.png</code>
      </p>
    </div>
  )
}

const label = 'text-[10.5px] font-bold uppercase tracking-[0.06em]'

export default function Hero() {
  const [photoOk, setPhotoOk] = useState(true)
  const go = useCurtain()

  return (
    <FluidHero words={{ left: site.firstName, right: site.lastName }} backdrop={<Backdrop />}>
      {/* Photo: sits on top of the water, always visible, feet on the bottom edge.
          Leave `site.photo` empty to hide it. */}
      {site.photo && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-[54svh] justify-center md:h-[84svh]"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
        >
          {photoOk ? (
            <img
              src={site.photo}
              alt={`${site.firstName} ${site.lastName} sitting on a chair`}
              onError={() => setPhotoOk(false)}
              className="h-full w-auto select-none object-contain object-bottom"
              draggable={false}
            />
          ) : (
            <PhotoPlaceholder />
          )}
        </motion.div>
      )}

      {/* UI: white text in difference mode reads black on the white surface */}
      <div className="pointer-events-none absolute inset-0 z-30 text-white mix-blend-difference">
        {/* Top-left: tagline + CTAs */}
        <div className="absolute left-5 top-5 max-w-[24rem]">
          <p className="text-[clamp(18px,1.6vw,22px)] font-medium leading-[1.05]">
            {site.tagline.map((t, i) => (
              <Line key={t} delay={0.15 + i * 0.08}>{t}</Line>
            ))}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <motion.a
              href={`mailto:${site.email}`}
              className={`pointer-events-auto inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 text-black ${label}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.45 }}
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
                className={`pointer-events-auto inline-flex items-center gap-3 rounded-full border border-white px-5 py-[11px] ${label}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.55 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                Résumé
                <ArrowDown size={12} strokeWidth={2.5} />
              </motion.a>
            )}
          </div>
        </div>

        {/* Top-right: spinning badge — for now it leads to About; it becomes the menu later */}
        <div className="absolute right-4 top-4">
          <SpinBadge text={site.badge} label="About me" onClick={() => go('/about', 'About')} />
        </div>

        {/* Bottom-left: blurb + stack */}
        <div className="absolute bottom-5 left-5 max-w-[30rem]">
          <p className="max-w-[24rem] text-[14px] font-medium leading-snug">
            <Line delay={0.55}>{site.blurb}</Line>
          </p>
          {site.stack?.length > 0 && (
            <p className={`mt-3 ${label} opacity-70`}>
              <Line delay={0.65}>{site.stack.join('  ·  ')}</Line>
            </p>
          )}
        </div>

        {/* Bottom-right: links */}
        <div className={`pointer-events-auto absolute bottom-5 right-5 flex items-center gap-3 ${label}`}>
          {[...site.links, { label: 'Email', href: `mailto:${site.email}` }].map((l, i) => (
            <span key={l.label} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden="true">/</span>}
              <a
                href={l.href}
                target={l.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="hover:opacity-60"
              >
                <Line delay={0.6 + i * 0.06}>{l.label}</Line>
              </a>
            </span>
          ))}
        </div>
      </div>
    </FluidHero>
  )
}
