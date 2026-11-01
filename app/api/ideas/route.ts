import { createJudgment, db } from "@/lib/server/db";
import { rateRules } from "@/server/config";
import { checkLimit, limitResponse } from "@/server/http/rate-limit";
import { jsonError, readSubmission } from "@/server/http/submission";

// Saves a new idea and its first (empty) judgment so the debate and the review can fill it in.
// `judgmentId` is null when the database isn't configured; the app still works without it.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be JSON.");
  }

  const parsed = readSubmission(body);
  if ("fields" in parsed) {
    return jsonError(400, "invalid_submission", "Idea, hackathon URL, and rules are required.", {
      fields: parsed.fields,
    });
  }

  if (!db()) return Response.json({ judgmentId: null });

  const blocked = checkLimit(request, "writes", rateRules().writes);
  if (!blocked.ok) return limitResponse(blocked, "coded");

  const judgmentId = await createJudgment({
    idea: parsed.submission.idea,
    hackathonUrl: parsed.submission.hackathonUrl,
    rules: parsed.submission.rules,
  });
  return Response.json({ judgmentId });
}
