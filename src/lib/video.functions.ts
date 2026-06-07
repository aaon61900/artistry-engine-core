import { createServerFn } from "@tanstack/react-start";

import { z } from "zod";
import { persistGeneratedVideo } from "./video-storage.server";
import { verifyChallenge } from "./human-challenge.server";

const GATEWAY = "https://connector-gateway.lovable.dev/replicate/v1";
const MODEL = "bytedance/seedance-1-lite";

const ChallengeSchema = z.object({
  nonce: z.string().regex(/^[a-f0-9]{24}$/),
  difficulty: z.number().int().min(1).max(8),
  exp: z.number().int().positive(),
  signature: z.string().min(1).max(128),
  solution: z.string().min(1).max(32).regex(/^[a-zA-Z0-9]+$/),
});

const Input = z.object({
  prompt: z.string().min(3).max(2000),
  duration: z.number().int().min(3).max(12).default(5),
  aspect: z.enum(["16:9", "9:16", "1:1", "4:3"]).default("16:9"),
  resolution: z.enum(["480p", "720p", "1080p"]).default("1080p"),
  challenge: ChallengeSchema,
});

const GENERIC_ERROR = "Video generation failed. Please try again.";
const CHALLENGE_ERROR = "Human verification expired. Please refresh and try again.";

export const generateVideo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    // Real server-side abuse mitigation: a server-signed, time-limited
    // proof-of-work challenge issued by `issueHumanChallenge`. The client
    // must compute a PoW solution before this handler will spend provider
    // credits. We do NOT rely on Origin/Referer headers — those are
    // trivially spoofed by non-browser clients (curl, scripts, etc.) and
    // would only provide a false sense of security.
    if (!verifyChallenge(data.challenge)) {
      console.warn("[generateVideo] rejected: invalid human-verification challenge");
      throw new Error(CHALLENGE_ERROR);
    }





    const lovableKey = process.env.LOVABLE_API_KEY;
    const replicateKey = process.env.LOVABLE_CONNECTOR_REPLICATE_API_KEY ?? process.env.REPLICATE_API_KEY;
    if (!lovableKey || !replicateKey) {
      console.error("[generateVideo] Missing API key configuration");
      throw new Error(GENERIC_ERROR);
    }

    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": replicateKey,
      "Content-Type": "application/json",
    };

    const createRes = await fetch(`${GATEWAY}/models/${MODEL}/predictions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: {
          prompt: data.prompt,
          duration: data.duration,
          aspect_ratio: data.aspect,
          resolution: data.resolution,
        },
      }),
    });
    if (!createRes.ok) {
      const t = await createRes.text().catch(() => "");
      console.error(`[generateVideo] gateway create failed ${createRes.status}: ${t}`);
      if (createRes.status === 402) {
        throw new Error("Video generation needs provider credits before it can run. Add billing credit in Connectors, then try again.");
      }
      if (createRes.status === 429) {
        throw new Error("Video generation is being rate-limited. Wait a few seconds, then try again.");
      }
      throw new Error(GENERIC_ERROR);
    }
    const pred = (await createRes.json()) as { id: string };
    const id = pred.id;

    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, i < 5 ? 3000 : 5000));
      const r = await fetch(`${GATEWAY}/predictions/${id}`, {
        headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": replicateKey },
      });
      if (!r.ok) continue;
      const j = (await r.json()) as { status: string; output?: unknown; error?: string };
      if (j.status === "succeeded") {
        const out = Array.isArray(j.output) ? j.output[0] : j.output;
        if (typeof out !== "string") {
          console.error("[generateVideo] missing output URL", j);
          throw new Error(GENERIC_ERROR);
        }
        const saved = await persistGeneratedVideo(out, id);
        return { url: saved.url, storagePath: saved.storagePath, id };
      }
      if (j.status === "failed" || j.status === "canceled") {
        console.error(`[generateVideo] ${j.status}: ${j.error ?? "unknown"}`);
        throw new Error(GENERIC_ERROR);
      }
    }
    console.error("[generateVideo] timed out");
    throw new Error(GENERIC_ERROR);
  });
