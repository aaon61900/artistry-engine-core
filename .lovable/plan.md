## Problem

`src/routes/index.tsx` keeps breaking under TanStack Router's code-splitter:

1. With `const fmtDuration = ...` at module scope → splitter strips it → `fmtDuration is not defined` at SSR.
2. After moving it inside `Index` → splitter mis-extracts fragments → `SyntaxError: 'return' outside of function (130:2)`.

Both are symptoms of the same thing: helpers declared as `const` aren't reliably retained by the splitter's AST walk, and large inline component bodies confuse it further.

## Fix

1. In `src/routes/index.tsx`:
   - Move `fmtDuration` back to **module scope** but declare it as a **named function declaration** (`function fmtDuration(seconds: number) { ... }`) instead of `const`. Named function declarations are kept by the code-splitter's reference analysis.
   - Leave the rest of `Index` untouched.

2. Verify the preview renders without SSR error and without the babel parse error.

No other files change. Plain UI/route fix — no schema, no server functions, no design changes.
