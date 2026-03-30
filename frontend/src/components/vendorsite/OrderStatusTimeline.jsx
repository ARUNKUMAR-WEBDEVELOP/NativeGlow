const TRACK_STEPS = ['Order Placed', 'Confirmed', 'Shipped', 'Delivered'];

function normalizeStatus(orderStatus) {
  const raw = String(orderStatus || '').toLowerCase().trim();

  if (raw.includes('cancel')) return 'cancelled';
  if (['delivered', 'completed'].includes(raw)) return 'delivered';
  if (['shipped', 'in_transit', 'out_for_delivery'].includes(raw)) return 'shipped';
  if (['confirmed', 'accepted', 'processing'].includes(raw)) return 'confirmed';
  return 'placed';
}

function getStepIndex(orderStatus) {
  const normalized = normalizeStatus(orderStatus);
  if (normalized === 'cancelled') return -1;
  if (normalized === 'placed') return 0;
  if (normalized === 'confirmed') return 1;
  if (normalized === 'shipped') return 2;
  if (normalized === 'delivered') return 3;
  return 0;
}

export default function OrderStatusTimeline({ status }) {
  const stepIndex = getStepIndex(status);
  const normalizedStatus = normalizeStatus(status);

  return (
    <div className="mt-3 flex items-start justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      {TRACK_STEPS.map((step, idx) => {
        const active = stepIndex >= idx;
        return (
          <div key={step} className="flex flex-1 items-start gap-2">
            <div
              className={`mt-0.5 h-3.5 w-3.5 rounded-full ${
                normalizedStatus === 'cancelled'
                  ? 'bg-red-500'
                  : active
                    ? 'bg-emerald-600'
                    : 'bg-zinc-300'
              }`}
            />
            <p className={`text-[11px] font-medium ${active ? 'text-zinc-900' : 'text-zinc-500'}`}>{step}</p>
          </div>
        );
      })}
    </div>
  );
}
