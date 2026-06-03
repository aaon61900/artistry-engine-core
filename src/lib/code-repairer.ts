/**
 * Website code repairer
 *
 * Auto-recovers from the most common runtime breakage on Vite + TanStack Start:
 *  - "Failed to fetch dynamically imported module" (stale chunk after a redeploy
 *    or dep-optimizer reload)
 *  - "Loading chunk N failed"
 *  - "Importing a module script failed"
 *
 * Strategy: on the FIRST occurrence, force a one-time hard reload with a
 * cache-busting query param. Guarded by sessionStorage so we never loop.
 */

const FLAG = "__repairer_reloaded__";

function isChunkLoadError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("importing a module script failed") ||
    m.includes("loading chunk") ||
    m.includes("loading css chunk") ||
    m.includes("unable to preload css")
  );
}

function tryRepair(message: string): boolean {
  if (typeof window === "undefined") return false;
  if (!isChunkLoadError(message)) return false;
  try {
    if (sessionStorage.getItem(FLAG)) return false;
    sessionStorage.setItem(FLAG, String(Date.now()));
  } catch {
    // sessionStorage may be unavailable; skip the guard
  }
  const url = new URL(window.location.href);
  url.searchParams.set("_r", String(Date.now()));
  window.location.replace(url.toString());
  return true;
}

export function installCodeRepairer() {
  if (typeof window === "undefined") return;

  // Clear the one-shot flag once the page renders successfully.
  window.addEventListener("load", () => {
    try {
      sessionStorage.removeItem(FLAG);
    } catch {
      /* noop */
    }
  });

  window.addEventListener("error", (event) => {
    const msg = (event.error && (event.error as Error).message) || event.message || "";
    if (tryRepair(msg)) event.preventDefault();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "";
    if (tryRepair(msg)) event.preventDefault();
  });
}
