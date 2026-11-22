import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Crosshair,
  GraduationCap,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/train")({
  head: () => ({
    meta: [
      { title: "Train — Berserk Sigma" },
      { name: "description", content: "Free daily puzzles, sparring, opening practice and mistake training." },
    ],
  }),
  component: TrainPage,
});

const quick = [
  { to: "/analysis", title: "Analysis board", description: "Set up a position, explore legal moves and inspect engine lines.", icon: Crosshair, tag: "TOOLS" },
  { to: "/daily-puzzle", title: "Daily puzzle", description: "Solve today's real Chessigma puzzle and follow its full continuation.", icon: Target, tag: "DAILY" },
  { to: "/brain", title: "Brain games", description: "Train memory, board vision, calculation and reaction speed.", icon: Brain, tag: "BRAIN" },
  { to: "/play", title: "Sparring", description: "Play a complete game against the local Berserk engine.", icon: Swords, tag: "PLAY" },
];

const supercoach = [
  { title: "Woodpecker", text: "Repeat tactics and track your solving accuracy.", icon: Target, to: "/daily-puzzle", action: "Open puzzles" },
  { title: "Opening Trainer", text: "Study known opening lines and review your repertoire.", icon: BookOpen, to: "/openings", action: "Open repertoire" },
  { title: "Sparring", text: "Play against Berserk with adjustable strength and time.", icon: Swords, to: "/play", action: "Start a game" },
  { title: "Blunder Shield", text: "Practice checking threats before committing to a move.", icon: ShieldCheck, to: "/analysis", action: "Open analysis" },
  { title: "Blunder Training", text: "Review your own games and revisit engine-marked mistakes.", icon: GraduationCap, to: "/review", action: "Review games" },
  { title: "Conversion Trainer", text: "Practice winning positions by playing them out against Berserk.", icon: Trophy, to: "/play", action: "Train endgames" },
];

function TrainPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-7 pb-4">
      <header>
        <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-primary"><Zap className="h-3.5 w-3.5" /> Build better habits</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Train</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A free training workspace for tactics, openings, calculation and practical play.</p>
      </header>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">START HERE</p><h2 className="mt-1 text-xl font-bold">Daily practice</h2></div><span className="text-[10px] text-muted-foreground">No subscriptions · No locked tools</span></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {quick.map((item) => (
            <Link key={item.to} to={item.to} className="training-card group flex min-w-0 gap-4 p-4 sm:p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border bg-background text-primary"><item.icon className="h-6 w-6" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold">{item.title}</span><span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-primary">{item.tag}</span></span>
                <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">{item.description}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">Continue <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">SUPERCOACH</p><h2 className="mt-1 text-xl font-bold">Train with a purpose</h2><p className="mt-1 text-xs text-muted-foreground">Training paths that use the working puzzle, engine, analysis and review tools.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {supercoach.map((item) => (
            <article key={item.title} className="training-card flex min-w-0 flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><item.icon className="h-5 w-5" /></span>
                <span className="text-[10px] font-semibold text-muted-foreground">FREE</span>
              </div>
              <h3 className="mt-4 text-sm font-bold">{item.title}</h3>
              <p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">{item.text}</p>
              <Link to={item.to} className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-xs font-bold transition hover:border-primary/50 hover:text-primary">{item.action}<ArrowRight className="h-3.5 w-3.5" /></Link>
            </article>
          ))}
        </div>
      </section>
      <p className="rounded-xl border border-border bg-card p-4 text-[11px] leading-5 text-muted-foreground">Training note: Woodpecker, Blunder Shield and Conversion Trainer currently open the real underlying puzzle, analysis, review and sparring tools. Dedicated adaptive sets and per-module history are not yet implemented.</p>
    </div>
  );
}
