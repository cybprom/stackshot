"use client";

import { createContext, use, useCallback, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { ERROR_COPY, FAILURE_REASONS, type FailureReason } from "@/lib/failure";
import { parseRepoUrl } from "@/lib/github-url";
import {
  DEFAULT_LAUNCH_STYLE,
  foundCount,
  type LaunchStyle,
  type PreviewDoc,
  type ThemeMode,
} from "@/lib/preview";
import { track } from "@/app/site/generator/track";
import { cardPath, COPY, EXAMPLE_REPO, introCardUrl, pictureSnippet } from "@/lib/site";
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

type RepoRef = { owner: string; repo: string };

// `repo` is the site's job: ERROR_COPY carries no repo, because the card puts it in the
// header. A bad URL or our own per-IP gate names none, so it stays optional.
type Failure = { repo?: RepoRef; reason: string; detail: string };

/**
 * Two loading phases, both real: `reading` while `/api/resolve` runs, `drawing` while the
 * card arrives on its own stagger. The doc and the failure sit outside the phase because
 * the card on screen outlives a resolve in flight: it dims and stays until the answer
 * replaces it, and a repo that fails is an answer too.
 */
type Phase = "idle" | "reading" | "drawing";

const isFailureReason = (value: string): value is FailureReason =>
  FAILURE_REASONS.some((reason) => reason === value);

/** The five reasons the card uses, plus the two the site answers before spending a request. */
function failureFor(body: z.infer<typeof FailedSchema>, repo?: RepoRef): Failure {
  if (body.error === "bad_url" || body.error === "bad_request") return { reason: COPY.badUrl, detail: "" };
  // Our per-IP gate, not GitHub's limit: the visitor did this, and the sentence says so.
  if (body.error === "rate_limited" && body.cause === "per_ip" && body.limit !== undefined) {
    return { reason: COPY.gateLimited(body.limit), detail: "" };
  }
  const copy = ERROR_COPY[isFailureReason(body.error) ? body.error : "unavailable"];
  return { repo, reason: copy.reason, detail: copy.detail };
}

// An external store, so the scramble never starts for a visitor who asked for less motion.
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

type Generator = {
  url: string;
  setUrl: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  /** A Try button: fill the field and resolve it, which is the second way in. */
  pick: (url: string) => void;
  phase: Phase;
  busy: boolean;
  failure?: Failure;

  /** The card being shown. Undefined until the first resolve succeeds. */
  doc?: PreviewDoc;
  /** Plain words for the line above the card. Empty when there is nothing to say. */
  statusText: string;
  /** Submit to PNG up, for the card on screen. */
  drawnMs?: number;
  png: { light: string; dark: string; alt: string };
  /** `png` is only there to size the empty slot. */
  placeholder: boolean;
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

  /** One column until the first Generate. Never goes back. */
  expanded: boolean;
  reduceMotion: boolean;
};

const COPIED_HOLD_MS = 1600;

const GeneratorContext = createContext<Generator | undefined>(undefined);

export function useGenerator(): Generator {
  const value = use(GeneratorContext);
  if (!value) throw new Error("useGenerator outside <GeneratorProvider>");
  return value;
}

/** Every piece of the generator's state, with no markup and no opinion about stacking. */
export function GeneratorProvider({ children }: { children: React.ReactNode }) {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [resolvedDoc, setResolvedDoc] = useState<PreviewDoc | undefined>(undefined);
  const [failure, setFailure] = useState<Failure | undefined>(undefined);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [style, setStyle] = useState<LaunchStyle>(DEFAULT_LAUNCH_STYLE);
  const [mode, setMode] = useState<ThemeMode>("system");
  const [expanded, setExpanded] = useState(false);
  const [reading, setReading] = useState("");
  const [drawnMs, setDrawnMs] = useState<number | undefined>(undefined);
  // Two submissions in flight would otherwise let the slower one win.
  const latest = useRef(0);
  const startedAt = useRef<number | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reduceMotion = useReducedMotion();
  const doc = resolvedDoc;
  const shown = resolvedDoc ?? EXAMPLE_REPO;
  const snippet = pictureSnippet(shown.owner, shown.repo, style);

  // Before the first card lands the slot is blank, sized by the build-rendered example, so
  // nothing shows another repo while this one loads. A first Generate that fails shows that
  // repo's real error card, which is exactly what its README would get.
  const failed = !resolvedDoc ? failure?.repo : undefined;
  const placeholder = !resolvedDoc && !failed;
  const pngUrl = (theme: "light" | "dark") =>
    resolvedDoc
      ? cardPath(resolvedDoc.owner, resolvedDoc.repo, style, theme)
      : failed
        ? cardPath(failed.owner, failed.repo, style, theme)
        : introCardUrl(style, theme);
  const png = {
    light: pngUrl("light"),
    dark: pngUrl("dark"),
    alt: `${shown.owner}/${shown.repo} tech stack, generated by Stackshot`,
  };

  const statusText =
    phase === "reading"
      ? COPY.statusReading(reading)
      : phase === "drawing" && doc
        ? COPY.statusDrawing(`${doc.owner}/${doc.repo}`)
        : doc
          ? COPY.statusFound(foundCount(doc), `${doc.owner}/${doc.repo}`)
          : "";

  /**
   * The card is arriving — a new resolve, or the same stack redrawn in another style. The
   * phase ends when the plate says so, not on a timer here: it is the one that knows when
   * the reveal has finished and the real PNG is up, and two timers would disagree.
   */
  const onSettled = useCallback(() => {
    if (startedAt.current !== null) {
      setDrawnMs(performance.now() - startedAt.current);
      startedAt.current = null;
    }
    setPhase("idle");
  }, []);

  function pickStyle(next: LaunchStyle) {
    if (next === style) return;
    setStyle(next);
    // A resolve in flight owns the phase, and its card arrives in this style anyway.
    if (doc && phase !== "reading") {
      startedAt.current = performance.now();
      setPhase("drawing");
    }
  }

  // A failure naming a repo takes the slot, so nothing still offers the last repo's card,
  // snippet or stack. A typo or our own rate limit names none, and leaves the card alone.
  function fail(next: Failure) {
    setPhase("idle");
    setFailure(next);
    if (next.repo) {
      setResolvedDoc(undefined);
      setDrawnMs(undefined);
    }
  }

  async function resolve(target: string) {
    setCopied("idle");

    // Answered here so a typo costs neither a request nor one of the hourly resolves.
    const parsed = parseRepoUrl(target);
    if (!parsed) {
      setFailure({ reason: COPY.badUrl, detail: "" });
      return;
    }
    // What the user asked for, which is what a failure has to name. A success names the
    // canonical owner/repo from the response instead.
    const repo = { owner: parsed.owner, repo: parsed.repo };

    const ticket = ++latest.current;
    setFailure(undefined);
    setExpanded(true);
    setReading(`${parsed.owner}/${parsed.repo}`);
    startedAt.current = performance.now();
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
      fail(failureFor(failed.success ? failed.data : { error: "unavailable" }, repo));
    } catch {
      if (ticket !== latest.current) return;
      fail(failureFor({ error: "unavailable" }, repo));
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
      track("copy", style);
      // A second click restarts the hold rather than racing the first timer.
      if (copyTimer.current !== null) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied("idle"), COPIED_HOLD_MS);
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
    statusText,
    drawnMs,
    png,
    placeholder,
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
