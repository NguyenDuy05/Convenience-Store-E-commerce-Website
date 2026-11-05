import { useMotionValue, useSpring, motion } from 'motion/react';
import { Link } from 'react-router-dom';

const MotionLink = motion(Link);

export default function MagneticLink({ to, children, className = '' }) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 230, damping: 18, mass: 0.35 });
  const y = useSpring(rawY, { stiffness: 230, damping: 18, mass: 0.35 });

  const move = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    rawX.set((event.clientX - rect.left - rect.width / 2) * 0.14);
    rawY.set((event.clientY - rect.top - rect.height / 2) * 0.14);
  };
  const reset = () => { rawX.set(0); rawY.set(0); };

  return (
    <MotionLink to={to} className={className} style={{ x, y }} whileHover={{ scale: 1.035 }} whileTap={{ scale: 0.97 }} onPointerMove={move} onPointerLeave={reset}>
      {children}
    </MotionLink>
  );
}
