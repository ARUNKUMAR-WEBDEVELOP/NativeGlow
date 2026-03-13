function ShippingPage() {
  return (
    <section className="max-w-4xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="font-display text-5xl text-zinc-900 max-md:text-4xl">Shipping Policy</h1>
      <div className="mt-4 grid gap-3 text-sm text-zinc-700 md:grid-cols-2">
        <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="font-semibold text-zinc-900">Order Processing</p>
          <p className="mt-1">Typical processing is 1-2 business days after successful payment confirmation.</p>
        </article>
        <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="font-semibold text-zinc-900">Transit Time</p>
          <p className="mt-1">Delivery usually takes 5-8 business days depending on destination and courier capacity.</p>
        </article>
        <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="font-semibold text-zinc-900">Tracking</p>
          <p className="mt-1">Tracking details are sent through email and linked to your order timeline.</p>
        </article>
        <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="font-semibold text-zinc-900">Support</p>
          <p className="mt-1">Reach support@nativeglow.store if a shipment is delayed beyond the estimated window.</p>
        </article>
      </div>
    </section>
  );
}

export default ShippingPage;
