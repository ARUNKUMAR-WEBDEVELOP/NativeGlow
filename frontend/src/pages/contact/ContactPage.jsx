function ContactPage() {
  return (
    <section className="max-w-5xl space-y-5">
      <header className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
        <h1 className="font-display text-5xl text-zinc-900 max-md:text-4xl">Contact NativeGlow</h1>
        <p className="mt-2 text-sm text-zinc-700">Support for orders, product questions, and seller onboarding.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Customer Support</h2>
          <p className="mt-2 text-sm text-zinc-700">Email: support@nativeglow.store</p>
          <p className="mt-1 text-sm text-zinc-700">Hours: Mon-Fri, 9:00-18:00 (local time)</p>
          <p className="mt-1 text-sm text-zinc-700">Share your order ID and phone number for faster help.</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Seller & Partnership</h2>
          <p className="mt-2 text-sm text-zinc-700">Email: admin@nativeglow.store</p>
          <p className="mt-1 text-sm text-zinc-700">Apply at Sell on NativeGlow page and our admin team will review your details.</p>
          <p className="mt-1 text-sm text-zinc-700">Only approved sellers can publish products dynamically.</p>
        </article>
      </div>
    </section>
  );
}

export default ContactPage;
