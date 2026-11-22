import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Brain,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  CircleDot,
  Crosshair,
  Gamepad2,
  GraduationCap,
  Radio,
  Swords,
  Trophy,
  Target,
  Upload,
  Zap,
} from "lucide-react";
import { EngineBadge } from "@/components/chess/parts";
import { getConnectedChessAccounts, loadGames, setPendingPgn, type SavedGame } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Berserk Sigma — Free Chess Workspace" },
      { name: "description", content: "Play, train, review and analyze chess with Berserk Sigma." },
      { property: "og:title", content: "Berserk Sigma — Free Chess Workspace" },
      { property: "og:description", content: "A free chess workspace for play, training, game review and analysis." },
    ],
  }),
  component: Home,
});

const workspaces = [
  { to: "/train", title: "Training hub", description: "Daily puzzles, opening practice, sparring and mistake training.", icon: GraduationCap, eyebrow: "TRAIN", accent: "from-amber-500/20 to-transparent" },
  { to: "/games", title: "Games library", description: "Browse, filter, import and review your saved chess games.", icon: Gamepad2, eyebrow: "GAMES", accent: "from-orange-500/15 to-transparent" },
  { to: "/review", title: "Game review", description: "Inspect your moves, engine grades and important moments.", icon: BookOpen, eyebrow: "IMPROVE", accent: "from-orange-500/15 to-transparent" },
  { to: "/analysis", title: "Analysis board", description: "Explore a position, follow variations and inspect engine lines.", icon: Crosshair, eyebrow: "EXPLORE", accent: "from-yellow-500/15 to-transparent" },
  { to: "/live", title: "Live games", description: "Follow live games and inspect the current position with Berserk.", icon: Radio, eyebrow: "WATCH", accent: "from-emerald-500/10 to-transparent" },
] as const;

function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Trophy }) {
  return (
    <div className="panel min-w-0 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-3 font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</div>
      <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const [games, setGames] = useState<SavedGame[]>([]);
  const [accountCount, setAccountCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setGames(loadGames());
      setAccountCount(getConnectedChessAccounts().length);
    };
    refresh();
    window.addEventListener("berserk-games-updated", refresh);
    window.addEventListener("berserk-auth-change", refresh);
    return () => {
      window.removeEventListener("berserk-games-updated", refresh);
      window.removeEventListener("berserk-auth-change", refresh);
    };
  }, []);

  const stats = useMemo(() => {
    let wins = 0, draws = 0, losses = 0, accuracyTotal = 0, accuracyCount = 0;
    for (const game of games) {
      if (game.result === "1-0") game.humanSide === "w" ? wins++ : losses++;
      else if (game.result === "0-1") game.humanSide === "b" ? wins++ : losses++;
      else if (game.result === "1/2-1/2") draws++;
      if (typeof game.accuracy === "number" && Number.isFinite(game.accuracy)) {
        accuracyTotal += game.accuracy;
        accuracyCount++;
      }
    }
    return {
      total: games.length,
      wins,
      draws,
      losses,
      accuracy: accuracyCount ? `${Math.round(accuracyTotal / accuracyCount)}%` : "—",
    };
  }, [games]);

  const latest = games[0];

  function resumeLatest() {
    if (!latest?.pgn) return;
    setPendingPgn(latest.pgn);
    navigate({ to: "/review" });
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-7 pb-3">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,.8fr)]">
        <div className="relative isolate overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">
              <CircleDot className="h-3 w-3 text-primary" /> Your chess workspace
            </span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">100% FREE</span>
          </div>
          <h1 className="mt-6 max-w-2xl text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl">
            Think deeper.
            <span className="block text-primary">Play stronger.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            One place to play, train, review your games and understand your chess. Powered by Berserk, built around your progress.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link to="/train" className="btn btn-primary"><GraduationCap className="h-4 w-4" /> Start training <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/games" className="btn btn-secondary"><Gamepad2 className="h-4 w-4" /> Open games</Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/80 pt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-primary" /> Local Berserk engine</span>
            <span className="inline-flex items-center gap-2"><Brain className="h-3.5 w-3.5 text-primary" /> Training and brain games</span>
            <span className="inline-flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-primary" /> Your activity stays yours</span>
          </div>
        </div>

        <div className="panel flex min-h-[230px] flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Engine room</p>
              <span className="rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">LOCAL</span>
            </div>
            <h2 className="mt-4 text-xl font-bold">Berserk is ready to work.</h2>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">Play against the engine or open a position for analysis. Your board stays in your browser.</p>
          </div>
          <div className="mt-6 rounded-xl border border-border bg-background p-3">
            <EngineBadge />
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
              <span>Engine status</span><span>WebAssembly</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">YOUR OVERVIEW</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Your chess activity</h2>
          </div>
          <Link to="/stats" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Full report <ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric label="Games saved" value={String(stats.total)} note="Games on this device / account" icon={Gamepad2} />
          <Metric label="Wins" value={String(stats.wins)} note={`${stats.draws} draws · ${stats.losses} losses`} icon={Trophy} />
          <Metric label="Average accuracy" value={stats.accuracy} note={stats.accuracy === "—" ? "No completed review data yet" : "Across games with saved accuracy"} icon={ChartNoAxesCombined} />
          <Metric label="Connected accounts" value={String(accountCount)} note="Chess.com and Lichess profiles" icon={BarChart3} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.75fr)]">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">EXPLORE</p><h2 className="mt-1 text-xl font-bold tracking-tight">Choose your next move</h2></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {workspaces.map((item) => (
              <Link key={item.to} to={item.to} className="group relative min-h-[154px] overflow-hidden rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/55">
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${item.accent}`} />
                <div className="relative flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-background text-primary"><item.icon className="h-5 w-5" /></span>
                  <span className="text-[9px] font-extrabold tracking-[.17em] text-muted-foreground">{item.eyebrow}</span>
                </div>
                <div className="relative mt-5 flex items-center justify-between gap-2"><h3 className="text-base font-bold">{item.title}</h3><ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" /></div>
                <p className="relative mt-1.5 text-xs leading-5 text-muted-foreground">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">KEEP IMPROVING</p><h2 className="mt-1 text-xl font-bold tracking-tight">Training corner</h2></div></div>
          <Link to="/daily-puzzle" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/55">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Target className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1"><h3 className="font-bold">Daily puzzle</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Solve a real puzzle from the Chessigma public API.</p></div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
          <Link to="/brain" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/55">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Brain className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1"><h3 className="font-bold">Chess brain games</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Memory, square recognition, knight movement and reaction tests.</p></div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
          <Link to="/stats" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/55">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ChartNoAxesCombined className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1"><h3 className="font-bold">Coach report</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Review saved games, accuracy and engine move grades.</p></div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
          <Link to="/settings" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/55">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Zap className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1"><h3 className="font-bold">Engine & accounts</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Tune Berserk and manage connected chess profiles.</p></div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        </div>
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">RECENT SESSION</p><h2 className="mt-1 text-lg font-bold">Pick up where you left off</h2></div>
          {latest && <button type="button" onClick={resumeLatest} className="btn btn-secondary btn-sm">Open latest review <ArrowRight className="h-3.5 w-3.5" /></button>}
        </div>
        {latest ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{latest.result} <span className="font-normal text-muted-foreground">· {new Date(latest.date).toLocaleDateString()}</span></p><p className="mt-1 text-xs text-muted-foreground">{latest.pgn.split(/\s+/).filter((token) => /^\d+\./.test(token)).length} move numbers in saved PGN</p></div>
            <span className="rounded-md bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary">{latest.accuracy === null ? "Not reviewed" : `${Math.round(latest.accuracy)}% accuracy`}</span>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-background/50 p-4 sm:flex-row sm:items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-muted-foreground"><CalendarDays className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">No saved games yet</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Play a game against Berserk or import a PGN to start building your personal chess report.</p></div>
            <Link to="/review" className="btn btn-primary btn-sm">Import a game <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        )}
      </section>
    </div>
  );
}
