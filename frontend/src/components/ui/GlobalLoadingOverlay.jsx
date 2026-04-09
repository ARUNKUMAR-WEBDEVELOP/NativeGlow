export default function GlobalLoadingOverlay({ show, label = 'Loading...' }) {
  if (!show) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-start justify-center bg-white/35 backdrop-blur-[1px]">
      <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-2 shadow-lg">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
        <span className="text-sm font-semibold text-zinc-700">{label}</span>
      </div>
    </div>
  );
}
