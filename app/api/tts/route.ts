import { createHash } from "node:crypto";
import { JUDGES, isJudgeId } from "@/lib/judges";
import { rateRules } from "@/server/config";
import { checkLimit, limitResponse } from "@/server/http/rate-limit";

const DEFAULT_MODEL = "eleven_multilingual_v2";

// Per-judge delivery, chosen to widen the gap between voices: high stability and
// low style is flat and clipped, low stability and high style is animated.
const VOICE_SETTINGS = {
  chair: { stability: 0.7, similarity_boost: 0.8, style: 0.1 }, // measured, even
  shark: { stability: 0.8, similarity_boost: 0.85, style: 0.05 }, // flat, clipped
  builder: { stability: 0.45, similarity_boost: 0.75, style: 0.3 }, // relaxed, conversational
  visionary: { stability: 0.25, similarity_boost: 0.7, style: 0.75 }, // excitable, expressive
  angel: { stability: 0.6, similarity_boost: 0.8, style: 0.4 }, // warm, unhurried
  operator: { stability: 0.4, similarity_boost: 0.75, style: 0.5 }, // brisk, a bit impatient
} as const;

// Recently voiced lines, so a replay or a reload of a cached verdict doesn't pay ElevenLabs again.
// In process memory like the rate limits (single instance); least recently used goes first.
const CACHE_MAX_BYTES = 40 * 1024 * 1024;
const GLOBAL_KEY = "__hackmuseVoiceClips";
type GlobalWithClips = typeof globalThis & { [GLOBAL_KEY]?: { clips: Map<string, ArrayBuffer>; bytes: number } };

function clipCache() {
  const store = globalThis as GlobalWithClips;
  store[GLOBAL_KEY] ??= { clips: new Map(), bytes: 0 };
  return store[GLOBAL_KEY];
}

function recall(key: string): ArrayBuffer | undefined {
  const cache = clipCache();
  const clip = cache.clips.get(key);
  if (clip) {
    cache.clips.delete(key);
    cache.clips.set(key, clip);
  }
  return clip;
}

function remember(key: string, clip: ArrayBuffer) {
  const cache = clipCache();
  if (clip.byteLength > CACHE_MAX_BYTES / 8) return;
  cache.clips.set(key, clip);
  cache.bytes += clip.byteLength;
  for (const [oldKey, old] of cache.clips) {
    if (cache.bytes <= CACHE_MAX_BYTES) break;
    cache.clips.delete(oldKey);
    cache.bytes -= old.byteLength;
  }
}

function audio(clip: ArrayBuffer, hit: boolean) {
  return new Response(clip.slice(0), {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Cache": hit ? "HIT" : "MISS" },
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // The debate room treats 503 as "captions only" mode.
    return Response.json({ error: "ELEVENLABS_API_KEY is not set" }, { status: 503 });
  }

  let speaker: unknown, text: unknown, cue: unknown;
  try {
    ({ speaker, text, cue } = await request.json());
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  if (!isJudgeId(speaker) || typeof text !== "string" || !text.trim() || text.length > 600) {
    return Response.json({ error: "Expected { speaker, text } with text ≤ 600 chars" }, { status: 400 });
  }

  const model = process.env.ELEVENLABS_MODEL || DEFAULT_MODEL;
  const voiceId =
    process.env[`ELEVENLABS_VOICE_${speaker.toUpperCase()}`] || JUDGES[speaker].voiceId;
  // eleven_v3 understands inline audio tags like [skeptical]; older models would read them aloud.
  const spoken =
    model.startsWith("eleven_v3") && typeof cue === "string" && /^[a-z]{2,16}$/.test(cue)
      ? `[${cue}] ${text}`
      : text;

  const key = createHash("sha256").update(`${model}\n${voiceId}\n${speaker}\n${spoken}`).digest("hex");
  const cached = recall(key);
  if (cached) return audio(cached, true);

  // Only a real ElevenLabs call costs money, so only a miss counts against the limits.
  // ElevenLabs bills by character, so the site-wide daily budget counts characters.
  const blocked = checkLimit(request, "tts", rateRules().tts, text.length);
  if (!blocked.ok) return limitResponse(blocked, "text");

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text: spoken,
        model_id: model,
        voice_settings: VOICE_SETTINGS[speaker],
      }),
      signal: AbortSignal.timeout(45_000),
    },
  );

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    console.error(`[tts] ElevenLabs ${res.status}: ${detail.slice(0, 300)}`);
    return Response.json({ error: `ElevenLabs returned ${res.status}` }, { status: 502 });
  }

  const clip = await res.arrayBuffer();
  remember(key, clip);
  return audio(clip, false);
}
