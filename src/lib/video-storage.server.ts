import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VIDEO_BUCKET = "generated-videos";

export async function persistGeneratedVideo(sourceUrl: string, predictionId: string) {
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

export async function downloadGeneratedVideo(storagePath: string) {
  return supabaseAdmin.storage.from(VIDEO_BUCKET).download(storagePath);
}