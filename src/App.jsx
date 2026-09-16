import { useCallback, useEffect, useState } from 'react'
import Header from './components/Header'
import Preloader from './components/Preloader'
import Cursor from './components/Cursor'
import { IntroCtx, INTRO_KEY } from './lib/intro'
import { startSmoothScroll, stopSmoothScroll, getLenis } from './lib/smooth'
import Hero from './sections/Hero'
import Journey from './sections/Journey'
import Work from './sections/Work'
import Contact from './sections/Contact'

const playedThisSession = () => {
  try { return sessionStorage.getItem(INTRO_KEY) === '1' } catch { return false }
}

// One long page: pinned water hero, then sections that scroll over it.
function App() {
  // The preloader runs once per browser session (like the reference site).
  const [introDone, setIntroDone] = useState(playedThisSession)
  const [showLoader, setShowLoader] = useState(() => !playedThisSession())

  const onReveal = useCallback(() => {
    setIntroDone(true)
    try { sessionStorage.setItem(INTRO_KEY, '1') } catch { /* private mode */ }
  }, [])
  const onExit = useCallback(() => setShowLoader(false), [])

  // Smooth scroll for the whole page; frozen while the loader is up.
  useEffect(() => {
    window.scrollTo(0, 0)
    startSmoothScroll()
    return stopSmoothScroll
  }, [])
  useEffect(() => {
    const lenis = getLenis()
    if (!lenis) return
    if (introDone) lenis.start()
    else lenis.stop()
  }, [introDone])

  return (
    <IntroCtx.Provider value={introDone}>
      <Header />
      <main>
        <Hero />
        <Journey />
        <Work />
        <Contact />
      </main>
      {showLoader && <Preloader onReveal={onReveal} onExit={onExit} />}
      <Cursor />
      <div className="grain" aria-hidden="true" />
    </IntroCtx.Provider>
  )
}

export default App
