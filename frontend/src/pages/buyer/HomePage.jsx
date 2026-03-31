import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../../styles/designSystem';
import Button from '../../components/common/Button';

/**
 * Vendor Acquisition Landing Page
 * Purpose: Convince natural cosmetic sellers to join NativeGlow platform
 * Features: Hero, problem statement, how it works, features, pricing, CTA
 */
const HomePage = () => {
  const navigate = useNavigate();
  
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ─── SECTION 1: NAVBAR ───
  const Navbar = () => (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 md:px-8 py-4`}
      style={{
        ...(scrolled
          ? {
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              boxShadow: theme.shadows.card,
            }
          : { backgroundColor: 'transparent' }),
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
          style={{ fontFamily: theme.fonts.heading }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: theme.colors.primary }}
          >
            🌿
          </div>
          <span
            className="text-xl font-bold hidden md:block"
            style={{ color: scrolled ? theme.colors.charcoal : '#ffffff' }}
          >
            NativeGlow
          </span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8">
          {['Home', 'How It Works', 'Pricing', 'About'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(' ', '-')}`}
              className="font-semibold transition-colors"
              style={{ color: scrolled ? theme.colors.charcoal : '#ffffff' }}
            >
              {item}
            </a>
          ))}
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex gap-3">
          <Button
            variant={scrolled ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => navigate('/vendor/login')}
          >
            Login
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/vendor/register')}
          >
            Register Store →
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-2xl"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ color: scrolled ? theme.colors.charcoal : '#ffffff' }}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="md:hidden mt-4 pb-4 space-y-3 flex flex-col"
          style={{ backgroundColor: `${theme.colors.cream}` }}
        >
          {['Home', 'How It Works', 'Pricing', 'About'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(' ', '-')}`}
              className="font-semibold px-4 py-2"
              style={{ color: theme.colors.charcoal }}
            >
              {item}
            </a>
          ))}
          <div className="px-4 space-y-2 pt-2 border-t" style={{ borderColor: `${theme.colors.muted}20` }}>
            <Button variant="secondary" size="sm" fullWidth onClick={() => navigate('/vendor/login')}>
              Login
            </Button>
            <Button variant="primary" size="sm" fullWidth onClick={() => navigate('/vendor/register')}>
              Register Store
            </Button>
          </div>
        </div>
      )}
    </nav>
  );

  // ─── SECTION 2: HERO ───
  const HeroSection = () => (
    <section
      className="min-h-screen pt-20 flex items-center relative overflow-hidden"
      style={{
        background: `linear-gradient(160deg, #0d2b18 0%, ${theme.colors.primary} 50%, ${theme.colors.primaryLight} 100%)`,
      }}
    >
      {/* Animated floating particles */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="float absolute rounded-full"
            style={{
              width: `${40 + i * 20}px`,
              height: `${40 + i * 20}px`,
              top: `${20 + i * 15}%`,
              left: `${10 + i * 18}%`,
              backgroundColor: `${theme.colors.primaryGlow}30`,
            }}
          />
        ))}
      </div>

      <div className="container-app grid md:grid-cols-2 gap-12 items-center py-20 relative z-10">
        {/* Left Content */}
        <div className="space-y-8">
          {/* Badge */}
          <div
            className="inline-block px-4 py-2 rounded-full text-sm font-semibold"
            style={{ backgroundColor: `${theme.colors.primaryGlow}30`, color: '#ffffff' }}
          >
            🌿 For Natural Cosmetic Sellers
          </div>

          {/* Heading */}
          <h1
            className="heading-xl text-white leading-tight"
            style={{ fontFamily: theme.fonts.heading }}
          >
            Stop Managing Orders on WhatsApp.
            <br />
            Get Your Own Website.
          </h1>

          {/* Subheading */}
          <p className="text-xl text-white/90 leading-relaxed">
            We give every natural cosmetic seller their own professional website. Your products. Your customers. Your
            brand. All in one place.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/vendor/register')}
              className="btn-glow"
            >
              Get Your Store Free →
            </Button>
            <Button variant="ghost" size="lg" onClick={() => window.scrollTo({ top: window.innerHeight * 3, behavior: 'smooth' })}>
              <span style={{ color: '#ffffff' }}>See How It Works ↓</span>
            </Button>
          </div>

          {/* Trust Signals */}
          <div className="text-sm text-white/80 space-y-2 pt-4">
            <p>✓ No technical skills needed</p>
            <p>✓ Live in minutes</p>
            <p>✓ 100% your brand</p>
          </div>
        </div>

        {/* Right: Device Mockup */}
        <div className="relative hidden md:flex justify-center items-center perspective">
          {/* Laptop mockup */}
          <div
            className="float relative"
            style={{
              width: '350px',
              perspective: '1200px',
              filter: `drop-shadow(0 0 40px ${theme.colors.primaryGlow}40)`,
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '12px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            >
              <div
                style={{
                  backgroundColor: theme.colors.cream,
                  borderRadius: '8px',
                  aspectRatio: '16/10',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.colors.muted,
                  fontSize: '12px',
                }}
              >
                Your Store Preview
              </div>
            </div>
          </div>

          {/* Mobile mockup */}
          <div
            className="float absolute bottom-10 right-10"
            style={{
              width: '140px',
              filter: `drop-shadow(0 0 30px ${theme.colors.primaryGlow}30)`,
            }}
          >
            <div
              style={{
                backgroundColor: '#000000',
                borderRadius: '24px',
                padding: '8px',
                aspectRatio: '9/20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  backgroundColor: theme.colors.cream,
                  borderRadius: '16px',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.colors.muted,
                  fontSize: '10px',
                }}
              >
                Mobile
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  // ─── SECTION 3: PROBLEM SECTION ───
  const ProblemSection = () => (
    <section className="py-24 bg-white">
      <div className="container-app space-y-16">
        <div>
          <h2
            className="heading-lg text-center"
            style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
          >
            Sound Familiar?
          </h2>
        </div>

        {/* Problem Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { emoji: '😓', title: 'Managing 100+ WhatsApp Messages Daily', desc: 'Customer queries, order updates, payment reminders — all scattered across conversations' },
            { emoji: '📝', title: 'Losing Track of Orders', desc: 'Juggling notebooks, sticky notes, and spreadsheets is chaotic and error-prone' },
            { emoji: '💸', title: 'Customers Forget to Pay', desc: 'Payment details get lost in chats. You spend time chasing money instead of growing' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="card-3d rounded-2xl p-8 space-y-4 transition-all duration-300"
              style={{
                backgroundColor: `${theme.colors.danger}08`,
                border: `2px solid ${theme.colors.danger}30`,
              }}
            >
              <div className="text-5xl">{item.emoji}</div>
              <h3 className="text-xl font-bold" style={{ color: theme.colors.charcoal }}>
                {item.title}
              </h3>
              <p style={{ color: theme.colors.muted }}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Arrow + Text */}
        <div className="text-center pt-8">
          <p className="text-2xl mb-4">↓</p>
          <p className="text-xl font-bold" style={{ color: theme.colors.primary }}>
            We solve all of this
          </p>
        </div>
      </div>
    </section>
  );

  // ─── SECTION 4: HOW IT WORKS ───
  const HowItWorksSection = () => (
    <section className="py-24" style={{ backgroundColor: theme.colors.cream }}>
      <div className="container-app space-y-16">
        <div className="text-center space-y-4">
          <h2
            className="heading-lg"
            style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
          >
            Your Store. Ready in Minutes.
          </h2>
          <p className="text-lg" style={{ color: theme.colors.muted }}>
            Here's how NativeGlow works for you
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { num: '01', title: 'Register', desc: 'Sign up with your basic details' },
            { num: '02', title: 'Get Verified', desc: 'Admin checks & approves your account' },
            { num: '03', title: 'Get Your Site', desc: 'Instant website setup for your store' },
            { num: '04', title: 'Go Live', desc: 'Share link, customers order directly' },
          ].map((step, idx) => (
            <div key={idx} className="relative">
              {/* Connecting dots (hidden on mobile) */}
              {idx < 3 && (
                <div
                  className="hidden md:block absolute top-16 left-full w-6 h-0.5"
                  style={{ backgroundColor: `${theme.colors.primary}30` }}
                />
              )}

              <div className="card-3d rounded-2xl p-6 space-y-4 h-full" style={{ backgroundColor: '#ffffff', border: `2px solid ${theme.colors.primary}20` }}>
                <div
                  className="gradient-text text-6xl font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryGlow})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {step.num}
                </div>
                <h3 className="text-xl font-bold" style={{ color: theme.colors.charcoal }}>
                  {step.title}
                </h3>
                <p style={{ color: theme.colors.muted }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // ─── SECTION 5: FEATURES GRID ───
  const FeaturesSection = () => (
    <section
      className="py-24"
      style={{ backgroundColor: '#0d2b18' }}
    >
      <div className="container-app space-y-16">
        <h2
          className="heading-lg text-center text-white"
          style={{ fontFamily: theme.fonts.heading }}
        >
          Everything You Need to Run Your Business
        </h2>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { emoji: '🛍️', title: 'Your Own Website', desc: 'Unique URL you share with your customers' },
            { emoji: '📦', title: 'Product Management', desc: 'Add, edit, discount, hide products anytime' },
            { emoji: '📋', title: 'Order Dashboard', desc: 'All orders in one place, no WhatsApp chaos' },
            { emoji: '💳', title: 'Direct Payments', desc: 'Customers pay directly to your UPI' },
            { emoji: '👥', title: 'Customer Database', desc: 'All your customer details saved securely' },
            { emoji: '📊', title: 'Sales Analytics', desc: 'Track your monthly performance' },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="glass-dark p-8 rounded-2xl space-y-4 group transition-all duration-300 hover:border-primary-glow"
              style={{
                border: `2px solid ${theme.colors.primaryGlow}30`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = theme.colors.primaryGlow)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${theme.colors.primaryGlow}30`)}
            >
              <div className="text-4xl">{feature.emoji}</div>
              <h3 className="text-xl font-bold text-white">{feature.title}</h3>
              <p style={{ color: `${theme.colors.primaryGlow}cc` }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // ─── SECTION 6: VENDOR SITE PREVIEW ───
  const VendorPreviewSection = () => (
    <section className="py-24 bg-white">
      <div className="container-app grid md:grid-cols-2 gap-12 items-center">
        {/* Phone Mockup */}
        <div className="flex justify-center">
          <div
            style={{
              width: '200px',
              backgroundColor: '#000000',
              borderRadius: '32px',
              padding: '10px',
              boxShadow: theme.shadows.deep,
            }}
          >
            <div
              style={{
                backgroundColor: theme.colors.cream,
                borderRadius: '24px',
                aspectRatio: '9/20',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.colors.muted,
                fontSize: '12px',
              }}
            >
              <div style={{ fontFamily: theme.fonts.heading, fontWeight: 'bold', marginBottom: '8px', color: theme.colors.charcoal }}>
                Your Store
              </div>
              Features displayed here
            </div>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-6">
          <h3
            className="text-3xl font-bold"
            style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
          >
            What Your Site Includes
          </h3>

          {[
            'Custom store homepage with banner',
            'Product listings with discounts',
            'About your brand page',
            'Order tracking for customers',
            'Google login for buyers',
            'Mobile responsive design',
          ].map((item, idx) => (
            <div key={idx} className="flex gap-3 items-start">
              <span style={{ color: theme.colors.primary, fontSize: '20px' }}>✅</span>
              <span style={{ color: theme.colors.charcoal }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // ─── SECTION 7: PRICING ───
  const PricingSection = () => (
    <section className="py-24" style={{ backgroundColor: theme.colors.cream }}>
      <div className="container-app space-y-12">
        <div className="text-center space-y-4">
          <h2
            className="heading-lg"
            style={{ color: theme.colors.charcoal, fontFamily: theme.fonts.heading }}
          >
            Simple. Transparent. Affordable.
          </h2>
        </div>

        {/* Pricing Card */}
        <div className="flex justify-center">
          <div
            className="card-3d w-full md:max-w-md rounded-3xl p-10 space-y-6"
            style={{
              backgroundColor: '#ffffff',
              border: `2px solid ${theme.colors.primary}20`,
              boxShadow: theme.shadows.deep,
            }}
          >
            <div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: theme.colors.charcoal }}>
                Starter Plan
              </h3>
              <div
                className="gradient-text text-5xl font-bold"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryGlow})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                ₹499<span className="text-2xl">/month</span>
              </div>
            </div>

            <p style={{ color: theme.colors.muted }}>Everything included. No hidden fees.</p>

            {/* Features */}
            <div className="space-y-3 py-6" style={{ borderTop: `1px solid ${theme.colors.muted}20` }}>
              {[
                'Your own website',
                'Unlimited products',
                'Order management',
                'Customer database',
                'Direct payments',
                'Analytics dashboard',
              ].map((feature, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span style={{ color: theme.colors.success }}>✓</span>
                  <span style={{ color: theme.colors.charcoal }}>{feature}</span>
                </div>
              ))}
            </div>

            <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/vendor/register')}>
              Start Free Trial
            </Button>

            <p className="text-xs text-center" style={{ color: theme.colors.muted }}>
              Admin approval required after registration
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  // ─── SECTION 8: CTA BANNER ───
  const CTABanner = () => (
    <section
      className="py-20"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryLight})`,
      }}
    >
      <div className="container-app text-center space-y-8">
        <h2
          className="heading-lg text-white"
          style={{ fontFamily: theme.fonts.heading }}
        >
          Ready to grow your natural cosmetics business?
        </h2>
        <Button
          variant="white"
          size="lg"
          onClick={() => navigate('/vendor/register')}
          className="btn-glow mx-auto"
        >
          Register Your Store Today →
        </Button>
      </div>
    </section>
  );

  // ─── SECTION 9: FOOTER ───
  const Footer = () => (
    <footer style={{ backgroundColor: theme.colors.charcoal }}>
      <div className="container-app py-12 space-y-8">
        {/* Brand */}
        <div className="space-y-2">
          <div className="flex items-center gap-2" style={{ fontFamily: theme.fonts.heading }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: theme.colors.primary }}
            >
              🌿
            </div>
            <span className="text-xl font-bold text-white">NativeGlow</span>
          </div>
          <p style={{ color: `${theme.colors.sand}cc` }}>Platform for natural cosmetic sellers</p>
        </div>

        {/* Links */}
        <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-6 py-8" style={{ borderTop: `1px solid ${theme.colors.primary}20` }}>
          {['About', 'How It Works', 'Register', 'Login', 'Contact'].map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm font-semibold transition-colors"
              style={{ color: theme.colors.sand }}
              onMouseEnter={(e) => (e.target.style.color = theme.colors.primaryGlow)}
              onMouseLeave={(e) => (e.target.style.color = theme.colors.sand)}
            >
              {link}
            </a>
          ))}
        </div>

        {/* Bottom */}
        <div
          className="text-sm text-center"
          style={{ borderTop: `1px solid ${theme.colors.primary}20`, paddingTop: '16px', color: `${theme.colors.sand}99` }}
        >
          <p>Powered for natural cosmetic sellers across India 🌿</p>
          <p className="mt-2">
            © 2026 NativeGlow. All rights reserved. |{' '}
            <a href="/terms" style={{ color: theme.colors.primaryGlow }}>
              Terms & Disclaimer
            </a>
          </p>
        </div>
      </div>
    </footer>
  );

  return (
    <div>
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <VendorPreviewSection />
      <PricingSection />
      <CTABanner />
      <Footer />
    </div>
  );
};

export default HomePage;
