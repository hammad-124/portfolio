import { ArrowUpRight } from 'lucide-react'
import { DISPLAY_FONT } from '../components/FluidHero'
import { site } from '../data/site'

const label = 'text-[10.5px] font-bold uppercase tracking-[0.06em]'

/* Simple for now: the email as the wordmark, links, résumé. */
export default function Contact() {
  return (
    <section id="contact" className="relative z-10 flex min-h-svh flex-col justify-between bg-peach px-5 py-24 text-ink">
      <p className={`${label} opacity-50`}>Contact — 05</p>
      <div>
        <p className="mb-6 text-[clamp(18px,1.6vw,22px)] font-medium leading-[1.05]">
          Have a product that should think?<br />Let's build it.
        </p>
        <a
          href={`mailto:${site.email}`}
          className="block break-all font-black uppercase leading-[0.9] tracking-[-0.03em] text-[clamp(28px,6.2vw,96px)] transition-colors duration-300 hover:text-accent"
          style={{ fontFamily: DISPLAY_FONT, fontStretch: '125%' }}
        >
          {site.email}
        </a>
      </div>
      <div className={`flex flex-wrap items-center justify-between gap-4 ${label}`}>
        <span>{site.fullName} — {site.location}</span>
        <div className="flex items-center gap-5">
          {site.links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="flex items-center gap-1 transition-colors hover:text-accent">
              {l.label} <ArrowUpRight size={12} strokeWidth={2.5} />
            </a>
          ))}
          {site.resume && (
            <a href={site.resume} target="_blank" rel="noreferrer" className="flex items-center gap-1 transition-colors hover:text-accent">
              Résumé <ArrowUpRight size={12} strokeWidth={2.5} />
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
