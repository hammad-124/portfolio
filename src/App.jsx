import { Routes, Route } from 'react-router-dom'
import { CurtainProvider } from './components/Curtain'
import Hero from './sections/Hero'
import About from './sections/About'

// One screen per route — the site never scrolls; views swap behind a curtain.
function App() {
  return (
    <CurtainProvider>
      <main className="h-svh overflow-hidden">
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </CurtainProvider>
  )
}

export default App
