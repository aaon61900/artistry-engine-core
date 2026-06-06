import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY = "https://connector-gateway.lovable.dev/replicate/v1";
const MODEL = "bytedance/seedance-1-lite";
const VIDEO_BUCKET = "generated-videos";

const Input = z.object({
  prompt: z.string().min(3).max(2000),
  duration: z.number().int().min(3).max(12).default(5),
  aspect: z.enum(["16:9", "9:16", "1:1", "4:3"]).default("16:9"),
  resolution: z.enum(["480p", "720p", "1080p"]).default("1080p"),
});

const GENERIC_ERROR = "Video generation failed. Please try again.";

async function persistVideo(sourceUrl: string, predictionId: string) {
  const videoRes = await fetch(sourceUrl);
  if (!videoRes.ok) {
    const body = await videoRes.text().catch(() => "");
    console.error(`[generateVideo] output download failed ${videoRes.status}: ${body}`);
    throw new Error("The generated video file could not be saved. Please try again.");
  }

  const contentType = videoRes.headers.get("content-type") || "video/mp4";
  const storagePath = `renders/${predictionId}-${crypto.randomUUID()}.mp4`;
  const videoBytes = new Uint8Array(await videoRes.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(VIDEO_BUCKET)
    .upload(storagePath, videoBytes, { contentType, upsert: false });

  if (uploadError) {
    console.error("[generateVideo] storage upload failed", uploadError);
    throw new Error("The generated video file could not be saved. Please try again.");
  }

  const { data, error: signedUrlError } = await supabaseAdmin.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  if (signedUrlError || !data?.signedUrl) {
    console.error("[generateVideo] signed URL failed", signedUrlError);
    throw new Error("The generated video download link could not be created. Please try again.");
  }

  return { url: data.signedUrl, storagePath };
}

// Best-effort same-origin guard. Prevents trivial cross-origin scripted abuse
// of the server-function RPC. Not a substitute for real auth/CAPTCHA, but a
// cheap mitigation while the app is unauthenticated.
function assertSameOrigin() {
  try {
    const req = getRequest();
    if (!req) return;
    const origin = req.headers.get("origin") ?? "";
    const referer = req.headers.get("referer") ?? "";
    const host = req.headers.get("host") ?? "";
    if (!host) return;
    const ok = (u: string) => {
      if (!u) return false;
      try {
        return new URL(u).host === host;
      } catch {
        return false;
      }
    };
    if (!ok(origin) && !ok(referer)) {
      throw new Error("Forbidden");
    }
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") throw e;
    // ignore best-effort errors
  }
}

export const generateVideo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    assertSameOrigin();

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
        const saved = await persistVideo(out, id);
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
