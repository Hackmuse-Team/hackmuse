"use client";

import { useState, type FormEvent } from "react";
import { BrutalButton } from "@/components/ui/brutal-button";

type State = { status: "idle" | "busy" | "done" | "error"; message?: string };

export function WaitlistForm({
  source,
  button = "Join the waitlist",
}: {
  source: "organizer" | "muse" | "newsletter";
  button?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const website = String(new FormData(e.currentTarget).get("website") ?? "");
    setState({ status: "busy" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, website }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "Could not save that. Try again.");
      setState({ status: "done" });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Could not save that. Try again." });
    }
  }

  if (state.status === "done") {
    return (
      <p role="status" className="border-[3px] border-ink bg-mint p-4 font-mono text-sm font-bold uppercase tracking-wider">
        You&apos;re on the list. One email when it&apos;s ready.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={`waitlist-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`waitlist-${source}`}
          type="email"
          required
          maxLength={320}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.status === "error") setState({ status: "idle" });
          }}
          placeholder="you@example.com"
          className="h-12 min-w-0 flex-1 border-[3px] border-ink bg-cream px-3 text-base outline-none transition-colors focus:bg-white"
        />
        {/* Hidden field a person never fills in; bots do. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        <BrutalButton type="submit" size="md" cursor="join" disabled={state.status === "busy"}>
          {state.status === "busy" ? "Saving…" : button}
        </BrutalButton>
      </div>
      <p role={state.status === "error" ? "alert" : undefined} className="text-xs leading-snug text-ink/70">
        {state.status === "error"
          ? state.message
          : "By joining you agree we may email you about HACKMUSE. Leave any time."}
      </p>
    </form>
  );
}
