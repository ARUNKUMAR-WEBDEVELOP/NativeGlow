import { Link } from 'react-router-dom';
import platformContent from '../content/platformContent';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

export default function AboutUsPage() {
  const ref = useScrollAnimation();
  const { about_page, mission_section, stats, cta_final, disclaimer } = platformContent;
  const storyParagraphs = about_page.story_body.split('\n\n');
  const problemBody = storyParagraphs[0] || about_page.story_body;
  const missionFirstSentence = `${(mission_section.body.split('. ')[0] || mission_section.body).trim()}.`;

  return (
    <main ref={ref} className="pb-12">
      <section className="fade-up relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#0a1f12,#1a472a)] px-6 py-16 text-center text-white">
        <span className="float absolute left-[12%] top-[18%] h-12 w-12 rounded-full bg-white/10 blur-sm" />
        <span className="float-slow absolute right-[14%] top-[32%] h-10 w-10 rounded-full bg-emerald-200/20 blur-sm" />
        <span className="float absolute bottom-[18%] left-[25%] h-8 w-8 rounded-full bg-green-100/20 blur-sm" />
        <div className="relative mx-auto max-w-3xl space-y-5">
          <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em]">
            {about_page.mission_badge}
          </p>
          <h1 className="font-display text-5xl leading-[1.02] text-white sm:text-6xl">{about_page.hero_heading}</h1>
          <p className="mx-auto max-w-[600px] text-base leading-8 text-white/75 sm:text-lg">{about_page.hero_sub}</p>
        </div>
      </section>

      <section className="fade-up bg-[var(--cream)] px-6 py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h2 className="font-display text-4xl text-zinc-900">{about_page.problem_heading}</h2>
            <p className="mt-5 text-[17px] leading-8 text-zinc-700">{problemBody}</p>
          </div>
          <div className="space-y-4">
            {stats.items.slice(0, 3).map((item) => (
              <article key={item.label} className="card-3d rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="stat-number text-zinc-900">{item.number}</p>
                <p className="mt-1 text-sm font-medium text-zinc-600">{item.label}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fade-up bg-white px-6 py-16">
        <div className="mx-auto w-full max-w-[720px]">
          <p className="font-display text-[120px] leading-none text-green-800/20">“</p>
          <h2 className="font-display text-3xl text-zinc-900">{about_page.story_heading}</h2>
          <div className="mt-5 space-y-6">
            {storyParagraphs.map((paragraph) => (
              <p key={paragraph} className="text-[17px] leading-[1.8] text-zinc-700">
                {paragraph}
              </p>
            ))}
          </div>
          <p className="mt-8 text-base italic text-zinc-500">{about_page.team_signature}</p>
        </div>
      </section>

      <section className="fade-up bg-[#0d2b18] px-6 py-16">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-display text-4xl text-white">{about_page.values_heading}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {mission_section.values.map((item, idx) => (
              <article key={item.title} className="card-3d glass-dark relative overflow-hidden rounded-2xl p-6">
                <p className="pointer-events-none absolute -right-2 top-0 font-display text-[80px] leading-none text-white/12">
                  {String(idx + 1).padStart(2, '0')}
                </p>
                <h3 className="relative z-10 text-2xl font-semibold text-white">{item.title}</h3>
                <p className="relative z-10 mt-3 text-sm leading-7 text-white/70">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fade-up gradient-animated px-6 py-16 text-center text-white">
        <div className="mx-auto w-full max-w-3xl">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">{about_page.mission_statement_heading}</h2>
          <div className="mt-5 flex items-center justify-center gap-4">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 7H5v6h4v4H3V9a6 6 0 0 1 6-6v4zm12 0h-4v6h4v4h-6V9a6 6 0 0 1 6-6v4z" fill="white" />
            </svg>
          </div>
          <blockquote className="mx-auto mt-4 max-w-[700px] font-display text-3xl italic leading-[1.4] text-white/95">
            {missionFirstSentence}
          </blockquote>
        </div>
      </section>

      <section className="fade-up bg-[var(--cream)] px-6 py-16">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-display text-4xl text-zinc-900">{about_page.help_heading}</h2>
          <div className="stagger mt-8 grid gap-4 md:grid-cols-3">
            {about_page.help_columns.map((item) => (
              <article key={item.title} className="fade-up card-3d rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-700">{item.line1}</p>
                <p className="mt-2 text-sm leading-7 text-zinc-600">{item.line2}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fade-up bg-[#1c1c1e] px-6 py-16 text-center text-white">
        <div className="mx-auto w-full max-w-3xl">
          <h2 className="font-display text-4xl text-white">{about_page.cta_heading}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/65">{cta_final.subtext}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/vendor/register" className="btn-primary">{about_page.cta_primary}</Link>
            <Link to="/" className="btn-ghost-white">{about_page.cta_secondary}</Link>
          </div>
        </div>
      </section>

      <section className="fade-up bg-[var(--cream-dark)] px-6 py-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm leading-7 text-zinc-700">{disclaimer.short}</p>
          <Link to={about_page.full_disclaimer_href} className="text-sm font-semibold text-green-800 underline underline-offset-4">
            {about_page.full_disclaimer_label}
          </Link>
        </div>
      </section>
    </main>
  );
}
