"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { JUDGES, VOTING_JUDGES } from "@/lib/judges";
import { cn } from "@/lib/utils";

/** A dorsal fin on a 40×30 grid, pointing right. */
export function FinShape({ color, className, size }: { color: string; className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 40 30" width={size} className={className} aria-hidden>
      <path
        d="M2 29 C 12 24 19 12 31 2 C 30 13 33 22 38 29 Z"
        fill={color}
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M14 22 C 19 17 23 12 28 8" fill="none" stroke="var(--ink)" strokeWidth="1.5" opacity="0.35" />
    </svg>
  );
}

// Two copies of one wave, side by side, so drifting by half its width loops seamlessly.
function Wave({ className, fill, wave }: { className: string; fill: string; wave: string }) {
  const crest = "Q 25 0 50 9 T 100 9";
  const path = `M0 9 ${crest} T 150 9 T 200 9 T 250 9 T 300 9 T 350 9 T 400 9 V 24 H 0 Z`;
  return (
    <div className={cn("wave-strip absolute left-0 w-[200%]", className)} style={{ "--wave": wave } as CSSProperties}>
      <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="block h-full w-full" aria-hidden>
        <path d={path} fill={fill} />
      </svg>
    </div>
  );
}

const LANES = VOTING_JUDGES.map((id, i) => ({
  id,
  swim: `${10 + i * 2.4}s`,
  delay: `${-i * 2.7}s`,
  reverse: i % 2 === 1,
  depth: `${8 + (i % 3) * 6}px`,
  size: 54 - (i % 3) * 8,
  bob: `${1.1 + (i % 3) * 0.35}s`,
  rest: `${8 + i * 18}%`,
}));

/**
 * Five fins, one per shark in its colour, patrol a strip of water. They pick up speed while
 * `agitated` (someone is typing) and dive when `diving` (the idea was thrown in). Speed changes go
 * through the Web Animations API, so the fins accelerate smoothly instead of jumping.
 */
export function SharkWater({
  agitated = false,
  diving = false,
  className,
  label,
}: {
  agitated?: boolean;
  diving?: boolean;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lanes = ref.current?.querySelectorAll<HTMLElement>(".fin-lane");
    lanes?.forEach((lane) => lane.getAnimations().forEach((a) => a.updatePlaybackRate(agitated ? 2.4 : 1)));
  }, [agitated]);

  return (
    <div
      ref={ref}
      aria-hidden
      data-diving={diving}
      className={cn("relative h-24 overflow-hidden border-[3px] border-ink bg-teal-deep", className)}
    >
      <Wave className="top-5 h-7 opacity-60" fill="var(--teal)" wave="14s" />
      {LANES.map((lane) => (
        <div
          key={lane.id}
          className="fin-lane"
          style={
            {
              "--swim": lane.swim,
              "--delay": lane.delay,
              "--dir": lane.reverse ? "reverse" : "normal",
              "--rest": lane.rest,
            } as CSSProperties
          }
        >
          <div className="fin-dive" style={{ "--depth": lane.depth } as CSSProperties}>
            <span className="fin-body" style={{ "--bob": lane.bob } as CSSProperties}>
              <FinShape
                color={JUDGES[lane.id].color}
                size={lane.size}
                className={cn("block", lane.reverse && "-scale-x-100")}
              />
            </span>
          </div>
        </div>
      ))}
      <Wave className="-bottom-1 h-6" fill="var(--ink)" wave="9s" />
      {label && (
        <p className="absolute right-2 top-1.5 z-10 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-cream/70">
          {label}
        </p>
      )}
    </div>
  );
}
