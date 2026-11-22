import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, BarChart3, BookOpen, Crosshair, Radio, Swords, Zap } from "lucide-react";
import { Logo } from "@/components/AppShell";
import { EngineBadge } from "@/components/chess/parts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Berserk Sigma — Chess Analysis & Play" },
      { name: "description", content: "Play, analyze and review chess with the Berserk engine." },
      { property: "og:title", content: "Berserk Sigma — Chess Analysis & Play" },
      { property: "og:description", content: "A focused chess workspace powered by Berserk." },
    ],
  }),
  component: Home,
});

const tools = [
  { to: "/play", title: "Play Berserk", description: "Challenge the engine. Tune its strength, style and thinking time.", icon: Swords, tag: "PLAY" },
  { to: "/analysis", title: "Analysis board", description: "Explore positions and find strong continuations with Berserk.", icon: Crosshair, tag: "ANALYZE" },
  { to: "/review", title: "Game review", description: "Review your games, inspect key moments and understand mistakes.", icon: BookOpen, tag: "IMPROVE" },
  { to: "/live", title: "Live games", description: "Follow live chess and see engine insights as the game unfolds.", icon: Radio, tag: "WATCH" },
] as const;

function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 py-5 sm:py-9">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-9 sm:px-9 sm:py-12">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              YOUR CHESS WORKSPACE
            </div>
            <div className="mb-4 flex items-center gap-3">
              <Logo size={48} />
              <span className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">BERSERK SIGMA</span>
            </div>
            <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
              Think deeper.
              <span className="block text-primary">Play stronger.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              A focused chess environment powered by the Berserk engine. Play, analyze positions, review games and follow live action — all in one place.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/play" className="btn btn-primary">
                <Swords className="h-4 w-4" /> Start playing <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/analysis" className="btn btn-secondary">
                <Crosshair className="h-4 w-4" /> Open analysis
              </Link>
            </div>
          </div>
          <div className="relative w-full max-w-xs rounded-xl border border-border bg-background/80 p-4 md:w-64">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Engine status</span>
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <EngineBadge />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Berserk runs locally in your browser using WebAssembly.
            </p>
            <div className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
              Private by design · No board upload required for local analysis
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">EXPLORE</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Everything you need to work on your game</h2>
          </div>
          <p className="text-xs text-muted-foreground">One engine. Four ways to improve.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {tools.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-surface"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-surface text-primary">
                  <tool.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">{tool.tag}</span>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">{tool.title}</h3>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <p className="mt-2 max-w-md text-sm leading-5 text-muted-foreground">{tool.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><BarChart3 className="h-4 w-4" /></div>
          <div>
            <p className="text-sm font-semibold">Track your progress</p>
            <p className="text-xs text-muted-foreground">See your saved games and performance statistics.</p>
          </div>
        </div>
        <Link to="/stats" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          View statistics <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
