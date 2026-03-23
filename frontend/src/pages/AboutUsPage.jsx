import { useEffect, useRef, useState } from 'react';

const missionPoints = [
  {
    icon: '🌿',
    title: 'Natural Only',
    text: 'Every product on NativeGlow is verified to be 100% natural. No synthetic chemicals allowed.',
  },
  {
    icon: '🛡️',
    title: 'Verified Sellers',
    text: 'All vendors go through admin approval before listing products on our platform.',
  },
  {
    icon: '💳',
    title: 'Direct Payments',
    text: 'Buyers pay directly to sellers via UPI or Bank Transfer. NativeGlow does not hold or process any payments.',
  },
  {
    icon: '📦',
    title: 'Seller Managed Shipping',
    text: 'Orders are handled entirely by individual sellers. NativeGlow provides the platform, sellers do the rest.',
  },
];

function FadeInSection({ children, className = '' }) {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      {
        threshold: 0.15,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`fade-section ${isVisible ? 'is-visible' : ''} ${className}`.trim()}
    >
      {children}
    </section>
  );
}

function AboutUsPage() {
  useEffect(() => {
    const existingFontLink = document.getElementById('nativeglow-about-fonts');
    if (!existingFontLink) {
      const link = document.createElement('link');
      link.id = 'nativeglow-about-fonts';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Playfair+Display:wght@600;700;800&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <main className="bg-[#f5f0e8] text-[#2d5a27]">
      <style>{`
        .fade-section {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }

        .fade-section.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <FadeInSection className="w-full bg-[#2d5a27] px-6 py-16 sm:py-24 text-[#f5f0e8]">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#e8b86d] bg-[#244821] shadow-lg">
            <span
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-lg font-bold text-[#e8b86d]"
            >
              NG
            </span>
          </div>
          <p
            style={{ fontFamily: "'Lato', sans-serif" }}
            className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#e8b86d]"
          >
            NativeGlow
          </p>
          <h1
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-4xl font-bold leading-tight sm:text-5xl"
          >
            We Believe Nature Knows Best
          </h1>
          <p
            style={{ fontFamily: "'Lato', sans-serif" }}
            className="mx-auto mt-6 max-w-3xl text-base leading-7 text-[#f5f0e8]/95 sm:text-lg"
          >
            NativeGlow is a digital marketplace platform dedicated to connecting buyers with trusted natural cosmetic sellers across India. We do not manufacture or sell products ourselves — we provide the platform, you discover the best.
          </p>
        </div>
      </FadeInSection>

      <FadeInSection className="px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <h2
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="mb-8 text-center text-3xl font-bold text-[#2d5a27] sm:text-4xl"
          >
            Our Mission
          </h2>

          <div className="space-y-5">
            {missionPoints.map((point) => (
              <div
                key={point.title}
                className="grid grid-cols-1 items-start gap-4 rounded-2xl border border-[#2d5a27]/15 bg-white/80 p-5 shadow-sm sm:grid-cols-[68px_1fr]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#2d5a27]/10 text-3xl">
                  <span>{point.icon}</span>
                </div>
                <div>
                  <h3
                    style={{ fontFamily: "'Playfair Display', serif" }}
                    className="text-2xl font-bold text-[#2d5a27]"
                  >
                    {point.title}
                  </h3>
                  <p
                    style={{ fontFamily: "'Lato', sans-serif" }}
                    className="mt-2 text-base leading-7 text-[#2d5a27]/90"
                  >
                    {point.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      <FadeInSection className="px-6 pb-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#e8b86d]/60 bg-[#f5f0e8] px-6 py-7 shadow-sm">
          <h2
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="mb-3 text-2xl font-bold text-[#2d5a27]"
          >
            Platform Disclaimer
          </h2>
          <p
            style={{ fontFamily: "'Lato', sans-serif" }}
            className="text-base leading-7 text-[#2d5a27]/90"
          >
            NativeGlow operates as a platform service provider only. Individual sellers are solely responsible for their products, ingredients, safety, labeling, and legal compliance. NativeGlow is not liable for third-party seller products, payment disputes, or shipping issues.
          </p>
        </div>
      </FadeInSection>

      <FadeInSection className="px-6 py-10 sm:py-12">
        <div className="mx-auto max-w-4xl text-center">
          <h2
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-3xl font-bold text-[#2d5a27]"
          >
            Contact
          </h2>
          <p
            style={{ fontFamily: "'Lato', sans-serif" }}
            className="mt-4 text-lg text-[#2d5a27]"
          >
            Have questions? Reach us at{' '}
            <a href="mailto:support@nativeglow.com" className="font-bold text-[#2d5a27] underline decoration-[#e8b86d] decoration-2 underline-offset-4">
              support@nativeglow.com
            </a>
          </p>
          <p
            style={{ fontFamily: "'Lato', sans-serif" }}
            className="mt-2 text-sm text-[#2d5a27]/80"
          >
            For order issues, contact your seller directly via WhatsApp.
          </p>
        </div>
      </FadeInSection>

      <FadeInSection className="w-full border-t border-[#2d5a27]/10 px-6 py-7">
        <p
          style={{ fontFamily: "'Playfair Display', serif" }}
          className="mx-auto max-w-5xl text-center text-xl font-bold text-[#2d5a27]"
        >
          NativeGlow — Empowering Natural Sellers Across India 🌿
        </p>
      </FadeInSection>
    </main>
  );
}

export default AboutUsPage;