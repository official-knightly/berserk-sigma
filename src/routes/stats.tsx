import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { engine } from "@/lib/engine";
import { loadGames, clearGames, SavedGame } from "@/lib/store";
import { GradeIcon, Panel } from "@/components/chess/parts";
import { Grade } from "@/lib/chess-logic";
import {
  Trophy,
  Gauge,
  Cpu,
  RotateCcw,
  Swords,
  Play,
  Zap,
  BarChart3,
  Award,
} from "lucide-react";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistics & Benchmarks — Berserk Web" },
      { name: "description", content: "Berserk engine benchmarks, match history, accuracy statistics and performance analytics." },
      { property: "og:title", content: "Statistics & Benchmarks — Berserk Web" },
      { property: "og:description", content: "Berserk engine benchmarks, match history, accuracy statistics and performance analytics." },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const [games, setGames] = useState<SavedGame[]>(() => loadGames());

  // Benchmark state
  const [benchRunning, setBenchRunning] = useState(false);
  const [benchResult, setBenchResult] = useState<{
    nodes: string;
    nps: number;
    depth: number;
    ms: number;
    bestmove: string;
  } | null>(null);

  // Compute aggregate records from saved games
  const stats = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalAcc = 0;
    let accCount = 0;
    const gradeTotals: Partial<Record<Grade, number>> = {};

    games.forEach((g) => {
      const isWhite = g.humanSide === "w";
      if (g.result === "1-0") {
        if (isWhite) wins++; else losses++;
      } else if (g.result === "0-1") {
        if (isWhite) losses++; else wins++;
      } else if (g.result === "1/2-1/2") {
        draws++;
      }

      if (g.accuracy !== null) {
        totalAcc += g.accuracy;
        accCount++;
      }

      if (g.grades) {
        Object.entries(g.grades).forEach(([grade, count]) => {
          gradeTotals[grade as Grade] = (gradeTotals[grade as Grade] || 0) + (count || 0);
        });
      }
    });

    const total = games.length;
    const winRate = total > 0 ? Math.round(((wins + 0.5 * draws) / total) * 100) : 0;
    const avgAcc = accCount > 0 ? Math.round(totalAcc / accCount) : null;

    return { total, wins, losses, draws, winRate, avgAcc, gradeTotals };
  }, [games]);

  // Run Berserk WASM Benchmark
  const runBenchmark = async () => {
    setBenchRunning(true);
    // Standard KiwiPete benchmark position
    const fen = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";
    const start = performance.now();
    try {
      const res = await engine.search(fen, 1500, 1);
      const ms = Math.max(1, Math.round(performance.now() - start));
      const nodesNum = parseInt(res.nodes.replace(/,/g, ""), 10) || 50000;
      const nps = Math.round((nodesNum / ms) * 1000);

      setBenchResult({
        nodes: res.nodes || `${nodesNum}`,
        nps,
        depth: res.depth,
        ms,
        bestmove: res.bestmove,
      });
    } catch {
      // ignore
    } finally {
      setBenchRunning(false);
    }
  };

  const handleClear = () => {
    if (confirm("Reset match history?")) {
      clearGames();
      setGames([]);
    }
  };

  const gradeList: Grade[] = ["Brilliant", "Great", "Best", "Book", "Excellent", "Good", "Inaccuracy", "Mistake", "Blunder"];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Engine & Match Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Berserk engine performance benchmarks and your lifetime match history against Berserk.
          </p>
        </div>
        <Link to="/play" className="btn btn-primary text-xs flex items-center gap-1.5">
          <Swords className="w-3.5 h-3.5" /> Play Berserk
        </Link>
      </div>

      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Record vs Berserk */}
        <div className="panel p-5">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-3">
            <span className="font-semibold flex items-center gap-1.5 text-foreground">
              <Trophy className="w-4 h-4 text-accent" /> Match Record
            </span>
            <span>{stats.total} games</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono">{stats.winRate}%</span>
            <span className="text-xs text-muted-foreground">score</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">{stats.wins} W</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold">{stats.draws} D</span>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold">{stats.losses} L</span>
          </div>
        </div>

        {/* Accuracy */}
        <div className="panel p-5">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-3">
            <span className="font-semibold flex items-center gap-1.5 text-foreground">
              <Award className="w-4 h-4 text-accent" /> Average Accuracy
            </span>
            <span>Reviewed moves</span>
          </div>
          <div className="text-3xl font-bold font-mono">
            {stats.avgAcc !== null ? `${stats.avgAcc}%` : "—"}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {stats.avgAcc !== null ? "Calculated across all saved matches." : "Complete games to see your accuracy rating."}
          </p>
        </div>

        {/* Engine Spec */}
        <div className="panel p-5">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-3">
            <span className="font-semibold flex items-center gap-1.5 text-foreground">
              <Cpu className="w-4 h-4 text-accent" /> Berserk Profile
            </span>
            <span className="badge badge-accent">NNUE</span>
          </div>
          <div className="text-3xl font-bold font-mono text-accent">~3500+</div>
          <p className="mt-3 text-xs text-muted-foreground">
            Author: <span className="text-foreground font-medium">Jay Honnold</span> • Top TCEC & CCRL Contender
          </p>
        </div>
      </div>

      {/* WASM Performance Benchmark */}
      <div className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="w-4 h-4 text-accent" /> In-Browser Berserk WASM Benchmark
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tests Berserk WebAssembly search throughput directly inside your browser on complex tactical positions.
            </p>
          </div>
          <button
            onClick={runBenchmark}
            disabled={benchRunning}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            <Zap className={`w-3.5 h-3.5 ${benchRunning ? "animate-spin" : ""}`} />
            {benchRunning ? "Benchmarking..." : "Run Benchmark"}
          </button>
        </div>

        {benchResult ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-background/50 rounded-lg p-4 border border-border/50">
            <div>
              <div className="text-[11px] text-muted-foreground">Speed (NPS)</div>
              <div className="text-xl font-bold font-mono text-accent">{benchResult.nps.toLocaleString()} NPS</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Nodes Visited</div>
              <div className="text-xl font-bold font-mono">{benchResult.nodes}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Search Depth</div>
              <div className="text-xl font-bold font-mono">Depth {benchResult.depth}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Best Move Found</div>
              <div className="text-xl font-bold font-mono text-primary">{benchResult.bestmove}</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-muted-foreground bg-background/30 rounded border border-dashed border-border/60">
            Click "Run Benchmark" to test your system's WebAssembly speed with Berserk.
          </div>
        )}
      </div>

      {/* Tactical Move Distribution */}
      <div className="panel p-6">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-accent" /> Tactical Quality Breakdown
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
          {gradeList.map((grade) => {
            const count = stats.gradeTotals[grade] || 0;
            return (
              <div key={grade} className="bg-background/50 rounded p-2 text-center border border-border/40 flex flex-col items-center">
                <GradeIcon grade={grade} size={22} />
                <span className="text-[11px] font-semibold mt-1">{grade}</span>
                <span className="text-xs font-mono text-muted-foreground mt-0.5">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Match History Table */}
      {games.length > 0 && (
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Saved Games Against Berserk</h2>
            <button onClick={handleClear} className="text-xs text-destructive hover:underline flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Clear History
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {games.map((g) => (
              <div key={g.id} className="flex justify-between items-center text-xs p-2.5 rounded bg-background/40 border border-border/30">
                <div>
                  <span className="font-semibold">{g.humanSide === "w" ? "White" : "Black"}</span> vs Berserk ({g.elo} Elo)
                  <div className="text-[10px] text-muted-foreground">{new Date(g.date).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  {g.accuracy !== null && <span className="font-mono text-muted-foreground">{Math.round(g.accuracy)}% acc</span>}
                  <span className="font-mono font-bold">{g.result}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
