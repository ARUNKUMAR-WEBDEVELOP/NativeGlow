import { animate, motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export default function CountUpStat({ value, suffix = '', label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.1,
      ease: 'easeOut',
      onUpdate: (latest) => {
        setCount(Math.round(latest));
      },
    });
    return controls.stop;
  }, [inView, value]);

  return (
    <div ref={ref} className="rounded-2xl border border-white/40 bg-white/50 p-4 text-center backdrop-blur">
      <motion.p className="text-2xl font-bold text-zinc-900 sm:text-3xl">
        {count}
        {suffix}
      </motion.p>
      <p className="mt-1 text-xs font-medium text-zinc-600">{label}</p>
    </div>
  );
}
