import crypto from "crypto";

const TTL_MS = 2 * 60 * 1000; // 2 minutes
export const CHALLENGE_DIFFICULTY = 3; // hex chars of leading zeros (~4k attempts)

function secret(): string {
  const s =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.LOVABLE_API_KEY ??
    "";
  if (!s) {
    throw new Error("Human-challenge secret is not configured");
  }
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export type IssuedChallenge = {
  nonce: string;
  difficulty: number;
  exp: number;
  signature: string;
};

export function issueChallenge(): IssuedChallenge {
  const nonce = crypto.randomBytes(12).toString("hex");
  const exp = Date.now() + TTL_MS;
  const payload = `${nonce}.${CHALLENGE_DIFFICULTY}.${exp}`;
  return {
    nonce,
    difficulty: CHALLENGE_DIFFICULTY,
    exp,
    signature: sign(payload),
  };
}

export type SolvedChallenge = IssuedChallenge & { solution: string };

export function verifyChallenge(c: SolvedChallenge | null | undefined): boolean {
  if (!c || typeof c !== "object") return false;
  if (typeof c.nonce !== "string" || !/^[a-f0-9]{24}$/.test(c.nonce)) return false;
  if (c.difficulty !== CHALLENGE_DIFFICULTY) return false;
  if (typeof c.exp !== "number" || !Number.isFinite(c.exp) || Date.now() > c.exp) return false;
  if (typeof c.signature !== "string" || c.signature.length > 128) return false;
  if (typeof c.solution !== "string" || c.solution.length === 0 || c.solution.length > 32) return false;
  if (!/^[a-zA-Z0-9]+$/.test(c.solution)) return false;

  const expected = sign(`${c.nonce}.${c.difficulty}.${c.exp}`);
  const a = Buffer.from(c.signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;

  const hash = crypto.createHash("sha256").update(`${c.nonce}:${c.solution}`).digest("hex");
  return hash.startsWith("0".repeat(c.difficulty));
}
