import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BookOpen, Brain, CalendarCheck, CheckCircle2, Crosshair,
  GraduationCap, LockKeyhole, Puzzle, ShieldCheck, Swords, Target, Trophy, Zap,
} from "lucide-react";

export const Route = createFileRoute("/train")({
  head: () => ({ meta: [
    { title: "Train — Chess Topper" },
    { name: "description", content: "Free daily puzzles, tactics, openings, sparring and game-review training." },
  ] }),
  component: TrainPage,
});

const coach = [
  { title: "Woodpecker", text: "Tactics that become instinct", icon: Target, to: "/daily-puzzle", status: "Continue training", tone: "teal" },
  { title: "Opening Trainer", text: "Know your lines by heart", icon: BookOpen, to: "/openings", status: "Explore repertoire", tone: "gold" },
  { title: "Sparring", text: "Climb a ladder of rivals", icon: Swords, to: "/play", status: "Choose an engine", tone: "teal" },
  { title: "Blunder Shield", text: "Spot danger before you move", icon: ShieldCheck, to: "/analysis", status: "Practice safely", tone: "blue" },
  { title: "Blunder Training", text: "Never repeat your own blunders", icon: GraduationCap, to: "/review", status: "Review a game", tone: "red" },
  { title: "Conversion Trainer", text: "Win the games you were winning", icon: Trophy, to: "/play", status: "Practice endgames", tone: "gold" },
];

function TrainPage() {
  return (
    <div className="train-hub mx-auto w-full max-w-[1120px] space-y-8 pb-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-primary">CHESS TOPPER · TRAINING</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Train</h1>
          <p className="mt-1 text-sm text-muted-foreground">Build stronger habits, one session at a time.</p>
        </div>
        <Link to="/account" aria-label="Your profile" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-lg font-black text-primary">♞</Link>
      </header>

      <Link to="/analysis" className="train-feature group flex items-center gap-4 p-4 sm:p-5">
        <span className="train-feature-icon"><Crosshair className="h-7 w-7" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold">Analysis board</span>
          <span className="mt-1 block text-sm text-muted-foreground">Scan a picture or set up any position.</span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-primary transition group-hover:translate-x-1" />
      </Link>

      <Link to="/daily-puzzle" className="train-resume group flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap sm:p-5">
        <span className="train-bird" aria-hidden="true">🐦</span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold">Woodpecker</span>
          <span className="mt-1 block text-xs text-muted-foreground">Tactics practice · Continue where you left off</span>
          <span className="mt-3 flex items-center gap-3">
            <span className="h-2.5 min-w-0 max-w-48 flex-1 overflow-hidden rounded-full bg-black/40"><span className="block h-full w-[27%] rounded-full bg-primary" /></span>
            <span className="text-xs font-bold text-muted-foreground">Daily practice</span>
          </span>
        </span>
        <span className="train-resume-button">▶ Resume</span>
      </Link>

      <section className="space-y-3">
        <div className="train-section-label"><span>🧩</span><span>PUZZLES</span></div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Link to="/daily-puzzle" className="train-tile">
            <CalendarCheck className="train-tile-icon text-[#ff5945]" />
            <h2>Daily puzzle</h2>
            <p>A fresh puzzle every day</p>
            <span className="train-tile-status"><CheckCircle2 /> Train today</span>
          </Link>
          <Link to="/daily-puzzle" className="train-tile">
            <Puzzle className="train-tile-icon text-[#ffb800]" />
            <h2>Classic</h2>
            <p>Endless puzzles at your level</p>
            <span className="train-tile-status"><CheckCircle2 /> Start solving</span>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <div className="train-section-label"><span>🧑‍🏫</span><span>SUPERCOACH</span></div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {coach.map((item) => (
            <Link key={item.title} to={item.to} className="train-tile train-coach-tile group">
              <item.icon className={`train-tile-icon train-icon-${item.tone}`} />
              <h2>{item.title}</h2>
              <p>{item.text}</p>
              <span className="train-tile-status"><ArrowRight /> {item.status}</span>
            </Link>
          ))}
        </div>
      </section>

      <Link to="/brain" className="train-brain-link">
        <Brain className="h-5 w-5 text-primary" />
        <span className="min-w-0 flex-1"><b>Brain games</b><small>Queens, memory and board-vision challenges</small></span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
