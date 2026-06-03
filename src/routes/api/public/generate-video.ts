import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/replicate/v1";
const MODEL = "bytedance/seedance-1-lite";

const Body = z.object({
  prompt: z.string().min(3).max(2000),
  duration: z.number().int().min(3).max(12).optional(),
  aspect: z.enum(["16:9", "9:16", "1:1", "4:3"]).optional(),
  resolution: z.enum(["480p", "720p", "1080p"]).optional(),
});

export const Route = createFileRoute("/api/public/generate-video")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
      POST: async ({ request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        };
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: cors });
        }
        const parsed = Body.safeParse(raw);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }), {
            status: 400,
            headers: cors,
          });
        }
        const lovableKey = process.env.LOVABLE_API_KEY;
        const replicateKey = process.env.REPLICATE_API_KEY;
        if (!lovableKey || !replicateKey) {
          return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500, headers: cors });
        }

        const headers = {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": replicateKey,
          "Content-Type": "application/json",
        };
        const input = {
          prompt: parsed.data.prompt,
          duration: parsed.data.duration ?? 5,
          aspect_ratio: parsed.data.aspect ?? "16:9",
          resolution: parsed.data.resolution ?? "1080p",
        };
        const createRes = await fetch(`${GATEWAY}/models/${MODEL}/predictions`, {
          method: "POST",
          headers,
          body: JSON.stringify({ input }),
        });
        if (!createRes.ok) {
          const t = await createRes.text();
          return new Response(JSON.stringify({ error: "Replicate create failed", status: createRes.status, body: t }), {
            status: 502,
            headers: cors,
          });
        }
        const pred = (await createRes.json()) as { id: string };
        for (let i = 0; i < 120; i++) {
          await new Promise((r) => setTimeout(r, i < 5 ? 3000 : 5000));
          const r = await fetch(`${GATEWAY}/predictions/${pred.id}`, {
            headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": replicateKey },
          });
          if (!r.ok) continue;
          const j = (await r.json()) as { status: string; output?: unknown; error?: string };
          if (j.status === "succeeded") {
            const out = Array.isArray(j.output) ? j.output[0] : j.output;
            return new Response(JSON.stringify({ id: pred.id, url: out }), { status: 200, headers: cors });
          }
          if (j.status === "failed" || j.status === "canceled") {
            return new Response(JSON.stringify({ error: j.error ?? j.status }), { status: 502, headers: cors });
          }
        }
        return new Response(JSON.stringify({ error: "Timed out" }), { status: 504, headers: cors });
      },
    },
  },
});
