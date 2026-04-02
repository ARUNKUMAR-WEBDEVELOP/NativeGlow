import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import NeoButton from '../../components/ui/NeoButton';
import NeoCard from '../../components/ui/NeoCard';
import RevealOnScroll from '../../components/ui/RevealOnScroll';
import CountUpStat from '../../components/ui/CountUpStat';
import SkeletonBlock from '../../components/ui/SkeletonBlock';
import platformContent from '../../content/platformContent';

export default function HomePage() {
  const [loadingHighlights, setLoadingHighlights] = useState(true);

  const {
    brand,
    hero,
    problem,
    solution,
    features,
    stats,
    pricing,
    cta_final,
    footer,
    disclaimer,
  } = platformContent;

  const parsedStats = stats.items.map((item) => {
    const match = item.number.match(/^(\d+(?:\.\d+)?)(.*)$/);
    return {
      value: match ? Number(match[1]) : 0,
      suffix: match ? match[2] : '',
      label: item.label,
    };
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingHighlights(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-12 pb-8 sm:space-y-16">
      <section className="relative overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-400 px-5 py-10 text-white shadow-[0_28px_80px_rgba(99,102,241,0.35)] sm:px-8 sm:py-14 lg:px-12">
        <motion.div
          className="pointer-events-none absolute -left-8 top-8 h-28 w-28 rounded-full bg-white/20 blur-xl sm:h-40 sm:w-40"
          animate={{ y: [0, -14, 0], rotate: [0, 6, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute -right-8 bottom-6 h-36 w-36 rounded-[28px] border border-white/30 bg-white/10 backdrop-blur"
          animate={{ y: [0, 16, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
              {brand.name}
            </p>
            <h1 className="font-display text-4xl leading-[0.95] text-balance sm:text-5xl lg:text-6xl">
              <span className="block">{hero.headline_line1}</span>
              <span className="block">{hero.headline_line2}</span>
              <span className="block">{hero.headline_line3}</span>
            </h1>
            <p className="max-w-xl text-sm leading-7 text-white/90 sm:text-base">
              {hero.subtext}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/vendor/register"><NeoButton>{hero.cta_primary}</NeoButton></Link>
              <Link to="/login"><NeoButton variant="secondary">{hero.cta_secondary}</NeoButton></Link>
            </div>
            <div className="space-y-1 text-sm text-white/85">
              {hero.trust_points.map((point) => (
                <p key={point}>{point}</p>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <NeoCard className="bg-white/20 text-white">
              <p className="text-xs uppercase tracking-[0.16em] text-white/80">{brand.tagline}</p>
              <p className="mt-2 text-lg font-semibold">{brand.tagline_alt}</p>
              <p className="mt-1 text-sm text-white/85">{brand.description}</p>
            </NeoCard>
            <NeoCard className="bg-white/20 text-white">
              <p className="text-xs uppercase tracking-[0.16em] text-white/80">{stats.heading}</p>
              <p className="mt-2 text-lg font-semibold">{pricing.heading}</p>
              <p className="mt-1 text-sm text-white/85">{pricing.subtext}</p>
            </NeoCard>
          </div>
        </div>
      </section>

      <RevealOnScroll>
        <section className="grid gap-4 md:grid-cols-3">
          {problem.pain_points.map((item, index) => (
            <NeoCard key={item.title} className="group h-full overflow-hidden bg-white/75 p-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 text-lg font-bold text-white shadow-[0_12px_28px_rgba(99,102,241,0.25)] transition duration-300 group-hover:scale-105">
                {item.emoji || String(index + 1).padStart(2, '0')}
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.description}</p>
            </NeoCard>
          ))}
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-7">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{problem.heading}</p>
              <h2 className="font-display text-3xl text-zinc-900 sm:text-4xl">{solution.heading}</h2>
              <p className="text-sm leading-7 text-zinc-600 sm:text-base">
                {solution.subtext}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {solution.steps.map((step, index) => (
                <RevealOnScroll key={step.number} delay={index * 0.08}>
                  <NeoCard className="h-full bg-white/80 p-4">
                    <p className="text-sm font-bold tracking-[0.2em] text-violet-600">{step.number}</p>
                    <h3 className="mt-3 text-base font-semibold text-zinc-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{step.description}</p>
                  </NeoCard>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="grid gap-3 sm:grid-cols-3">
          {parsedStats.map((item) => (
            <CountUpStat key={item.label} value={item.value} suffix={item.suffix} label={item.label} />
          ))}
        </section>
      </RevealOnScroll>

      <section className="space-y-4">
        <RevealOnScroll>
          <h2 className="font-display text-3xl text-zinc-900 sm:text-4xl">{features.heading}</h2>
        </RevealOnScroll>
        <RevealOnScroll>
          <p className="text-sm leading-7 text-zinc-600 sm:text-base">{features.subtext}</p>
        </RevealOnScroll>
        <div className="grid gap-4 md:grid-cols-3">
          {features.items.slice(0, 3).map((item, idx) => (
            <RevealOnScroll key={item.title} delay={idx * 0.08}>
              <NeoCard>
                <h3 className="text-lg font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{item.description}</p>
              </NeoCard>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-7">
        <RevealOnScroll>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{pricing.plan.name}</p>
              <h2 className="mt-1 font-display text-2xl text-zinc-900 sm:text-3xl">{pricing.heading}</h2>
            </div>
            <Link to="/vendor/register"><NeoButton>{pricing.plan.cta}</NeoButton></Link>
          </div>
        </RevealOnScroll>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.items.map((item, idx) => (
            <RevealOnScroll key={item.title} delay={idx * 0.05}>
              <NeoCard className="h-full bg-white/80 p-5">
                <h3 className="text-lg font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{item.description}</p>
              </NeoCard>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <RevealOnScroll>
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-slate-900 via-violet-900 to-fuchsia-800 px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:px-8 sm:py-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{stats.heading}</p>
              <h2 className="mt-3 font-display text-3xl leading-[0.95] sm:text-4xl">{cta_final.heading}</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
                {cta_final.subtext}
              </p>
              <div className="mt-5">
                <Link to="/vendor/register"><NeoButton>{cta_final.button}</NeoButton></Link>
              </div>
            </div>
            <div className="relative grid min-h-[240px] place-items-center">
              <motion.div
                className="absolute left-6 top-6 h-24 w-24 rounded-full bg-white/15 blur-xl"
                animate={{ y: [0, -10, 0], x: [0, 6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute bottom-8 right-6 h-28 w-28 rounded-[32px] border border-white/25 bg-white/10 backdrop-blur"
                animate={{ rotate: [0, 8, 0], y: [0, 10, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              />
              <NeoCard className="relative w-full max-w-sm bg-white/12 p-5 text-white shadow-none">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">{pricing.plan.name}</p>
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-semibold text-white">{pricing.plan.price}</p>
                  <p className="text-sm text-white/80">{pricing.plan.period}</p>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {pricing.plan.features.slice(0, 2).map((feature) => (
                      <div key={feature} className="rounded-2xl bg-white/15 p-3 text-xs text-white/85">{feature}</div>
                    ))}
                  </div>
                </div>
              </NeoCard>
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <section className="rounded-[24px] border border-white/70 bg-white/70 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-7">
        <RevealOnScroll>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-zinc-900 sm:text-3xl">{footer.tagline}</h2>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">{pricing.plan.note}</span>
          </div>
        </RevealOnScroll>

        {loadingHighlights ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
                <SkeletonBlock className="h-4 w-20" />
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pricing.plan.features.slice(0, 4).map((item, idx) => (
              <RevealOnScroll key={item} delay={idx * 0.06}>
                <NeoCard className="p-4">
                  <p className="text-sm font-medium text-zinc-700">{item}</p>
                </NeoCard>
              </RevealOnScroll>
            ))}
          </div>
        )}
      </section>

      <RevealOnScroll>
        <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 text-sm leading-7 text-zinc-600 backdrop-blur">
          <p>{disclaimer.short}</p>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 backdrop-blur">
          <div className="grid gap-4 sm:grid-cols-3">
            {Object.entries(footer.links).map(([group, links]) => (
              <NeoCard key={group} className="h-full bg-white/80 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-700">{group}</h3>
                <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                  {links.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </NeoCard>
            ))}
          </div>
          <p className="mt-5 text-xs text-zinc-500">{footer.copyright}</p>
        </section>
      </RevealOnScroll>
    </div>
  );
}
