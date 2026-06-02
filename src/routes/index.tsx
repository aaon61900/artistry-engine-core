import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Sparkles, Wand2, Download, Play, Pause, RotateCcw, Film, Zap, Image as ImageIcon, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — AI Video Generator" },
      { name: "description", content: "Generate cinematic AI videos from text prompts. Fast, simple, gorgeous." },
      { property: "og:title", content: "Lumen — AI Video Generator" },
      { property: "og:description", content: "Generate cinematic AI videos from text prompts." },
    ],
  }),
  component: Index,
});

const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
];

const PRESETS = [
  { label: "Cinematic", prompt: "A cinematic wide shot of a lone astronaut walking on a red martian dune at sunset, volumetric light, anamorphic lens" },
  { label: "Anime", prompt: "Anime style, a girl with silver hair running through cherry blossom petals, golden hour, Studio Ghibli" },
  { label: "Product", prompt: "A luxury perfume bottle rotating on a marble pedestal with soft studio lighting, macro shot" },
  { label: "Nature", prompt: "Drone footage flying over a misty mountain forest at dawn, sunbeams piercing through trees" },
  { label: "Sci-Fi", prompt: "A neon-lit cyberpunk alleyway in the rain, holographic billboards, slow camera dolly" },
  { label: "Abstract", prompt: "Iridescent liquid metal flowing in zero gravity, ultra slow motion, macro" },
];

type Job = {
  id: string;
  prompt: string;
  status: "queued" | "rendering" | "done";
  progress: number;
  url?: string;
  duration: number;
  aspect: string;
  style: string;
};

function Index() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState([5]);
  const [aspect, setAspect] = useState("16:9");
  const [style, setStyle] = useState("cinematic");
  const [quality, setQuality] = useState("1080p");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const aspectClass = (a: string) =>
    a === "9:16" ? "aspect-[9/16]" : a === "1:1" ? "aspect-square" : a === "4:3" ? "aspect-[4/3]" : "aspect-video";

  const generate = () => {
    if (!prompt.trim()) {
      toast.error("Add a prompt first ✦");
      return;
    }
    const id = crypto.randomUUID();
    const job: Job = {
      id,
      prompt: prompt.trim(),
      status: "queued",
      progress: 0,
      duration: duration[0],
      aspect,
      style,
    };
    setJobs((j) => [job, ...j]);
    toast.success("Render queued — Lumen is dreaming…");

    setTimeout(() => {
      setJobs((j) => j.map((x) => (x.id === id ? { ...x, status: "rendering" } : x)));
      const interval = setInterval(() => {
        setJobs((j) => {
          const target = j.find((x) => x.id === id);
          if (!target) {
            clearInterval(interval);
            return j;
          }
          const next = Math.min(100, target.progress + Math.random() * 18 + 6);
          if (next >= 100) {
            clearInterval(interval);
            const url = SAMPLE_VIDEOS[Math.floor(Math.random() * SAMPLE_VIDEOS.length)];
            toast.success("Video ready ✨");
            return j.map((x) => (x.id === id ? { ...x, status: "done", progress: 100, url } : x));
          }
          return j.map((x) => (x.id === id ? { ...x, progress: next } : x));
        });
      }, 450);
    }, 600);
  };

  const reroll = (job: Job) => {
    setPrompt(job.prompt);
    setDuration([job.duration]);
    setAspect(job.aspect);
    setStyle(job.style);
    toast("Settings restored — tweak & regenerate", { icon: "🎬" });
  };

  const download = (job: Job) => {
    if (!job.url) return;
    const a = document.createElement("a");
    a.href = job.url;
    a.download = `lumen-${job.id.slice(0, 8)}.mp4`;
    a.click();
    toast.success("Download started");
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <Toaster theme="dark" position="top-center" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{ background: "var(--gradient-glow)" }}
      />

      <header className="relative z-10 border-b border-border/50 backdrop-blur-xl bg-background/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl grid place-items-center" style={{ background: "var(--gradient-hero)" }}>
              <Film className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">Lumen</div>
              <div className="text-xs text-muted-foreground -mt-0.5">AI Video Studio</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1"><Zap className="size-3" /> Pro</Badge>
            <Button variant="outline" size="sm" onClick={() => toast("Coming soon — share with your team")}>Invite</Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <section className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4 gap-1.5"><Sparkles className="size-3" /> Now with Motion v3</Badge>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            Turn a sentence into a{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
              cinematic shot
            </span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Write a prompt. Pick a vibe. Lumen renders broadcast-quality video in seconds.
          </p>
        </section>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
          {/* Composer */}
          <Card className="p-6 border-border/60" style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-elevated)" }}>
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Wand2 className="size-4 text-primary" /> Describe your video
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A golden retriever puppy surfing a tidal wave at sunset, slow motion, lens flare…"
              className="min-h-32 resize-none text-base bg-input/40 border-border/60"
            />

            <div className="flex flex-wrap gap-2 mt-3">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setPrompt(p.prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-secondary/40 hover:bg-secondary hover:border-primary/40 transition-all"
                  style={{ transitionTimingFunction: "var(--transition-smooth)" }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Aspect ratio</label>
                <Select value={aspect} onValueChange={setAspect}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 — Widescreen</SelectItem>
                    <SelectItem value="9:16">9:16 — Vertical</SelectItem>
                    <SelectItem value="1:1">1:1 — Square</SelectItem>
                    <SelectItem value="4:3">4:3 — Classic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Style</label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cinematic">Cinematic</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                    <SelectItem value="3d">3D Render</SelectItem>
                    <SelectItem value="documentary">Documentary</SelectItem>
                    <SelectItem value="vhs">VHS / Retro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Quality</label>
                <Select value={quality} onValueChange={setQuality}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p — Draft</SelectItem>
                    <SelectItem value="1080p">1080p — HD</SelectItem>
                    <SelectItem value="4k">4K — Ultra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 flex justify-between">
                  <span>Duration</span><span className="text-foreground font-medium">{fmtDuration(duration[0])}</span>
                </label>
                <Slider value={duration} onValueChange={setDuration} min={2} max={32400} step={1} className="mt-3" />
              </div>
            </div>

            <Button
              onClick={generate}
              size="lg"
              className="w-full mt-6 text-base font-semibold h-12 border-0"
              style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
            >
              <Sparkles className="size-4 mr-2" /> Generate Video
            </Button>
          </Card>

          {/* Preview pane */}
          <Card className="p-6 border-border/60 flex flex-col" style={{ background: "var(--gradient-card)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2"><ImageIcon className="size-4 text-accent" /> Live Preview</h2>
              <Badge variant="outline" className="text-xs">{aspect} · {quality}</Badge>
            </div>
            <div className={`${aspectClass(aspect)} w-full rounded-xl overflow-hidden border border-border/60 bg-black/60 grid place-items-center relative`}>
              {jobs[0]?.url ? (
                <video src={jobs[0].url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
              ) : (
                <div className="text-center px-6">
                  <div className="size-14 rounded-full mx-auto grid place-items-center mb-3" style={{ background: "var(--gradient-hero)" }}>
                    <Film className="size-6 text-primary-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Your generated video will appear here</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3 line-clamp-2 min-h-8">
              {jobs[0]?.prompt ?? "No render yet — describe a scene to begin."}
            </p>
          </Card>
        </div>

        {/* Renders */}
        <section className="mt-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold tracking-tight">Your renders</h2>
            {jobs.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { setJobs([]); toast("Cleared"); }}>Clear all</Button>
            )}
          </div>

          {jobs.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/60 bg-card/30">
              <p className="text-muted-foreground">Generated videos will live here.</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {jobs.map((job) => (
                <Card key={job.id} className="overflow-hidden border-border/60 group" style={{ background: "var(--gradient-card)" }}>
                  <div className={`${aspectClass(job.aspect)} w-full bg-black/60 relative overflow-hidden`}>
                    {job.status === "done" && job.url ? (
                      <>
                        <video
                          src={job.url}
                          className="w-full h-full object-cover"
                          loop
                          muted
                          playsInline
                          autoPlay={playingId === job.id}
                          ref={(el) => {
                            if (!el) return;
                            if (playingId === job.id) el.play().catch(() => {});
                            else el.pause();
                          }}
                        />
                        <button
                          onClick={() => setPlayingId(playingId === job.id ? null : job.id)}
                          className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <div className="size-14 rounded-full bg-background/80 grid place-items-center backdrop-blur">
                            {playingId === job.id ? <Pause className="size-6" /> : <Play className="size-6 ml-1" />}
                          </div>
                        </button>
                      </>
                    ) : (
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="text-center">
                          <Loader2 className="size-8 animate-spin mx-auto text-primary mb-3" />
                          <div className="text-xs uppercase tracking-wider text-muted-foreground">
                            {job.status === "queued" ? "Queued" : "Rendering"} · {Math.round(job.progress)}%
                          </div>
                          <div className="w-40 h-1 bg-border rounded-full mt-3 overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{ width: `${job.progress}%`, background: "var(--gradient-hero)" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm line-clamp-2 min-h-10">{job.prompt}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px]">{job.aspect}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{job.duration}s</Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">{job.style}</Badge>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => reroll(job)}>
                        <RotateCcw className="size-3.5 mr-1.5" /> Remix
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={job.status !== "done"}
                        onClick={() => download(job)}
                      >
                        <Download className="size-3.5 mr-1.5" /> Save
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-20 pt-8 border-t border-border/50 text-center text-xs text-muted-foreground">
          Lumen Studio · Crafted for filmmakers and dreamers
        </footer>
      </main>
    </div>
  );
}
