import { createContext, useContext } from 'react'

export const CurtainCtx = createContext(() => {})

/** `go(to, name)` — sweeps a black curtain up, swaps the route, sweeps it off. */
export const useCurtain = () => useContext(CurtainCtx)
