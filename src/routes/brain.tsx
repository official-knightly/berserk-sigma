import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Chess, type Square, type PieceSymbol } from "chess.js";
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
  Eye,
  ShieldCheck,
  Crosshair,
  Flag,
  Grid3X3,
  Crown,
  MoveRight,
} from "lucide-react";
import { pieceImageSource, useBoardAppearance, BOARD_THEMES } from "@/lib/board-appearance";
import { Board } from "@/components/chess/Board";

export const Route = createFileRoute("/brain")({
  head: () => ({
    meta: [
      { title: "Brain Games — Chess Topper" },
      { name: "description", content: "Play twelve chess-inspired board vision, memory, tactics and reaction games." },
    ],
  }),
  component: BrainGamesPage,
});

type Mode = "board" | "knight" | "blind" | "square" | "check" | "mate" | "spot" | "legal" | "minefield" | "reaction" | "queens" | "memory";
type MiniPiece = { square: string; type: string; color: "w" | "b" };
const FILES = "abcdefgh";
const PIECE_TYPES = ["k", "q", "r", "b", "n", "p"];
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const CHECK_FEN = "4k3/8/8/8/8/2K5/8/3Q4 w - - 0 1";
const MATE_FEN = "7k/6pp/5K2/6Q1/8/8/8/8 w - - 0 1";
const SPOT_FEN_A = "4k2r/8/8/8/8/8/8/R3K3 w - - 0 1";
const SPOT_FEN_B = "4k2r/8/8/8/8/8/R7/4K3 w - - 0 1";

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

function parseFenPieces(fen: string): MiniPiece[] {
  const game = new Chess(fen);
  const pieces: MiniPiece[] = [];
  for (let r = 8; r >= 1; r--) {
    for (const file of FILES) {
      const square = `${file}${r}` as Square;
      const piece = game.get(square);
      if (piece) pieces.push({ square, type: piece.type, color: piece.color });
    }
  }
  return pieces;
}

function randomBoardMemoryPieces(): MiniPiece[] {
  const squares = new Set<string>();
  while (squares.size < 5) squares.add(randomSquare());
  return [...squares].map((square, index) => ({
    square,
    type: ["q", "r", "b", "n", "p"][index],
    color: index % 2 === 0 ? "w" : "b",
  }));
}

function makeDeck() {
  const values = [...PIECE_TYPES, ...PIECE_TYPES].sort(() => Math.random() - 0.5);
  return values.map((value, id) => ({ id, value }));
}

function isLegalUci(fen: string, uci: string) {
  try {
    const game = new Chess(fen);
    return game.moves({ verbose: true }).some((move) =>
      move.from === uci.slice(0, 2) &&
      move.to === uci.slice(2, 4) &&
      (move.promotion || "") === (uci[4]?.toLowerCase() || "")
    );
  } catch { return false; }
}

function MiniBoard({ pieces = [], onSquare, highlights = [], found = [], hidePieces = false, disabled = false, compact = false }: {
  pieces?: MiniPiece[];
  onSquare?: (square: string) => void;
  highlights?: string[];
  found?: string[];
  hidePieces?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [appearance] = useBoardAppearance();
  const theme = BOARD_THEMES.find((item) => item.id === appearance.board) || BOARD_THEMES[5];
  const pieceAt = new Map(pieces.map((piece) => [piece.square, piece]));
  return (
    <div className={`grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg border border-border ${compact ? "max-w-[240px]" : "max-w-[540px]"}`}>
      {Array.from({ length: 64 }, (_, index) => {
        const row = Math.floor(index / 8), col = index % 8;
        const square = squareName(index);
        const piece = pieceAt.get(square);
        const isFound = found.includes(square);
        const isHighlight = highlights.includes(square);
        return (
          <button key={square} type="button" disabled={disabled || !onSquare} onClick={() => onSquare?.(square)} aria-label={square}
            className={`relative grid aspect-square min-w-0 place-items-center p-0 ${(row + col) % 2 ? "" : ""} ${isHighlight ? "ring-2 ring-inset ring-[#ffb800]" : ""} ${isFound ? "bg-emerald-500/35" : ""}`}
            style={{ backgroundColor: isFound ? "rgba(0,189,145,.24)" : (row + col) % 2 ? theme.dark : theme.light }}>
            {!hidePieces && piece && <img src={pieceImageSource(piece.color, piece.type, appearance.pieces)} alt={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`} className="pointer-events-none h-[88%] w-[88%] object-contain drop-shadow-sm" />}
            {hidePieces && isFound && piece && <img src={pieceImageSource(piece.color, piece.type, appearance.pieces)} alt="Found piece" className="pointer-events-none h-[88%] w-[88%] object-contain" />}
            {col === 0 && <span className="pointer-events-none absolute left-0.5 top-0.5 text-[7px] font-bold" style={{ color: (row + col) % 2 ? theme.light : theme.dark }}>{8 - row}</span>}
            {row === 7 && <span className="pointer-events-none absolute bottom-0 right-0.5 text-[7px] font-bold" style={{ color: (row + col) % 2 ? theme.light : theme.dark }}>{FILES[col]}</span>}
          </button>
        );
      })}
    </div>
  );
}

const CARD_ART: Partial<Record<Mode, MiniPiece[]>> = {
  board: [{ square: "c6", type: "q", color: "w" }, { square: "e4", type: "n", color: "b" }, { square: "b2", type: "p", color: "w" }, { square: "f2", type: "p", color: "w" }],
  knight: [{ square: "a1", type: "n", color: "w" }, { square: "d4", type: "n", color: "w" }, { square: "h8", type: "n", color: "b" }],
  blind: [{ square: "d4", type: "n", color: "w" }],
  square: [{ square: "e4", type: "p", color: "w" }],
  check: [{ square: "c3", type: "k", color: "w" }, { square: "e8", type: "k", color: "b" }, { square: "d1", type: "q", color: "w" }],
  mate: [{ square: "f6", type: "k", color: "w" }, { square: "h8", type: "k", color: "b" }, { square: "g5", type: "q", color: "w" }],
  spot: [{ square: "a1", type: "r", color: "w" }, { square: "h8", type: "r", color: "b" }, { square: "e1", type: "k", color: "w" }],
  legal: [{ square: "e2", type: "p", color: "w" }, { square: "g1", type: "n", color: "w" }],
  queens: ["a1", "c2", "e3", "g4", "b5", "d6", "f7", "h8"].map((square) => ({ square, type: "q", color: "w" as const })),
};

function GameArt({ mode }: { mode: Mode }) {
  const [appearance] = useBoardAppearance();
  const theme = BOARD_THEMES.find((item) => item.id === appearance.board) ?? BOARD_THEMES[5];
  if (mode === "reaction") {
    return <div className="relative grid h-full w-full place-items-center bg-[#101411]"><span className="grid h-20 w-20 place-items-center rounded-full border-[6px] border-primary/70 bg-[#1b2821] shadow-[0_0_0_7px_#202a23]"><Timer className="h-10 w-10 text-primary" /></span><span className="absolute right-5 top-4 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" /></div>;
  }
  if (mode === "memory") {
    return <div className="grid h-full w-full grid-cols-3 place-items-center gap-2 bg-[#101411] p-3">
      {["k", "q", "r", "b", "n", "p"].map((type, index) => <span key={type} className="grid h-12 w-full place-items-center rounded-md border border-primary/25 bg-[#202820]"><img src={pieceImageSource(index % 2 ? "b" : "w", type, appearance.pieces)} alt="" className="h-11 w-11 object-contain" /></span>)}
    </div>;
  }
  if (mode === "minefield") {
    return <div className="grid h-full w-full grid-cols-4 gap-1 bg-[#101411] p-3">
      {Array.from({ length: 16 }, (_, index) => <span key={index} className={"grid aspect-square place-items-center rounded border " + ([2, 7, 10].includes(index) ? "border-rose-400/40 bg-rose-500/15" : [0, 5, 8, 13].includes(index) ? "border-primary/40 bg-primary/10" : "border-border bg-[#222622]")}>
        {[2, 7, 10].includes(index) ? <span className="h-3 w-3 rounded-full border-2 border-rose-400" /> : [0, 5, 8, 13].includes(index) ? <span className="font-mono text-sm font-black text-primary">{index === 5 ? "2" : "1"}</span> : null}
      </span>)}
    </div>;
  }
  const pieces = CARD_ART[mode] ?? [];
  const pieceMap = new Map(pieces.map((piece) => {
    const col = Math.min(3, Math.floor(FILES.indexOf(piece.square[0]) / 2));
    const row = Math.min(3, Math.floor((8 - Number(piece.square[1])) / 2));
    return [row + ":" + col, piece] as const;
  }));
  return <div className="grid h-full w-full grid-cols-4 overflow-hidden bg-[#101411] p-3">
    {Array.from({ length: 16 }, (_, index) => {
      const row = Math.floor(index / 4), col = index % 4;
      const piece = pieceMap.get(row + ":" + col);
      const marked = mode === "knight" ? [0, 5, 10, 15].includes(index) : mode === "square" ? index === 9 : mode === "spot" ? index === 0 || index === 4 : mode === "legal" ? index === 5 || index === 6 : [5, 10].includes(index);
      return <span key={index} className="relative grid aspect-square place-items-center" style={{ backgroundColor: (row + col) % 2 ? theme.dark : theme.light }}>
        {marked && <span className="absolute inset-1 rounded border-2 border-primary/80 bg-primary/20" />}
        {piece && <img src={pieceImageSource(piece.color, piece.type, appearance.pieces)} alt="" className="relative z-10 h-[86%] w-[86%] object-contain" />}
      </span>;
    })}
  </div>;
}

function GameCard({ mode, title, description, icon: Icon, active, onClick, group }: {
  mode: Mode; title: string; description: string; icon: typeof Brain; active: boolean; onClick: () => void; group: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`group min-w-0 rounded-xl border p-3 text-left transition sm:p-4 ${active ? "border-primary bg-[#191919] shadow-[0_4px_0_#8b5e00]" : "border-border bg-card shadow-[0_4px_0_#090909] hover:border-primary/45"}`}>
      <div className="relative grid aspect-[1.55/1] place-items-center overflow-hidden rounded-lg border border-border bg-[#171717] sm:aspect-[1.8/1]"><GameArt mode={mode} /><span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-md border border-white/10 bg-black/50 text-primary"><Icon className="h-3.5 w-3.5" /></span></div>
      <span className="mt-3 block truncate text-sm font-bold">{title}</span>
      <span className="mt-1 block min-h-8 text-[10px] leading-4 text-muted-foreground">{description}</span>
      <span className="mt-3 flex items-center justify-between gap-2"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">{group}</span>{active ? <Check className="h-4 w-4 text-primary" /> : <span className="text-[10px] font-semibold text-muted-foreground">Play</span>}</span>
    </button>
  );
}

function BrainGamesPage() {
  const [mode, setMode] = useState<Mode>("board");
  const [appearance] = useBoardAppearance();

  // Board Memory
  const [memoryPieces, setMemoryPieces] = useState<MiniPiece[]>([]);
  const [memoryPhase, setMemoryPhase] = useState<"idle" | "peek" | "recall" | "done">("idle");
  const [memoryFound, setMemoryFound] = useState<string[]>([]);
  const [memoryMessage, setMemoryMessage] = useState("Memorize the five pieces, then rebuild their squares.");
  const memoryTimer = useRef<number | null>(null);

  // Knight Trail
  const knightStart = squareIndex("a1");
  const knightEnd = squareIndex("h8");
  const [knightCurrent, setKnightCurrent] = useState(knightStart);
  const [knightSteps, setKnightSteps] = useState(0);
  const [knightWon, setKnightWon] = useState(false);
  const [knightMessage, setKnightMessage] = useState("Reach h8 using the fewest possible knight moves.");
  const knightBest = knightDistance(knightStart, knightEnd);
  const knightLegal = useMemo(() => knightTargets(knightCurrent), [knightCurrent]);

  // Blind Moves
  const blindQuestions = [
    { piece: "p", color: "w" as const, from: "e2", to: "e4", options: ["e4", "e3", "d4"] },
    { piece: "n", color: "w" as const, from: "g1", to: "f3", options: ["h3", "f3", "e2"] },
    { piece: "n", color: "w" as const, from: "b1", to: "c3", options: ["a3", "d2", "c3"] },
    { piece: "p", color: "b" as const, from: "e7", to: "e5", options: ["e5", "e6", "d5"] },
    { piece: "n", color: "b" as const, from: "g8", to: "f6", options: ["h6", "f6", "e7"] },
    { piece: "p", color: "w" as const, from: "d2", to: "d4", options: ["d4", "d3", "c4"] },
  ];
  const [blindIndex, setBlindIndex] = useState(0);
  const [blindScore, setBlindScore] = useState(0);
  const [blindMessage, setBlindMessage] = useState("Visualize the move without a board and choose its destination.");
  const blindQuestion = blindQuestions[blindIndex % blindQuestions.length];

  // Square Rush
  const [squareTarget, setSquareTarget] = useState(() => randomSquare());
  const [squareScore, setSquareScore] = useState(0);
  const [squareSeconds, setSquareSeconds] = useState(30);
  const [squareRunning, setSquareRunning] = useState(false);
  const [squareBest, setSquareBest] = useState(0);

  // Find the Check
  const [checkFen, setCheckFen] = useState(CHECK_FEN);
  const [checkSolved, setCheckSolved] = useState(false);
  const [checkMessage, setCheckMessage] = useState("Find any legal move that gives check.");
  const checkMoves = useMemo(() => {
    try {
      const base = new Chess(checkFen);
      return base.moves({ verbose: true }).filter((move) => {
        const candidate = new Chess(checkFen);
        candidate.move(move);
        return candidate.isCheck();
      });
    } catch { return []; }
  }, [checkFen]);

  // Mate Rush
  const [mateFen, setMateFen] = useState(MATE_FEN);
  const [mateSolved, setMateSolved] = useState(false);
  const [mateMessage, setMateMessage] = useState("Find checkmate in one move.");
  const mateMoves = useMemo(() => {
    try {
      const base = new Chess(mateFen);
      return base.moves({ verbose: true }).filter((move) => {
        const candidate = new Chess(mateFen);
        candidate.move(move);
        return candidate.isCheckmate();
      });
    } catch { return []; }
  }, [mateFen]);

  // Spot the Change
  const [spotAnswer, setSpotAnswer] = useState("");
  const [spotSolved, setSpotSolved] = useState(false);
  const spotPiecesA = useMemo(() => parseFenPieces(SPOT_FEN_A), []);
  const spotPiecesB = useMemo(() => parseFenPieces(SPOT_FEN_B), []);

  // Legal or Not
  const legalQuestions = [
    { fen: START_FEN, uci: "e2e4" },
    { fen: START_FEN, uci: "e2e5" },
    { fen: START_FEN, uci: "g1f3" },
    { fen: START_FEN, uci: "e1e3" },
    { fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", uci: "g1f3" },
    { fen: START_FEN, uci: "b1b4" },
  ];
  const [legalIndex, setLegalIndex] = useState(0);
  const [legalMessage, setLegalMessage] = useState("Judge whether the highlighted UCI move is legal in this position.");
  const legalQuestion = legalQuestions[legalIndex % legalQuestions.length];
  const legalAnswer = isLegalUci(legalQuestion.fen, legalQuestion.uci);

  // Minefield
  const [mines, setMines] = useState<number[]>([]);
  const [revealedMines, setRevealedMines] = useState<number[]>([]);
  const [flaggedMines, setFlaggedMines] = useState<number[]>([]);
  const [flagMode, setFlagMode] = useState(false);
  const [mineStatus, setMineStatus] = useState<"idle" | "playing" | "won" | "lost">("idle");

  // Reaction Time
  const [reactionPhase, setReactionPhase] = useState<"idle" | "waiting" | "go" | "result" | "early">("idle");
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const reactionTimer = useRef<number | null>(null);
  const reactionStart = useRef(0);
  const [reactionBest, setReactionBest] = useState<number | null>(null);

  // Queens
  const [queens, setQueens] = useState<Record<number, number>>({});
  const [queenMessage, setQueenMessage] = useState("Place eight queens so none attack another.");
  const queenCount = Object.keys(queens).length;
  const queenConflict = useMemo(() => {
    const entries = Object.entries(queens).map(([col, row]) => [Number(col), row] as const);
    for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
      const [c1, r1] = entries[i], [c2, r2] = entries[j];
      if (r1 === r2 || Math.abs(c1 - c2) === Math.abs(r1 - r2)) return true;
    }
    return false;
  }, [queens]);

  // Memory Match
  const [deck, setDeck] = useState(makeDeck);
  const [opened, setOpened] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const mismatchTimer = useRef<number | null>(null);

  useEffect(() => {
    if (memoryPhase !== "peek") return;
    memoryTimer.current = window.setTimeout(() => {
      setMemoryPhase("recall");
      setMemoryMessage("Now tap the five squares where you saw a piece.");
    }, 3500);
    return () => { if (memoryTimer.current) window.clearTimeout(memoryTimer.current); };
  }, [memoryPhase]);

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
    if (memoryTimer.current) window.clearTimeout(memoryTimer.current);
  }, []);

  function startBoardMemory() {
    setMemoryPieces(randomBoardMemoryPieces());
    setMemoryFound([]);
    setMemoryPhase("peek");
    setMemoryMessage("Memorize these five pieces and their squares.");
  }

  function tapMemorySquare(square: string) {
    if (memoryPhase !== "recall" || memoryFound.includes(square)) return;
    const target = memoryPieces.find((piece) => piece.square === square);
    if (!target) {
      setMemoryMessage("That square was empty. Keep looking for the remembered pieces.");
      return;
    }
    const next = [...memoryFound, square];
    setMemoryFound(next);
    if (next.length === memoryPieces.length) {
      setMemoryPhase("done");
      setMemoryMessage("Board reconstructed correctly. Nice visual memory.");
    } else {
      setMemoryMessage(`Correct square — ${next.length} of ${memoryPieces.length} found.`);
    }
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

  function resetKnight() {
    setKnightCurrent(knightStart);
    setKnightSteps(0);
    setKnightWon(false);
    setKnightMessage("Reach h8 using the fewest possible knight moves.");
  }

  function blindAnswer(square: string) {
    if (square === blindQuestion.to) {
      setBlindScore((value) => value + 1);
      setBlindMessage(`Correct — ${blindQuestion.from} to ${blindQuestion.to}. Next move.`);
      setBlindIndex((value) => value + 1);
    } else {
      setBlindMessage("Not quite. Replay the piece movement in your head and try again.");
    }
  }

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

  function handleCheckMove(move: { from: string; to: string; promotion?: string }) {
    if (checkSolved) return false;
    const game = new Chess(checkFen);
    try {
      const result = game.move({ from: move.from as Square, to: move.to as Square, promotion: move.promotion as PieceSymbol | undefined });
      if (!result) return false;
      if (game.isCheck()) {
        setCheckFen(game.fen());
        setCheckSolved(true);
        setCheckMessage(`Check found: ${result.san}. Good board vision.`);
        return true;
      }
      setCheckMessage("That move is legal, but it does not give check. Find a forcing move.");
      return false;
    } catch { return false; }
  }

  function resetCheck() {
    setCheckFen(CHECK_FEN);
    setCheckSolved(false);
    setCheckMessage("Find any legal move that gives check.");
  }

  function handleMateMove(move: { from: string; to: string; promotion?: string }) {
    if (mateSolved) return false;
    const game = new Chess(mateFen);
    try {
      const result = game.move({ from: move.from as Square, to: move.to as Square, promotion: move.promotion as PieceSymbol | undefined });
      if (!result) return false;
      if (game.isCheckmate()) {
        setMateFen(game.fen());
        setMateSolved(true);
        setMateMessage(`Checkmate: ${result.san}. Puzzle solved.`);
        return true;
      }
      setMateMessage("Legal move, but not checkmate. Look for the king's escape squares.");
      return false;
    } catch { return false; }
  }

  function resetMate() {
    setMateFen(MATE_FEN);
    setMateSolved(false);
    setMateMessage("Find checkmate in one move.");
  }

  function chooseSpot(square: string) {
    if (spotSolved) return;
    if (square === "a2") {
      setSpotAnswer(square);
      setSpotSolved(true);
    } else {
      setSpotAnswer(square);
    }
  }

  function chooseLegal(answer: boolean) {
    if (answer === legalAnswer) {
      setLegalMessage(`Correct — ${legalQuestion.uci.slice(0,2)} to ${legalQuestion.uci.slice(2,4)} is ${legalAnswer ? "legal" : "illegal"}.`);
      setLegalIndex((value) => value + 1);
    } else {
      setLegalMessage("Not correct. Consider whose turn it is, piece movement and obstruction.");
    }
  }

  function startMinefield() {
    const picks = new Set<number>();
    while (picks.size < 3) picks.add(Math.floor(Math.random() * 16));
    setMines([...picks]);
    setRevealedMines([]);
    setFlaggedMines([]);
    setFlagMode(false);
    setMineStatus("playing");
  }

  function adjacentMines(index: number) {
    const row = Math.floor(index / 4), col = index % 4;
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < 4 && c >= 0 && c < 4 && mines.includes(r * 4 + c)) count += 1;
    }
    return count;
  }

  function tapMine(index: number) {
    if (mineStatus !== "playing") return;
    if (flagMode) {
      setFlaggedMines((old) => old.includes(index) ? old.filter((item) => item !== index) : [...old, index]);
      return;
    }
    if (revealedMines.includes(index) || flaggedMines.includes(index)) return;
    if (mines.includes(index)) {
      setMineStatus("lost");
      return;
    }
    const next = [...revealedMines, index];
    setRevealedMines(next);
    if (next.length === 13) setMineStatus("won");
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
      const ms = Math.round(performance.now() - reactionStart.current);
      setReactionMs(ms);
      setReactionBest((old) => old === null ? ms : Math.min(old, ms));
      setReactionPhase("result");
    }
  }

  function placeQueen(square: string) {
    const col = FILES.indexOf(square[0]);
    const row = 8 - Number(square[1]);
    const next = { ...queens, [col]: row };
    setQueens(next);
    const rows = Object.entries(next).map(([c, r]) => [Number(c), r] as const);
    let conflict = false;
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      const [c1, r1] = rows[i], [c2, r2] = rows[j];
      if (r1 === r2 || Math.abs(c1 - c2) === Math.abs(r1 - r2)) conflict = true;
    }
    if (conflict) setQueenMessage("Queens are attacking each other. Move one to a safe square.");
    else if (Object.keys(next).length === 8) setQueenMessage("Eight queens placed safely. Challenge complete.");
    else setQueenMessage(`${Object.keys(next).length} of 8 queens placed safely.`);
  }

  function flipMemoryCard(index: number) {
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

  function resetMemoryMatch() {
    if (mismatchTimer.current) window.clearTimeout(mismatchTimer.current);
    setDeck(makeDeck());
    setOpened([]);
    setMatched([]);
    setMemoryMoves(0);
  }

  const games = [
    { id: "board" as const, title: "Board Memory", description: "Memorize a piece layout and recall its squares.", icon: Brain, group: "Chess games" },
    { id: "knight" as const, title: "Knight Trail", description: "Find the shortest legal knight route.", icon: Sparkles, group: "Chess games" },
    { id: "blind" as const, title: "Blind Moves", description: "Visualize a move without looking at a board.", icon: Eye, group: "Chess games" },
    { id: "square" as const, title: "Square Rush", description: "Find called-out squares against the clock.", icon: Target, group: "Chess games" },
    { id: "check" as const, title: "Find the Check", description: "Spot a legal move that gives check.", icon: Crosshair, group: "Chess games" },
    { id: "mate" as const, title: "Mate Rush", description: "Find checkmate in one move.", icon: Trophy, group: "Chess games" },
    { id: "spot" as const, title: "Spot the Change", description: "Compare two positions and find what moved.", icon: Grid3X3, group: "Chess games" },
    { id: "legal" as const, title: "Legal or Not", description: "Judge a candidate move using chess rules.", icon: ShieldCheck, group: "Chess games" },
    { id: "minefield" as const, title: "Minefield", description: "Clear safe squares and flag hidden mines.", icon: Flag, group: "Chess games" },
    { id: "reaction" as const, title: "Reaction Time", description: "Measure your response time.", icon: Timer, group: "Brain tests" },
    { id: "queens" as const, title: "Queens", description: "Place eight queens so none attack another.", icon: Crown, group: "Brain tests" },
    { id: "memory" as const, title: "Memory Match", description: "Match chess pieces from memory.", icon: Brain, group: "Brain tests" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-primary"><Gamepad2 className="h-3.5 w-3.5" /> Board vision · memory · calculation</div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Brain games</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Twelve chess-inspired mini-games. All scores shown here come from your current sessions.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground"><Zap className="h-4 w-4 text-primary" /> Free to play</div>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(300px,.82fr)_minmax(0,1.5fr)]">
        <section className="space-y-4">
          {(["Chess games", "Brain tests"] as const).map((group) => (
            <div key={group} className="space-y-2">
              <h2 className="px-1 text-[10px] font-extrabold uppercase tracking-[.17em] text-muted-foreground">{group}</h2>
              <div className="grid grid-cols-2 gap-2">
                {games.filter((game) => game.group === group).map((game) => (
                  <GameCard key={game.id} mode={game.id} title={game.title} description={game.description} icon={game.icon} active={mode === game.id} group={group} onClick={() => setMode(game.id)} />
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="panel min-w-0 p-4 sm:p-6">
          {mode === "board" && (
            <div className="mx-auto max-w-[620px] space-y-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">VISUAL MEMORY</p><h2 className="mt-1 text-2xl font-extrabold">Board Memory</h2><p className="mt-1 text-xs text-muted-foreground">Study the five pieces for 3.5 seconds, then tap the squares where they were placed.</p></div>
              <div className="flex flex-wrap gap-2"><span className="rounded-lg bg-background px-3 py-2 text-xs">Pieces: <strong className="font-mono">{memoryPieces.length || 5}</strong></span><span className="rounded-lg bg-background px-3 py-2 text-xs">Found: <strong className="font-mono">{memoryFound.length}</strong></span></div>
              <MiniBoard pieces={memoryPieces} hidePieces={memoryPhase === "recall"} found={memoryFound} onSquare={tapMemorySquare} disabled={memoryPhase === "idle" || memoryPhase === "peek" || memoryPhase === "done"} />
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{memoryMessage}</p><button type="button" onClick={startBoardMemory} className="btn btn-primary"><Eye className="h-4 w-4" /> {memoryPhase === "idle" || memoryPhase === "done" ? "Start round" : "New layout"}</button></div>
              {memoryPhase === "done" && <button type="button" onClick={() => setMemoryPhase("peek")} className="btn btn-secondary w-full">Review the layout</button>}
            </div>
          )}

          {mode === "knight" && (
            <div className="mx-auto max-w-[620px] space-y-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">BOARD VISION</p><h2 className="mt-1 text-2xl font-extrabold">Knight Trail</h2><p className="mt-1 text-xs text-muted-foreground">Move the knight from a1 to h8 using only legal knight moves. Find a shortest path.</p></div>
              <div className="flex flex-wrap gap-2"><span className="rounded-lg bg-background px-3 py-2 text-xs">Moves: <strong className="font-mono">{knightSteps}</strong></span><span className="rounded-lg bg-background px-3 py-2 text-xs">Shortest route: <strong className="font-mono">{knightBest}</strong></span></div>
              <MiniBoard pieces={[{ square: squareName(knightCurrent), type: "n", color: "w" }]} highlights={knightLegal.map(squareName)} onSquare={(square) => moveKnight(squareIndex(square))} disabled={knightWon} />
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-muted-foreground">{knightMessage}</p><button type="button" onClick={resetKnight} className="btn btn-secondary"><RotateCcw className="h-4 w-4" /> Restart</button></div>
            </div>
          )}

          {mode === "blind" && (
            <div className="mx-auto max-w-[620px] space-y-5">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">VISUALIZATION</p><h2 className="mt-1 text-2xl font-extrabold">Blind Moves</h2><p className="mt-1 text-xs text-muted-foreground">Visualize how the piece moves. No board is shown during the question.</p></div>
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-border bg-background p-5 text-center">
                <img src={pieceImageSource(blindQuestion.color, blindQuestion.piece, appearance.pieces)} alt="Chess piece" className="h-24 w-24 object-contain" />
                <p className="mt-3 text-sm font-bold">Move from <span className="font-mono text-primary">{blindQuestion.from}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Choose the destination square</p>
              </div>
              <div className="grid grid-cols-3 gap-2">{blindQuestion.options.map((square) => <button key={square} type="button" onClick={() => blindAnswer(square)} className="btn btn-secondary py-4 font-mono text-lg">{square}</button>)}</div>
              <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{blindMessage}</p><span className="font-mono text-sm font-bold text-primary">{blindScore} correct</span></div>
            </div>
          )}

          {mode === "square" && (
            <div className="mx-auto max-w-[620px] space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">SQUARE RECOGNITION</p><h2 className="mt-1 text-2xl font-extrabold">Square Rush</h2><p className="mt-1 text-xs text-muted-foreground">Tap the named square before the 30-second timer expires.</p></div><div className="flex gap-2"><div className="rounded-lg bg-background px-3 py-2 text-center"><p className="text-[9px] text-muted-foreground">SCORE</p><p className="font-mono text-xl font-bold">{squareScore}</p></div><div className="rounded-lg bg-background px-3 py-2 text-center"><p className="text-[9px] text-muted-foreground">TIME</p><p className="font-mono text-xl font-bold">{squareSeconds}s</p></div></div></div>
              <div className="rounded-xl border border-border bg-background p-3 text-center"><p className="text-xs text-muted-foreground">{squareRunning ? "Find this square" : squareSeconds === 0 ? "Time is up" : "Ready?"}</p><p className="mt-1 font-mono text-4xl font-black tracking-wider text-primary">{squareTarget}</p></div>
              <MiniBoard onSquare={tapSquare} disabled={!squareRunning} />
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Personal best this session: {squareBest}</p><button type="button" onClick={startSquareRush} className="btn btn-primary"><Clock3 className="h-4 w-4" /> {squareRunning ? "Restart round" : "Start 30 sec"}</button></div>
            </div>
          )}

          {mode === "check" && (
            <div className="mx-auto max-w-[620px] space-y-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">TACTICAL VISION</p><h2 className="mt-1 text-2xl font-extrabold">Find the Check</h2><p className="mt-1 text-xs text-muted-foreground">Make any legal move that puts the opponent's king in check. Try moves directly on the board.</p></div>
              <div className="mx-auto w-full max-w-[540px]"><Board fen={checkFen} orientation="white" movable="both" onMove={handleCheckMove} /></div>
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-muted-foreground">{checkMessage}</p><button type="button" onClick={resetCheck} className="btn btn-secondary"><RotateCcw className="h-4 w-4" /> Reset</button></div>
              <p className="text-[10px] text-muted-foreground">{checkMoves.length} checking move(s) available in this position. This count is generated from legal move testing.</p>
            </div>
          )}

          {mode === "mate" && (
            <div className="mx-auto max-w-[620px] space-y-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">MATING VISION</p><h2 className="mt-1 text-2xl font-extrabold">Mate Rush</h2><p className="mt-1 text-xs text-muted-foreground">White to move. Find checkmate in one move.</p></div>
              <div className="mx-auto w-full max-w-[540px]"><Board fen={mateFen} orientation="white" movable="both" onMove={handleMateMove} /></div>
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-muted-foreground">{mateMessage}</p><button type="button" onClick={resetMate} className="btn btn-secondary"><RotateCcw className="h-4 w-4" /> Reset</button></div>
              <p className="text-[10px] text-muted-foreground">{mateMoves.length} forced mate-in-one move(s) detected from the position.</p>
            </div>
          )}

          {mode === "spot" && (
            <div className="mx-auto max-w-[700px] space-y-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">VISUAL COMPARISON</p><h2 className="mt-1 text-2xl font-extrabold">Spot the Change</h2><p className="mt-1 text-xs text-muted-foreground">Compare the two positions and select the square that changed. One rook moved.</p></div>
              <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><p className="text-xs font-semibold">Position A</p><MiniBoard pieces={spotPiecesA} compact /></div><div className="space-y-2"><p className="text-xs font-semibold">Position B</p><MiniBoard pieces={spotPiecesB} compact /></div></div>
              <div className="flex flex-wrap items-center gap-2"><p className="mr-auto text-xs text-muted-foreground">{spotSolved ? `Correct — the rook moved from a1 to a2.` : "Choose the square containing the rook in Position B."}</p>{["a1", "a2"].map((square) => <button key={square} type="button" disabled={spotSolved} onClick={() => chooseSpot(square)} className="btn btn-secondary font-mono">{square}</button>)}<button type="button" onClick={() => { setSpotAnswer(""); setSpotSolved(false); }} className="btn btn-secondary"><RotateCcw className="h-4 w-4" /> Reset</button></div>
            </div>
          )}

          {mode === "legal" && (
            <div className="mx-auto max-w-[620px] space-y-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">RULES TEST</p><h2 className="mt-1 text-2xl font-extrabold">Legal or Not</h2><p className="mt-1 text-xs text-muted-foreground">Inspect the current position and decide whether the candidate move is legal.</p></div>
              <MiniBoard pieces={parseFenPieces(legalQuestion.fen)} />
              <div className="rounded-xl border border-border bg-background p-4 text-center"><p className="text-[10px] text-muted-foreground">CANDIDATE MOVE · UCI</p><p className="mt-1 font-mono text-3xl font-black tracking-widest text-primary">{legalQuestion.uci.slice(0,2)} → {legalQuestion.uci.slice(2,4)}</p></div>
              <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => chooseLegal(true)} className="btn btn-secondary py-4">Legal</button><button type="button" onClick={() => chooseLegal(false)} className="btn btn-secondary py-4">Illegal</button></div>
              <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{legalMessage}</p><button type="button" onClick={() => setLegalIndex((value) => value + 1)} className="text-xs font-bold text-primary">Next <MoveRight className="inline h-3.5 w-3.5" /></button></div>
              <p className="text-[10px] text-muted-foreground">The expected answer is computed with chess.js from the position, not random selection.</p>
            </div>
          )}

          {mode === "minefield" && (
            <div className="mx-auto max-w-[620px] space-y-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">CAREFUL SCANNING</p><h2 className="mt-1 text-2xl font-extrabold">Minefield</h2><p className="mt-1 text-xs text-muted-foreground">Reveal safe squares. Numbers tell you how many mines are adjacent. Flag suspicious squares.</p></div>
              <div className="mx-auto grid w-full max-w-[380px] grid-cols-4 gap-1.5">
                {Array.from({ length: 16 }, (_, index) => {
                  const revealed = revealedMines.includes(index) || mineStatus === "lost" && mines.includes(index);
                  const number = adjacentMines(index);
                  const flagged = flaggedMines.includes(index);
                  return <button key={index} type="button" onClick={() => tapMine(index)} disabled={mineStatus === "idle" || mineStatus === "won" || mineStatus === "lost" || revealed} className={`grid aspect-square place-items-center rounded-lg border text-lg font-black transition ${revealed ? "border-border bg-[#1a1a1a] text-primary" : flagged ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-surface-2 hover:border-primary/50"}`}>
                    {revealed ? mines.includes(index) ? <span className="text-rose-400">×</span> : number || "" : flagged ? <Flag className="h-5 w-5" /> : ""}
                  </button>;
                })}
              </div>
              <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setFlagMode((value) => !value)} disabled={mineStatus !== "playing"} className={`btn btn-secondary ${flagMode ? "border-primary text-primary" : ""}`}><Flag className="h-4 w-4" /> {flagMode ? "Flag mode on" : "Flag mode"}</button><button type="button" onClick={startMinefield} className="btn btn-primary"><RotateCcw className="h-4 w-4" /> {mineStatus === "idle" ? "Start game" : "New field"}</button></div>
              <p className="text-xs text-muted-foreground">{mineStatus === "won" ? "Field cleared. You found every safe square." : mineStatus === "lost" ? "A mine was found. Start a new field to try again." : mineStatus === "idle" ? "Start a new field. Three mines are hidden in sixteen squares." : `${revealedMines.length} safe squares revealed · ${flaggedMines.length} flags placed.`}</p>
            </div>
          )}

          {mode === "reaction" && (
            <div className="mx-auto flex min-h-[420px] max-w-[620px] flex-col">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">REFLEX TEST</p><h2 className="mt-1 text-2xl font-extrabold">Reaction Time</h2><p className="mt-1 text-xs text-muted-foreground">Wait until the panel turns green, then tap as quickly as you can.</p></div>
              <button type="button" onClick={reactionPhase === "idle" || reactionPhase === "result" || reactionPhase === "early" ? startReaction : tapReaction} className={`my-6 flex min-h-[250px] flex-1 flex-col items-center justify-center rounded-2xl border text-center transition active:scale-[.99] ${reactionPhase === "go" ? "border-emerald-400 bg-emerald-500 text-[#06271f]" : reactionPhase === "waiting" ? "border-red-400/40 bg-red-500/15 text-foreground" : "border-border bg-background text-foreground"}`}>
                {reactionPhase === "idle" && <><Timer className="mb-4 h-10 w-10 text-primary" /><span className="text-xl font-extrabold">Tap to start</span><span className="mt-2 text-xs opacity-75">The wait time is random.</span></>}
                {reactionPhase === "waiting" && <><span className="text-2xl font-black">Wait for green…</span><span className="mt-2 text-xs opacity-75">Don’t tap yet.</span></>}
                {reactionPhase === "go" && <><Zap className="mb-3 h-10 w-10" /><span className="text-3xl font-black">TAP NOW!</span></>}
                {reactionPhase === "early" && <><span className="text-2xl font-black">Too early!</span><span className="mt-2 text-xs opacity-75">Wait until the panel turns green.</span></>}
                {reactionPhase === "result" && <><span className="text-xs font-bold uppercase tracking-widest opacity-75">Your reaction</span><span className="mt-2 font-mono text-5xl font-black">{reactionMs} ms</span><span className="mt-2 text-xs opacity-75">Tap to try again.</span></>}
              </button>
              <p className="text-center text-xs text-muted-foreground">{reactionBest === null ? "Personal best: no result yet." : `Personal best: ${reactionBest} ms.`} Browser timing and device performance can affect the measurement.</p>
            </div>
          )}

          {mode === "queens" && (
            <div className="mx-auto max-w-[620px] space-y-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">PATTERN CHALLENGE</p><h2 className="mt-1 text-2xl font-extrabold">Queens</h2><p className="mt-1 text-xs text-muted-foreground">Place eight queens on the board so that no two queens attack each other.</p></div>
              <MiniBoard pieces={Object.entries(queens).map(([col, row]) => ({ square: `${FILES[Number(col)]}${8 - row}`, type: "q", color: "w" }))} onSquare={placeQueen} />
              <div className="flex flex-wrap items-center justify-between gap-3"><p className={`text-xs ${queenConflict ? "text-rose-400" : "text-muted-foreground"}`}>{queenMessage}</p><span className="font-mono text-sm font-bold">{queenCount}/8</span><button type="button" onClick={() => { setQueens({}); setQueenMessage("Place eight queens so none attack another."); }} className="btn btn-secondary btn-sm"><RotateCcw className="h-4 w-4" /> Reset</button></div>
            </div>
          )}

          {mode === "memory" && (
            <div className="mx-auto max-w-[620px] space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">VISUAL MEMORY</p><h2 className="mt-1 text-2xl font-extrabold">Memory Match</h2><p className="mt-1 text-xs text-muted-foreground">Flip two cards at a time and match all six chess-piece pairs.</p></div><div className="rounded-lg bg-background px-3 py-2 text-center"><p className="text-[9px] text-muted-foreground">MOVES</p><p className="font-mono text-xl font-bold">{memoryMoves}</p></div></div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">{deck.map((card, index) => {
                const visible = opened.includes(index) || matched.includes(index);
                return <button key={card.id} type="button" onClick={() => flipMemoryCard(index)} disabled={visible || opened.length === 2} aria-label={visible ? `Card ${card.value.toUpperCase()}` : "Hidden card"} className={`grid aspect-square place-items-center rounded-xl border transition ${visible ? "border-primary/60 bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}>{visible ? <img src={pieceImageSource("w", card.value, appearance.pieces)} alt={`${card.value.toUpperCase()} chess piece`} className="h-[78%] w-[78%] object-contain" /> : <span className="text-3xl font-black text-primary">?</span>}</button>;
              })}</div>
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{matched.length === deck.length ? `Completed in ${memoryMoves} moves. Nice memory!` : `${matched.length / 2} of 6 pairs found.`}</p><button type="button" onClick={resetMemoryMatch} className="btn btn-secondary"><RotateCcw className="h-4 w-4" /> New board</button></div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
