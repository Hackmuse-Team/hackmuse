"use client";

import { useLenis } from "lenis/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Logo } from "@/components/landing/site-header";
import { BrutalButton, BrutalLink } from "@/components/ui/brutal-button";
import { RandomizedText } from "@/components/ui/randomized-text";
import { DebateEngine, IDLE_SNAPSHOT, type PlayerSnapshot } from "@/lib/client/debate-engine";
import { ensureJudgment } from "@/lib/client/judgment";
import {
  isDemoSession,
  loadDebate,
  loadHackathon,
  loadIdea,
  loadJudgmentId,
  loadReview,
  saveDebate,
  saveReview,
  startDemoSession,
} from "@/lib/idea";
import { DEBATE_LENGTH, type JudgeId } from "@/lib/judges";
import { fetchReview, reviewOverall, type ReviewState } from "@/lib/review";
import type { Debate, StreamEvent } from "@/lib/types";
import dynamic from "next/dynamic";
import { Caption } from "./caption";
import { GroupChat } from "./group-chat";
import { Roundtable } from "./roundtable";
import { Transcript } from "./transcript";

// Shown only after the debate (scorecard) or on demand (call view), so they load in their own
// chunks. The scorecard chunk is fetched as soon as the debate starts; see the effect below.
const loadScorecard = () => import("./scorecard");
const Scorecard = dynamic(() => loadScorecard().then((m) => m.Scorecard), { ssr: false });
const CallView = dynamic(() => import("./call-view").then((m) => m.CallView), { ssr: false });

interface Session {
  idea: string;
  engine: DebateEngine;
  fromCache: boolean;
  title: string | null;
  source: Debate["source"] | null;
  model: string | null;
  /** The finished debate with scores — arrives after the last line. */
  debate: Debate | null;
  error: string | null;
}

const noopSubscribe = () => () => {};
const idleSnapshot = () => IDLE_SNAPSHOT;

/** Reads an NDJSON response body, calling onEvent for each parsed line. */
async function readEvents(res: Response, onEvent: (e: StreamEvent) => void) {
  if (!res.body) throw new Error("Empty response");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const raw = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (raw) onEvent(JSON.parse(raw) as StreamEvent);
    }
    if (done) break;
  }
}

export function DebateRoom() {
  const lenis = useLenis();
  const [session, setSession] = useState<Session | null>(null);
  // Waiting room: who has joined the group chat, and whether everyone is in.
  const [present, setPresent] = useState<JudgeId[]>([]);
  const [assembled, setAssembled] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  // True when this tab has no idea to judge (a link opened in a fresh tab, say).
  const [empty, setEmpty] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const reviewAbortRef = useRef<AbortController | null>(null);
  // Gemma + Google Search review (the teammate backend). Runs in parallel with the
  // debate and usually lands while the panel is still talking.
  const [review, setReview] = useState<ReviewState | null>(null);

  const requestReview = useCallback(async (idea: string) => {
    reviewAbortRef.current?.abort();
    const ctrl = new AbortController();
    reviewAbortRef.current = ctrl;
    setReview({ status: "loading" });
    try {
      const judgmentId = await ensureJudgment(idea);
      const { hackathonUrl, rules } = loadHackathon();
      const result = await fetchReview({ idea, judgmentId, hackathonUrl, rules }, ctrl.signal);
      if (ctrl.signal.aborted) return;
      saveReview(idea, result);
      setReview({ status: "ready", review: result });
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setReview({ status: "failed", message: err instanceof Error ? err.message : "The review failed." });
    }
  }, []);

  const requestDebate = useCallback(async (idea: string, demo = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const engine = new DebateEngine();
    setPresent([]);
    setAssembled(false);
    setChatKey((k) => k + 1);
    const update = (patch: Partial<Session>) =>
      setSession((s) => (s && s.engine === engine ? { ...s, ...patch } : s));
    setSession({ idea, engine, fromCache: false, title: null, source: null, model: null, debate: null, error: null });

    try {
      // Demo debates are never saved, so they need no saved verdict to fill in.
      const judgmentId = demo ? null : await ensureJudgment(idea);
      const { hackathonUrl, rules } = loadHackathon();
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, demo, judgmentId, hackathonUrl, rules }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      let finished = false;
      await readEvents(res, (e) => {
        if (e.type === "meta") update({ source: e.source, model: e.model });
        else if (e.type === "title") update({ title: e.title });
        else if (e.type === "line") engine.push(e.line);
        else if (e.type === "debate") {
          finished = true;
          saveDebate(e.debate);
          update({ debate: e.debate, title: e.debate.title });
          engine.finish();
        } else if (e.type === "error") throw new Error(e.message);
      });
      if (!finished) throw new Error("The panel walked out mid-debate (the stream ended early). Try again.");
    } catch (err) {
      if (ctrl.signal.aborted) return;
      update({ error: err instanceof Error ? err.message : "Something went wrong." });
    }
  }, []);

  // Boot: read this tab's idea and reuse its verdict if it already has one. With no idea there is
  // nothing to judge, so we offer the demo instead of bouncing the visitor home.
  const begin = useCallback(() => {
    const demo = new URLSearchParams(window.location.search).has("demo") || isDemoSession();
    let idea = loadIdea();
    if (!idea && demo) idea = startDemoSession();
    if (!idea) {
      setEmpty(true);
      return;
    }
    setEmpty(false);
    const cached = loadDebate(idea);
    if (cached) {
      setSession({
        idea,
        engine: new DebateEngine(cached.lines, true),
        fromCache: true,
        title: cached.title,
        source: cached.source,
        model: cached.model,
        debate: cached,
        error: null,
      });
    } else {
      // The demo plays the scripted debate: no API calls, nothing saved.
      void requestDebate(idea, demo);
    }
    const cachedReview = loadReview(idea);
    if (cachedReview) setReview({ status: "ready", review: cachedReview });
    else if (!demo) void requestReview(idea);
  }, [requestDebate, requestReview]);

  useEffect(() => {
    // sessionStorage is only readable after mount, so state has to be set from here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    begin();
    return () => {
      abortRef.current?.abort();
      reviewAbortRef.current?.abort();
    };
  }, [begin]);

  const engine = session?.engine ?? null;
  const fromCache = session?.fromCache ?? false;

  // Start (or jump to the verdict for a cached debate); stop when replaced.
  useEffect(() => {
    if (!engine) return;
    if (fromCache) engine.skipToEnd();
    else if (assembled) engine.start();
    else return;
    return () => engine.dispose();
  }, [engine, fromCache, assembled]);

  const snap = useSyncExternalStore(engine?.subscribe ?? noopSubscribe, engine?.getSnapshot ?? idleSnapshot, idleSnapshot);
  // Once the research-backed review lands, its score becomes the headline number.
  const reviewScore = review?.status === "ready" ? reviewOverall(review.review) : null;
  const rawDebate = session?.debate ?? null;
  const debate = useMemo(
    () => (rawDebate && reviewScore !== null ? { ...rawDebate, overall: reviewScore } : rawDebate),
    [rawDebate, reviewScore],
  );
  const lines = snap.lines;
  const done = snap.status === "done" && debate !== null;
  const line = snap.index >= 0 && snap.index < lines.length ? lines[snap.index] : null;
  const started = fromCache || (assembled && lines.length > 0);
  const deliberating = !session || (!started && !session.error);
  const total = snap.complete ? lines.length : Math.max(DEBATE_LENGTH, lines.length);
  const tankNo = session ? String(hashIdea(session.idea) % 10000).padStart(4, "0") : "0000";

  // Warm the scorecard chunk while the sharks talk, so the verdict appears without a pause.
  useEffect(() => {
    if (started) void loadScorecard();
  }, [started]);

  // Glide down to the scorecard when the Chair finishes.
  useEffect(() => {
    if (!done || fromCache) return;
    const t = setTimeout(() => {
      if (lenis) lenis.scrollTo("#verdict", { offset: -80, duration: 1.6 });
      else document.getElementById("verdict")?.scrollIntoView({ behavior: "smooth" });
    }, 500);
    return () => clearTimeout(t);
  }, [done, fromCache, lenis]);

  // Keyboard: space play/pause, arrows step, M mute.
  useEffect(() => {
    if (!engine) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, button, a")) return;
      if (e.code === "Space") {
        e.preventDefault();
        engine.toggle();
      } else if (e.key === "ArrowRight") engine.next();
      else if (e.key === "ArrowLeft") engine.prev();
      else if (e.key.toLowerCase() === "m") engine.setMuted(!engine.getSnapshot().muted);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);

  const waitingText =
    snap.index >= lines.length && lines.length > 0 && !snap.complete
      ? "Gemma is writing the next argument…"
      : snap.index >= lines.length && snap.complete
        ? "The panel has spoken."
        : "The sharks are circling…";

  if (empty) {
    return (
      <>
        <header className="border-b-[3px] border-ink bg-teal text-cream">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Logo className="[&>span:last-child]:text-cream" />
          </div>
        </header>
        <main className="relative flex-1">
          <div className="bg-grid pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-2xl px-4 py-20 sm:px-6">
            <div className="border-[3px] border-ink bg-paper p-6 shadow-brutal sm:p-8">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">Nothing in the tank yet</p>
              <h1 className="mt-2 font-display text-5xl font-black uppercase leading-[0.9] sm:text-6xl">No idea to judge.</h1>
              <p className="mt-4 text-base leading-relaxed text-ink/80">
                Ideas live in the tab you pitched them from, so a new tab or a reopened link starts empty. Pitch a new one, or
                watch the sharks take on a sample idea.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <BrutalLink href="/#pitch" cursor="pitch">
                  Pitch the sharks →
                </BrutalLink>
                <BrutalButton
                  tone="paper"
                  cursor="watch"
                  onClick={() => {
                    startDemoSession();
                    begin();
                  }}
                >
                  ▶ Watch a demo debate
                </BrutalButton>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b-[3px] border-ink bg-teal text-cream">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo className="[&>span:last-child]:text-cream" />
          <div className="flex items-center gap-2">
            {session?.source && (
              <span className="hidden border-2 border-cream/40 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest sm:inline-block">
                {session.source === "gemma" ? `Gemma · ${session.model}` : "Demo mode"}
              </span>
            )}
            {snap.voice !== "pending" && (
              <span className="hidden border-2 border-cream/40 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest md:inline-block">
                {snap.voice === "on" ? "Voices · ElevenLabs" : "Captions only"}
              </span>
            )}
            <BrutalLink href="/#pitch" size="sm" cursor="new">
              New idea
            </BrutalLink>
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
          {/* The idea in the tank */}
          <div className="mb-8 flex flex-col gap-3 border-[3px] border-ink bg-paper p-4 shadow-brutal-sm sm:flex-row sm:items-center">
            <span className="shrink-0 border-2 border-ink bg-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cream">
              The idea
            </span>
            <p className="line-clamp-2 text-base font-medium leading-snug">
              {session ? <RandomizedText text={session.idea} revealMs={8} /> : "…"}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            {/* Stage */}
            <div className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
              <div className="relative">
                <Roundtable
                  title={session?.title ?? null}
                  total={total}
                  verdict={debate}
                  line={line}
                  index={snap.index}
                  speaking={snap.status === "playing"}
                  progress={engine?.progress ?? null}
                  deliberating={deliberating}
                  done={done}
                  present={started ? null : present}
                />
                <AnimatePresence>
                  {engine && snap.status === "blocked" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-20 flex items-center justify-center bg-cream/60 backdrop-blur-[2px]"
                    >
                      <BrutalButton size="lg" cursor="start" onClick={() => engine.unblock()}>
                        ▶ Open the floor
                      </BrutalButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Side */}
            <div className="flex flex-col gap-6 [&>*]:shrink-0">
              {engine && !deliberating && !done && (
                <Caption line={line} index={snap.index} progress={engine.progress} emptyText={waitingText} />
              )}
              {session && deliberating && (
                <GroupChat
                  key={chatKey}
                  tankNo={tankNo}
                  waiting={lines.length === 0}
                  onJoin={(id) => setPresent((p) => (p.includes(id) ? p : [...p, id]))}
                  onAssembled={() => setAssembled(true)}
                />
              )}

              {session?.error && (
                <div role="alert" className="border-[3px] border-ink bg-coral p-5 shadow-brutal">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.25em]">The sharks swam off</p>
                  <h1 className="mt-1 font-display text-5xl font-black uppercase leading-[0.9]">No verdict</h1>
                  <p className="mt-3 text-base">{session.error}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <BrutalButton tone="paper" cursor="retry" onClick={() => requestDebate(session.idea)}>
                      Try again
                    </BrutalButton>
                    <BrutalButton tone="sage" cursor="demo" onClick={() => requestDebate(session.idea, true)}>
                      Run demo debate
                    </BrutalButton>
                    <BrutalLink href="/#pitch" tone="ink" cursor="edit">
                      Edit idea
                    </BrutalLink>
                  </div>
                </div>
              )}

              {engine && started && lines.length > 0 && (
                <>
                  <Controls engine={engine} snap={snap} total={total} />
                  <Transcript lines={lines} index={snap.index} complete={snap.complete} onJump={(i) => engine.jumpTo(i)} />
                </>
              )}
            </div>
          </div>

          {debate && done && (
            <div className="mt-20">
              <Scorecard
                debate={debate}
                review={review}
                judgmentId={session?.source === "gemma" ? loadJudgmentId() : null}
                onRetryReview={session ? () => requestReview(session.idea) : undefined}
                onReplay={() => {
                  engine?.jumpTo(0);
                  if (lenis) lenis.scrollTo(0, { duration: 1.2 });
                  else window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onJoinCall={() => {
                  engine?.jumpTo(0);
                  setCallOpen(true);
                }}
              />
            </div>
          )}
          <AnimatePresence>
            {callOpen && engine && debate && (
              <CallView
                engine={engine}
                snap={snap}
                debate={debate}
                onLeave={() => {
                  engine.skipToEnd();
                  setCallOpen(false);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}

function hashIdea(s: string) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function Controls({ engine, snap, total }: { engine: DebateEngine; snap: PlayerSnapshot; total: number }) {
  const playing = snap.status === "playing";
  const heard = snap.status === "done" ? total : Math.max(0, Math.min(total, snap.index));
  const pct = Math.round((heard / total) * 100);
  const label =
    snap.status === "done"
      ? "Debate closed"
      : snap.status === "buffering"
        ? snap.index >= snap.lines.length
          ? snap.complete
            ? "Tallying the scores…"
            : "Waiting on Gemma…"
          : "Cueing the next voice…"
        : snap.status === "paused"
          ? "Paused"
          : "Live from the table";
  return (
    <div className="border-[3px] border-ink bg-paper p-4 shadow-brutal">
      <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-[0.2em]">
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="mt-2 flex h-3 border-2 border-ink bg-cream">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-full flex-1 border-r-2 border-ink transition-colors last:border-r-0 ${
              i < snap.index || snap.status === "done"
                ? "bg-ink"
                : i === snap.index
                  ? "bg-coral"
                  : i < snap.lines.length
                    ? "bg-sage"
                    : ""
            }`}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <BrutalButton size="sm" tone="paper" cursor="back" aria-label="Previous argument" onClick={() => engine.prev()}>
          ⏮
        </BrutalButton>
        <BrutalButton size="sm" tone={playing ? "paper" : "coral"} cursor={playing ? "pause" : "play"} onClick={() => engine.toggle()}>
          {playing ? "❚❚ Pause" : snap.status === "done" ? "↺ Replay" : "▶ Play"}
        </BrutalButton>
        <BrutalButton size="sm" tone="paper" cursor="skip" aria-label="Next argument" onClick={() => engine.next()}>
          ⏭
        </BrutalButton>
        <BrutalButton size="sm" tone="paper" cursor={snap.muted ? "unmute" : "mute"} onClick={() => engine.setMuted(!snap.muted)}>
          {snap.muted ? "🔇 Muted" : "🔊 Sound"}
        </BrutalButton>
        {snap.status !== "done" && snap.complete && (
          <BrutalButton size="sm" tone="ink" cursor="verdict" onClick={() => engine.skipToEnd()} className="ml-auto">
            Skip to verdict
          </BrutalButton>
        )}
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink/65">Space · ← → · M</p>
    </div>
  );
}
