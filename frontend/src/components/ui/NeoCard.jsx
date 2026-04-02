export default function NeoCard({ className = '', children }) {
  return (
    <article
      className={`rounded-2xl border border-white/60 bg-white/65 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(15,23,42,0.14)] ${className}`.trim()}
    >
      {children}
    </article>
  );
}
