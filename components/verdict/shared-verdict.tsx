import { JudgeAvatar } from "@/components/judge-avatar";
import { JUDGES, VOTING_JUDGES } from "@/lib/judges";
import { reviewOverall } from "@/lib/review";
import { RUBRIC, gradeFor } from "@/lib/rubric";
import type { PublicVerdict } from "@/lib/server/db";

/** Read-only verdict for the public share page. No animation and no client code, so it renders fast anywhere. */
export function SharedVerdict({ verdict }: { verdict: PublicVerdict }) {
  const { debate, review } = verdict;
  const reviewScore = review ? reviewOverall(review) : null;
  const overall = reviewScore ?? debate.overall;
  const grade = gradeFor(overall);
  const reviewRows = reviewScore !== null ? review!.criteria : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">A shared verdict</p>
        <h1 className="mt-1 font-display text-6xl font-black uppercase leading-[0.9] sm:text-7xl">{debate.title}</h1>
      </div>

      <div className="flex flex-col gap-3 border-[3px] border-ink bg-paper p-4 shadow-brutal-sm sm:flex-row sm:items-start">
        <span className="shrink-0 border-2 border-ink bg-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cream">
          The idea
        </span>
        <p className="whitespace-pre-line text-base font-medium leading-snug">{verdict.idea}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <div className="relative overflow-hidden border-[3px] border-ink bg-paper p-6 shadow-brutal-lg sm:p-8 lg:self-start">
          <div className="bg-grid absolute inset-0 opacity-60" />
          <div className="relative">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em]">
              {reviewRows ? "Overall · research-backed review" : "Overall · panel estimate"}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-[clamp(6rem,16vw,10rem)] font-black leading-none tabular-nums">{overall}</span>
              <span className="font-display text-4xl font-black text-ink/40">/100</span>
            </div>
            <p className="mt-2 inline-block -rotate-3 border-[5px] border-double border-coral-deep px-3 py-1 font-display text-4xl font-black uppercase leading-none text-coral-deep">
              {grade.label}
            </p>
            <p className="mt-5 font-display text-2xl font-black uppercase">{grade.blurb}</p>
            <blockquote className="mt-4 border-l-[6px] border-mustard bg-cream p-4 text-lg font-medium leading-snug">
              &ldquo;{debate.verdict}&rdquo;
              <footer className="mt-2 font-mono text-[11px] font-bold uppercase tracking-wider text-ink/60">— The Chair</footer>
            </blockquote>
            <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {VOTING_JUDGES.map((id) => (
                <div
                  key={id}
                  className="flex flex-col items-center border-[3px] border-ink p-1.5 text-center"
                  style={{ backgroundColor: JUDGES[id].color }}
                >
                  <JudgeAvatar id={id} className="w-10 bg-paper!" />
                  <p className="mt-1 font-display text-3xl font-black leading-none tabular-nums">{debate.votes[id]}</p>
                  <p className="font-mono text-[8px] font-bold uppercase tracking-wider">{JUDGES[id].short}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="border-[3px] border-ink bg-paper shadow-brutal">
            <div className="border-b-[3px] border-ink bg-teal px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.25em] text-cream">
              Criteria breakdown
            </div>
            <ul className="divide-y-2 divide-dashed divide-ink/25">
              {reviewRows
                ? reviewRows.map((c) => (
                    <Row key={c.id} label={c.label} value={c.score} max={100} note={c.explanation} />
                  ))
                : RUBRIC.map((c) => (
                    <Row key={c.id} label={c.label} value={debate.scores[c.id].score} max={10} note={debate.scores[c.id].note} />
                  ))}
            </ul>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <ListCard title="Lean on" tone="var(--mint)" mark="+" items={debate.strengths} />
            <ListCard title="Fix first" tone="var(--coral)" mark="!" items={debate.risks} />
          </div>
        </div>
      </div>

      <p className="max-w-2xl text-sm leading-snug text-ink/70">
        Scored by an AI panel (Gemma 4) from the idea as written. It says nothing about the team, the demo or the polish,
        so treat it as a critique to work with, not a prediction.
      </p>
    </div>
  );
}

function Row({ label, value, max, note }: { label: string; value: number | null; max: number; note: string }) {
  return (
    <li className="p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-2xl font-black uppercase leading-none">{label}</span>
        <span className="font-display text-3xl font-black tabular-nums">
          {value ?? "—"}
          <span className="text-lg text-ink/40">/{max}</span>
        </span>
      </div>
      <div className="mt-2 h-4 border-2 border-ink bg-cream">
        <div
          className="bg-hatch h-full"
          style={{
            width: `${((value ?? 0) / max) * 100}%`,
            color: "var(--coral)",
            backgroundColor: "color-mix(in oklab, currentColor 35%, transparent)",
          }}
        />
      </div>
      {note && <p className="mt-2 text-sm leading-snug text-ink/75">{note}</p>}
    </li>
  );
}

function ListCard({ title, tone, mark, items }: { title: string; tone: string; mark: string; items: string[] }) {
  return (
    <div className="border-[3px] border-ink bg-paper shadow-brutal-sm">
      <div className="border-b-[3px] border-ink px-4 py-2 font-display text-2xl font-black uppercase" style={{ backgroundColor: tone }}>
        {title}
      </div>
      <ul className="space-y-3 p-4">
        {(items.length ? items : ["Nothing flagged."]).map((it) => (
          <li key={it} className="flex gap-3 text-sm leading-snug">
            <span
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center border-2 border-ink font-mono text-xs font-bold"
              style={{ backgroundColor: tone }}
            >
              {mark}
            </span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
