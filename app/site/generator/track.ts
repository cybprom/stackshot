import type { SiteEvent } from "@/lib/counters";

/** Fire and forget. A beacon survives the page navigating away, which a download can cause. */
export function track(event: SiteEvent): void {
  const body = JSON.stringify({ event });
  try {
    if (navigator.sendBeacon?.("/api/event", body)) return;
    void fetch("/api/event", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    // A count is never worth an error in front of the visitor.
  }
}
