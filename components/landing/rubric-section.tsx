"use client";

import { motion } from "motion/react";
import { JudgeAvatar } from "@/components/judge-avatar";
import { TextAnimation } from "@/components/ui/text-animation";
import { JUDGES, JUDGE_ORDER } from "@/lib/judges";
import { RUBRIC } from "@/lib/rubric";

export function RubricSection() {
  return (
    <section id="rubric" className="scroll-mt-16 border-t-[3px] border-ink bg-ink py-24 text-cream">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-mustard">How it&apos;s scored</p>
            <TextAnimation
              as="h2"
              text="What the sharks count."
              className="mt-2 font-display text-6xl font-black uppercase leading-[0.9] sm:text-7xl"
            />
            <p className="mt-6 max-w-sm text-cream/70">
              Eight criteria. The sharks score each 0–10 while they argue; a slower research pass then scores the same eight
              0–100 and looks for similar projects.
            </p>
            <p className="mt-4 max-w-sm border-l-[5px] border-mustard pl-3 text-sm text-cream/70">
              Every criterion counts the same. We don&apos;t yet have the data to say which one wins hackathons, so we
              don&apos;t pretend to.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {RUBRIC.map((c, i) => {
              const owner = JUDGE_ORDER.map((id) => JUDGES[id]).find((j) => j.owns.includes(c.id));
              return (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ delay: (i % 2) * 0.08 }}
                  className="group flex flex-col border-[3px] border-cream/80 bg-teal-deep p-4 transition-colors hover:bg-teal"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-xs text-cream/50">0{i + 1}</span>
                    {owner && (
                      <span className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-widest text-cream/60">
                        {owner.short}
                        <JudgeAvatar id={owner.id} className="w-8 transition-transform duration-300 group-hover:-rotate-6" />
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-display text-3xl font-black uppercase leading-none">{c.label}</h3>
                  <p className="mt-2 text-sm leading-snug text-cream/70">{c.question}</p>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
