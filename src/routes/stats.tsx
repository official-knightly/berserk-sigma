import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { engine } from "@/lib/engine";
import { stockfishEngine } from "@/lib/stockfish";
import { loadGames, clearGames, saveGame, SavedGame } from "@/lib/store";
import { fetchLichessGames, fetchChessComGames } from "@/lib/game-import";
import { GradeIcon, Panel } from "@/components/chess/parts";
import { Grade } from "@/lib/chess-logic";
import { deleteCloudGames, syncCloudGames } from "@/lib/supabase";
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
  Download,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Coach — Berserk Sigma" },
      { name: "description", content: "Your saved games, move-quality report, training activity and engine performance." },
      { property: "og:title", content: "Statistics & Benchmarks — Berserk Web" },
      { property: "og:description", content: "Berserk engine benchmarks, match history, accuracy statistics and performance analytics." },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const [games, setGames] = useState<SavedGame[]>(() => loadGames());
  const [activeTab, setActiveTab] = useState<"overview" | "blunders" | "tactics">("overview");
  const [importSource, setImportSource] = useState<"lichess" | "chesscom">("lichess");
  const [importUsername, setImportUsername] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const refreshCloudHistory = async () => {
      try {
        const merged = await syncCloudGames(loadGames());
        if (!active) return;
        setGames(merged);
      } catch (error) {
        console.warn("Berserk cloud history sync failed:", error);
      }
    };
    void refreshCloudHistory();
    const onGamesUpdated = () => { void refreshCloudHistory(); };
    const onAuthChanged = () => { void refreshCloudHistory(); };
    window.addEventListener("berserk-games-updated", onGamesUpdated);
    window.addEventListener("berserk-auth-change", onAuthChanged);
    return () => {
      active = false;
      window.removeEventListener("berserk-games-updated", onGamesUpdated);
      window.removeEventListener("berserk-auth-change", onAuthChanged);
    };
  }, []);

  const handleImportGames = async () => {
    const username = importUsername.trim();
    if (!username || importBusy) return;
    setImportBusy(true);
    setImportMessage(null);
    try {
      const imported = importSource === "lichess"
        ? await fetchLichessGames(username)
        : await fetchChessComGames(username);
      if (!imported.length) {
        setImportMessage(`No public games found for ${username}.`);
        return;
      }
      const existing = new Set(loadGames().map((game) => game.id));
      let added = 0;
      for (const game of imported) {
        const whiteMatch = game.white.name.toLowerCase() === username.toLowerCase();
        const blackMatch = game.black.name.toLowerCase() === username.toLowerCase();
        const humanSide = whiteMatch ? "w" : blackMatch ? "b" : "w";
        const id = `${importSource}:${game.id}`;
        if (existing.has(id) || !game.pgn) continue;
        saveGame({
          id, date: Date.now(), pgn: game.pgn, result: game.result,
          humanSide, elo: (humanSide === "w" ? game.white.rating : game.black.rating) || 0,
          accuracy: null, grades: {},
        });
        existing.add(id);
        added++;
      }
      setGames(loadGames());
      setImportMessage(added ? `Imported ${added} new games from ${importSource === "lichess" ? "Lichess" : "Chess.com"}.` : "Those games are already imported, or no PGNs were available.");
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Could not import games. Try again.");
    } finally {
      setImportBusy(false);
    }
  };

  // Benchmark state
  const [benchRunning, setBenchRunning] = useState(false);
  const [benchResult, setBenchResult] = useState<{
    nodes: string;
    nps: number;
    depth: number;
    ms: number;
    bestmove: string;
  } | null>(null);
  const [stockfishBenchRunning, setStockfishBenchRunning] = useState(false);
  const [stockfishBenchResult, setStockfishBenchResult] = useState<{
    depth: number;
    samples: number;
    firstEvalAverage: number;
    fixedDepthAverage: number;
    fastest: number;
    slowest: number;
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

  const runStockfishBenchmark = async () => {
    setStockfishBenchRunning(true);
    try {
      const result = await stockfishEngine.benchmark();
      const average = (samples: number[]) => samples.reduce((sum, value) => sum + value, 0) / samples.length;
      setStockfishBenchResult({
        depth: result.depth,
        samples: result.sampleCount,
        firstEvalAverage: average(result.firstEvalMs),
        fixedDepthAverage: average(result.fixedDepthMs),
        fastest: Math.min(...result.fixedDepthMs),
        slowest: Math.max(...result.fixedDepthMs),
      });
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Stockfish benchmark failed.");
    } finally {
      setStockfishBenchRunning(false);
    }
  };

  const handleClear = async () => {
    if (confirm("Delete your saved match history from this device and your Berserk account?")) {
      clearGames();
      setGames([]);
      try { await deleteCloudGames(); }
      catch (error) { setImportMessage(error instanceof Error ? error.message : "Could not delete cloud history."); }
    }
  };

  const gradeList: Grade[] = ["Brilliant", "Great", "Best", "Book", "Excellent", "Good", "Inaccuracy", "Mistake", "Blunder"];
  const blunderCount = (stats.gradeTotals.Blunder || 0) + (stats.gradeTotals.Mistake || 0) + (stats.gradeTotals.Inaccuracy || 0);
  const tacticalCount = (stats.gradeTotals.Brilliant || 0) + (stats.gradeTotals.Great || 0) + (stats.gradeTotals.Best || 0);
  const activityDays = Array.from({ length: 84 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (83 - index));
    const count = games.filter((game) => new Date(game.date).toDateString() === date.toDateString()).length;
    return { date, count };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Coach</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your saved games, move-quality report, training activity and engine performance.
          </p>
        </div>
        <Link to="/play" className="btn btn-primary text-xs flex items-center gap-1.5">
          <Swords className="w-3.5 h-3.5" /> Play Berserk
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {([{ id: "overview", label: "Overview" }, { id: "blunders", label: "Blunders" }, { id: "tactics", label: "Tactics" }] as const).map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-pressed={activeTab === tab.id} className={"rounded-xl border px-3 py-3 text-xs font-bold transition " + (activeTab === tab.id ? "border-primary bg-[#171717] text-foreground shadow-[0_3px_0_#956300]" : "border-border bg-card text-muted-foreground")}>{tab.label}</button>)}
      </div>
      {activeTab === "blunders" && <section className="panel p-5"><h2 className="text-sm font-bold">Your blunders</h2><p className="mt-1 text-xs text-muted-foreground">Calculated from saved move grades only.</p><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-lg bg-background p-3"><p className="text-[10px] text-muted-foreground">Blunders</p><p className="mt-1 font-mono text-2xl">{stats.gradeTotals.Blunder || 0}</p></div><div className="rounded-lg bg-background p-3"><p className="text-[10px] text-muted-foreground">Mistakes</p><p className="mt-1 font-mono text-2xl">{stats.gradeTotals.Mistake || 0}</p></div><div className="rounded-lg bg-background p-3"><p className="text-[10px] text-muted-foreground">Inaccuracies</p><p className="mt-1 font-mono text-2xl">{stats.gradeTotals.Inaccuracy || 0}</p></div></div><p className="mt-3 text-xs text-muted-foreground">{blunderCount ? blunderCount + " reviewed errors in saved games." : "No analyzed mistakes are saved yet. Run Game Review to populate this report."}</p></section>}
      {activeTab === "tactics" && <section className="panel p-5"><h2 className="text-sm font-bold">Tactics collection</h2><p className="mt-1 text-xs text-muted-foreground">Tactical move grades found in your analyzed games.</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{(["Brilliant", "Great", "Best", "Excellent", "Good", "Book"] as Grade[]).map((grade) => <div key={grade} className="rounded-xl border border-border bg-background p-4"><GradeIcon grade={grade} size={22} /><p className="mt-2 text-xs font-bold">{grade}</p><p className="font-mono text-2xl font-extrabold">{stats.gradeTotals[grade] || 0}</p></div>)}</div><p className="mt-3 text-xs text-muted-foreground">{tacticalCount ? tacticalCount + " strong / theory moves counted." : "Analyze games to start collecting tactical classifications."}</p></section>}
      <div hidden={activeTab !== "overview"}>
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

      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-bold">Activity</h2><p className="mt-1 text-xs text-muted-foreground">Your last 12 weeks · {games.length} saved games</p></div>
          <span className="text-[10px] text-muted-foreground">More filled squares mean more games</span>
        </div>
        <div className="mt-4 grid grid-cols-12 gap-1.5">
          {activityDays.map((day) => <span key={day.date.toISOString()} title={day.date.toLocaleDateString() + ": " + day.count + " games"} className={"aspect-square rounded-[4px] border border-border/40 " + (day.count === 0 ? "bg-background" : day.count === 1 ? "bg-primary/35" : day.count <= 3 ? "bg-primary/65" : "bg-primary")} />)}
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground"><span>{activityDays[0]?.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><span>{activityDays[83]?.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
      </section>

      {/* Import games for profile statistics */}
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold">Import Your Games</h2>
            <p className="text-xs text-muted-foreground mt-1">Import recent public games to add them to your Berserk statistics.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setImportSource("lichess")} className={`btn text-xs ${importSource === "lichess" ? "btn-primary" : "btn-secondary"}`}>Lichess</button>
            <button onClick={() => setImportSource("chesscom")} className={`btn text-xs ${importSource === "chesscom" ? "btn-primary" : "btn-secondary"}`}>Chess.com</button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input className="input text-sm flex-1 min-w-0" value={importUsername} onChange={(event) => setImportUsername(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleImportGames()} placeholder={`${importSource === "lichess" ? "Lichess" : "Chess.com"} username`} />
          <button onClick={handleImportGames} disabled={importBusy || !importUsername.trim()} className="btn btn-primary text-xs">
            {importBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {importBusy ? "Importing..." : "Import Games"}
          </button>
        </div>
        {importMessage && <p className="mt-2 text-xs text-muted-foreground" role="status">{importMessage}</p>}
        <p className="mt-2 text-[11px] text-muted-foreground">Imported games add to your match record and move totals. Accuracy and move grades appear only after a game has been analyzed.</p>
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

      <div className="panel p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="flex items-center gap-2 text-sm font-semibold"><Gauge className="h-4 w-4 text-accent" /> Stockfish 19 Lite benchmark</h2><p className="mt-0.5 text-xs text-muted-foreground">Measures the local single-threaded Stockfish WebAssembly build in your browser.</p></div>
          <button type="button" onClick={runStockfishBenchmark} disabled={stockfishBenchRunning} className="btn btn-primary flex items-center gap-1.5 text-xs"><Zap className={"h-3.5 w-3.5 " + (stockfishBenchRunning ? "animate-spin" : "")} />{stockfishBenchRunning ? "Benchmarking…" : "Run Stockfish benchmark"}</button>
        </div>
        {stockfishBenchResult ? <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/50 bg-background/50 p-4 sm:grid-cols-4">
          <div><div className="text-[11px] text-muted-foreground">First evaluation · depth 5</div><div className="font-mono text-xl font-bold text-accent">{Math.round(stockfishBenchResult.firstEvalAverage).toLocaleString()} ms</div></div>
          <div><div className="text-[11px] text-muted-foreground">Full search · depth {stockfishBenchResult.depth}</div><div className="font-mono text-xl font-bold">{Math.round(stockfishBenchResult.fixedDepthAverage).toLocaleString()} ms</div></div>
          <div><div className="text-[11px] text-muted-foreground">Fastest sample</div><div className="font-mono text-xl font-bold">{Math.round(stockfishBenchResult.fastest).toLocaleString()} ms</div></div>
          <div><div className="text-[11px] text-muted-foreground">Slowest sample</div><div className="font-mono text-xl font-bold">{Math.round(stockfishBenchResult.slowest).toLocaleString()} ms</div></div>
        </div> : <div className="rounded border border-dashed border-border/60 bg-background/30 py-6 text-center text-xs text-muted-foreground">Run nine depth-13 searches across three positions, after one warm-up, to measure Stockfish performance on this device.</div>}
        <p className="mt-2 text-[10px] text-muted-foreground">Average of {stockfishBenchResult?.samples ?? 9} measured samples; first evaluation is recorded when depth 5 appears, and total time when depth {stockfishBenchResult?.depth ?? 13} appears.</p>
        <p className="mt-3 text-[10px] leading-5 text-muted-foreground">This is a local-device measurement, not an Elo rating. Results vary with browser, CPU, temperature and other running applications.</p>
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
    </div>
  );
}
