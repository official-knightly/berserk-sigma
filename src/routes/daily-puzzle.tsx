import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { ArrowLeft, CheckCircle2, Eye, Lightbulb, Loader2, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { Board, type Arrow } from "@/components/chess/Board";
import { getChessigmaDailyPuzzle, type ChessigmaDailyPuzzle } from "@/lib/chessigma-api";

type UciMove = { from: string; to: string; promotion?: string; uci: string };
type PuzzleResult = { date: string; puzzleId: string; correct: boolean; attempts: number; hints: number; timeSeconds: number };
const HISTORY_KEY = "berserk.daily-puzzle.history";

function parseSolution(fen: string, raw: string[]): UciMove[] {
  const game = new Chess(fen);
  return raw.map((uci) => {
    if (!/^[a-h][1-8][a-h][1-8][qrbnQRBN]?$/.test(uci)) throw new Error("The puzzle response contains an invalid move.");
    const move = game.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci[4]?.toLowerCase() as PieceSymbol | undefined });
    if (!move) throw new Error("The puzzle line could not be validated on the chessboard.");
    return { from: move.from, to: move.to, promotion: move.promotion, uci: `${move.from}${move.to}${move.promotion || ""}` };
  });
}

export const Route = createFileRoute("/daily-puzzle")({
  head: () => ({
    meta: [
      { title: "Daily Puzzle — Berserk Sigma" },
      { name: "description", content: "Solve the daily chess puzzle powered by the Chessigma public API." },
    ],
  }),
  component: DailyPuzzlePage,
});

function DailyPuzzlePage() {
  const [puzzle, setPuzzle] = useState<ChessigmaDailyPuzzle | null>(null);
  const [solution, setSolution] = useState<UciMove[]>([]);
  const [fen, setFen] = useState("");
  const [startingFen, setStartingFen] = useState("");
  const [nextMove, setNextMove] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [hints, setHints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("Find the best continuation.");
  const [showHint, setShowHint] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const historyRef = useRef<PuzzleResult[]>([]);

  const arrows: Arrow[] = useMemo(() => {
    if (!showHint || !solution[nextMove] || finished) return [];
    return [{ from: solution[nextMove].from, to: solution[nextMove].to, tone: "best" }];
  }, [showHint, solution, nextMove, finished]);

  const loadPuzzle = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPuzzle(null);
    setSolution([]);
    setFinished(false);
    setAttempts(0);
    setHints(0);
    setNextMove(0);
    setElapsed(0);
    startedAt.current = null;
    try {
      const data = await getChessigmaDailyPuzzle();
      const validated = parseSolution(data.fen, data.solution);
      if (!validated.length) throw new Error("Today's puzzle has no playable solution.");
      setPuzzle(data);
      setSolution(validated);
      setFen(data.fen);
      setStartingFen(data.fen);
      setFeedback("Find the best continuation.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the daily puzzle.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPuzzle(); }, [loadPuzzle]);

  useEffect(() => {
    if (!puzzle || finished || !startedAt.current) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current!) / 1000));
    }, 500);
    return () => window.clearInterval(timer);
  }, [puzzle, finished, nextMove]);

  const complete = useCallback((correct: boolean, additionalAttempts = 0) => {
    if (!puzzle) return;
    setFinished(true);
    const timeSeconds = startedAt.current ? Math.floor((Date.now() - startedAt.current) / 1000) : elapsed;
    setElapsed(timeSeconds);
    const result: PuzzleResult = {
      date: puzzle.date, puzzleId: puzzle.puzzleId, correct, attempts: attempts + additionalAttempts, hints, timeSeconds,
    };
    try {
      const old = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as PuzzleResult[];
      historyRef.current = [result, ...old.filter((item) => item.puzzleId !== result.puzzleId)].slice(0, 365);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(historyRef.current));
    } catch { /* Local storage may be disabled. */ }
    setFeedback(correct
      ? hints ? "Puzzle solved. Review the line once more to reinforce the pattern." : "Excellent — puzzle solved."
      : "Solution revealed. Replay the position and try the line again.");
  }, [puzzle, attempts, hints, elapsed]);

  const applyUci = (game: Chess, move: UciMove) => {
    return game.move({ from: move.from as Square, to: move.to as Square, promotion: move.promotion as PieceSymbol | undefined });
  };

  const handleMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
    if (!puzzle || finished) return false;
    if (!startedAt.current) startedAt.current = Date.now();
    setAttempts((count) => count + 1);
    setShowHint(false);
    const uci = `${move.from}${move.to}${move.promotion || ""}`;
    const expected = solution[nextMove];
    if (!expected || uci !== expected.uci) {
      setFeedback("Not the solution. Look for checks, captures and forcing moves.");
      return false;
    }

    const game = new Chess(fen);
    const played = applyUci(game, expected);
    if (!played) {
      setError("The move could not be applied. Reload the puzzle.");
      return false;
    }
    let index = nextMove + 1;

    // Apply the puzzle's forced opponent reply, if the line includes one.
    if (index < solution.length) {
      const reply = solution[index];
      const forced = applyUci(game, reply);
      if (!forced) {
        setError("The opponent reply could not be applied. Reload the puzzle.");
        return false;
      }
      index += 1;
    }

    setFen(game.fen());
    setNextMove(index);
    if (index >= solution.length) {
      window.setTimeout(() => complete(true, 1), 0);
    } else {
      setFeedback("Correct. Keep calculating the next move.");
    }
    return true;
  }, [puzzle, finished, solution, nextMove, fen, complete]);

  function resetPosition() {
    if (!startingFen) return;
    setFen(startingFen);
    setNextMove(0);
    setAttempts(0);
    setHints(0);
    setShowHint(false);
    setFinished(false);
    setElapsed(0);
    startedAt.current = null;
    setFeedback("Find the best continuation.");
  }

  function useHint() {
    if (!solution[nextMove] || finished) return;
    setHints((value) => value + 1);
    setShowHint(true);
    setFeedback("Follow the yellow arrow. Try to understand why the move works.");
  }

  function revealSolution() {
    if (!solution.length || finished) return;
    const game = new Chess(fen);
    for (let i = nextMove; i < solution.length; i++) {
      if (!applyUci(game, solution[i])) break;
    }
    setFen(game.fen());
    setNextMove(solution.length);
    complete(false);
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-5 pb-5">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-primary">DAILY TRAINING</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Daily puzzle</h1>
        </div>
        <button type="button" onClick={() => void loadPuzzle()} disabled={loading} className="btn btn-secondary btn-sm"><RotateCcw className="h-4 w-4" /> Refresh</button>
      </header>

      {loading && <div className="panel flex min-h-64 items-center justify-center gap-3 p-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading today's Chessigma puzzle…</div>}
      {error && !loading && (
        <div className="panel space-y-3 p-5">
          <p className="text-sm font-semibold">Puzzle unavailable</p>
          <p className="text-xs leading-5 text-muted-foreground">{error}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadPuzzle()} className="btn btn-primary btn-sm">Retry</button>
            <a href="https://www.chessigma.com/" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Open Chessigma</a>
          </div>
          <p className="text-[10px] text-muted-foreground">Puzzle source: Chessigma Public API · Daily puzzle endpoint.</p>
        </div>
      )}

      {puzzle && !loading && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="panel min-w-0 p-3 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-xs font-semibold">{new Date(puzzle.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p><p className="mt-1 text-[10px] text-muted-foreground">Chessigma puzzle · {puzzle.puzzleId}</p></div>
              <div className="rounded-lg border border-border bg-background px-3 py-2 text-right"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Puzzle rating</p><p className="font-mono text-xl font-extrabold text-primary">{puzzle.rating}</p></div>
            </div>
            <div className="mx-auto w-full max-w-[580px]">
              <Board fen={fen} orientation={puzzle.sideToMove === "white" ? "white" : "black"} movable="both" arrows={arrows} onMove={handleMove} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={useHint} disabled={finished || !solution.length} className="btn btn-secondary flex-1"><Lightbulb className="h-4 w-4 text-primary" /> Hint</button>
              <button type="button" onClick={revealSolution} disabled={finished || !solution.length} className="btn btn-secondary flex-1"><Eye className="h-4 w-4" /> Reveal</button>
              <button type="button" onClick={resetPosition} disabled={!finished && attempts === 0} className="btn btn-secondary flex-1"><RotateCcw className="h-4 w-4" /> Retry</button>
            </div>
          </section>

          <aside className="space-y-3">
            <section className="panel p-4">
              <div className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-primary" /> Puzzle coach</div>
              <p className="mt-3 rounded-lg border border-border bg-background p-3 text-sm leading-6">{feedback}</p>
              {finished && <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm font-semibold text-primary"><CheckCircle2 className="h-4 w-4" /> {nextMove >= solution.length && attempts ? "Completed" : "Solution shown"}</div>}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-background p-3"><p className="text-[10px] text-muted-foreground">Attempts</p><p className="mt-1 font-mono text-xl font-bold">{attempts}</p></div>
                <div className="rounded-lg bg-background p-3"><p className="text-[10px] text-muted-foreground">Time</p><p className="mt-1 font-mono text-xl font-bold">{elapsed}s</p></div>
              </div>
              <div className="mt-2 rounded-lg bg-background p-3"><p className="text-[10px] text-muted-foreground">Hints used</p><p className="mt-1 font-mono text-xl font-bold">{hints}</p></div>
              {finished && <button type="button" onClick={() => void loadPuzzle()} className="btn btn-primary mt-3 w-full"><Trophy className="h-4 w-4" /> Load latest daily puzzle</button>}
            </section>
            <section className="panel p-4">
              <h2 className="text-xs font-bold uppercase tracking-[.15em] text-muted-foreground">Tactical themes</h2>
              <div className="mt-3 flex flex-wrap gap-2">{puzzle.themes.map((theme) => <span key={theme} className="rounded-md border border-border bg-background px-2 py-1 text-[10px] capitalize text-muted-foreground">{theme.replace(/-/g, " ")}</span>)}</div>
              <div className="mt-3 border-t border-border pt-3 text-[10px] leading-5 text-muted-foreground">Side to move: <strong className="capitalize text-foreground">{puzzle.sideToMove}</strong><br />Puzzle provided by Chessigma's public daily puzzle API.</div>
              {puzzle.gameUrl && <a href={puzzle.gameUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">Open source game</a>}
              <a href="https://www.chessigma.com/developers" target="_blank" rel="noreferrer" className="mt-2 block text-[10px] text-muted-foreground hover:text-primary">Chessigma API attribution and documentation</a>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
