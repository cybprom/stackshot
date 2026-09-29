import { StackForm } from "@/app/stack-form";
import { COPY, SITE_ORIGIN } from "@/lib/site";

export default function Home() {
  return (
    // The column is centred at roughly the card's natural width; everything inside starts
    // at the card's left edge. That single shared spine does the compositional work a grid
    // would do on a denser page. DESIGN.md SELF-CRITIQUE 5.
    <div className="mx-auto w-full max-w-[1100px] px-4 py-16 sm:px-8 sm:py-24">
      <main className="flex flex-col items-start">
        <h1 className="site-display max-w-[16ch]">{COPY.headline}</h1>
        <p className="site-body mt-6 max-w-[68ch] text-ink-muted">{COPY.intro}</p>
        <StackForm />
      </main>
      <footer className="site-data mt-24 text-ink-muted">
        <a href={SITE_ORIGIN} className="motion-state hover:text-ink">
          {SITE_ORIGIN.replace(/^https?:\/\//, "")}
        </a>
      </footer>
    </div>
  );
}
