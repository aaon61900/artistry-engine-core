import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VIDEO_BUCKET = "generated-videos";

const ALLOWED_VIDEO_HOSTS = [
  "replicate.delivery",
  "pbxt.replicate.delivery",
  "replicate.com",
];

function assertSafeVideoUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("The generated video file could not be saved. Please try again.");
  }
  if (parsed.protocol !== "https:") {
    console.error(`[generateVideo] rejected non-https output URL: ${parsed.protocol}`);
    throw new Error("The generated video file could not be saved. Please try again.");
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_VIDEO_HOSTS.some(
    (h) => host === h || host.endsWith(`.${h}`),
  );
  if (!allowed) {
    console.error(`[generateVideo] rejected output URL with untrusted host: ${host}`);
    throw new Error("The generated video file could not be saved. Please try again.");
  }
  return parsed;
}

export async function persistGeneratedVideo(sourceUrl: string, predictionId: string) {
  const safeUrl = assertSafeVideoUrl(sourceUrl);
  const videoRes = await fetch(safeUrl.toString(), { redirect: "error" });
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

export async function downloadGeneratedVideo(storagePath: string) {
  return supabaseAdmin.storage.from(VIDEO_BUCKET).download(storagePath);
}