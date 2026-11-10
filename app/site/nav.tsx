import Link from "next/link";
import { GitHubIcon, LogoMark, StarIcon } from "@/app/site/marks";
import { starsCount, starsLabel } from "@/lib/card-text";
import { COPY, LINKS } from "@/lib/site";
import { stars } from "@/lib/stars";

/**
 * Sticky so the star stays reachable. A server component because the star count is
 * fetched server-side and cached, never from the visitor's browser (`lib/stars.ts`).
 * `.nav-band` is see-through over the wall and turns solid as the page scrolls.
 */
export async function Nav() {
  const count = await stars("cybprom/stackshot");

  return (
    <nav className="nav-band theme-dark sticky top-0 z-50 flex h-18 shrink-0 items-center justify-between border-b px-5 sm:px-12">
      <Link href="/" className="flex items-center gap-2.5 text-ink">
        <LogoMark size={20} />
        <span className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{COPY.wordmark}</span>
      </Link>

      <a
        href={LINKS.repo}
        aria-label={COPY.starOnGitHub(starsLabel(count))}
        className="motion-state flex h-10 items-center rounded-control border border-rule bg-surface text-ink hover:border-ink"
      >
        <span className="flex items-center gap-2 px-3">
          <GitHubIcon />
          <span className="site-control hidden sm:inline">{COPY.github}</span>
        </span>
        <span aria-hidden className="h-5 w-px bg-rule" />
        <span className="flex items-center gap-1.5 px-3 text-ink-muted">
          <StarIcon />
          <span className="site-status">{starsCount(count)}</span>
        </span>
      </a>
    </nav>
  );
}
