import { LAYER_NAME } from "@/lib/card-text";
import type { Category } from "@/lib/stack-map/types";

const CATEGORIES = Object.keys(LAYER_NAME) as Category[];

/** The logo: four squares in the four layer colours, the card's own encoding shrunk. */
export function LogoMark({ size = 16 }: { size?: number }) {
  return (
    <span aria-hidden className="grid shrink-0 grid-cols-2 gap-0.5" style={{ width: size, height: size }}>
      {CATEGORIES.map((category) => (
        <span key={category} className="rounded-xs" style={{ backgroundColor: `var(--layer-${category})` }} />
      ))}
    </span>
  );
}

const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden>
      <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
    </svg>
  );
}

export function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden>
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.2" {...stroke} aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}


export function BookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden>
      <path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  );
}
