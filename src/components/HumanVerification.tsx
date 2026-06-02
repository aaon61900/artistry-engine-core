import { useEffect, useState } from "react";
import { Loader2, Check, ShieldCheck, RefreshCw, X } from "lucide-react";

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

type Phase = "idle" | "checking" | "challenge" | "done";

const CHALLENGE_POOL = [
  { label: "traffic lights", target: "🚦", decoys: ["🚗", "🛵", "🚕", "🚙", "🛣️", "🚧", "🛑", "🅿️"] },
  { label: "bicycles", target: "🚲", decoys: ["🛴", "🛹", "🏍️", "🚗", "🚌", "🛼", "🚐", "🚜"] },
  { label: "boats", target: "⛵", decoys: ["🚤", "🛶", "🏖️", "🐟", "🌊", "🦈", "🐳", "🏝️"] },
  { label: "trees", target: "🌳", decoys: ["🌵", "🌲", "🌴", "🍄", "🌷", "🪨", "🏔️", "🪵"] },
  { label: "stars", target: "⭐", decoys: ["🌙", "☀️", "☁️", "🌈", "❄️", "⚡", "🪐", "🌍"] },
];

function buildChallenge() {
  const c = CHALLENGE_POOL[Math.floor(Math.random() * CHALLENGE_POOL.length)];
  const targetCount = 3 + Math.floor(Math.random() * 2); // 3 or 4
  const tiles: { emoji: string; isTarget: boolean }[] = [];
  for (let i = 0; i < targetCount; i++) tiles.push({ emoji: c.target, isTarget: true });
  const decoys = [...c.decoys].sort(() => Math.random() - 0.5).slice(0, 9 - targetCount);
  decoys.forEach((d) => tiles.push({ emoji: d, isTarget: false }));
  return { label: c.label, tiles: tiles.sort(() => Math.random() - 0.5) };
}

export function HumanVerificationGate() {
  const [mounted, setMounted] = useState(false);
  const [verified, setVerified] = useState(true); // assume verified during SSR
  const [state, setState] = useState<Phase>("idle");
  const [challenge, setChallenge] = useState(() => buildChallenge());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

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
      setChallenge(buildChallenge());
      setSelected(new Set());
      setError(null);
      setState("challenge");
    }, 900 + Math.random() * 500);
  };

  const toggleTile = (i: number) => {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const newChallenge = () => {
    setChallenge(buildChallenge());
    setSelected(new Set());
    setError(null);
  };

  const verify = () => {
    const correct = challenge.tiles.every((t, i) => t.isTarget === selected.has(i));
    if (!correct) {
      setError("That didn't look right. Try again.");
      newChallenge();
      return;
    }
    setState("done");
    setTimeout(() => {
      markHumanVerified();
      setVerified(true);
    }, 500);
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

        {state !== "challenge" && state !== "done" && (
          <p className="text-sm text-muted-foreground mb-6">
            This quick check protects Lumen from automated abuse. It only takes a
            moment.
          </p>
        )}

        {(state === "idle" || state === "checking") && (
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
            </span>
            <span className="flex-1 text-sm font-medium">
              {state === "idle" ? "I am human" : "Verifying…"}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Lumen
            </span>
          </button>
        )}

        {state === "challenge" && (
          <div>
            <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 mb-4">
              <div className="text-[11px] uppercase tracking-wider text-primary/80">
                Select all squares with
              </div>
              <div className="text-base font-semibold capitalize">
                {challenge.label}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {challenge.tiles.map((t, i) => {
                const isSel = selected.has(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleTile(i)}
                    className={`relative aspect-square rounded-lg border text-4xl grid place-items-center transition-all ${
                      isSel
                        ? "border-primary bg-primary/15 scale-95"
                        : "border-border/60 bg-background/60 hover:bg-background/80"
                    }`}
                  >
                    <span>{t.emoji}</span>
                    {isSel && (
                      <span className="absolute top-1 right-1 size-4 rounded-full bg-primary grid place-items-center">
                        <Check className="size-3 text-primary-foreground" strokeWidth={4} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-destructive mb-3">
                <X className="size-3.5" /> {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={newChallenge}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-background/80 border border-border/60"
                aria-label="New challenge"
              >
                <RefreshCw className="size-3.5" /> New
              </button>
              <button
                type="button"
                onClick={verify}
                disabled={selected.size === 0}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--gradient-hero)" }}
              >
                Verify
              </button>
            </div>
          </div>
        )}

        {state === "done" && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
            <span className="size-8 rounded-full bg-primary grid place-items-center">
              <Check className="size-5 text-primary-foreground" strokeWidth={3} />
            </span>
            <div className="text-sm font-medium">Verified — welcome!</div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Privacy · Terms</span>
          <span>Protected by Lumen</span>
        </div>
      </div>
    </div>
  );
}
