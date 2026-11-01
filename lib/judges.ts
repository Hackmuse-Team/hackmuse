import type { CriterionId } from "./rubric";

// The tank: five sharks and the Tank Master who runs it. Each shark stands for one way ideas die.
// Ids stay as they were (voices, saved verdicts and env overrides key off them); names and roles
// are what people see. Add a judge here (plus an avatar in components/judge-avatar.tsx) and the
// prompt, roundtable, chat, call and scorecard all pick it up.
export type JudgeId = "chair" | "shark" | "builder" | "visionary" | "angel" | "operator";
export type VotingJudgeId = Exclude<JudgeId, "chair">;

export interface Judge {
  id: JudgeId;
  name: string;
  /** Short name for tight spots (seats, chat). */
  short: string;
  role: string;
  /** CSS colour for the judge's seat, tags and avatar backdrop. */
  color: string;
  catchphrase: string;
  /** The kind of idea this shark eats. */
  kills: string;
  owns: CriterionId[];
  /** Chip shown on the panel card when the judge owns no rubric criterion. */
  focus: string;
  /** Persona brief handed to Gemma. */
  brief: string;
  /** What they post when they join the group chat while Gemma writes. */
  joinLine: string;
  /** Default ElevenLabs premade voice (see the voice table below); override per judge with ELEVENLABS_VOICE_<ID>. */
  voiceId: string;
  voiceName: string;
}

export const JUDGES: Record<JudgeId, Judge> = {
  chair: {
    id: "chair",
    focus: "Final verdict",
    name: "The Tank Master",
    short: "Master",
    role: "Runs the tank",
    color: "#e9b949",
    catchphrase: "Five sharks, one idea. Let's see what's left of it.",
    kills: "Nothing. Calls the verdict and keeps the sharks honest.",
    owns: ["hackathon_fit", "winner_pattern_fit"],
    brief:
      "the Tank Master, who runs the shark tank. Opens in one line, keeps the sharks on this idea and this hackathon, and closes with the verdict. Measured, dry wit, never rambles. Does not vote.",
    joinLine: "Tank's open. Keep it short.",
    voiceId: "onwK4e9ZLuTAKqWW03F9",
    voiceName: "Daniel",
  },
  shark: {
    id: "shark",
    focus: "Impact",
    name: "The Market Shark",
    short: "Market",
    role: "Skeptical VC",
    color: "#e8736a",
    catchphrase: "Who pays for this, and why now?",
    kills: "Ideas nobody would pay for.",
    owns: ["impact"],
    brief:
      "the Market Shark, a skeptical venture capitalist. Goes after ideas nobody would pay for: who pays, how big the market is, why now. Blunt, dry, short sentences.",
    joinLine: "Who pays? Go.",
    voiceId: "nPczCjzI2devNBz1zQrb",
    voiceName: "Brian",
  },
  builder: {
    id: "builder",
    focus: "Feasibility",
    name: "The Build Shark",
    short: "Build",
    role: "Senior engineer",
    color: "#7fb3a5",
    catchphrase: "Cool. What breaks at 3 a.m.?",
    kills: "Ideas that can't ship before the deadline.",
    owns: ["feasibility", "technical_innovation"],
    brief:
      "the Build Shark, a pragmatic senior engineer. Goes after ideas that can't be built in the time a hackathon gives: which APIs and data it needs, where it breaks. Concrete, names specific tech.",
    joinLine: "Counting the APIs already.",
    voiceId: "IKne3meq5aSn9XLyUdCD",
    voiceName: "Charlie",
  },
  visionary: {
    id: "visionary",
    focus: "Originality",
    name: "The Novelty Shark",
    short: "Novelty",
    role: "Product designer",
    color: "#b9a6e8",
    catchphrase: "I've seen this ten times. Show me the eleventh.",
    kills: "Ideas the judges have already seen all day.",
    owns: ["originality", "demo_potential"],
    brief:
      "the Novelty Shark, a product designer. Goes after ideas the judges have seen ten times today, and lights up for the one demo moment people remember. Energetic, vivid.",
    joinLine: "Please be original.",
    voiceId: "cgSgspJ2msm6clMCkdW9",
    voiceName: "Jessica",
  },
  angel: {
    id: "angel",
    focus: "Team & story",
    name: "The Story Shark",
    short: "Story",
    role: "Angel investor",
    color: "#9cc3d5",
    catchphrase: "Why is this team the one to build it?",
    kills: "Ideas with no reason this team should build them.",
    owns: ["concept_clarity"],
    brief:
      "the Story Shark, an early-stage angel investor. Goes after pitches with no story: the founders' unfair advantage, whether anyone would love this, whether it can be said in one breath. Warm but probing.",
    joinLine: "Sorry, late. Who's the team?",
    voiceId: "XB0fDUnXU5powFXDhCwa",
    voiceName: "Charlotte",
  },
  operator: {
    id: "operator",
    focus: "Distribution",
    name: "The Crowd Shark",
    short: "Crowd",
    role: "Ex-founder, growth",
    color: "#e59a4f",
    catchphrase: "Great product. How do the first hundred users find it?",
    kills: "Ideas with no way to reach their users.",
    owns: [],
    brief:
      "the Crowd Shark, a former startup founder who ran growth. Goes after ideas with no way to reach users: the first hundred users, the launch, the channel. Practical, a little impatient.",
    joinLine: "Here. Distribution is my question.",
    voiceId: "bIHbv24MWmeRgasZH58o",
    voiceName: "Will",
  },
};

// Voice table: six premade ElevenLabs voices, spread across gender, accent and age.
//   chair     Daniel     male    British, mature, broadcaster
//   shark     Brian      male    American, deep, older, resonant
//   builder   Charlie    male    Australian, young, casual
//   visionary Jessica    female  American, young, expressive
//   angel     Charlotte  female  English-Swedish, mature, warm
//   operator  Will       male    American, young, upbeat
// Delivery is pushed apart further by VOICE_SETTINGS in app/api/tts/route.ts.
const seenVoices = new Map<string, JudgeId>();
for (const judge of Object.values(JUDGES)) {
  const clash = seenVoices.get(judge.voiceId);
  if (clash) throw new Error(`Judges ${clash} and ${judge.id} share ElevenLabs voice ${judge.voiceId}`);
  seenVoices.set(judge.voiceId, judge.id);
}

/** Seating order: the Tank Master first (head of the table), then clockwise. */
export const JUDGE_ORDER: JudgeId[] = ["chair", "shark", "builder", "angel", "visionary", "operator"];
export const VOTING_JUDGES = JUDGE_ORDER.filter((id): id is VotingJudgeId => id !== "chair");

export function isJudgeId(v: unknown): v is JudgeId {
  return typeof v === "string" && v in JUDGES;
}

/** Rebuttal lines after every voting judge has opened. */
export const REBUTTALS = 3;
/** Tank Master opens, every shark opens, the rebuttals, Tank Master closes. */
export const DEBATE_LENGTH = 1 + VOTING_JUDGES.length + REBUTTALS + 1;
