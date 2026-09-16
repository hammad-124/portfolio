// Sand + Espresso + Peach, with one terracotta accent.
// Mirrors the @theme tokens in index.css for canvas/JS use.
export const PAPER = '#E9D8C3'   // sand — page + hero surface
export const INK = '#1E1410'     // espresso — type, dark sections
export const PEACH = '#F0C9AE'   // second surface
export const ACCENT = '#C9502E'  // terracotta — tiny doses only


// Text colour for layers using mix-blend-mode: difference. Chosen so that
// |DIFF - PAPER| = INK, i.e. it reads as espresso on sand and stays light on espresso.
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16))
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
export const DIFF = toHex(hex(PAPER).map((v, i) => v - hex(INK)[i]))
