import { LogoMark } from "@/app/site/marks";
import { COPY, LINKS } from "@/lib/site";

/**
 * Shared by both layouts, identically. The author's name is a link to their own account
 * rather than to the repo — the repo already has two links in this row, and a byline that
 * goes to the project says nothing the project does not already say.
 */
export function Footer() {
  return (
    <footer className="mt-auto flex flex-col gap-4 border-t border-rule px-6 pb-9 pt-7 text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-14">
      <div className="site-body flex items-center gap-[10px]">
        <LogoMark />
        <span>
          {COPY.builtBy.before}
          <a href={LINKS.author} className="motion-state font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">
            {COPY.builtBy.name}
          </a>
          {COPY.builtBy.after}
        </span>
      </div>

      <div className="site-body flex gap-6 font-medium">
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
