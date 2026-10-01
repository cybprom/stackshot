"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * What the visitor's own machine asks for, which is what System on the theme toggle shows.
 * A media query is an external store, so it is read as one rather than copied into state
 * by an effect.
 *
 * The server has no media query to read and answers false: guessing dark would make the
 * first paint wrong for most visitors rather than for some.
 */
export function useSystemDark(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
