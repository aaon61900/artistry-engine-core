import { useEffect, useState } from "react";
import { Loader2, Check, ShieldCheck } from "lucide-react";

const STORAGE_KEY = "lumen:human-verified";
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export function isHumanVerified(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < TTL_MS;
  } catch {
    return false;
  }
}

export function markHumanVerified() {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("lumen:human-verified"));
}

export function clearHumanVerified() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("lumen:human-verified"));
}

export function HumanVerificationGate() {
  const [mounted, setMounted] = useState(false);
  const [verified, setVerified] = useState(true); // assume verified during SSR
  const [state, setState] = useState<"idle" | "checking" | "done">("idle");

  useEffect(() => {
    setMounted(true);
    setVerified(isHumanVerified());
    const onChange = () => setVerified(isHumanVerified());
    window.addEventListener("lumen:human-verified", onChange);
    return () => window.removeEventListener("lumen:human-verified", onChange);
  }, []);

  if (!mounted || verified) return null;

  const handleCheck = () => {
    if (state !== "idle") return;
    setState("checking");
    setTimeout(() => {
      setState("done");
      setTimeout(() => {
        markHumanVerified();
        setVerified(true);
      }, 400);
    }, 1200 + Math.random() * 600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Human verification"
      className="fixed inset-0 z-[100] grid place-items-center bg-background/95 backdrop-blur-xl px-4"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px] opacity-60"
        style={{ background: "var(--gradient-glow)" }}
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-border/60 p-8 shadow-2xl"
        style={{ background: "var(--gradient-card)" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="size-10 rounded-xl grid place-items-center"
            style={{ background: "var(--gradient-hero)" }}
          >
            <ShieldCheck className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">Verify you are human</div>
            <div className="text-xs text-muted-foreground -mt-0.5">
              Lumen Security Check
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          This quick check protects Lumen from automated abuse. It only takes a
          moment.
        </p>

        <button
          type="button"
          onClick={handleCheck}
          disabled={state !== "idle"}
          aria-label="I am human"
          className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 hover:bg-background/80 transition-colors p-4 text-left disabled:cursor-default"
        >
          <span className="relative size-6 shrink-0 rounded-md border-2 border-border grid place-items-center bg-background">
            {state === "checking" && (
              <Loader2 className="size-4 animate-spin text-primary" />
            )}
            {state === "done" && (
              <Check className="size-4 text-primary" strokeWidth={3} />
            )}
          </span>
          <span className="flex-1 text-sm font-medium">
            {state === "idle" && "I am human"}
            {state === "checking" && "Verifying…"}
            {state === "done" && "Verified"}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Lumen
          </span>
        </button>

        <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Privacy · Terms</span>
          <span>Protected by Lumen</span>
        </div>
      </div>
    </div>
  );
}
