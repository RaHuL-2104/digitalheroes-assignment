import Link from "next/link";
import { SectionTitle } from "@/components/section-title";

const valueBlocks = [
  {
    title: "Enter last 5 scores",
    body: "Log Stableford scores from 1 to 45 with dates. The platform always keeps your latest five rounds."
  },
  {
    title: "Join monthly draws",
    body: "Every month, your participation qualifies for 5/4/3 number match prize pools with transparent rules."
  },
  {
    title: "Support real charities",
    body: "Choose your charity at signup and contribute a minimum of 10% from each subscription payment."
  }
];

export default function HomePage() {
  return (
    <div className="bg-hero-gradient">
      <section className="shell py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-ocean">
              Golf x Charity x Rewards
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-ink md:text-6xl">
              Play with purpose.
              <br />
              Win with transparency.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-ink/70">
              ImpactDraw is a subscription platform where your golf performance powers monthly prize draws and
              meaningful charity contributions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary">
                Subscribe Now
              </Link>
              <Link href="/charities" className="btn-secondary">
                Explore Charities
              </Link>
            </div>
          </div>
          <div className="card border border-white/70">
            <h2 className="text-xl font-bold">How the monthly reward works</h2>
            <ol className="mt-4 space-y-3 text-sm text-ink/75">
              <li>1. Keep your latest 5 Stableford scores updated.</li>
              <li>2. Enter monthly draw numbers based on your score profile.</li>
              <li>3. Match 3, 4, or 5 numbers to receive payouts.</li>
              <li>4. Jackpot rolls over when no 5-match winner appears.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="shell pb-16 md:pb-24">
        <SectionTitle
          eyebrow="Core Flow"
          title="Everything required by the assignment, in one ecosystem"
          description="This MVP includes subscription billing, score logic, draw simulation/publishing, charity management, and winner verification."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {valueBlocks.map((block) => (
            <article key={block.title} className="card">
              <h3 className="text-lg font-semibold">{block.title}</h3>
              <p className="mt-2 text-sm text-ink/70">{block.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
