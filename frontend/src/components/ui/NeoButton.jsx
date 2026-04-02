import { useState } from 'react';

const base = 'relative inline-flex items-center justify-center overflow-hidden rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 disabled:cursor-not-allowed disabled:opacity-60';

const variants = {
  primary: 'bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 text-white shadow-[0_12px_28px_rgba(124,58,237,0.28)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(124,58,237,0.35)] active:scale-[0.98]',
  secondary: 'border border-white/60 bg-white/70 text-zinc-800 shadow-sm backdrop-blur hover:-translate-y-0.5 hover:bg-white/90 active:scale-[0.98]',
  ghost: 'text-zinc-700 hover:bg-white/70 active:scale-[0.98]',
};

export default function NeoButton({
  variant = 'primary',
  className = '',
  children,
  onClick,
  ...props
}) {
  const [ripple, setRipple] = useState({ x: 0, y: 0, show: false, key: 0 });

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      show: true,
      key: Date.now(),
    });
    if (typeof onClick === 'function') {
      onClick(e);
    }
    window.setTimeout(() => setRipple((prev) => ({ ...prev, show: false })), 320);
  };

  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${className}`.trim()}
      onClick={handleClick}
      {...props}
    >
      {ripple.show ? (
        <span
          key={ripple.key}
          className="pointer-events-none absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-white/40"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ) : null}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
