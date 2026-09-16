import { useState } from 'react'
import Line from './Line'
import SpinBadge from './SpinBadge'
import Menu from './Menu'
import { useIntro } from '../lib/intro'
import { scrollTo } from '../lib/smooth'
import { site } from '../data/site'

const label = 'text-[10.5px] font-bold uppercase tracking-[0.06em]'

/* Fixed corners: monogram (back to top) and the spinning badge that opens the menu. */
export default function Header() {
  const play = useIntro()
  const [open, setOpen] = useState(false)
  const monogram = `${site.firstName[0]}${site.lastName[0]}`

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex items-start justify-between p-5 text-diff mix-blend-difference">
        <button
          type="button"
          onClick={() => { setOpen(false); scrollTo(0) }}
          className="pointer-events-auto flex items-baseline gap-3"
          aria-label="Back to top"
        >
          <Line delay={0.1} play={play} className="text-[22px] font-black leading-none tracking-[-0.06em]">
            {monogram}.
          </Line>
          <Line delay={0.15} play={play && !open} className={`hidden sm:block ${label}`}>
            {site.role}
          </Line>
        </button>
        <div className="-mr-1 -mt-1">
          <SpinBadge
            text={site.badge}
            play={play}
            open={open}
            label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          />
        </div>
      </header>
      <Menu open={open} onClose={() => setOpen(false)} />
    </>
  )
}
