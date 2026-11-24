import { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Board } from "@/components/chess/Board";
import { MoveList, EvalBar, GradeIcon } from "@/components/chess/parts";
import { parseGame, useGameReview, summarize } from "@/lib/use-analysis";
import { takePendingPgn, takePendingChessProfile } from "@/lib/store";
import { identifyOpening } from "@/lib/openings";
import { CHESSIGMA_ATTRIBUTION, submitChessigmaGame } from "@/lib/chessigma-api";
import {
  fetchLichessGames,
  fetchChessComGames,
  parsePgnGame,
  ImportedGame,
} from "@/lib/game-import";
import {
  Download,
  Loader2,
  Upload,
  Trophy,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Game Review — Chess Topper" },
      { name: "description", content: "Review every move with Stockfish 19 in Chess Topper." },
      { property: "og:title", content: "Game Review — Chess Topper" },
      { property: "og:description", content: "Review every move with Stockfish 19 Lite in Chess Topper." },
    ],
  }),
  component: GameReviewPage,
});

type SourceTab = "lichess" | "chesscom" | "worldchess" | "pgn";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function GameReviewPage() {
  const [source, setSource] = useState<SourceTab>("lichess");
  const [activeTab, setActiveTab] = useState<"report" | "analysis" | "insights">("analysis");
  const [username, setUsername] = useState("");
  const [rawPgn, setRawPgn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<ImportedGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<ImportedGame | null>(null);
  const [chessigmaBusy, setChessigmaBusy] = useState(false);
  const [chessigmaError, setChessigmaError] = useState<string | null>(null);
  const [chessigmaUrl, setChessigmaUrl] = useState<string | null>(null);

  const [moves, setMoves] = useState<{ san: string; uci: string; fenAfter: string }[]>([]);
  const [startFen, setStartFen] = useState(START_FEN);
  const [currentPly, setCurrentPly] = useState(0);

  const sans = useMemo(() => moves.map((m) => m.san), [moves]);
  const { reviews, running, progress, error: analysisError } = useGameReview(sans, startFen, "stockfish");
  const summary = useMemo(() => summarize(reviews), [reviews]);
  const opening = useMemo(() => identifyOpening(sans), [sans]);

  const handleFetch = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const fetched = source === "lichess"
        ? await fetchLichessGames(username)
        : source === "chesscom"
          ? await fetchChessComGames(username)
          : [];
      setGames(fetched);
      if (fetched[0]) loadGame(fetched[0]);
      else setError(`No public games with PGN were found for "${username}".`);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch games");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPgn = () => {
    if (!rawPgn.trim()) return;
    try {
      const g = parsePgnGame(rawPgn);
      loadGame(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid PGN text. Paste a complete PGN game.");
    }
  };

  const loadGame = useCallback((game: ImportedGame) => {
    setError(null);
    try {
      if (!game.pgn?.trim()) throw new Error("This game does not include PGN moves. Try downloading the PGN from the chess site.");
      const parsed = parseGame(game.pgn);
      if (!parsed.moves.length) throw new Error("No chess moves were found in this PGN. Paste a complete game PGN.");
      const items = parsed.moves.map((m) => ({
        san: m.san,
        uci: `${m.from}${m.to}${m.promotion || ""}`,
        fenAfter: m.after,
      }));
      setSelectedGame(game);
      setChessigmaUrl(null);
      setChessigmaError(null);
      setStartFen(parsed.startFen);
      setMoves(items);
      setCurrentPly(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse this game's moves.");
    }
  }, []);

  // Restore a PGN sent from the Live page when opening Game Review.
  useEffect(() => {
    const pendingPgn = takePendingPgn();
    if (!pendingPgn) return;
    setSource("pgn");
    loadGame(parsePgnGame(pendingPgn));
  }, [loadGame]);

  // A saved chess profile can open its recent games directly from Settings.
  useEffect(() => {
    const profile = takePendingChessProfile();
    if (!profile) return;
    let active = true;
    setSource(profile.provider);
    setUsername(profile.username);
    setLoading(true);
    setError(null);
    const fetchGames = profile.provider === "lichess" ? fetchLichessGames : fetchChessComGames;
    fetchGames(profile.username)
      .then((fetched) => {
        if (!active) return;
        setGames(fetched);
        if (fetched[0]) loadGame(fetched[0]);
        else setError(`No public games with PGN were found for "${profile.username}".`);
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load this chess profile."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadGame]);

  const handleShareToChessigma = async () => {
    if (!selectedGame?.pgn?.trim() || chessigmaBusy) return;
    setChessigmaBusy(true);
    setChessigmaError(null);
    setChessigmaUrl(null);
    try {
      const submitted = await submitChessigmaGame(selectedGame.pgn);
      setChessigmaUrl(submitted.url);
    } catch (err) {
      setChessigmaError(err instanceof Error ? err.message : "Could not create a Chessigma analysis link.");
    } finally {
      setChessigmaBusy(false);
    }
  };

  const currentFen = useMemo(() => {
    if (currentPly === 0 || moves.length === 0) return startFen;
    return moves[currentPly - 1]?.fenAfter || startFen;
  }, [moves, currentPly, startFen]);

  const activeReview = currentPly > 0 ? reviews[currentPly - 1] : undefined;
  const currentEval = activeReview?.afterWhite ?? 0;

  const lastMoveSquares = useMemo(() => {
    if (currentPly === 0 || moves.length === 0) return null;
    const item = moves[currentPly - 1];
    return item ? { from: item.uci.slice(0, 2), to: item.uci.slice(2, 4) } : null;
  }, [moves, currentPly]);

  const bestMoveArrow = useMemo(() => {
    if (!activeReview?.bestUci) return [];
    return [{
      from: activeReview.bestUci.slice(0, 2),
      to: activeReview.bestUci.slice(2, 4),
      tone: "best" as const,
    }];
  }, [activeReview]);

  const whiteName = selectedGame?.white?.name || "White";
  const blackName = selectedGame?.black?.name || "Black";
  const reviewCount = reviews.filter(Boolean).length;
  const whiteGrades = summary.w.counts;
  const blackGrades = summary.b.counts;
  const gradeOrder = ["Brilliant", "Great", "Best", "Excellent", "Good", "Inaccuracy", "Mistake", "Blunder", "Book"] as const;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 pb-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-primary">CHESS TOPPER · GAME REVIEW</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Review your game</h1>
          <p className="mt-1 text-xs text-muted-foreground">Stockfish checks every position locally. Select any move to replay it.</p>
        </div>
        <button type="button" onClick={() => { setSource("pgn"); setRawPgn(""); }} className="btn btn-secondary">
          <Upload className="h-4 w-4" /> Import another game
        </button>
      </header>

      <details className="panel">
        <summary className="panel-head cursor-pointer list-none">
          <div><h2>Load a game</h2><p className="mt-1 text-[11px] normal-case tracking-normal text-muted-foreground">Lichess · Chess.com · World Chess PGN · any PGN</p></div>
          <span className="text-xs text-primary">Open import</span>
        </summary>
        <div className="space-y-3 p-4">
          <div className="tabs">
            {(["lichess", "chesscom", "worldchess", "pgn"] as SourceTab[]).map((tab) => (
              <button key={tab} type="button" data-on={source === tab} onClick={() => { setSource(tab); setError(null); }}>
                {tab === "chesscom" ? "Chess.com" : tab === "worldchess" ? "World Chess PGN" : tab === "pgn" ? "Other PGN" : "Lichess"}
              </button>
            ))}
          </div>
          {source === "lichess" || source === "chesscom" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="text" placeholder={`${source === "lichess" ? "Lichess" : "Chess.com"} username`} value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handleFetch()} className="field min-w-0 flex-1" />
              <button type="button" onClick={() => void handleFetch()} disabled={loading || !username.trim()} className="btn btn-primary">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Fetch recent games
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea placeholder="Paste a complete PGN here. Export the game from World Chess, then paste it below." value={rawPgn} onChange={(e) => setRawPgn(e.target.value)} rows={5} className="field w-full font-mono text-xs" />
              <button type="button" onClick={handleLoadPgn} disabled={!rawPgn.trim()} className="btn btn-primary">Load PGN</button>
            </div>
          )}
          {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
          {games.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{games.map((g) => (
            <button key={g.id} type="button" onClick={() => loadGame(g)} className={`rounded-lg border p-3 text-left text-xs transition ${selectedGame?.id === g.id ? "border-primary bg-primary/10" : "border-border bg-surface hover:bg-accent"}`}>
              <span className="font-semibold">{g.white.name}</span> <span className="text-muted-foreground">vs</span> <span className="font-semibold">{g.black.name}</span>
              <span className="mt-1 block text-muted-foreground">{g.date} · {g.timeControl} · {g.result}</span>
            </button>
          ))}</div>}
        </div>
      </details>

      {moves.length === 0 ? (
        <div className="panel flex min-h-[360px] flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="text-4xl">♟</div>
          <h2 className="text-xl font-bold">Your review board is ready</h2>
          <p className="max-w-md text-sm text-muted-foreground">Import a game from Lichess or Chess.com, or paste a PGN exported from World Chess or another chess site.</p>
          <button type="button" onClick={() => { setSource("pgn"); document.querySelector("details")?.setAttribute("open", ""); }} className="btn btn-primary">Load a PGN</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="panel p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">White accuracy</p><p className="mt-1 font-mono text-xl font-extrabold">{summary.w.acc === null ? "—" : `${Math.round(summary.w.acc)}%`}</p></div>
            <div className="panel p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Black accuracy</p><p className="mt-1 font-mono text-xl font-extrabold">{summary.b.acc === null ? "—" : `${Math.round(summary.b.acc)}%`}</p></div>
            <div className="panel p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Analysis</p><p className="mt-1 font-mono text-xl font-extrabold">{reviewCount}/{moves.length}</p><p className="text-[10px] text-muted-foreground">{running ? `${Math.round(progress * 100)}% running` : analysisError ? "Needs attention" : reviewCount === moves.length ? "Complete" : "Preparing"}</p></div>
          </div>

          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border p-3 sm:p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{whiteName} <span className="font-normal text-muted-foreground">vs</span> {blackName}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{opening?.name || "Game review"} · {moves.length} plies · Stockfish 19</p>
              </div>
              <span className={`status-pill shrink-0 ${analysisError ? "status-error" : running ? "status-busy" : "status-ready"}`}><span className="status-dot" />{analysisError ? "Engine error" : running ? "Analysing" : "Stockfish ready"}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 border-b border-border bg-surface p-1">
              {(["report", "analysis", "insights"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)} data-on={activeTab === tab} className="rounded-md px-2 py-2.5 text-xs font-bold capitalize text-muted-foreground transition data-[on=true]:bg-primary data-[on=true]:text-primary-foreground">{tab === "report" ? "📊 Report" : tab === "analysis" ? "▦ Analysis" : "💡 Insights"}</button>
              ))}
            </div>

            {activeTab === "analysis" && (
              <div className="space-y-3 p-3 sm:p-4">
                {analysisError && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive" role="alert">Stockfish could not analyse this game: {analysisError}</div>}
                <div className="mx-auto flex w-full max-w-[760px] items-stretch gap-2">
                  <EvalBar cpWhite={currentEval} />
                  <div className="min-w-0 flex-1"><Board fen={currentFen} orientation="white" lastMove={lastMoveSquares} arrows={bestMoveArrow} /></div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">Move {currentPly} of {moves.length}</span>
                  <div className="flex gap-1.5">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentPly(0)} disabled={currentPly === 0}>|‹</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentPly((p) => Math.max(0, p - 1))} disabled={currentPly === 0}>‹</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentPly((p) => Math.min(moves.length, p + 1))} disabled={currentPly >= moves.length}>›</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentPly(moves.length)} disabled={currentPly >= moves.length}>›|</button>
                  </div>
                </div>
                <div className="flex gap-1.5 overflow-x-auto rounded-lg border border-border bg-background p-2">
                  <button type="button" onClick={() => setCurrentPly(0)} className={`shrink-0 rounded-md px-2 py-2 font-mono text-xs ${currentPly === 0 ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Start</button>
                  {moves.map((move, index) => (
                    <button key={`${index}-${move.uci}`} type="button" onClick={() => setCurrentPly(index + 1)} className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-2 font-mono text-xs ${currentPly === index + 1 ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                      {index % 2 === 0 && <span className="text-[10px] opacity-60">{Math.floor(index / 2) + 1}.</span>}
                      {move.san}
                      {reviews[index] && <GradeIcon grade={reviews[index]!.grade} size={14} />}
                    </button>
                  ))}
                </div>
                {activeReview ? (
                  <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <GradeIcon grade={activeReview.grade} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{activeReview.san} · {activeReview.grade}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{activeReview.bestSan ? `Stockfish preferred ${activeReview.bestSan}. ` : ""}{Math.round(activeReview.loss)} centipawn loss · {activeReview.accuracy}% move accuracy</p>
                      </div>
                      <span className="font-mono text-sm font-bold">{activeReview.afterWhite > 0 ? "+" : ""}{(activeReview.afterWhite / 100).toFixed(2)}</span>
                    </div>
                  </div>
                ) : <p className="rounded-lg bg-surface p-3 text-xs text-muted-foreground">{running ? `Stockfish is analysing this move · ${Math.round(progress * 100)}% complete` : "Select a move to see its engine evaluation and classification."}</p>}
                {running && <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
              </div>
            )}

            {activeTab === "report" && (
              <div className="space-y-4 p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-3">
                  {([{ label: whiteName, side: summary.w, grades: whiteGrades }, { label: blackName, side: summary.b, grades: blackGrades }]).map((player) => (
                    <div key={player.label} className="rounded-xl border border-border bg-surface p-3">
                      <p className="truncate text-xs font-bold">{player.label}</p>
                      <p className="mt-2 font-mono text-3xl font-extrabold">{player.side.acc === null ? "—" : `${Math.round(player.side.acc)}%`}</p>
                      <p className="text-[10px] text-muted-foreground">Accuracy · {player.side.list.length} analysed moves</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">Avg. centipawn loss: {player.side.acpl === null ? "—" : Math.round(player.side.acpl)}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border p-3">
                  <h3 className="text-sm font-bold">Move classifications</h3>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                    {gradeOrder.map((grade) => {
                      const count = (whiteGrades[grade] || 0) + (blackGrades[grade] || 0);
                      return <div key={grade} className="flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">{grade}</span><span className="font-mono font-bold">{count}</span></div>;
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setActiveTab("analysis")} className="btn btn-primary">Review moves <span aria-hidden="true">→</span></button>
                  <button type="button" onClick={() => void handleShareToChessigma()} disabled={!selectedGame?.pgn || chessigmaBusy} className="btn btn-secondary">{chessigmaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />} Share to Chessigma</button>
                </div>
                {chessigmaError && <p className="text-xs text-destructive" role="alert">{chessigmaError}</p>}
                {chessigmaUrl && <a href={chessigmaUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary underline">Open Chessigma analysis</a>}
                <p className="text-[10px] text-muted-foreground">Chessigma API attribution: <a href={CHESSIGMA_ATTRIBUTION.developersUrl} target="_blank" rel="noopener noreferrer" className="underline">{CHESSIGMA_ATTRIBUTION.name}</a>. Its API stores PGN and returns a browser-analysis link; Stockfish analysis in this app is performed locally.</p>
              </div>
            )}

            {activeTab === "insights" && (
              <div className="space-y-3 p-3 sm:p-4">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="text-sm font-bold">Where the game changed</h3>
                  {reviews.filter(Boolean).length ? (
                    <div className="mt-3 space-y-2">
                      {reviews.filter((r): r is NonNullable<typeof r> => !!r).filter((r) => ["Blunder", "Mistake", "Inaccuracy", "Brilliant"].includes(r.grade)).slice(0, 8).map((r) => (
                        <button key={r.ply} type="button" onClick={() => { setCurrentPly(r.ply); setActiveTab("analysis"); }} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted">
                          <GradeIcon grade={r.grade} size={24} />
                          <span className="min-w-0 flex-1 text-xs"><b>{r.san}</b> · {r.grade}<span className="block text-muted-foreground">Move {Math.ceil(r.ply / 2)} · {Math.round(r.loss)} cp lost</span></span>
                          <span className="text-xs text-primary">Review →</span>
                        </button>
                      ))}
                    </div>
                  ) : <p className="mt-2 text-xs text-muted-foreground">Critical moments will appear here after Stockfish finishes analysing the game.</p>}
                </div>
                <div className="rounded-xl border border-border p-4">
                  <h3 className="text-sm font-bold">Opening</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{opening?.name || "Opening not identified"}</p>
                  <p className="mt-3 text-xs text-muted-foreground">Analysis progress: {reviewCount} of {moves.length} moves classified by Stockfish.</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
