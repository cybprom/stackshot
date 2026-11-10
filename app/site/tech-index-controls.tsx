"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon } from "@/app/site/marks";
import { LAYER_NAME } from "@/lib/card-text";
import { COPY, LINKS } from "@/lib/site";
import {
  INDEX_ALL,
  INDEX_CAP,
  closestEntry,
  indexTileDelay,
  score,
  type IndexEntry,
  type IndexFilter,
} from "@/lib/tech-index";

type Chip = { value: IndexFilter; label: string; count: number };

/** Old tiles fade out together over this long, which is also the typing debounce. */
const SWAP_MS = 120;

/**
 * The map as a searchable grid. Ordinary React over the entries rather than DOM surgery
 * over server-rendered tiles, which the React Compiler refuses. ADR-0036.
 */
export function TechIndexControls({ entries, chips }: { entries: readonly IndexEntry[]; chips: Chip[] }) {
  const [query, setQuery] = useState("");
  const [layer, setLayer] = useState<IndexFilter>(INDEX_ALL);
  const [expanded, setExpanded] = useState(false);
  // What the grid is drawing, which trails the controls by SWAP_MS.
  const [applied, setApplied] = useState<{ query: string; layer: IndexFilter }>({ query: "", layer: INDEX_ALL });
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  const matches = useMemo(() => {
    const scored: { entry: IndexEntry; rank: number }[] = [];
    for (const entry of entries) {
      if (applied.layer !== INDEX_ALL && entry.category !== applied.layer) continue;
      const rank = score(entry, applied.query);
      if (rank === null) continue;
      scored.push({ entry, rank });
    }
    // Best first; ties keep the server's alphabetical order.
    scored.sort((a, b) => b.rank - a.rank);
    return scored.map(({ entry }) => entry);
  }, [entries, applied]);

  const shown = expanded ? matches : matches.slice(0, INDEX_CAP);
  const hasMore = matches.length > INDEX_CAP;
  const trimmed = applied.query.trim();
  const closest = matches.length === 0 ? closestEntry(entries, trimmed) : undefined;

  function change(nextQuery: string, nextLayer: IndexFilter) {
    setQuery(nextQuery);
    setLayer(nextLayer);
    setLeaving(true);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setApplied({ query: nextQuery, layer: nextLayer });
      setExpanded(false);
      setLeaving(false);
    }, SWAP_MS);
  }

  return (
    <>
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div className="flex max-w-140 flex-col gap-2">
          <h2 className="site-section">{COPY.indexTitle}</h2>
          <p className="site-body text-ink-muted">{COPY.indexIntro(entries.length)}</p>
        </div>
        <div className="field motion-state flex h-11 w-full items-center gap-2.5 rounded-control border border-rule bg-field px-3.5 text-ink-muted sm:max-w-75">
          <SearchIcon />
          <input
            type="search"
            aria-label={COPY.indexSearchLabel}
            aria-controls="tech-grid"
            placeholder={COPY.indexSearchPlaceholder}
            value={query}
            onChange={(event) => change(event.target.value, layer)}
            className="site-data h-full w-full min-w-0 bg-transparent text-ink placeholder:text-ink-muted"
          />
        </div>
      </div>

      {/* All first and selected by default, or there is no way back to the whole map. */}
      <div className="index-chips -mx-5 flex gap-1.5 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
        {chips.map((chip) => {
          const on = layer === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              aria-pressed={on}
              onClick={() => change(query, chip.value)}
              className={`site-control motion-state inline-flex h-8 shrink-0 items-center gap-2 rounded-tile border px-2.5 ${on ? "border-ink bg-ink text-surface" : "border-rule text-ink hover:border-ink"}`}
            >
              {/* The dot keeps its layer colour either way: it is the key to the card. */}
              <span
                className="inline-block h-2 w-2 rounded-xs"
                style={{
                  backgroundColor: chip.value === INDEX_ALL ? "var(--ink-muted)" : `var(--layer-${chip.value})`,
                }}
              />
              {chip.label}
              <span className="site-status opacity-70">{chip.count}</span>
            </button>
          );
        })}
      </div>

      {/* Keyed by the filter, so the tiles remount and the stagger runs again. Twelve on
          a phone: 24 tiles at four across is a whole screen of grid. */}
      <div
        key={`${applied.query}|${applied.layer}|${expanded}`}
        id="tech-grid"
        className={`index-grid grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12 ${leaving ? "index-leaving" : ""} ${expanded ? "" : "index-capped"}`}
      >
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
          <span className="block font-semibold text-ink">{COPY.indexNoMatch(trimmed)}</span>
          {closest ? `${COPY.indexClosest(closest.display)} ` : null}
          <a href={LINKS.issues} className="motion-state font-semibold text-ink underline underline-offset-2 hover:text-ink-muted">
            {COPY.indexSuggest}
          </a>
        </p>
      ) : null}

      {hasMore ? (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setExpanded((was) => !was)}
            className="site-control motion-state h-11 flex-1 rounded-control border border-rule px-4 text-ink hover:border-ink sm:flex-none"
          >
            {expanded ? COPY.indexShowFewer : COPY.indexShowAll(matches.length)}
          </button>
          <span className="site-status hidden text-ink-muted sm:inline">
            {COPY.indexShown(shown.length, matches.length)}
          </span>
        </div>
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
      className="reveal-tile box-border flex h-20.5 min-w-0 flex-col justify-between rounded-tile px-0.75 pb-1.75 pt-1.5"
      style={{
        animationDelay: `${delay}ms`,
        backgroundColor: `var(--layer-${entry.category}-tint)`,
        borderTop: `3px solid var(--layer-${entry.category})`,
        // Transparent sides mitre the bar's ends, as the card draws them.
        borderInline: "3px solid transparent",
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
