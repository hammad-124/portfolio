import { DISPLAY_FONT } from '../components/FluidHero'
import { PAPER } from '../lib/palette'

const label = 'text-[10.5px] font-bold uppercase tracking-[0.06em]'

/* Placeholder until the Work showcase is designed. */
export default function Work() {
  return (
    <section id="work" className="relative z-10 flex min-h-svh flex-col justify-between bg-ink px-5 py-24 text-paper">
      <p className={`${label} text-accent`}>Work — 04</p>
      <h2
        className="text-[clamp(64px,18vw,260px)] font-black uppercase leading-none tracking-[-0.03em]"
        style={{ fontFamily: DISPLAY_FONT, fontStretch: '125%', color: 'transparent', WebkitTextStroke: `2px ${PAPER}` }}
      >
        Work
      </h2>
      <p className={`${label} opacity-50`}>Showcase — coming next</p>
    </section>
  )
}
