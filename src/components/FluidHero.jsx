import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { FluidReveal } from '../lib/fluidReveal'
import { INK, PAPER } from '../lib/palette'

// Wide, heavy grotesk for the wordmark (Archivo variable, width axis pushed to 125%).
export const DISPLAY_FONT = '"Archivo", "Archivo Black", "Inter Tight", system-ui, sans-serif'
const DISPLAY_WEIGHT = 900

// Entrance: each letter rises from below its baseline, in random order.
// Same numbers as the reference site's wordmark reveal.
const REVEAL = { from: 1.2, duration: 1.8, stagger: 0.07, delay: 0.2, ease: 'power4.inOut' }

/**
 * Paints the white "surface" with the name as two full-width lines:
 * first name flush left on line 1, last name flush right on line 2,
 * centred vertically like a magazine masthead. Each letter is drawn
 * separately, shifted down by `letter.off * fontSize` and clipped to its
 * line box, which is what makes the rise-up entrance possible.
 */
function bakeWords(ctx, w, h, { lines, ink, paper, padX, blockTop, blockHeight, lineGap }) {
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = ink
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  if ('letterSpacing' in ctx) ctx.letterSpacing = '-0.03em'
  if ('fontStretch' in ctx) ctx.fontStretch = 'expanded'

  const maxW = w - padX * 2
  const setFont = (px) => { ctx.font = `${DISPLAY_WEIGHT} ${px}px ${DISPLAY_FONT}` }

  // Size that makes `text` exactly maxW wide.
  const fitWidth = (text) => {
    setFont(100)
    return (100 * maxW) / ctx.measureText(text).width
  }

  // Size that makes the two-line block exactly blockHeight tall.
  setFont(100)
  const capRatio = ctx.measureText(lines[0].text).actualBoundingBoxAscent / 100
  const fitHeight = (h * blockHeight) / (capRatio + lineGap)

  const size = Math.min(...lines.map((l) => fitWidth(l.text)), fitHeight)
  setFont(size)

  let baseline = 0
  lines.forEach((line, li) => {
    const m = ctx.measureText(line.text)
    if (li === 0) baseline = h * blockTop + m.actualBoundingBoxAscent
    else baseline += lineGap * size

    // Flush left for line 1, flush right for line 2 (measured on ink, not advance).
    const x0 = line.align === 'right'
      ? w - padX - m.actualBoundingBoxRight
      : padX + m.actualBoundingBoxLeft

    // Clip box hugs the line so letters emerge from just below the baseline.
    const top = baseline - m.actualBoundingBoxAscent - size * 0.02
    const bottom = baseline + size * 0.03
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, top, w, bottom - top)
    ctx.clip()

    for (let i = 0; i < line.text.length; i++) {
      const off = line.letters[i]?.off ?? 0
      if (off >= REVEAL.from) continue // still fully hidden
      const dx = ctx.measureText(line.text.slice(0, i)).width
      ctx.fillText(line.text[i], x0 + dx, baseline + off * size)
    }
    ctx.restore()
  })
}

/**
 * Layer stack (bottom -> top):
 *   backdrop  — whatever should show through the water (video / gradient)
 *   canvas    — fluid-masked white surface with the giant words baked in
 *   children  — photo + UI, rendered on top (use mix-blend-difference for text)
 *
 * `play` gates the letter entrance so it can wait for a preloader.
 */
export default function FluidHero({
  words,
  backdrop,
  children,
  play = true,
  onEngine,
  ink = INK,
  paper = PAPER,
  padX = 20,
  blockTop = 0.26,     // wordmark block starts at 26% of the height...
  blockHeight = 0.62,  // ...and is at most 62% tall
  lineGap = 0.86,      // baseline-to-baseline distance in em
  settings,
  className = '',
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const settingsRef = useRef(settings)
  const fxRef = useRef(null)
  const linesRef = useRef(null)
  const [fontsReady, setFontsReady] = useState(false)
  // The backdrop stays hidden until the white surface has actually been drawn,
  // otherwise a cached image flashes on reload before the canvas covers it.
  const [ready, setReady] = useState(false)

  // 1. Engine + baked surface. Letters start fully hidden below their baseline.
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = reduceMotion ? 0 : REVEAL.from

    const lines = [
      { text: words.left, align: 'left' },
      { text: words.right, align: 'right' },
    ].map((l) => ({ ...l, letters: [...l.text].map(() => ({ off: start })) }))
    linesRef.current = lines

    const fx = new FluidReveal({
      container,
      canvas,
      settings: settingsRef.current,
      onFirstFrame: () => setReady(true),
      bake: (ctx, w, h) =>
        bakeWords(ctx, w, h, { lines, ink, paper, padX, blockTop, blockHeight, lineGap }),
    })
    fxRef.current = fx
    onEngine?.(fx)

    let cancelled = false
    setFontsReady(false)
    document.fonts
      .load(`${DISPLAY_WEIGHT} 100px "Archivo"`)
      .then(() => document.fonts.ready)
      .then(() => { if (!cancelled) { fx.rebake(); setFontsReady(true) } })
      .catch(() => { if (!cancelled) setFontsReady(true) })

    return () => {
      cancelled = true
      fx.destroy()
      fxRef.current = null
      onEngine?.(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.left, words.right, ink, paper, padX, blockTop, blockHeight, lineGap])

  // 2. Letter entrance — only once the font is in AND the page says go.
  useEffect(() => {
    const fx = fxRef.current
    const lines = linesRef.current
    if (!fx || !lines || !fontsReady || !play) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Random order, like the reference: shuffle every letter across both lines.
    const targets = lines.flatMap((l) => l.letters)
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[targets[i], targets[j]] = [targets[j], targets[i]]
    }

    const tl = gsap.timeline({
      delay: REVEAL.delay,
      onUpdate: () => fx.rebake(),
      onComplete: () => fx.rebake(),
    })
    targets.forEach((letter, i) => {
      tl.to(letter, { off: 0, duration: REVEAL.duration, ease: REVEAL.ease }, i * REVEAL.stagger)
    })
    return () => tl.kill()
  }, [fontsReady, play])

  return (
    <div
      ref={containerRef}
      className={`relative h-svh w-full overflow-hidden ${className}`}
      style={{ backgroundColor: paper }}
    >
      <div className={`absolute inset-0 z-0 ${ready ? '' : 'invisible'}`}>{backdrop}</div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 block h-full w-full"
      />
      {children}
    </div>
  )
}
