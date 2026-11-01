import { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Board } from "@/components/chess/Board";
import { MoveList, EvalBar, GradeIcon } from "@/components/chess/parts";
import { parseGame, useGameReview, summarize } from "@/lib/use-analysis";
import { takePendingPgn, takePendingChessProfile } from "@/lib/store";
import { identifyOpening } from "@/lib/openings";
import {
  fetchLichessGames,
  fetchChessComGames,
  parsePgnGame,
  ImportedGame,
} from "@/lib/game-import";
import {
  Download,
  Loader2,
  Sparkles,
  Upload,
  Trophy,
} from "lucide-react";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Game Review — Berserk Web" },
      { name: "description", content: "Review and evaluate games with the Berserk chess engine." },
      { property: "og:title", content: "Game Review — Berserk Web" },
      { property: "og:description", content: "Review and evaluate games with the Berserk chess engine." },
    ],
  }),
  component: GameReviewPage,
});

type SourceTab = "lichess" | "chesscom" | "worldchess" | "pgn";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function GameReviewPage() {
  const [source, setSource] = useState<SourceTab>("lichess");
  const [username, setUsername] = useState("");
  const [rawPgn, setRawPgn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<ImportedGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<ImportedGame | null>(null);

  const [moves, setMoves] = useState<{ san: string; uci: string; fenAfter: string }[]>([]);
  const [startFen, setStartFen] = useState(START_FEN);
  const [currentPly, setCurrentPly] = useState(0);

  const sans = useMemo(() => moves.map((m) => m.san), [moves]);
  const { reviews, running, progress } = useGameReview(sans, startFen);
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Left: Board & Controls */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[560px] flex items-stretch gap-3">
            <EvalBar cpWhite={currentEval} />
            <div className="flex-1">
              <Board
                fen={currentFen}
                orientation="white"
                lastMove={lastMoveSquares}
                arrows={bestMoveArrow}
              />
            </div>
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center gap-2 mt-4">
            <button onClick={() => setCurrentPly(0)} disabled={currentPly === 0} className="btn btn-secondary text-xs">|&lt;</button>
            <button onClick={() => setCurrentPly((p) => Math.max(0, p - 1))} disabled={currentPly === 0} className="btn btn-secondary text-xs">&lt; Prev</button>
            <span className="text-sm font-mono px-3">{currentPly} / {moves.length}</span>
            <button onClick={() => setCurrentPly((p) => Math.min(moves.length, p + 1))} disabled={currentPly >= moves.length} className="btn btn-secondary text-xs">Next &gt;</button>
            <button onClick={() => setCurrentPly(moves.length)} disabled={currentPly >= moves.length} className="btn btn-secondary text-xs">&gt;|</button>

            {running && (
              <span className="text-xs text-muted-foreground ml-3 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Reviewing ({Math.round(progress * 100)}%)
              </span>
            )}
          </div>

          {/* Active Move Feedback */}
          {activeReview && (
            <div className="panel mt-4 p-3 w-full max-w-[560px] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <GradeIcon grade={activeReview.grade} size={20} />
                <div>
                  <span className="font-semibold text-foreground">{activeReview.grade} move</span>
                  {activeReview.bestSan && (
                    <span className="text-muted-foreground ml-2">
                      Berserk preferred <span className="font-mono text-foreground font-semibold">{activeReview.bestSan}</span>
                    </span>
                  )}
                </div>
              </div>
              <span className="font-mono text-muted-foreground">{activeReview.accuracy}% acc</span>
            </div>
          )}
        </div>

        {/* Right: Sources & Summary */}
        <div className="flex flex-col gap-4">
          <div className="panel p-4">
            <div className="flex border-b border-border/50 pb-3 gap-2">
              {(["lichess", "chesscom", "worldchess", "pgn"] as SourceTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setSource(tab); setError(null); }}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium capitalize transition whitespace-nowrap ${
                    source === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab === "chesscom" ? "Chess.com" : tab === "pgn" ? "PGN / Other" : tab === "worldchess" ? "World Chess" : "Lichess"}
                </button>
              ))}
            </div>

            {source === "lichess" || source === "chesscom" ? (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder={`${source === "lichess" ? "Lichess" : "Chess.com"} username`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                  className="input text-sm flex-1"
                />
                <button onClick={handleFetch} disabled={loading || !username.trim()} className="btn btn-primary text-xs">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <textarea
                  placeholder="Paste Worldchess or PGN here..."
                  value={rawPgn}
                  onChange={(e) => setRawPgn(e.target.value)}
                  rows={4}
                  className="input font-mono text-xs w-full"
                />
                <button onClick={handleLoadPgn} disabled={!rawPgn.trim()} className="btn btn-primary text-xs self-end flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Load PGN
                </button>
              </div>
            )}

            {error && <div className="mt-2 text-xs text-destructive">{error}</div>}

            {games.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Recent Games:</p>
                {games.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => loadGame(g)}
                    className={`w-full text-left p-2 rounded text-xs flex items-center justify-between transition ${
                      selectedGame?.id === g.id ? "bg-primary/10 border border-primary/30" : "bg-background/40 hover:bg-muted"
                    }`}
                  >
                    <div>
                      <span className="font-semibold">{g.white.name}</span> vs <span className="font-semibold">{g.black.name}</span>
                      <div className="text-[10px] text-muted-foreground">{g.date} • {g.timeControl}</div>
                    </div>
                    <span className="font-mono font-bold text-xs">{g.result}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Accuracy Summary */}
          {moves.length > 0 && (
            <div className="panel p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-accent" /> Accuracy
                </span>
                {opening && <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">{opening.name}</span>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-background/50 rounded p-2 border border-border/40">
                  <div className="text-[10px] text-muted-foreground">White</div>
                  <div className="text-lg font-bold font-mono">{summary.w.acc !== null ? `${Math.round(summary.w.acc)}%` : "—"}</div>
                </div>
                <div className="bg-background/50 rounded p-2 border border-border/40">
                  <div className="text-[10px] text-muted-foreground">Black</div>
                  <div className="text-lg font-bold font-mono">{summary.b.acc !== null ? `${Math.round(summary.b.acc)}%` : "—"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Move List */}
          <div className="panel p-4 flex-1 flex flex-col min-h-[260px]">
            <h2 className="text-xs font-semibold mb-2">Moves</h2>
            <div className="flex-1 overflow-y-auto max-h-[300px]">
              <MoveList
                moves={moves.map((m, idx) => ({ san: m.san, grade: reviews[idx]?.grade }))}
                ply={currentPly}
                onSelect={(ply) => setCurrentPly(ply)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
