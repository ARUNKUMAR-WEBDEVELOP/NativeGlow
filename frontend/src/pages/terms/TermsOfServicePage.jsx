function TermsOfServicePage() {
  return (
    <section className="max-w-4xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">Legal</p>
        <h1 className="mt-2 font-display text-4xl text-zinc-900 sm:text-5xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-zinc-600">
          By using NativeGlow, you agree to these platform terms.
        </p>
      </header>

      <div className="space-y-4 text-sm leading-7 text-zinc-700">
        <p>
          NativeGlow is a marketplace platform connecting buyers with independent sellers.
          NativeGlow does not manufacture products and does not process direct seller payments.
        </p>
        <p>
          Sellers are solely responsible for product quality, ingredients, claims, labeling,
          fulfillment, shipping, and customer support related to their products.
        </p>
        <p>
          Buyers should verify seller details before purchasing. Platform-level account misuse,
          fraud, or policy violations may lead to access restrictions.
        </p>
        <p>
          These terms may be updated as needed. Continued use of NativeGlow after updates
          constitutes acceptance of revised terms.
        </p>
      </div>
    </section>
  );
}

export default TermsOfServicePage;
