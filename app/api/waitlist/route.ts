import { addToWaitlist, db } from "@/lib/server/db";
import { rateRules } from "@/server/config";
import { checkLimit, limitResponse } from "@/server/http/rate-limit";
import { jsonError } from "@/server/http/submission";

const SOURCES = ["organizer", "muse", "newsletter"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError(400, "invalid_json", "Request body must be JSON.");
  }

  // Hidden field a person never fills in. A bot that does gets the same answer as a signup.
  if (typeof body.website === "string" && body.website !== "") return Response.json({ ok: true });

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const source = typeof body.source === "string" ? body.source : "";
  if (email.length > 320 || !EMAIL.test(email)) return jsonError(400, "invalid_email", "Enter a valid email address.");
  if (!SOURCES.includes(source)) return jsonError(400, "invalid_source", "Unknown waitlist.");

  if (!db()) return jsonError(503, "offline", "The waitlist is not available right now.");

  const blocked = checkLimit(request, "waitlist", rateRules().waitlist);
  if (!blocked.ok) return limitResponse(blocked, "coded");

  return (await addToWaitlist(email, source)) === "ok"
    ? Response.json({ ok: true })
    : jsonError(502, "waitlist_failed", "Could not save that. Try again.");
}
