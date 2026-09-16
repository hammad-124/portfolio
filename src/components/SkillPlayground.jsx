import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'

/**
 * Skill "pills" that drop into the box, pile up on the floor and can be
 * grabbed and thrown. Physics by Matter.js; the pills are real DOM nodes
 * whose transforms follow their bodies every frame.
 */
export default function SkillPlayground({ items, delay = 0.8 }) {
  const boxRef = useRef(null)
  const pillRefs = useRef([])
  const [rebuild, setRebuild] = useState(0)

  // Rebuild the world only when the box's width really changes (debounced), so
  // mobile address-bar show/hide and other height-only resizes don't reset the pile.
  useEffect(() => {
    let t
    let lastW = boxRef.current?.clientWidth ?? 0
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(() => {
        const w = boxRef.current?.clientWidth ?? 0
        if (Math.abs(w - lastW) > 2) {
          lastW = w
          setRebuild((n) => n + 1)
        }
      }, 200)
    }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t) }
  }, [])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const W = box.clientWidth
    const H = box.clientHeight
    if (W < 50 || H < 50) return

    const { Engine, Bodies, Body, Composite, Mouse, MouseConstraint, Runner } = Matter
    const engine = Engine.create({ gravity: { x: 0, y: 1.1 } })
    const world = engine.world

    // Invisible walls: floor + sides (tall enough that thrown pills can't escape).
    const wall = (x, y, w, h) => Bodies.rectangle(x, y, w, h, { isStatic: true })
    Composite.add(world, [
      wall(W / 2, H + 40, W + 400, 80),
      wall(-40, H / 2 - H, 80, H * 4),
      wall(W + 40, H / 2 - H, 80, H * 4),
    ])

    // One body per pill, sized from the rendered DOM node.
    const bodies = items.map((_, i) => {
      const el = pillRefs.current[i]
      const w = el.offsetWidth
      const h = el.offsetHeight
      const b = Bodies.rectangle(
        w / 2 + Math.random() * Math.max(1, W - w),
        -h - Math.random() * H * 0.8,
        w,
        h,
        { chamfer: { radius: h / 2 - 1 }, restitution: 0.25, friction: 0.35, frictionAir: 0.012, density: 0.0025 },
      )
      Body.setAngle(b, (Math.random() - 0.5) * 0.5)
      b.plugin = { w, h }
      return b
    })

    // Staggered drop.
    const timers = bodies.map((b, i) => setTimeout(() => Composite.add(world, b), delay * 1000 + i * 60))

    // Drag & throw.
    const mouse = Mouse.create(box)
    const mc = MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.15, damping: 0.05 } })
    Composite.add(world, mc)
    // Matter hijacks the wheel to read scroll; we never scroll, so drop those listeners.
    mouse.element.removeEventListener('wheel', mouse.mousewheel)
    mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel)

    const runner = Runner.create()
    Runner.run(runner, engine)

    let raf
    const paint = () => {
      bodies.forEach((b, i) => {
        const el = pillRefs.current[i]
        if (!el) return
        const { w, h } = b.plugin
        el.style.transform = `translate(${b.position.x - w / 2}px, ${b.position.y - h / 2}px) rotate(${b.angle}rad)`
      })
      raf = requestAnimationFrame(paint)
    }
    paint()

    return () => {
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf)
      Runner.stop(runner)
      Composite.clear(world, false)
      Engine.clear(engine)
      Mouse.clearSourceEvents(mouse)
    }
  }, [items, delay, rebuild])

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
      aria-label="Skills — drag the pills around"
    >
      {items.map((t, i) => (
        <div
          key={t}
          ref={(el) => { pillRefs.current[i] = el }}
          className="absolute left-0 top-0 select-none whitespace-nowrap rounded-full border border-black bg-white px-4 py-2 text-[11.5px] font-bold uppercase tracking-[0.08em] will-change-transform"
          style={{ transform: 'translate(-2000px, -2000px)' }}
        >
          {t}
        </div>
      ))}
    </div>
  )
}
