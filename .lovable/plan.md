## Goal

Add a Cloudflare-style "Checking your browser…" human verification interstitial that appears on site load, plus re-gates the **Generate Video** action.

## UX

### 1. On site load — full-screen interstitial
- Dark overlay covering the entire viewport, matching the existing neon/dark theme.
- Centered card with:
  - Lumen logo mark + "Verifying you are human" heading.
  - A checkbox-style widget ("I am human") that, when clicked, shows a 1–2s spinner then a green check.
  - Small print: "This step protects Lumen from automated abuse."
- Once verified, the overlay fades out and the app becomes interactive.
- Verification is remembered in `sessionStorage` so it doesn't re-prompt on every navigation within the tab.

### 2. On "Generate Video" click
- If verification has expired (older than 30 min) or was cleared, re-show the interstitial before queuing the render.
- Otherwise generate normally.

## Implementation

- New component `src/components/HumanVerification.tsx`:
  - Self-contained overlay with the checkbox interaction.
  - Calls an `onVerified()` callback.
  - Uses semantic tokens from `src/styles.css` (no hardcoded colors).
- New hook `src/hooks/useHumanVerification.ts`:
  - Reads/writes `sessionStorage` key `lumen:human-verified` with timestamp.
  - Exposes `{ verified, verify(), requireVerification() }`.
- Wire into `src/routes/__root.tsx`: mount `<HumanVerification />` overlay when `!verified`, so it gates the whole app on load.
- In `src/routes/index.tsx`: in `generate()`, call `requireVerification()` — if not verified, open the overlay instead of starting the render.

Pure client-side — no backend, no third-party keys, no schema changes. This is a UX deterrent, not a cryptographic bot defense (real bot defense would need Turnstile/reCAPTCHA + server verification, which we can layer on later if needed).
