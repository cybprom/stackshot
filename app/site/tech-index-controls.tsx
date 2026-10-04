"use client";

import { useMemo, useState } from "react";
import { LAYER_NAME } from "@/lib/card-text";
import { COPY, LINKS } from "@/lib/site";
import { INDEX_CAP, score, type IndexEntry } from "@/lib/tech-index";
import type { Category } from "@/lib/stack-map/types";

type Chip = { category: Category; label: string; count: number };

/**
 * The map as a searchable grid: the whole index, filtered by a query and the layer chips,
 * capped until asked to show everything.
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
  const [layer, setLayer] = useState<Category | null>(null);
  const [expanded, setExpanded] = useState(false);

  const matches = useMemo(() => {
    const scored: { entry: IndexEntry; rank: number }[] = [];
    for (const entry of entries) {
      if (layer && entry.category !== layer) continue;
      const rank = score(entry, query);
      if (rank === null) continue;
      scored.push({ entry, rank });
    }
    // Best first; ties keep the server's alphabetical order, so an empty query renders
    // the grid exactly as `TECH_INDEX` is sorted.
    scored.sort((a, b) => b.rank - a.rank);
    return scored.map(({ entry }) => entry);
  }, [entries, query, layer]);

  // A query or a chip means every match is worth showing; a bare grid is capped.
  const filtering = query.trim() !== "" || layer !== null;
  const capped = expanded || filtering ? matches : matches.slice(0, INDEX_CAP);
  const hasMore = !filtering && matches.length > INDEX_CAP;

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
          onChange={(event) => setQuery(event.target.value)}
          className="site-data h-[46px] w-full max-w-[340px] rounded-control border-[1.5px] border-ink bg-surface px-[14px] text-ink"
        />
      </div>

      <div className="flex flex-wrap gap-[6px]">
        {chips.map((chip) => {
          const on = layer === chip.category;
          return (
            <button
              key={chip.category}
              type="button"
              aria-pressed={on}
              onClick={() => setLayer(on ? null : chip.category)}
              className="motion-state inline-flex h-[34px] shrink-0 items-center gap-[7px] rounded-pill border px-3 font-display text-[13.5px] font-semibold"
              style={{
                borderColor: on ? `var(--layer-${chip.category})` : "var(--rule)",
                backgroundColor: on ? `var(--layer-${chip.category}-tint)` : "transparent",
                color: on ? `var(--layer-${chip.category})` : "var(--ink)",
              }}
            >
              <span className="inline-block h-2 w-2 rounded-[2px]" style={{ backgroundColor: `var(--layer-${chip.category})` }} />
              {chip.label}
              <span className="site-data opacity-70">{chip.count}</span>
            </button>
          );
        })}
      </div>

      <div id="tech-grid" className="flex flex-wrap gap-[10px]">
        {capped.map((entry) => (
          <TechTile key={entry.id} entry={entry} />
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

      {hasMore || expanded ? (
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
function TechTile({ entry }: { entry: IndexEntry }) {
  return (
    <div
      className="box-border flex h-[88px] w-[100px] flex-col justify-between rounded-tile px-2 pb-[7px] pt-[6px]"
      style={{
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
