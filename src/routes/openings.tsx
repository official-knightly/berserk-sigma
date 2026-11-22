import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Chess } from "chess.js";
import { ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Board } from "@/components/chess/Board";
import { OPENING_REPERTOIRE } from "@/lib/openings";

export const Route = createFileRoute("/openings")({
  head: () => ({
    meta: [
      { title: "Opening Trainer — Berserk Sigma" },
      { name: "description", content: "Practice recalling standard chess opening moves and variations." },
    ],
  }),
  component: OpeningTrainerPage,
});

const START_FEN = new Chess().fen();

function buildPosition(moves: string[], ply: number) {
  const game = new Chess();
  const played: string[] = [];
  for (let i = 0; i < Math.min(ply, moves.length); i++) {
    const move = game.move(moves[i]);
    if (!move) break;
    played.push(move.san);
  }
  return { fen: game.fen(), played };
}

function OpeningTrainerPage() {
  const [selectedEco, setSelectedEco] = useState(OPENING_REPERTOIRE[0]?.eco || "C20");
  const [ply, setPly] = useState(0);
  const [feedback, setFeedback] = useState("Play the next move from the selected opening line.");
  const [completed, setCompleted] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  const opening = OPENING_REPERTOIRE.find((item) => item.eco === selectedEco) || OPENING_REPERTOIRE[0];
  const position = useMemo(() => buildPosition(opening.moves, ply), [opening, ply]);
  const expected = useMemo(() => {
    const game = new Chess(position.fen);
    const san = opening.moves[ply];
    if (!san) return null;
    try {
      const move = game.moves({ verbose: true }).find((item) => item.san === san);
      return move ? { from: move.from, to: move.to, promotion: move.promotion, san: move.san } : null;
    } catch { return null; }
  }, [position.fen, opening, ply]);
  const finished = ply >= opening.moves.length;

  function chooseOpening(eco: string) {
    setSelectedEco(eco);
    setPly(0);
    setFeedback("Play the first move of the opening.");
  }

  function attemptMove(move: { from: string; to: string; promotion?: string }) {
    if (finished || !expected) return false;
    if (move.from !== expected.from || move.to !== expected.to || (move.promotion || "") !== (expected.promotion || "")) {
      setMistakes((value) => value + 1);
      setFeedback("Not the repertoire move. Try to recall the move you selected.");
      return false;
    }
    const next = ply + 1;
    setPly(next);
    if (next >= opening.moves.length) {
      setCompleted((value) => value + 1);
      setFeedback("Opening line completed. Great recall.");
    } else {
      setFeedback(`Correct — ${expected.san}. Continue with the next move.`);
    }
    return true;
  }

  function restart() {
    setPly(0);
    setFeedback("Line restarted. Play the first move.");
  }

  function reveal() {
    if (!expected) return;
    setFeedback(`Next move: ${expected.san}`);
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5 pb-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-primary">TRAINING MODULE</p><h1 className="text-2xl font-extrabold sm:text-3xl">Opening trainer</h1></div></div>
        <div className="flex gap-2"><span className="rounded-lg border border-border bg-card px-3 py-2 text-xs">Completed <strong className="ml-1 font-mono text-primary">{completed}</strong></span><span className="rounded-lg border border-border bg-card px-3 py-2 text-xs">Mistakes <strong className="ml-1 font-mono">{mistakes}</strong></span></div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="panel min-w-0 p-3 sm:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">{opening.eco} · OPENING LINE</p><h2 className="mt-1 text-lg font-bold">{opening.name}</h2></div><span className="rounded-lg bg-background px-3 py-2 font-mono text-xs">{Math.min(ply, opening.moves.length)} / {opening.moves.length} plies</span></div>
          <div className="mx-auto w-full max-w-[560px]"><Board fen={position.fen} orientation="white" movable="both" onMove={attemptMove} /></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => { setPly((value) => Math.max(0, value - 1)); setFeedback("Step back and recall the move again."); }} disabled={ply === 0} className="btn btn-secondary btn-sm"><ChevronLeft className="h-4 w-4" /> Back</button>
            <div className="flex gap-2"><button type="button" onClick={reveal} disabled={finished} className="btn btn-secondary btn-sm">Show move</button><button type="button" onClick={restart} className="btn btn-primary btn-sm"><RotateCcw className="h-4 w-4" /> Restart line</button></div>
            <button type="button" onClick={() => { if (!finished) setPly((value) => Math.min(opening.moves.length, value + 1)); }} disabled={finished} className="btn btn-secondary btn-sm">Skip <ChevronRight className="h-4 w-4" /></button>
          </div>
          <p className="mt-4 rounded-lg border border-border bg-background p-3 text-sm leading-6">{feedback}</p>
        </section>

        <aside className="space-y-3">
          <section className="panel p-4">
            <h2 className="text-sm font-bold">Opening repertoire</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a line, then play the next move from memory. The trainer validates every move using chess.js.</p>
            <label className="mt-4 block text-[10px] font-semibold text-muted-foreground">SELECT AN OPENING</label>
            <select value={selectedEco} onChange={(event) => chooseOpening(event.target.value)} className="field mt-1">
              {OPENING_REPERTOIRE.map((item, index) => <option key={item.eco + ":" + item.name + ":" + index} value={item.eco}>{item.eco} · {item.name}</option>)}
            </select>
            <div className="mt-4 flex flex-wrap gap-1.5">{opening.moves.slice(0, ply).map((move, index) => <span key={index} className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] text-muted-foreground">{index + 1}. {move}</span>)}</div>
            {finished && <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm font-semibold text-primary"><Check className="h-4 w-4" /> Line completed</div>}
          </section>
          <section className="panel p-4">
            <h2 className="text-sm font-bold">How practice works</h2>
            <ol className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              <li>1. Choose an opening from the catalogue.</li>
              <li>2. Recreate the moves on the board in order.</li>
              <li>3. Use Show move only when you are stuck.</li>
              <li>4. Restart the line to repeat it from memory.</li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
