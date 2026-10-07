"use client";

import { useMemo, useState } from "react";
import { LAYER_NAME } from "@/lib/card-text";
import { COPY, LINKS } from "@/lib/site";
import {
  INDEX_ALL,
  INDEX_CAP,
  indexTileDelay,
  score,
  type IndexEntry,
  type IndexFilter,
} from "@/lib/tech-index";

type Chip = { value: IndexFilter; label: string; count: number };

/**
 * The map as a searchable grid: the whole index, filtered by a query and the layer chips,
 * capped at `INDEX_CAP` until asked to show everything.
 *
 * **Ordinary React over the entries, not DOM surgery over server-rendered tiles.** The
 * first build did the latter, to keep the map out of the RSC payload, and the React
 * Compiler refused it on three counts — mutating `hidden`, setting state from the effect
 * that filtered, reading a ref during render. The index costs 5.8KB gzipped, which is not
 * worth a lint suppression on the page's largest component. ADR-0036.
 *
 * Ranking is a sort on `score`, so **a fuzzy matcher is a change to that one function**
 * and nothing here moves.
 */
export function TechIndexControls({ entries, chips }: { entries: readonly IndexEntry[]; chips: Chip[] }) {
  const [query, setQuery] = useState("");
  const [layer, setLayer] = useState<IndexFilter>(INDEX_ALL);
  const [expanded, setExpanded] = useState(false);

  const matches = useMemo(() => {
    const scored: { entry: IndexEntry; rank: number }[] = [];
    for (const entry of entries) {
      if (layer !== INDEX_ALL && entry.category !== layer) continue;
      const rank = score(entry, query);
      if (rank === null) continue;
      scored.push({ entry, rank });
    }
    // Best first; ties keep the server's alphabetical order, so an empty query renders
    // the grid exactly as `TECH_INDEX` is sorted.
    scored.sort((a, b) => b.rank - a.rank);
    return scored.map(({ entry }) => entry);
  }, [entries, query, layer]);

  // The cap applies to a filtered grid too, as in the prototype: forty hits are still two
  // rows and a "Show all 40", not forty tiles dumped on the page.
  const shown = expanded ? matches : matches.slice(0, INDEX_CAP);
  const hasMore = matches.length > INDEX_CAP;

  // Narrowing the set starts the grid over, so the stagger runs again and whatever is
  // left reads as a new answer rather than as the old one with holes in it.
  function search(next: string) {
    setQuery(next);
    setExpanded(false);
  }

  function pick(next: IndexFilter) {
    setLayer(next);
    setExpanded(false);
  }

  return (
    <>
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div className="flex max-w-[560px] flex-col gap-2">
          <h2 className="site-section">{COPY.indexTitle}</h2>
          <p className="site-body text-ink-muted">{COPY.indexIntro(entries.length)}</p>
        </div>
        <input
          type="search"
          aria-label={COPY.indexSearchLabel}
          aria-controls="tech-grid"
          placeholder={COPY.indexSearchPlaceholder}
          value={query}
          onChange={(event) => search(event.target.value)}
          className="site-data h-[46px] w-full max-w-[340px] rounded-control border-[1.5px] border-ink bg-surface px-[14px] text-ink"
        />
      </div>

      {/* All first and selected by default. Without it there is no way back to the whole
          map once a layer is picked — the chips are a filter, not a mode you commit to. */}
      <div className="flex flex-wrap gap-[6px]">
        {chips.map((chip) => {
          const on = layer === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              aria-pressed={on}
              onClick={() => pick(chip.value)}
              className={`motion-state inline-flex h-[34px] shrink-0 items-center gap-[7px] rounded-pill border px-3 font-display text-[13.5px] font-semibold ${
                on ? "border-ink bg-ink text-surface" : "border-rule bg-transparent text-ink hover:border-ink"
              }`}
            >
              {/* The dot keeps its layer colour whether or not the chip is selected: it is
                  the key to the card's colours, not a selection indicator. All has no
                  layer, so it takes the neutral. */}
              <span
                className="inline-block h-2 w-2 rounded-[2px]"
                style={{
                  backgroundColor: chip.value === INDEX_ALL ? "var(--ink-muted)" : `var(--layer-${chip.value})`,
                }}
              />
              {chip.label}
              <span className="site-data opacity-70">{chip.count}</span>
            </button>
          );
        })}
      </div>

      {/* Keyed by the filter, so narrowing the set remounts the tiles and the stagger
          runs again. A CSS animation does not restart on its own for a node that stayed
          put, and the arrival is the thing that says the grid answered you. */}
      <div key={`${query}|${layer}|${expanded}`} id="tech-grid" className="flex flex-wrap gap-[10px]">
        {shown.map((entry, i) => (
          <TechTile key={entry.id} entry={entry} delay={indexTileDelay(i)} />
        ))}
      </div>

      {/* The grid changing is a visual event and announces nothing on its own. */}
      <p aria-live="polite" className="sr-only">
        {COPY.indexCount(matches.length)}
      </p>

      {matches.length === 0 ? (
        <p className="site-body text-ink-muted">
          {COPY.indexNoMatch(query.trim())}{" "}
          <a href={LINKS.issues} className="font-semibold text-ink underline decoration-rule underline-offset-4">
            {COPY.indexSuggest}
          </a>
          {COPY.indexSuggestAfter}
        </p>
      ) : null}

      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((was) => !was)}
          className="site-label motion-state h-[42px] self-start rounded-control border-[1.5px] border-ink px-4 font-display font-semibold text-ink"
        >
          {expanded ? COPY.indexShowFewer : COPY.indexShowAll(matches.length)}
        </button>
      ) : null}
    </>
  );
}

/** One entry, as the card would draw it: the symbol in the layer's colour on its tint. */
function TechTile({ entry, delay }: { entry: IndexEntry; delay: number }) {
  return (
    <div
      // The card preview's own reveal: same keyframes, same duration, a faster stagger.
      // Its reduced-motion branch covers this too.
      className="reveal-tile box-border flex h-[88px] w-[100px] flex-col justify-between rounded-tile px-2 pb-[7px] pt-[6px]"
      style={{
        animationDelay: `${delay}ms`,
        backgroundColor: `var(--layer-${entry.category}-tint)`,
        borderTop: `3px solid var(--layer-${entry.category})`,
      }}
    >
      <div
        className="font-display text-[28px] font-extrabold leading-none tracking-[-0.03em]"
        style={{ color: `var(--layer-${entry.category})` }}
      >
        {entry.symbol}
      </div>
      <div className="max-h-[2.3em] overflow-hidden text-[11.5px] font-medium leading-[1.15] text-ink">
        {entry.display}
      </div>
      <span className="sr-only">{LAYER_NAME[entry.category]}</span>
    </div>
  );
}
