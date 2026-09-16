import { motion } from 'framer-motion'
import { ArrowDown, ArrowUpLeft } from 'lucide-react'

const EASE = [0.16, 1, 0.3, 1]

/* Slowly rotating circular text badge. Acts as the site's only "menu" control. */
export default function SpinBadge({ text, onClick, icon = 'down', label = 'Open menu' }) {
  const Icon = icon === 'back' ? ArrowUpLeft : ArrowDown
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="pointer-events-auto relative block h-24 w-24 md:h-28 md:w-28"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: EASE, delay: 0.4 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg viewBox="0 0 100 100" className="spin-slow h-full w-full">
        <defs>
          <path id="badge-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        {/* circumference of r=38 is ~238.8; textLength stretches the string to fill it exactly */}
        <text className="fill-current text-[8.5px] font-bold uppercase">
          <textPath href="#badge-circle" textLength="237" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <Icon size={18} strokeWidth={2.5} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    </motion.button>
  )
}
