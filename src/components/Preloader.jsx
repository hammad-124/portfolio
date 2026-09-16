import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { Delaunay } from 'd3-delaunay'
import { DISPLAY_FONT } from './FluidHero'
import { site } from '../data/site'
import { INK, PAPER, ACCENT } from '../lib/palette'

const MIN_MS = 1700 // never flash: the fill takes at least this long

/* Voronoi fracture of the viewport: a cluster of seeds near the impact point
   gives the dense radial cracks glass makes, the rest fill the screen. Each
   shard is described in its own bounding box so its layer stays small. */
function makeShards(W, H) {
  const count = W < 768 ? 20 : 34
  const cx = W / 2
  const cy = H / 2
  const seeds = []
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 30 + Math.random() * Math.min(W, H) * 0.22
    seeds.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  for (let i = 10; i < count; i++) seeds.push([Math.random() * W, Math.random() * H])

  const voronoi = Delaunay.from(seeds).voronoi([0, 0, W, H])
  return seeds
    .map((_, i) => {
      const poly = voronoi.cellPolygon(i)
      if (!poly) return null
      const xs = poly.map((p) => p[0])
      const ys = poly.map((p) => p[1])
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)
      const c = poly.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]).map((v) => v / poly.length)
      const d = Math.hypot(c[0] - cx, c[1] - cy) || 1
      return {
        box: { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY },
        clip: `polygon(${poly.map(([x, y]) => `${(x - minX).toFixed(1)}px ${(y - minY).toFixed(1)}px`).join(',')})`,
        origin: `${(c[0] - minX).toFixed(1)}px ${(c[1] - minY).toFixed(1)}px`,
        path: voronoi.renderCell(i),
        d,
        dir: [(c[0] - cx) / d, (c[1] - cy) / d],
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.d - b.d)
}

/* The slab's face, drawn to a canvas: hollow monogram + ink fill, counter, name. */
function drawFace(ctx, W, H, p, monogram) {
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = PAPER
  ctx.strokeStyle = PAPER
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  if ('fontStretch' in ctx) ctx.fontStretch = 'expanded'
  if ('letterSpacing' in ctx) ctx.letterSpacing = '-0.04em'

  // Monogram, ink-centred in the viewport.
  const size = W >= 768 ? W * 0.26 : W * 0.34
  ctx.font = `900 ${size}px ${DISPLAY_FONT}`
  const m = ctx.measureText(monogram)
  const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight
  const x = (W - inkW) / 2 + m.actualBoundingBoxLeft
  const asc = m.actualBoundingBoxAscent
  const y = H / 2 + asc / 2
  ctx.lineWidth = 2
  ctx.strokeText(monogram, x, y)
  // Ink rises from the baseline to the top of the caps as p goes 0 -> 100.
  const fillH = (asc * p) / 100
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, y - fillH, W, fillH + size * 0.05)
  ctx.clip()
  ctx.fillText(monogram, x, y)
  ctx.restore()

  // Counter, bottom-left.
  const cs = W >= 768 ? 88 : 64
  ctx.font = `900 ${cs}px ${DISPLAY_FONT}`
  const label = String(p).padStart(3, '0')
  ctx.fillText(label, 20, H - 20)
  const lw = ctx.measureText(label).width
  ctx.font = `700 14px ${DISPLAY_FONT}`
  ctx.fillStyle = ACCENT
  ctx.fillText('%', 20 + lw + 4, H - 20)
  ctx.fillStyle = PAPER

  // Name, bottom-right.
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0.06em'
  ctx.font = `700 10.5px "Inter Tight", system-ui, sans-serif`
  ctx.textAlign = 'right'
  ctx.globalAlpha = 0.7
  ctx.fillText(`${site.fullName} — Portfolio`.toUpperCase(), W - 20, H - 24)
  ctx.globalAlpha = 1
}

/**
 * Black slab with the monogram filling with "ink" while a counter runs
 * 000 -> 100. When assets are ready it cracks from the centre and shatters
 * into shards that fall away, revealing the page. `onReveal` fires as the
 * shards break (so the page's entrances run underneath), `onExit` when gone.
 */
export default function Preloader({ onReveal, onExit }) {
  const root = useRef(null)
  const face = useRef(null)
  const cracks = useRef(null)
  const shardEls = useRef([])
  const [p, setP] = useState(0)
  const monogram = `${site.firstName[0]}${site.lastName[0]}.`
  const [W, H] = useMemo(() => [window.innerWidth, window.innerHeight], [])
  const shards = useMemo(() => makeShards(W, H), [W, H])

  // Paint the face whenever progress changes (and again once the font arrives).
  useEffect(() => {
    const canvas = face.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== Math.round(W * dpr)) {
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
    }
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawFace(ctx, W, H, p, monogram)
  }, [p, W, H, monogram])

  useEffect(() => {
    const t0 = performance.now()
    const obj = { v: 0 }
    const paint = () => setP(Math.round(obj.v))
    let cancelled = false

    // Crack lines start fully "undrawn".
    const paths = [...cracks.current.querySelectorAll('path')]
    paths.forEach((el) => {
      const len = el.getTotalLength()
      el.style.strokeDasharray = `${len}`
      el.style.strokeDashoffset = `${len}`
    })

    const assets = Promise.all([
      document.fonts.load(`900 100px "Archivo"`),
      document.fonts.ready,
    ]).catch(() => {})

    // Run to ~90 quickly, hold for assets + minimum time, then snap to 100 and break.
    const first = gsap.to(obj, { v: 90, duration: 1.4, ease: 'power2.out', onUpdate: paint })

    let finish
    assets.then(async () => {
      const wait = Math.max(0, MIN_MS - (performance.now() - t0))
      await new Promise((r) => setTimeout(r, wait))
      if (cancelled) return
      first.kill()

      const els = shardEls.current.filter(Boolean)
      finish = gsap.timeline()
        .to(obj, { v: 100, duration: 0.4, ease: 'power2.inOut', onUpdate: paint })
        // Snapshot the finished face once; every shard shows a window onto it.
        .add(() => {
          const dpr = Math.min(window.devicePixelRatio || 1, 2)
          const ctx = face.current.getContext('2d')
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          drawFace(ctx, W, H, 100, monogram)
          const url = face.current.toDataURL('image/png')
          els.forEach((el) => { el.style.backgroundImage = `url(${url})` })
        })
        // Impact: the slab shudders while cracks race outward from the centre.
        .add('impact', '+=0.1')
        .fromTo(face.current, { x: -5 }, { x: 5, duration: 0.045, repeat: 7, yoyo: true, ease: 'none' }, 'impact')
        .set(face.current, { x: 0 })
        .set(cracks.current, { opacity: 1 }, 'impact')
        .to(paths, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out', stagger: 0.014 }, 'impact')
        // Beat, then break: swap the face for the shards and let them fall.
        .add('break', '+=0.18')
        .add(() => {
          onReveal?.()
          root.current.style.backgroundColor = 'transparent'
          face.current.style.visibility = 'hidden'
          cracks.current.style.visibility = 'hidden'
          els.forEach((el) => { el.style.visibility = 'visible' })
        }, 'break')
        .to(els, {
          x: (i) => shards[i].dir[0] * (160 + Math.random() * 380),
          y: (i) => shards[i].dir[1] * (120 + Math.random() * 300) + 420 + Math.random() * 520,
          rotation: () => (Math.random() - 0.5) * 48,
          opacity: 0,
          duration: 1.15,
          ease: 'power2.in',
          stagger: { each: 0.012, from: 'start' }, // shards are sorted by distance from the impact
        }, 'break')
        .add(() => onExit?.())
    })

    return () => {
      cancelled = true
      first.kill()
      finish?.kill()
    }
  }, [onReveal, onExit, shards, W, H, monogram])

  return (
    <div ref={root} className="fixed inset-0 z-[120] bg-ink" aria-label="Loading" role="status">
      {/* Phase 1: the intact slab (canvas) */}
      <canvas ref={face} className="absolute inset-0 block h-full w-full" />

      {/* Crack lines (drawn on impact) */}
      <svg
        ref={cracks}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        aria-hidden="true"
      >
        {shards.map((s, i) => (
          <path key={i} d={s.path} fill="none" stroke={PAPER} strokeWidth="1.2" strokeLinejoin="round" />
        ))}
      </svg>

      {/* Phase 2: windows onto the snapshot, cut to each shard, hidden until the break */}
      {shards.map((s, i) => (
        <div
          key={i}
          ref={(el) => { shardEls.current[i] = el }}
          className="absolute will-change-transform"
          style={{
            left: s.box.x,
            top: s.box.y,
            width: s.box.w,
            height: s.box.h,
            clipPath: s.clip,
            transformOrigin: s.origin,
            backgroundSize: `${W}px ${H}px`,
            backgroundPosition: `${-s.box.x}px ${-s.box.y}px`,
            visibility: 'hidden',
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
