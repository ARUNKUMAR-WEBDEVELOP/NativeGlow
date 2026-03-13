function AboutPage() {
  return (
    <section className="max-w-6xl space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-[#fbf9f0] via-[#eef5e3] to-[#f3e7d7] p-7 shadow-sm">
        <div className="float-soft pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-sage/20 blur-2xl" />
        <div className="float-soft pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-clay/20 blur-2xl" />
        <p className="text-xs font-bold uppercase tracking-wider text-sage">About NativeGlow</p>
        <h1 className="mt-2 max-w-3xl font-display text-6xl leading-[0.9] text-zinc-900 max-md:text-4xl">Natural products, modern trust, seller collaboration.</h1>
        <p className="mt-4 max-w-3xl text-sm text-zinc-700">
          NativeGlow is built for people who want ingredient clarity and everyday comfort. We combine herbal skincare with breathable clothing,
          and we onboard verified natural sellers through an admin-reviewed process.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Ingredient Transparency</h2>
          <p className="mt-2 text-sm text-zinc-700">Each product page includes ingredients, how it works, benefits, and usage guidance for informed decisions.</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Verified Seller Network</h2>
          <p className="mt-2 text-sm text-zinc-700">Interested sellers apply directly and are reviewed by admins before listing products on the marketplace.</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Shopify-Style Experience</h2>
          <p className="mt-2 text-sm text-zinc-700">Fast browsing, mobile-first layout, sticky purchase actions, and conversion-focused content blocks.</p>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-3xl text-zinc-900">How We Review Sellers</h2>
          <ol className="mt-3 space-y-2 text-sm text-zinc-700">
            <li>Application with brand details and product categories.</li>
            <li>Admin review for product quality and fit with natural-care standards.</li>
            <li>Approval activates vendor profile and dynamic catalog publishing.</li>
          </ol>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-3xl text-zinc-900">What You See on Product Pages</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            <li>High-clarity image gallery and category context.</li>
            <li>Ingredient or material points based on product type.</li>
            <li>How-it-works explanation, benefits, and usage steps.</li>
            <li>Shipping and support details for purchase confidence.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

export default AboutPage;
