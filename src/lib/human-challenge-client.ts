// Client-side proof-of-work solver for the human-verification challenge.
// Runs in the browser; uses the Web Crypto SubtleCrypto API.

export type IssuedChallenge = {
  nonce: string;
  difficulty: number;
  exp: number;
  signature: string;
};

export type SolvedChallenge = IssuedChallenge & { solution: string };

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const view = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < view.length; i++) {
    hex += view[i].toString(16).padStart(2, "0");
  }
  return hex;
}

const MAX_ATTEMPTS = 1_000_000;

export async function solveChallenge(challenge: IssuedChallenge): Promise<SolvedChallenge> {
  const prefix = "0".repeat(challenge.difficulty);
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const solution = i.toString(36);
    const hash = await sha256Hex(`${challenge.nonce}:${solution}`);
    if (hash.startsWith(prefix)) {
      return { ...challenge, solution };
    }
  }
  throw new Error("Human verification timed out. Please try again.");
}
