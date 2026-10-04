"use client";

import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import { CardPlate } from "@/app/preview/card-plate";
import { StackFound } from "@/app/site/stack-found";
import { Segmented } from "@/app/preview/segmented";
import { ERROR_COPY, FAILURE_REASONS, type FailureReason } from "@/lib/failure";
import { parseRepoUrl } from "@/lib/github-url";
import {
  DEFAULT_LAUNCH_STYLE,
  LAUNCH_STYLES,
  THEME_MODES,
  type LaunchStyle,
  type ThemeMode,
} from "@/lib/preview";
import { cardUrl, COPY, EXAMPLE_REPO, pictureSnippet } from "@/lib/site";
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

type Doc = z.infer<typeof DocSchema>;
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

export function StackForm() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [doc, setDoc] = useState<Doc | undefined>(undefined);
  const [failure, setFailure] = useState<Failure | undefined>(undefined);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [style, setStyle] = useState<LaunchStyle>(DEFAULT_LAUNCH_STYLE);
  const [mode, setMode] = useState<ThemeMode>("system");
  // Two submissions in flight would otherwise let the slower one win.
  const latest = useRef(0);

  const shown = doc ?? EXAMPLE_REPO;
  const snippet = pictureSnippet(shown.owner, shown.repo, style);

  /**
   * The card is arriving — a new resolve, or the same stack redrawn in another style. The
   * phase ends when the plate says so, not on a timer here: it is the one that knows when
   * the reveal has finished and the real PNG is up, and two timers would disagree.
   */
  const onSettled = useCallback(() => setPhase("idle"), []);

  function pickStyle(next: LaunchStyle) {
    setStyle(next);
    if (doc) setPhase("drawing");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setCopied("idle");

    // Answered here so a typo costs neither a request nor one of the hourly resolves.
    const parsed = parseRepoUrl(url);
    if (!parsed) {
      setFailure({ reason: COPY.badUrl, detail: "" });
      return;
    }
    // What the user asked for, which is what a failure has to name. A success names the
    // canonical owner/repo from the response instead.
    const ref = `${parsed.owner}/${parsed.repo}`;

    const ticket = ++latest.current;
    setFailure(undefined);
    setPhase("reading");
    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body: unknown = await response.json();
      if (ticket !== latest.current) return;

      const ok = OkSchema.safeParse(body);
      if (response.ok && ok.success) {
        setDoc(ok.data.doc);
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

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied("done");
      setTimeout(() => setCopied("idle"), 3000);
    } catch {
      // Denied permission or an insecure origin. The snippet is selectable text, so say so.
      setCopied("failed");
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-12 flex w-full flex-col gap-3">
        <label htmlFor="repo-url" className="site-label text-ink-muted">
          {COPY.inputLabel}
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="repo-url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={COPY.placeholder}
            aria-describedby={failure ? "resolve-status" : undefined}
            className="site-data motion-state min-w-0 flex-1 rounded-control border-[1.5px] border-ink bg-transparent px-4 py-3 text-ink placeholder:text-ink-muted"
          />
          <button
            type="submit"
            disabled={phase === "reading"}
            className="site-label motion-state rounded-control border-[1.5px] border-ink bg-ink px-6 py-3 text-surface disabled:opacity-60"
          >
            {phase === "reading" ? COPY.reading : phase === "drawing" ? COPY.drawing : COPY.generate}
          </button>
        </div>
      </form>

      {/* Pending and failed both land here, so a screen reader hears the same thing the
          page shows. Never a skeleton of a card we cannot predict. */}
      <p
        id="resolve-status"
        role="status"
        aria-live="polite"
        className="site-body mt-4 max-w-[68ch]"
        hidden={phase === "idle" && !failure}
      >
        {phase !== "idle" ? (
          <span className="text-ink-muted">{phase === "reading" ? COPY.reading : COPY.drawing}</span>
        ) : failure ? (
          <>
            {/* The repo above the reason, the way the card's header sits above its
                message. DESIGN.md QUALITY FLOOR: every error names the repo. */}
            {failure.ref ? <span className="site-data block text-ink-muted">{failure.ref}</span> : null}
            <span className="text-error">{failure.reason}</span>
            {failure.detail ? <span className="text-ink-muted"> {failure.detail}</span> : null}
          </>
        ) : null}
      </p>

      <div className="mt-12 flex w-full flex-wrap items-center justify-between gap-4">
        <Segmented
          label={COPY.styleGroup}
          options={LAUNCH_STYLES.map((name) => ({ value: name, label: COPY.style[name] }))}
          value={style}
          onChange={pickStyle}
        />
        <Segmented
          label={COPY.themeGroup}
          options={THEME_MODES.map((name) => ({ value: name, label: COPY.theme[name] }))}
          value={mode}
          onChange={setMode}
          describedBy="theme-note"
        />
      </div>

      {/* Beside the control it explains, not beneath the card: it is the one control on
          the page that changes nothing about what you copy. */}
      <p id="theme-note" className="site-label mt-3 w-full text-ink-muted">
        {COPY.themeNote}
      </p>

      {/* No key and no arrival animation: the per-style reveal is the arrival now (ADR-0032
          amended MOTION's list), and remounting on a new repo would throw away the plate's
          measurement and collapse its height for a frame. */}
      <figure className="mt-4 w-full">
        {/* One slot, contents swapped — the page does not move when it answers you. Before
            a resolve there is no doc in the browser, so the example is its own bytes.
            DESIGN.md SELF-CRITIQUE, Milestone 3 #4. */}
        <CardPlate
          doc={doc}
          busy={phase === "reading"}
          reveal={phase === "drawing"}
          onSettled={onSettled}
          style={style}
          mode={mode}
          png={{
            light: cardUrl(shown.owner, shown.repo, style, "light"),
            dark: cardUrl(shown.owner, shown.repo, style, "dark"),
            alt: `${shown.owner}/${shown.repo} tech stack, generated by Stackshot`,
          }}
        />
        <figcaption className="mt-4 max-w-[68ch]">
          {doc ? (
            // The full name, never truncated: the card's header may have had to clip it.
            <span className="site-data text-ink-muted">
              {doc.owner}/{doc.repo}
            </span>
          ) : (
            <span className="site-body text-ink-muted">{COPY.exampleCaption}</span>
          )}
        </figcaption>
      </figure>

      {doc ? (
        <>
          <section className="mt-16 w-full">
            <h2 className="site-title">{COPY.snippetTitle}</h2>
            <pre className="site-code mt-6 overflow-x-auto rounded-snippet border-[1.5px] border-rule p-4 text-ink">
              {snippet}
            </pre>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onCopy}
                className="site-label motion-state rounded-control border-[1.5px] border-ink bg-ink px-6 py-3 text-surface"
              >
                {copied === "done" ? COPY.copied : COPY.copyMarkdown}
              </button>
              {/* Same-origin by construction — SITE_ORIGIN serves this page too — which is
                  what makes `download` save rather than navigate. */}
              <a
                href={cardUrl(doc.owner, doc.repo, style, "light")}
                download
                className="site-label motion-state rounded-control border-[1.5px] border-ink px-6 py-3 text-ink"
              >
                {COPY.downloadLight}
              </a>
              <a
                href={cardUrl(doc.owner, doc.repo, style, "dark")}
                download
                className="site-label motion-state rounded-control border-[1.5px] border-ink px-6 py-3 text-ink"
              >
                {COPY.downloadDark}
              </a>
            </div>
            <p className="site-body mt-4 text-ink-muted" hidden={copied !== "failed"}>
              {COPY.copyFailed}
            </p>
          </section>

          {/* Rebuilt in Phase 5 step 4: the symbol leads the row, two columns on
              desktop. It is the key to the Tiles symbols as much as it is the home of
              the descriptions. */}
          <StackFound doc={doc} />
        </>
      ) : null}
    </>
  );
}
