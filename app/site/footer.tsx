import { LogoMark } from "@/app/site/marks";
import { COPY, LINKS } from "@/lib/site";

/** The byline links to the author's own account: the repo already has two links here. */
export function Footer() {
  return (
    <footer className="site-grid mt-auto flex flex-col gap-4 border-t border-rule pb-9 pt-7 text-ink-muted sm:flex-row sm:items-center sm:justify-between">
      <div className="site-small flex items-center gap-2.5">
        <LogoMark size={18} />
        <span>
          {COPY.builtBy.before}
          <a href={LINKS.author} className="motion-state font-bold text-ink hover:text-ink-muted">
            {COPY.builtBy.name}
          </a>
          {COPY.builtBy.after}
        </span>
      </div>

      <div className="site-small flex gap-6 font-semibold">
        <a href={LINKS.repo} className="motion-state text-ink hover:text-ink-muted">
          {COPY.github}
        </a>
        <a href={LINKS.issues} className="motion-state text-ink hover:text-ink-muted">
          {COPY.suggest}
        </a>
      </div>
    </footer>
  );
}
