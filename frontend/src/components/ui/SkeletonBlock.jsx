export default function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-100 bg-[length:180%_100%] ${className}`.trim()}
    />
  );
}
