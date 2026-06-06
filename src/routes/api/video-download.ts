import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { downloadGeneratedVideo } from "@/lib/video-storage.server";

const Query = z.object({
  path: z.string().min(1).max(500).regex(/^renders\/[a-zA-Z0-9._-]+\.mp4$/),
  name: z.string().min(1).max(80).regex(/^[a-zA-Z0-9._-]+\.mp4$/).default("lumen-video.mp4"),
});

export const Route = createFileRoute("/api/video-download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = Query.safeParse({
          path: url.searchParams.get("path"),
          name: url.searchParams.get("name") ?? "lumen-video.mp4",
        });

        if (!parsed.success) {
          return new Response("Invalid video download link", { status: 400 });
        }

        const { data, error } = await downloadGeneratedVideo(parsed.data.path);

        if (error || !data) {
          console.error("[video-download] storage download failed", error);
          return new Response("Video file not found", { status: 404 });
        }

        return new Response(data, {
          headers: {
            "Content-Type": data.type || "video/mp4",
            "Content-Disposition": `attachment; filename="${parsed.data.name}"`,
            "Cache-Control": "private, max-age=60",
          },
        });
      },
    },
  },
});