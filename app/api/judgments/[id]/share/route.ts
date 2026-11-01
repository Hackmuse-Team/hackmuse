import { readJudgmentId, shareJudgment } from "@/lib/server/db";
import { rateRules } from "@/server/config";
import { checkLimit, limitResponse } from "@/server/http/rate-limit";
import { jsonError } from "@/server/http/submission";

// Turns on the public link for a verdict. The id is an unguessable uuid held by whoever ran the panel.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const id = readJudgmentId((await context.params).id);
  if (!id) return jsonError(404, "not_found", "No such verdict.");

  const blocked = checkLimit(request, "writes", rateRules().writes);
  if (!blocked.ok) return limitResponse(blocked, "coded");

  switch (await shareJudgment(id)) {
    case "ok":
      return Response.json({ path: `/v/${id}` });
    case "unsaved":
      return jsonError(409, "not_ready", "The verdict isn't saved yet. Try again in a moment.");
    case "offline":
      return jsonError(503, "offline", "Sharing is not available right now.");
    case "error":
      return jsonError(502, "share_failed", "Could not create the link. Try again.");
    default:
      return jsonError(404, "not_found", "No such verdict.");
  }
}
