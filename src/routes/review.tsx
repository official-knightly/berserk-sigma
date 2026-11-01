import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Chess } from "chess.js";
import { Board } from "@/components/chess/Board";
import { MoveList, MoveHistoryItem, EvalBar } from "@/components/chess/parts";
import { BerserkEngine } from "@/lib/engine";
import { classifyMove, Classification } from "@/lib/chess-logic";
import {
  fetchLichessGames,
  fetchChessComGames,
  parsePgnGame,
  ImportedGame,
} from "@/lib/game-import";
import {
  Download,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Upload,
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

function GameReviewPage() {
  const [source, setSource] = useState<SourceTab>("lichess");
  const [username, setUsername] = useState("");
  const [rawPgn, setRawPgn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<ImportedGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<ImportedGame | null>(null);

  // Review & Engine state
  const [moves, setMoves] = useState<MoveHistoryItem[]>([]);
  const [currentPly, setCurrentPly] = useState(0);
  const [evalScore, setEvalScore] = useState(0.2);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(0);

  // Fetch games by username
  const handleFetch = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (source === "lichess") {
        const fetched = await fetchLichessGames(username);
        setGames(fetched);
        if (fetched[0]) loadGame(fetched[0]);
      } else if (source === "chesscom") {
        const fetched = await fetchChessComGames(username);
        setGames(fetched);
        if (fetched[0]) loadGame(fetched[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to fetch games");
    } finally {
      setLoading(false);
    }
  };

  // Load custom PGN from text or Worldchess export
  const handleLoadPgn = () => {
    if (!rawPgn.trim()) return;
    try {
      const g = parsePgnGame(rawPgn);
      loadGame(g);
    } catch (e: any) {
      setError("Invalid PGN text");
    }
  };

  // Load selected game into the board
  const loadGame = (game: ImportedGame) => {
    setSelectedGame(game);
    setError(null);
    const chess = new Chess();
    try {
      chess.loadPgn(game.pgn);
      const history = chess.history({ verbose: true });
      const items: MoveHistoryItem[] = history.map((m) => ({
        san: m.san,
        fenAfter: m.after,
      }));
      setMoves(items);
      setCurrentPly(0);
      setReviewProgress(0);
    } catch (e) {
      setError("Could not parse this game's moves.");
    }
  };

  // Active board state at current ply
  const currentFen = useMemo(() => {
    if (currentPly === 0 || moves.length === 0) return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    return moves[currentPly - 1]?.fenAfter || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  }, [moves, currentPly]);

  const lastMoveSquares = useMemo(() => {
    if (currentPly === 0 || moves.length === 0) return undefined;
    const item = moves[currentPly - 1];
    if (!item?.uci) return undefined;
    return {
      from: item.uci.slice(0, 2),
      to: item.uci.slice(2, 4),
    };
  }, [moves, currentPly]);

  // Run full game analysis with Berserk engine
  const startFullReview = async () => {
    if (moves.length === 0 || isReviewing) return;
    setIsReviewing(true);
    setReviewProgress(0);

    const engine = new BerserkEngine();
    await engine.init();

    const updated = [...moves];
    let prevEval = 20; // centipawns

    for (let i = 0; i < updated.length; i++) {
      const fen = updated[i].fenAfter;
      const res = await engine.analyze(fen, 10);
      const curEval = res.scoreCp ?? (res.scoreMate ? res.scoreMate * 1000 : 0);

      // Classify the move against evaluation change
      const isWhite = i % 2 === 0;
      const evalDelta = isWhite ? curEval - prevEval : prevEval - curEval;
      const cls = classifyMove(evalDelta, false);

      updated[i] = {
        ...updated[i],
        evalCp: curEval,
        classification: cls,
      };

      prevEval = curEval;
      setReviewProgress(Math.round(((i + 1) / updated.length) * 100));
      setMoves([...updated]);
    }

    engine.terminate();
    setIsReviewing(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      {/* Left: Chessboard & Controls */}
      <div className="flex flex-col items-center">
        <div className="w-full max-w-[560px] flex items-stretch gap-3">
          <EvalBar evalScore={evalScore} />
          <div className="flex-1">
            <Board
              fen={currentFen}
              orientation="white"
              lastMove={lastMoveSquares}
            />
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPly(0)}
            disabled={currentPly === 0}
            className="btn btn-secondary text-xs"
          >
            |&lt;
          </button>
          <button
            onClick={() => setCurrentPly((p) => Math.max(0, p - 1))}
            disabled={currentPly === 0}
            className="btn btn-secondary text-xs"
          >
            &lt; Prev
          </button>
          <span className="text-sm font-mono px-3">
            {currentPly} / {moves.length}
          </span>
          <button
            onClick={() => setCurrentPly((p) => Math.min(moves.length, p + 1))}
            disabled={currentPly >= moves.length}
            className="btn btn-secondary text-xs"
          >
            Next &gt;
          </button>
          <button
            onClick={() => setCurrentPly(moves.length)}
            disabled={currentPly >= moves.length}
            className="btn btn-secondary text-xs"
          >
            &gt;|
          </button>

          <button
            onClick={startFullReview}
            disabled={isReviewing || moves.length === 0}
            className="btn btn-primary ml-4 text-xs flex items-center gap-1.5"
          >
            {isReviewing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Reviewing ({reviewProgress}%)
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Analyze with Berserk
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right: Import tabs & Game details */}
      <div className="flex flex-col gap-4">
        {/* Source Selector Tabs */}
        <div className="panel p-4">
          <div className="flex border-b border-border/50 pb-3 gap-2">
            {(["lichess", "chesscom", "worldchess", "pgn"] as SourceTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setSource(tab);
                  setError(null);
                }}
                className={`px-3 py-1.5 text-xs rounded-md font-medium capitalize transition ${
                  source === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab === "chesscom" ? "Chess.com" : tab}
              </button>
            ))}
          </div>

          {/* Tab Inputs */}
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
              <button
                onClick={handleFetch}
                disabled={loading || !username.trim()}
                className="btn btn-primary text-xs"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                placeholder="Paste Worldchess or standard PGN here..."
                value={rawPgn}
                onChange={(e) => setRawPgn(e.target.value)}
                rows={4}
                className="input font-mono text-xs w-full"
              />
              <button
                onClick={handleLoadPgn}
                disabled={!rawPgn.trim()}
                className="btn btn-primary text-xs self-end flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Load PGN
              </button>
            </div>
          )}

          {error && <div className="mt-2 text-xs text-destructive">{error}</div>}

          {/* Recent Games List */}
          {games.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Recent Games:</p>
              {games.map((g) => (
                <button
                  key={g.id}
                  onClick={() => loadGame(g)}
                  className={`w-full text-left p-2 rounded text-xs flex items-center justify-between transition ${
                    selectedGame?.id === g.id
                      ? "bg-accent/20 border border-accent/40"
                      : "bg-background/40 hover:bg-muted"
                  }`}
                >
                  <div>
                    <span className="font-semibold">{g.white.name}</span> ({g.white.rating || "?"}) vs{" "}
                    <span className="font-semibold">{g.black.name}</span> ({g.black.rating || "?"})
                    <div className="text-[10px] text-muted-foreground">{g.date} • {g.timeControl}</div>
                  </div>
                  <span className="font-mono font-bold text-xs">{g.result}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Move History Panel */}
        <div className="panel p-4 flex-1 flex flex-col min-h-[300px]">
          <h2 className="text-sm font-semibold mb-2">Move List</h2>
          <div className="flex-1 overflow-y-auto">
            <MoveList
              moves={moves}
              currentPly={currentPly}
              onSelectPly={(ply) => setCurrentPly(ply)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
