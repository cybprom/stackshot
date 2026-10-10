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
export async function Nav({ className = "" }: { className?: string }) {
  const count = await stars("cybprom/stackshot");

  return (
    // Sticky so the star stays reachable: it is the one thing on the page we are asking
    // for, and it is otherwise only in view for the first screenful. `bg-surface` is
    // required, not decoration — a transparent sticky bar lets the index's tiles scroll
    // through it.
    //
    // `className` is how a layout paints the band, and it has to land on this element
    // rather than on a wrapper: a sticky element can only travel inside its own parent's
    // box, so a wrapper the height of the nav unsticks it immediately. C passes
    // `theme-dark` and `bg-surface` then resolves to the band's own ground.
    <nav
      className={`sticky top-0 z-50 flex h-18 shrink-0 items-center justify-between border-b border-rule bg-surface px-6 sm:px-14 ${className}`}
    >
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
        {/* The label goes before the count does: the star and the number still say what
            the link is, and at 390px the three together wrap into the wordmark. */}
        <span className="site-label hidden font-display font-semibold sm:inline">{COPY.starOnGitHub}</span>
        <span className="site-data text-ink-muted">{starsLabel(count)}</span>
      </a>
    </nav>
  );
}
