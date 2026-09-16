import { motion } from 'framer-motion'
import { EASE } from '../lib/motion'

/* A single line that slides up from behind a clipped box. */
export default function Line({ children, delay = 0, className = '', duration = 1 }) {
  return (
    <span className={`block overflow-hidden ${className}`}>
      <motion.span
        className="block"
        initial={{ y: '110%' }}
        animate={{ y: 0 }}
        transition={{ duration, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  )
}
