import { SharkWater } from "@/components/effects/shark-water";
import { Logo } from "@/components/landing/site-header";
import { BrutalLink } from "@/components/ui/brutal-button";

export default function NotFound() {
  return (
    <>
      <header className="border-b-[3px] border-ink bg-teal text-cream">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
          <Logo className="[&>span:last-child]:text-cream" />
        </div>
      </header>
      <main className="relative flex flex-1 items-center">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto w-full max-w-3xl px-4 py-24 sm:px-6">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">404 · nothing here</p>
          <h1 className="mt-2 font-display text-7xl font-black uppercase leading-[0.88] sm:text-8xl">This one got eaten.</h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/80">
            The page doesn&apos;t exist, or the verdict behind this link was never shared.
          </p>
          <SharkWater className="mt-10 shadow-brutal-sm" label="Still hungry" />
          <BrutalLink href="/#pitch" size="lg" cursor="pitch" className="mt-10">
            Throw them a new idea →
          </BrutalLink>
        </div>
      </main>
    </>
  );
}
