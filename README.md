# Hammad Hamid — Portfolio

Single-screen portfolio for a Full Stack (MERN) & AI developer. No scrolling: each route is one viewport, views swap behind a black curtain.

- **Landing** — the name as a full-width wordmark baked into a WebGL fluid simulation; moving the mouse washes the white surface away like water and reveals a B&W portrait underneath. Letters rise in with a random-stagger reveal.
- **About** — giant statement with a cursor-following portrait, counting stats, a live local clock, and a physics playground of skill pills you can throw around.

## Stack

React 19 · Vite 8 · Tailwind CSS 4 · React Router · Three.js (fluid sim) · GSAP · Framer Motion · Matter.js · Lucide

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Edit content

All copy lives in `src/data/`:

- `site.js` — name, tagline, links, email, résumé path, backdrop images
- `about.js` — statement, bio, stats, facts, skills, marquee

Images go in `public/` (`hero-wide.jpg` for desktop, `hero-tall.jpg` for phones).

## Deploy

Configured for Vercel (`vercel.json` rewrites every route to `index.html`).
