import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/landing/site-header";
import { BrutalLink } from "@/components/ui/brutal-button";
import { WaitlistForm } from "@/components/ui/waitlist-form";
import { SharedVerdict } from "@/components/verdict/shared-verdict";
import { getPublicVerdict, readJudgmentId } from "@/lib/server/db";

// Shared by link, not for search engines: the idea belongs to whoever shared it.
// A per-verdict title and share image come with the share card.
export const metadata: Metadata = {
  title: "A shared verdict · HACKMUSE",
  description: "An AI panel argued about this hackathon idea and scored it.",
  robots: { index: false },
};

type Props = { params: Promise<{ id: string }> };

export default function SharedVerdictPage({ params }: Props) {
  return (
    <>
      <header className="border-b-[3px] border-ink bg-teal text-cream">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo className="[&>span:last-child]:text-cream" />
          <BrutalLink href="/#pitch" size="sm" cursor="new">
            Grade your idea
          </BrutalLink>
        </div>
      </header>
      <main className="relative flex-1">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl space-y-12 px-4 pb-24 pt-10 sm:px-6">
          <Suspense fallback={<p className="font-mono text-sm font-bold uppercase tracking-widest">Loading the verdict…</p>}>
            <Verdict params={params} />
          </Suspense>

          <section className="border-[3px] border-ink bg-coral p-6 shadow-brutal-lg sm:p-8">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">Running a hackathon?</p>
            <h2 className="mt-1 max-w-2xl font-display text-4xl font-black uppercase leading-[0.9] sm:text-5xl">
              Give every team a practice judging panel.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-snug">
              With your own rules as the rubric, before the building starts. Join the organizer waitlist.
            </p>
            <div className="mt-5 max-w-xl">
              <WaitlistForm source="organizer" />
            </div>
          </section>

          <BrutalLink href="/#pitch" size="lg" cursor="pitch">
            Put your own idea on the table →
          </BrutalLink>
        </div>
      </main>
    </>
  );
}

async function Verdict({ params }: Props) {
  await connection();
  const id = readJudgmentId((await params).id);
  const verdict = id ? await getPublicVerdict(id) : null;
  if (!verdict) notFound();
  return <SharedVerdict verdict={verdict} />;
}
