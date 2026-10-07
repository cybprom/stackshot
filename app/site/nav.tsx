import Link from "next/link";
import { LogoMark, StarIcon } from "@/app/site/marks";
import { starsLabel } from "@/lib/card-text";
import { COPY, LINKS } from "@/lib/site";
import { stars } from "@/lib/stars";

/**
 * Shared by both layouts. A server component, because the star count is fetched
 * server-side and cached — never from the visitor's browser (`lib/stars.ts`).
 *
 * `starsLabel` is the card's own rounding, not a second one: the number beside the logo
 * and the number on a card should never disagree about what 58,784 is called.
 */
export async function Nav() {
  const count = await stars("cybprom/stackshot");

  return (
    <nav className="flex h-18 shrink-0 items-center justify-between border-b border-rule px-6 sm:px-14">
      <Link href="/" className="flex items-center gap-2.5 text-ink">
        <LogoMark size={18} />
        <span className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{COPY.wordmark}</span>
      </Link>

      <a
        href={LINKS.repo}
        className="motion-state inline-flex h-9 items-center gap-2 rounded-pill border-[1.5px] border-rule px-3.5 text-ink hover:border-ink"
      >
        <span className="text-layer-infra">
          <StarIcon />
        </span>
        <span className="site-label font-display font-semibold">{COPY.starOnGitHub}</span>
        <span className="site-data text-ink-muted">{starsLabel(count)}</span>
      </a>
    </nav>
  );
}
