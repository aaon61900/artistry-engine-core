import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/replicate/v1";
// Fast image-to-video isn't needed — use a text-to-video model.
const MODEL = "bytedance/seedance-1-lite";

const Input = z.object({
  prompt: z.string().min(3).max(2000),
  duration: z.number().int().min(3).max(12).default(5),
  aspect: z.enum(["16:9", "9:16", "1:1", "4:3"]).default("16:9"),
  resolution: z.enum(["480p", "720p", "1080p"]).default("1080p"),
});

export const generateVideo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const replicateKey = process.env.REPLICATE_API_KEY;
    if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
    if (!replicateKey) throw new Error("REPLICATE_API_KEY is not configured");

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
      const t = await createRes.text();
      throw new Error(`Replicate create failed ${createRes.status}: ${t}`);
    }
    const pred = (await createRes.json()) as { id: string };
    const id = pred.id;

    // Poll up to ~10 minutes
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, i < 5 ? 3000 : 5000));
      const r = await fetch(`${GATEWAY}/predictions/${id}`, {
        headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": replicateKey },
      });
      if (!r.ok) continue;
      const j = (await r.json()) as { status: string; output?: unknown; error?: string };
      if (j.status === "succeeded") {
        const out = Array.isArray(j.output) ? j.output[0] : j.output;
        if (typeof out !== "string") throw new Error("No video URL in output");
        return { url: out, id };
      }
      if (j.status === "failed" || j.status === "canceled") {
        throw new Error(`Replicate ${j.status}: ${j.error ?? "unknown error"}`);
      }
    }
    throw new Error("Video generation timed out");
  });
