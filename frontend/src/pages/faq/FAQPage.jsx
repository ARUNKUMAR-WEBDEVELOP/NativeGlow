function FAQPage() {
  return (
    <section className="max-w-4xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="font-display text-5xl text-zinc-900 max-md:text-4xl">FAQ</h1>
      <div className="mt-4 space-y-4 text-sm text-zinc-700">
        <article>
          <p><strong>How fast is shipping?</strong></p>
          <p>Orders are processed in 1-2 business days and usually delivered in 5-8 business days.</p>
        </article>
        <article>
          <p><strong>How can I verify ingredients?</strong></p>
          <p>Each product detail page includes ingredients/material points, how it works, benefits, and usage guidance.</p>
        </article>
        <article>
          <p><strong>Can natural sellers join NativeGlow?</strong></p>
          <p>Yes. Submit the seller application form. Admin reviews each request and approves verified profiles.</p>
        </article>
        <article>
          <p><strong>What login options are available?</strong></p>
          <p>Google login is preferred for quick onboarding, with username/password available as fallback.</p>
        </article>
        <article>
          <p><strong>What is your return window?</strong></p>
          <p>Returns are accepted within 14 days for eligible unused products and approved cases.</p>
        </article>
      </div>
    </section>
  );
}

export default FAQPage;
