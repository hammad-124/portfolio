import { createContext, useContext } from 'react'

/** true once the preloader has lifted (or was skipped) — entrances wait for it. */
export const IntroCtx = createContext(true)
export const useIntro = () => useContext(IntroCtx)

export const INTRO_KEY = 'hh:intro-played'
