import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenis = null

/** Smooth scrolling (Lenis) driven by GSAP's ticker, kept in sync with ScrollTrigger. */
export function startSmoothScroll() {
  if (lenis) return lenis
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function stopSmoothScroll() {
  lenis?.destroy()
  lenis = null
}

export const getLenis = () => lenis

/** Scroll to a section id (e.g. "#work") with Lenis' easing. */
export function scrollTo(target, opts = {}) {
  if (typeof target === 'function') target = target()
  if (lenis) lenis.scrollTo(target, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4), force: true, ...opts })
  else document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' })
}

export { ScrollTrigger }
