"use client";

import { createContext, use, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { ERROR_COPY, FAILURE_REASONS, type FailureReason } from "@/lib/failure";
import { INTRO_DELAY_MS, PANEL_WIDTH_MS } from "@/lib/hero";
import { parseRepoUrl } from "@/lib/github-url";
import {
  DEFAULT_LAUNCH_STYLE,
  type LaunchStyle,
  type PreviewDoc,
  type ThemeMode,
} from "@/lib/preview";
import { cardUrl, COPY, EXAMPLE_REPO, introCardUrl, pictureSnippet } from "@/lib/site";
import type { StackDoc } from "@/lib/stack-map/types";

// Our own route, but still a boundary the page parses rather than trusts.
const DocSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  language: z.string().nullable(),
  stars: z.number(),
  layers: z.array(
    z.object({
      category: z.enum(["frontend", "backend", "infra", "tooling"]),
      items: z.array(
        z.object({
          id: z.string(),
          display: z.string(),
          // The Tiles preview draws it, so the page needs it without importing the map.
          symbol: z.string(),
          version: z.string().optional(),
          description: z.string(),
        }),
      ),
      overflow: z.number(),
    }),
  ),
}) satisfies z.ZodType<Omit<StackDoc, "unmapped">>;

const OkSchema = z.object({ doc: DocSchema, cached: z.boolean() });
const FailedSchema = z.object({ error: z.string(), cause: z.string().optional(), limit: z.number().optional() });

// `ref` is the site's job: ERROR_COPY carries no repo, because the card puts it in the
// header. A bad URL names no repo at all, so it stays optional.
type Failure = { ref?: string; reason: string; detail: string };

/**
 * Two loading phases, both real: `reading` while `/api/resolve` runs, `drawing` while the
 * card arrives on its own stagger. The doc and the failure sit outside the phase because
 * the card on screen outlives both — it dims and stays, rather than vanishing, since what
 * is showing is still true until something replaces it.
 */
type Phase = "idle" | "reading" | "drawing";

const isFailureReason = (value: string): value is FailureReason =>
  FAILURE_REASONS.some((reason) => reason === value);

/** The five reasons the card uses, plus the two the site answers before spending a request. */
function failureFor(body: z.infer<typeof FailedSchema>, ref?: string): Failure {
  if (body.error === "bad_url" || body.error === "bad_request") return { reason: COPY.badUrl, detail: "" };
  // Our per-IP gate, not GitHub's limit: the visitor did this, and the sentence says so.
  if (body.error === "rate_limited" && body.cause === "per_ip" && body.limit !== undefined) {
    return { reason: COPY.gateLimited(body.limit), detail: "" };
  }
  const copy = ERROR_COPY[isFailureReason(body.error) ? body.error : "unavailable"];
  return { ref, reason: copy.reason, detail: copy.detail };
}

/**
 * Reduced motion, read as an external store rather than in an effect.
 *
 * C decides a piece of **layout** from it — the panel is already open for a visitor who
 * asked for less motion — and that has to be true in the hydration render, before a paint.
 * An effect would set state one commit late, which is a visible jump on the one page
 * element the layout exists to show, and the React Compiler forbids the `setState` it
 * would take. The server snapshot is `false`, so the server HTML is the animated path.
 */
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );
}

/** What C is handed so it can draw a card without a request. ADR-0035. */
export type Intro = { url: string; doc: PreviewDoc };

type Generator = {
  url: string;
  setUrl: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  /** A Try button: fill the field and resolve it, which is the second way in. */
  pick: (url: string) => void;
  phase: Phase;
  busy: boolean;
  failure?: Failure;

  /** The card being shown, from a resolve or from the committed intro doc. */
  doc?: PreviewDoc;
  /** Whether that doc came from a resolve, which is what decides the PNG's URL. */
  resolved: boolean;
  png: { light: string; dark: string; alt: string };
  onSettled: () => void;

  style: LaunchStyle;
  pickStyle: (style: LaunchStyle) => void;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;

  snippet: string;
  /** Where the copied markdown would point, for the download links. */
  shown: { owner: string; repo: string };
  copied: "idle" | "done" | "failed";
  onCopy: () => void;
  snippetOpen: boolean;
  toggleSnippet: () => void;

  /** C's panel is closed until it has something to show. A is always open. */
  expanded: boolean;
  reduceMotion: boolean;
};

const GeneratorContext = createContext<Generator | undefined>(undefined);

export function useGenerator(): Generator {
  const value = use(GeneratorContext);
  if (!value) throw new Error("useGenerator outside <GeneratorProvider>");
  return value;
}

/**
 * Every piece of the generator's state, with no markup and no opinion about stacking.
 *
 * Layouts A and C place the same parts differently — C puts the controls beside the card
 * and Copy under it — so the parts in this directory take no width, margin or order of
 * their own and the hero composes them. ROADMAP, Phase 5 step 5.
 */
export function GeneratorProvider({
  children,
  intro,
  startExpanded = true,
}: {
  children: React.ReactNode;
  /** C only: the card it draws itself, ~0.9s after load, with no request. */
  intro?: Intro;
  startExpanded?: boolean;
}) {
  // Undefined until something puts a value in it, so the intro can fill the field under
  // reduced motion — where there is no sequence to watch and the page simply arrives at
  // the end of one — without overwriting a visitor who typed first.
  const [typed, setTyped] = useState<string | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>("idle");
  const [resolvedDoc, setResolvedDoc] = useState<PreviewDoc | undefined>(undefined);
  const [failure, setFailure] = useState<Failure | undefined>(undefined);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [style, setStyle] = useState<LaunchStyle>(DEFAULT_LAUNCH_STYLE);
  const [mode, setMode] = useState<ThemeMode>("system");
  const [opened, setOpened] = useState(startExpanded);
  const [introShown, setIntroShown] = useState(false);
  // Two submissions in flight would otherwise let the slower one win.
  const latest = useRef(0);
  // The intro is abandoned if the visitor gets there first, but only before it starts:
  // once the panel is opening, cancelling would strand the sequence mid-phase.
  const introLocked = useRef(false);
  const introCancelled = useRef(false);

  const reduceMotion = useReducedMotion();
  // No sequence to watch, so the page arrives at the end of it. ROADMAP, Phase 5.
  const introSettled = Boolean(intro) && reduceMotion;
  const doc = resolvedDoc ?? (intro && (introShown || introSettled) ? intro.doc : undefined);
  // The field says what produced the card on screen, on both paths.
  const url = typed ?? (introSettled && intro ? intro.url : "");
  const expanded = opened || introSettled;
  const shown = resolvedDoc ?? EXAMPLE_REPO;
  const snippet = pictureSnippet(shown.owner, shown.repo, style);

  /**
   * The intro card's bytes are the ones rendered into `public/` at build time, not the
   * card route's: the route resolves from GitHub on a cold cache, and the homepage must
   * never wait on it. A card the visitor asked for is a different matter — that one has
   * been resolved already, so its route URL is warm and is also what the snippet says.
   * ADR-0035, and `lib/site.ts`'s note on the pre-warm this one card gives up.
   */
  const png = {
    light: resolvedDoc ? cardUrl(shown.owner, shown.repo, style, "light") : introCardUrl(style, "light"),
    dark: resolvedDoc ? cardUrl(shown.owner, shown.repo, style, "dark") : introCardUrl(style, "dark"),
    alt: `${shown.owner}/${shown.repo} tech stack, generated by Stackshot`,
  };

  /**
   * The card is arriving — a new resolve, or the same stack redrawn in another style. The
   * phase ends when the plate says so, not on a timer here: it is the one that knows when
   * the reveal has finished and the real PNG is up, and two timers would disagree.
   */
  const onSettled = useCallback(() => setPhase("idle"), []);

  /**
   * C draws its own card shortly after load. The doc is committed data handed down as a
   * prop, so this spends no request and cannot fail; the beat between opening and drawing
   * is the panel's own transition, because the card cannot be drawn at its final size
   * until the panel has finished opening.
   */
  useEffect(() => {
    if (!intro || reduceMotion) return;

    const open = setTimeout(() => {
      if (introCancelled.current) return;
      introLocked.current = true;
      setTyped(intro.url);
      setOpened(true);
      setPhase("reading");
    }, INTRO_DELAY_MS);

    const draw = setTimeout(() => {
      if (introCancelled.current) return;
      setIntroShown(true);
      setPhase("drawing");
    }, INTRO_DELAY_MS + PANEL_WIDTH_MS);

    return () => {
      clearTimeout(open);
      clearTimeout(draw);
    };
  }, [intro, reduceMotion]);

  function cancelIntro() {
    if (!introLocked.current) introCancelled.current = true;
  }

  function setUrl(value: string) {
    cancelIntro();
    setTyped(value);
  }

  function pickStyle(next: LaunchStyle) {
    setStyle(next);
    if (doc) setPhase("drawing");
  }

  async function resolve(target: string) {
    cancelIntro();
    setCopied("idle");

    // Answered here so a typo costs neither a request nor one of the hourly resolves.
    const parsed = parseRepoUrl(target);
    if (!parsed) {
      setFailure({ reason: COPY.badUrl, detail: "" });
      return;
    }
    // What the user asked for, which is what a failure has to name. A success names the
    // canonical owner/repo from the response instead.
    const ref = `${parsed.owner}/${parsed.repo}`;

    const ticket = ++latest.current;
    setFailure(undefined);
    setOpened(true);
    setPhase("reading");
    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const body: unknown = await response.json();
      if (ticket !== latest.current) return;

      const ok = OkSchema.safeParse(body);
      if (response.ok && ok.success) {
        setResolvedDoc(ok.data.doc);
        setPhase("drawing");
        return;
      }
      const failed = FailedSchema.safeParse(body);
      setPhase("idle");
      setFailure(failureFor(failed.success ? failed.data : { error: "unavailable" }, ref));
    } catch {
      if (ticket !== latest.current) return;
      setPhase("idle");
      setFailure(failureFor({ error: "unavailable" }, ref));
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    void resolve(url);
  }

  function pick(next: string) {
    setUrl(next);
    void resolve(next);
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied("done");
      setTimeout(() => setCopied("idle"), 3000);
    } catch {
      // Denied permission or an insecure origin. The snippet is readable markup rather
      // than a string only we hold, so the disclosure opens and the message points at it.
      setCopied("failed");
      setSnippetOpen(true);
    }
  }

  const value: Generator = {
    url,
    setUrl,
    onSubmit,
    pick,
    phase,
    busy: phase === "reading",
    failure,
    doc,
    resolved: Boolean(resolvedDoc),
    png,
    onSettled,
    style,
    pickStyle,
    mode,
    setMode,
    snippet,
    shown,
    copied,
    onCopy,
    snippetOpen,
    toggleSnippet: () => setSnippetOpen((open) => !open),
    expanded,
    reduceMotion,
  };

  return <GeneratorContext value={value}>{children}</GeneratorContext>;
}
