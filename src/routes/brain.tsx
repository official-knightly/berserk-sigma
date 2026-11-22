import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Brain,
  Check,
  Clock3,
  Gamepad2,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import { pieceImageSource, useBoardAppearance } from "@/lib/board-appearance";

export const Route = createFileRoute("/brain")({
  head: () => ({
    meta: [
      { title: "Brain Games — Berserk Sigma" },
      { name: "description", content: "Play free chess memory, square recognition, knight movement and reaction games." },
    ],
  }),
  component: BrainGamesPage,
});

type Mode = "square" | "knight" | "memory" | "reaction";
const FILES = "abcdefgh";
const PIECE_TYPES = ["k", "q", "r", "b", "n", "p"];

function randomSquare(except?: string) {
  const all = Array.from({ length: 64 }, (_, i) => FILES[i % 8] + (8 - Math.floor(i / 8)));
  const choices = except ? all.filter((square) => square !== except) : all;
  return choices[Math.floor(Math.random() * choices.length)];
}

function squareIndex(square: string) {
  return (8 - Number(square[1])) * 8 + FILES.indexOf(square[0]);
}

function squareName(index: number) {
  return FILES[index % 8] + (8 - Math.floor(index / 8));
}

function knightTargets(index: number) {
  const row = Math.floor(index / 8), col = index % 8;
  return [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
    .map(([dr, dc]) => [(row + dr), (col + dc)])
    .filter(([r, c]) => r >= 0 && r < 8 && c >= 0 && c < 8)
    .map(([r, c]) => r * 8 + c);
}

function knightDistance(start: number, target: number) {
  const queue: Array<[number, number]> = [[start, 0]];
  const seen = new Set([start]);
  while (queue.length) {
    const [square, distance] = queue.shift()!;
    if (square === target) return distance;
    for (const next of knightTargets(square)) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push([next, distance + 1]);
    }
  }
  return Infinity;
}

function makeDeck() {
  const values = [...PIECE_TYPES, ...PIECE_TYPES].sort(() => Math.random() - 0.5);
  return values.map((value, id) => ({ id, value }));
}

function GameCard({ title, description, icon: Icon, active, onClick }: {
  title: string; description: string; icon: typeof Brain; active: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`group flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition sm:p-4 ${active ? "border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(255,184,0,.18)]" : "border-border bg-card hover:border-primary/45 hover:bg-surface"}`}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-surface text-primary"}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{title}</span><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{description}</span></span>
      {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

function BrainGamesPage() {
  const [mode, setMode] = useState<Mode>("square");
  const [appearance] = useBoardAppearance();

  const [squareTarget, setSquareTarget] = useState(() => randomSquare());
  const [squareScore, setSquareScore] = useState(0);
  const [squareSeconds, setSquareSeconds] = useState(30);
  const [squareRunning, setSquareRunning] = useState(false);
  const [squareBest, setSquareBest] = useState(0);

  const knightStart = squareIndex("a1");
  const knightEnd = squareIndex("h8");
  const [knightCurrent, setKnightCurrent] = useState(knightStart);
  const [knightSteps, setKnightSteps] = useState(0);
  const [knightWon, setKnightWon] = useState(false);
  const [knightMessage, setKnightMessage] = useState("Reach h8 using the fewest possible knight moves.");
  const knightBest = knightDistance(knightStart, knightEnd);
  const knightLegal = useMemo(() => knightTargets(knightCurrent), [knightCurrent]);

  const [deck, setDeck] = useState(makeDeck);
  const [opened, setOpened] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const mismatchTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const [reactionPhase, setReactionPhase] = useState<"idle" | "waiting" | "go" | "result" | "early">("idle");
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const reactionTimer = useRef<number | null>(null);
  const reactionStart = useRef(0);

  useEffect(() => {
    if (!squareRunning) return;
    const timer = window.setInterval(() => setSquareSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [squareRunning]);

  useEffect(() => {
    if (squareRunning && squareSeconds === 0) {
      setSquareRunning(false);
      setSquareBest((best) => Math.max(best, squareScore));
    }
  }, [squareRunning, squareSeconds, squareScore]);

  useEffect(() => () => {
    if (mismatchTimer.current) window.clearTimeout(mismatchTimer.current);
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
  }, []);

  function startSquareRush() {
    setSquareScore(0);
    setSquareSeconds(30);
    setSquareTarget(randomSquare());
    setSquareRunning(true);
  }

  function tapSquare(square: string) {
    if (!squareRunning || square !== squareTarget) return;
    setSquareScore((score) => score + 1);
    setSquareTarget(randomSquare(square));
  }

  function resetKnight() {
    setKnightCurrent(knightStart);
    setKnightSteps(0);
    setKnightWon(false);
    setKnightMessage("Reach h8 using the fewest possible knight moves.");
  }

  function moveKnight(target: number) {
    if (knightWon || !knightLegal.includes(target)) return;
    const remaining = knightDistance(target, knightEnd);
    const currentRemaining = knightDistance(knightCurrent, knightEnd);
    if (remaining >= currentRemaining) {
      setKnightMessage("That is a legal move, but it does not follow a shortest route. Try another square.");
      return;
    }
    setKnightCurrent(target);
    setKnightSteps((steps) => steps + 1);
    if (target === knightEnd) {
      setKnightWon(true);
      setKnightMessage("Route complete. You found a shortest knight path!");
    } else {
      setKnightMessage(`${remaining} shortest move${remaining === 1 ? "" : "s"} to go.`);
    }
  }

  function resetMemory() {
    if (mismatchTimer.current) window.clearTimeout(mismatchTimer.current);
    setDeck(makeDeck());
    setOpened([]);
    setMatched([]);
    setMemoryMoves(0);
  }

  function flipCard(index: number) {
    if (opened.length === 2 || opened.includes(index) || matched.includes(index)) return;
    if (opened.length === 0) {
      setOpened([index]);
      return;
    }
    const first = opened[0];
    setOpened([first, index]);
    setMemoryMoves((moves) => moves + 1);
    if (deck[first].value === deck[index].value) {
      setMatched((current) => [...current, first, index]);
      setOpened([]);
    } else {
      mismatchTimer.current = window.setTimeout(() => setOpened([]), 700);
    }
  }

  function startReaction() {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    setReactionMs(null);
    setReactionPhase("waiting");
    reactionTimer.current = window.setTimeout(() => {
      reactionStart.current = performance.now();
      setReactionPhase("go");
    }, 1100 + Math.random() * 2400);
  }

  function tapReaction() {
    if (reactionPhase === "waiting") {
      if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
      setReactionPhase("early");
    } else if (reactionPhase === "go") {
      setReactionMs(Math.round(performance.now() - reactionStart.current));
      setReactionPhase("result");
    }
  }

  const modes = [
    { id: "square" as const, title: "Square Rush", description: "Find named squares quickly.", icon: Target },
    { id: "knight" as const, title: "Knight Trail", description: "Find the shortest knight route.", icon: Sparkles },
    { id: "memory" as const, title: "Memory Match", description: "Match pairs of chess pieces.", icon: Brain },
    { id: "reaction" as const, title: "Reaction Time", description: "Test how fast you react.", icon: Timer },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-primary"><Gamepad2 className="h-3.5 w-3.5" /> Train your chess brain</div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Brain games</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Short chess-inspired challenges for board vision, memory, calculation and reaction speed.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground"><Zap className="h-4 w-4 text-primary" /> Free to play</div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(260px,.72fr)_minmax(0,1.4fr)]">
        <section className="space-y-2">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Choose a challenge</h2>
          {modes.map((item) => <GameCard key={item.id} title={item.title} description={item.description} icon={item.icon} active={mode === item.id} onClick={() => setMode(item.id)} />)}
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-bold"><Trophy className="h-4 w-4 text-primary" /> Personal bests</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><p className="text-[10px] text-muted-foreground">Square Rush</p><p className="mt-1 font-mono text-xl font-bold">{squareBest}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Knight Trail optimum</p><p className="mt-1 font-mono text-xl font-bold">{knightBest} moves</p></div>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-muted-foreground">Square Rush best is kept for this session. Knight Trail shows the shortest possible route, not a rating.</p>
          </div>
        </section>

        <section className="panel min-w-0 p-4 sm:p-6">
          {mode === "square" && (
            <div className="mx-auto max-w-[620px] space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">SQUARE RECOGNITION</p><h2 className="mt-1 text-2xl font-extrabold">Square Rush</h2><p className="mt-1 text-xs text-muted-foreground">Tap the square called out below before the timer runs out.</p></div>
                <div className="flex gap-2"><div className="rounded-lg bg-background px-3 py-2 text-center"><p className="text-[9px] text-muted-foreground">SCORE</p><p className="font-mono text-xl font-bold">{squareScore}</p></div><div className="rounded-lg bg-background px-3 py-2 text-center"><p className="text-[9px] text-muted-foreground">TIME</p><p className="font-mono text-xl font-bold">{squareSeconds}s</p></div></div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 text-center"><p className="text-xs text-muted-foreground">{squareRunning ? "Find this square" : squareSeconds === 0 ? "Time is up" : "Ready?"}</p><p className="mt-1 font-mono text-4xl font-black tracking-wider text-primary">{squareTarget}</p></div>
              <div className="mx-auto grid aspect-square w-full max-w-[480px] grid-cols-8 overflow-hidden rounded-lg border border-border">
                {Array.from({ length: 64 }, (_, index) => <button key={index} type="button" disabled={!squareRunning} onClick={() => tapSquare(squareName(index))} aria-label={squareName(index)} className={`relative aspect-square min-w-0 text-[9px] font-semibold transition sm:text-xs ${(Math.floor(index / 8) + index % 8) % 2 ? "bg-[#b58863] text-[#f5e6d3]" : "bg-[#f0d9b5] text-[#76543a]"} ${squareRunning ? "hover:brightness-110 active:brightness-90" : "opacity-85"}`}>{index % 8 === 0 && <span className="absolute left-1 top-0.5 opacity-70">{8 - Math.floor(index / 8)}</span>}{Math.floor(index / 8) === 7 && <span className="absolute bottom-0.5 right-1 opacity-70">{FILES[index % 8]}</span>}</button>)}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{squareRunning ? "Keep going — every correct square adds a point." : "Start a 30-second round and beat your personal best."}</p><button type="button" onClick={startSquareRush} className="btn btn-primary"><Clock3 className="h-4 w-4" /> {squareRunning ? "Restart round" : "Start 30 sec"}</button></div>
            </div>
          )}

          {mode === "knight" && (
            <div className="mx-auto max-w-[620px] space-y-5">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">BOARD VISION</p><h2 className="mt-1 text-2xl font-extrabold">Knight Trail</h2><p className="mt-1 text-xs text-muted-foreground">Move the knight from a1 to h8 using only legal knight moves. Find a shortest path.</p></div>
              <div className="flex flex-wrap gap-2"><span className="rounded-lg bg-background px-3 py-2 text-xs">Moves: <strong className="font-mono">{knightSteps}</strong></span><span className="rounded-lg bg-background px-3 py-2 text-xs">Shortest route: <strong className="font-mono">{knightBest}</strong></span></div>
              <div className="mx-auto grid aspect-square w-full max-w-[480px] grid-cols-8 overflow-hidden rounded-lg border border-border">
                {Array.from({ length: 64 }, (_, index) => {
                  const isKnight = index === knightCurrent;
                  const isTarget = index === knightEnd;
                  const isLegal = knightLegal.includes(index);
                  const isVisited = index === knightStart;
                  return <button key={index} type="button" onClick={() => moveKnight(index)} aria-label={squareName(index)} className={`relative grid aspect-square min-w-0 place-items-center text-xl sm:text-3xl ${(Math.floor(index / 8) + index % 8) % 2 ? "bg-[#b58863]" : "bg-[#f0d9b5]"} ${isLegal ? "ring-4 ring-inset ring-[#ffb800]" : ""} ${isTarget ? "bg-[#d4a62a]" : ""}`}>
                    {isKnight && <img src={pieceImageSource("w", "n", appearance.pieces)} alt="Knight" className="h-[82%] w-[82%] object-contain drop-shadow-md" />}
                    {!isKnight && isTarget && <span className="text-sm font-black text-[#33240c] sm:text-lg">GO</span>}
                    {!isKnight && !isTarget && isVisited && <span className="h-2 w-2 rounded-full bg-[#ffb800]" />}
                    {index % 8 === 0 && <span className="absolute left-1 top-0.5 text-[8px] font-bold text-black/60">{8 - Math.floor(index / 8)}</span>}
                    {Math.floor(index / 8) === 7 && <span className="absolute bottom-0.5 right-1 text-[8px] font-bold text-black/60">{FILES[index % 8]}</span>}
                  </button>;
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-muted-foreground">{knightMessage}</p><button type="button" onClick={resetKnight} className="btn btn-secondary"><RotateCcw className="h-4 w-4" /> Restart</button></div>
            </div>
          )}

          {mode === "memory" && (
            <div className="mx-auto max-w-[620px] space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">VISUAL MEMORY</p><h2 className="mt-1 text-2xl font-extrabold">Memory Match</h2><p className="mt-1 text-xs text-muted-foreground">Flip two cards at a time and match all six chess-piece pairs.</p></div><div className="rounded-lg bg-background px-3 py-2 text-center"><p className="text-[9px] text-muted-foreground">MOVES</p><p className="font-mono text-xl font-bold">{memoryMoves}</p></div></div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
                {deck.map((card, index) => {
                  const visible = opened.includes(index) || matched.includes(index);
                  return <button key={card.id} type="button" onClick={() => flipCard(index)} disabled={visible || opened.length === 2} aria-label={visible ? `Card ${card.value.toUpperCase()}` : "Hidden card"} className={`grid aspect-square place-items-center rounded-xl border text-3xl transition sm:text-4xl ${visible ? "border-primary/60 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"}`}>{visible ? <img src={pieceImageSource("w", card.value, appearance.pieces)} alt={`${card.value.toUpperCase()} chess piece`} className="h-[78%] w-[78%] object-contain" /> : <span className="text-3xl font-black text-primary">?</span>}</button>;
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{matched.length === deck.length ? `Completed in ${memoryMoves} moves. Nice memory!` : `${matched.length / 2} of 6 pairs found.`}</p><button type="button" onClick={resetMemory} className="btn btn-secondary"><RotateCcw className="h-4 w-4" /> New board</button></div>
            </div>
          )}

          {mode === "reaction" && (
            <div className="mx-auto flex min-h-[440px] max-w-[620px] flex-col">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">REFLEX TEST</p><h2 className="mt-1 text-2xl font-extrabold">Reaction Time</h2><p className="mt-1 text-xs text-muted-foreground">Wait until the panel turns green, then tap as quickly as you can.</p></div>
              <button type="button" onClick={reactionPhase === "idle" || reactionPhase === "result" || reactionPhase === "early" ? startReaction : tapReaction} className={`my-6 flex min-h-[270px] flex-1 flex-col items-center justify-center rounded-2xl border text-center transition active:scale-[.99] ${reactionPhase === "go" ? "border-emerald-400 bg-emerald-500 text-[#06271f]" : reactionPhase === "waiting" ? "border-red-400/40 bg-red-500/15 text-foreground" : "border-border bg-background text-foreground"}`}>
                {reactionPhase === "idle" && <><Timer className="mb-4 h-10 w-10 text-primary" /><span className="text-xl font-extrabold">Tap to start</span><span className="mt-2 text-xs opacity-75">The wait time is random.</span></>}
                {reactionPhase === "waiting" && <><span className="text-2xl font-black">Wait for green…</span><span className="mt-2 text-xs opacity-75">Don’t tap yet.</span></>}
                {reactionPhase === "go" && <><Zap className="mb-3 h-10 w-10" /><span className="text-3xl font-black">TAP NOW!</span></>}
                {reactionPhase === "early" && <><span className="text-2xl font-black">Too early!</span><span className="mt-2 text-xs opacity-75">Wait until the panel turns green.</span></>}
                {reactionPhase === "result" && <><span className="text-xs font-bold uppercase tracking-widest opacity-75">Your reaction</span><span className="mt-2 font-mono text-5xl font-black">{reactionMs} ms</span><span className="mt-2 text-xs opacity-75">Tap to try again.</span></>}
              </button>
              <p className="text-center text-xs text-muted-foreground">One result per round. Browser timing and device performance can affect the measurement.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
