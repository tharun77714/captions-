import { motion, useMotionValue } from 'framer-motion';

export default function Scratch() {
  const x = useMotionValue("-50%");
  const y = useMotionValue("-50%");
  return (
    <motion.div
      drag
      style={{ x, y }}
      onDragEnd={() => {
        // can we reset to -50%?
        x.set("-50%");
        y.set("-50%");
      }}
    />
  )
}
