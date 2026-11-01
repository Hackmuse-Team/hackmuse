import { loadHackathon, loadJudgmentId, saveJudgmentId } from "@/lib/idea";

let pending: Promise<string | null> | null = null;

/**
 * The saved verdict this tab's debate and review fill in, created on first use. Creating it here,
 * not on the landing page, lets the pitch form navigate instantly; the round trip hides behind the
 * panel's waiting room. Concurrent callers share one request. Null when saving is off or failed:
 * the debate still runs, it just can't be shared.
 */
export function ensureJudgment(idea: string): Promise<string | null> {
  const existing = loadJudgmentId();
  if (existing) return Promise.resolve(existing);
  pending ??= (async () => {
    try {
      const { hackathonUrl, rules } = loadHackathon();
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, hackathonUrl, rules }),
      });
      const data = await res.json().catch(() => null);
      if (typeof data?.judgmentId !== "string") return null;
      saveJudgmentId(data.judgmentId);
      return data.judgmentId as string;
    } catch {
      return null;
    } finally {
      pending = null;
    }
  })();
  return pending;
}
