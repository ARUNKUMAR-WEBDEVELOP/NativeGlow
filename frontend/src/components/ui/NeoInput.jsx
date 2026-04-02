export default function NeoInput({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-xl border border-violet-200/80 bg-white/80 px-3.5 py-2.5 text-sm text-zinc-800 shadow-sm transition-all duration-300 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 ${className}`.trim()}
      {...props}
    />
  );
}
