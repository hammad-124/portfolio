import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { CurtainCtx } from '../lib/curtain'
import { DISPLAY_FONT } from './FluidHero'

export function CurtainProvider({ children }) {
  const navigate = useNavigate()
  const panel = useRef(null)
  const busy = useRef(false)
  const [name, setName] = useState('')

  const go = useCallback(
    (to, label = '') => {
      if (busy.current) return
      busy.current = true
      setName(label)
      const el = panel.current
      gsap
        .timeline({ onComplete: () => { busy.current = false } })
        .set(el, { yPercent: 100, display: 'flex' })
        .to(el, { yPercent: 0, duration: 0.55, ease: 'power4.inOut' })
        .add(() => navigate(to))
        .to(el, { yPercent: -100, duration: 0.6, ease: 'power4.inOut', delay: 0.15 })
        .set(el, { display: 'none' })
    },
    [navigate],
  )

  return (
    <CurtainCtx.Provider value={go}>
      {children}
      <div
        ref={panel}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[100] hidden items-center justify-center bg-black text-white"
        style={{ fontFamily: DISPLAY_FONT, fontStretch: '125%' }}
      >
        <span className="text-[18vw] font-black uppercase leading-none tracking-[-0.03em]">{name}</span>
      </div>
    </CurtainCtx.Provider>
  )
}
