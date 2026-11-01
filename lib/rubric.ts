import { VOTING_JUDGES, type VotingJudgeId } from "./judges";

// The one rubric. The panel scores it 0–10 while it argues; the research-backed review scores the
// same criteria 0–100. Both average them with equal weight: nothing yet tells us which criterion
// predicts a win, so we don't pretend to know. The eval loop is what will earn weights.
export type CriterionId =
  | "originality"
  | "winner_pattern_fit"
  | "hackathon_fit"
  | "feasibility"
  | "impact"
  | "technical_innovation"
  | "demo_potential"
  | "concept_clarity";

export interface Criterion {
  id: CriterionId;
  label: string;
  question: string;
}

export const RUBRIC: Criterion[] = [
  { id: "originality", label: "Originality", question: "Have the judges seen this ten times today?" },
  { id: "winner_pattern_fit", label: "Winner pattern", question: "Does it look like the projects that actually win?" },
  { id: "hackathon_fit", label: "Hackathon fit", question: "Does it hit this event's rules and prize tracks?" },
  { id: "feasibility", label: "Feasibility", question: "Can a small team ship it before the deadline?" },
  { id: "impact", label: "Impact", question: "Does anyone need this, and would anyone pay?" },
  { id: "technical_innovation", label: "Technical innovation", question: "Is there a real technical problem underneath?" },
  { id: "demo_potential", label: "Demo potential", question: "Will the room remember the demo?" },
  { id: "concept_clarity", label: "Concept clarity", question: "Can you say what it does in one breath?" },
];

export const CRITERION_IDS = RUBRIC.map((c) => c.id);

/** Equal-weight 0–100 score from 0–10 criterion scores. */
export function overallScore(scores: Record<CriterionId, number>): number {
  const values = CRITERION_IDS.map((id) => scores[id] ?? 0);
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10);
}

export interface Grade {
  label: string;
  blurb: string;
}

export function gradeFor(overall: number): Grade {
  if (overall >= 85) return { label: "Apex", blurb: "Nothing bit. Build it tonight." };
  if (overall >= 70) return { label: "Survivor", blurb: "A few scratches. Sharpen the demo." };
  if (overall >= 55) return { label: "Bitten", blurb: "There's a real idea in here. Patch the wounds." };
  if (overall >= 40) return { label: "Chum", blurb: "Back to the whiteboard." };
  return { label: "Eaten", blurb: "Keep the team, change the idea." };
}

/** A shark lets the idea go when its own vote is at least this. */
export const SURVIVE_AT = 6;

export function survival(votes: Partial<Record<VotingJudgeId, number>>) {
  const survived = VOTING_JUDGES.filter((id) => (votes[id] ?? 0) >= SURVIVE_AT);
  return { survived, total: VOTING_JUDGES.length, line: `Survived ${survived.length} of ${VOTING_JUDGES.length} sharks` };
}
