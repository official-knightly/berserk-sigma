import { Chess, type Square } from "chess.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const FILES = "abcdefgh";
const PIECE_URL = (color: string, type: string) =>
  `https://lichess1.org/assets/piece/cburnett/${color}${type.toUpperCase()}.svg`;

export type Arrow = { from: string; to: string; tone?: "best" | "premove" | "alt" };
export type Premove = { from: string; to: string; promotion?: string };

type Props = {
  fen: string;
  orientation?: "white" | "black";
  /** Which color the user may move now (null = view only). */
  movable?: "w" | "b" | "both" | null;
  /** Color the user plays; enables premoves when it is not their turn. */
  premoveColor?: "w" | "b" | null;
  premove?: Premove | null;
  onPremove?: (p: Premove | null) => void;
  onMove?: (m: { from: string; to: string; promotion?: string }) => boolean;
  lastMove?: { from: string; to: string } | null;
  arrows?: Arrow[];
  badge?: { square: string; icon: string; label: string } | null;
  className?: string;
};

function squareXY(sq: string, flip: boolean) {
  const f = FILES.indexOf(sq[0]);
  const r = Number(sq[1]);
  return flip ? { x: 7 - f, y: r - 1 } : { x: f, y: 8 - r };
}

export function Board({
  fen, orientation = "white", movable = null, premoveColor = null, premove = null,
  onPremove, onMove, lastMove, arrows = [], badge, className,
}: Props) {
  const flip = orientation === "black";
  const chess = useMemo(() => {
    try { return new Chess(fen); } catch { return new Chess(); }
  }, [fen]);
  const turn = chess.turn();
  const [selected, setSelected] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string; color: "w" | "b"; pre: boolean } | null>(null);
  const [drag, setDrag] = useState<{ from: string; x: number; y: number; started: boolean } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const downRef = useRef<{ x: number; y: number; sq: string; wasSelected: boolean } | null>(null);

  useEffect(() => { setSelected(null); setPromo(null); }, [fen]);

  const canMoveColor = (c: "w" | "b") =>
    movable === "both" ? c === turn : movable === c && turn === c;
  const canPremoveColor = (c: "w" | "b") => !!premoveColor && premoveColor === c && turn !== c && !!onPremove;

  const pieceAt = (sq: string) => chess.get(sq as Square);

  const targets = useMemo(() => {
    if (!selected) return new Map<string, boolean>();
    const p = pieceAt(selected);
    const map = new Map<string, boolean>();
    if (!p) return map;
    if (canMoveColor(p.color)) {
      for (const m of chess.moves({ square: selected as Square, verbose: true })) map.set(m.to, !!m.captured);
    } else if (canPremoveColor(p.color)) {
      // Premove targets: pseudo-legal moves as if it were our turn.
      const parts = fen.split(" ");
      parts[1] = p.color; parts[3] = "-";
      try {
        const c = new Chess(parts.join(" "), { skipValidation: true });
        for (const m of c.moves({ square: selected as Square, verbose: true })) map.set(m.to, false);
        if (p.type === "p") {
          const dir = p.color === "w" ? 1 : -1;
          const f = FILES.indexOf(selected[0]); const r = Number(selected[1]) + dir;
          for (const df of [-1, 1]) if (f + df >= 0 && f + df < 8 && r >= 1 && r <= 8) map.set(FILES[f + df] + r, false);
        }
      } catch { /* ignore */ }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, chess, movable, premoveColor, turn]);

  function needsPromotion(from: string, to: string) {
    const p = pieceAt(from);
    return p?.type === "p" && ((p.color === "w" && to[1] === "8") || (p.color === "b" && to[1] === "1"));
  }

  function attempt(from: string, to: string) {
    const p = pieceAt(from);
    if (!p || !targets.has(to)) return false;
    const pre = !canMoveColor(p.color);
    if (needsPromotion(from, to)) { setPromo({ from, to, color: p.color, pre }); return true; }
    if (pre) onPremove?.({ from, to });
    else onMove?.({ from, to });
    setSelected(null);
    return true;
  }

  function squareFromPoint(clientX: number, clientY: number) {
    const el = boardRef.current; if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = Math.floor(((clientX - r.left) / r.width) * 8);
    const y = Math.floor(((clientY - r.top) / r.height) * 8);
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    return flip ? FILES[7 - x] + (y + 1) : FILES[x] + (8 - y);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (promo) return;
    if (e.button === 2) { setSelected(null); onPremove?.(null); return; }
    const sq = squareFromPoint(e.clientX, e.clientY); if (!sq) return;
    const p = pieceAt(sq);
    if (selected && selected !== sq && targets.has(sq)) { attempt(selected, sq); downRef.current = null; return; }
    if (p && (canMoveColor(p.color) || canPremoveColor(p.color))) {
      downRef.current = { x: e.clientX, y: e.clientY, sq, wasSelected: selected === sq };
      setSelected(sq);
      setDrag({ from: sq, x: e.clientX, y: e.clientY, started: false });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } else {
      setSelected(null);
      if (premove) onPremove?.(null);
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const d = downRef.current;
    const started = drag.started || (!!d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6);
    setDrag({ ...drag, x: e.clientX, y: e.clientY, started });
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = downRef.current; downRef.current = null;
    const wasDrag = drag?.started; setDrag(null);
    if (!d) return;
    const sq = squareFromPoint(e.clientX, e.clientY);
    if (wasDrag) {
      if (sq && sq !== d.sq && attempt(d.sq, sq)) return;
      return; // keep selection so the user can tap a target
    }
    if (sq === d.sq && d.wasSelected) setSelected(null); // second tap deselects
  }

  const squares = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const sq = flip ? FILES[7 - x] + (y + 1) : FILES[x] + (8 - y);
    const light = (x + y) % 2 === 0;
    const p = pieceAt(sq);
    const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
    const isPre = premove && (premove.from === sq || premove.to === sq);
    const inCheck = p?.type === "k" && p.color === turn && chess.inCheck();
    const target = targets.get(sq);
    const hasTarget = targets.has(sq);
    const dragging = drag?.started && drag.from === sq;
    squares.push(
      <div key={sq} className={cn("board-sq", light ? "sq-light" : "sq-dark")}>
        {isLast && <div className="sq-last" />}
        {isPre && <div className="sq-premove" />}
        {selected === sq && <div className="sq-selected" />}
        {inCheck && <div className="sq-check" />}
        {x === 0 && <span className={cn("coord coord-rank", light ? "coord-on-light" : "coord-on-dark")}>{sq[1]}</span>}
        {y === 7 && <span className={cn("coord coord-file", light ? "coord-on-light" : "coord-on-dark")}>{sq[0]}</span>}
        {p && (
          <img src={PIECE_URL(p.color, p.type)} alt="" draggable={false}
            className={cn("board-piece", dragging && "opacity-30")} />
        )}
        {hasTarget && (target || (p && p.color !== pieceAt(selected!)?.color) ? <div className="sq-capture" /> : <div className="sq-dot" />)}
        {badge?.square === sq && <img src={badge.icon} alt={badge.label} title={badge.label} className="sq-badge" />}
      </div>,
    );
  }

  const allArrows: Arrow[] = [...arrows, ...(premove ? [{ ...premove, tone: "premove" as const }] : [])];
  const dragPiece = drag?.started ? pieceAt(drag.from) : null;
  const rect = boardRef.current?.getBoundingClientRect();
  const size = rect ? rect.width / 8 : 0;

  return (
    <div className={cn("relative w-full select-none", className)}>
      <div
        ref={boardRef}
        className="board-grid"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {squares}
        <svg viewBox="0 0 8 8" className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            {(["best", "premove", "alt"] as const).map((t) => (
              <marker key={t} id={`ah-${t}`} markerWidth="3" markerHeight="3" refX="1.6" refY="1.5" orient="auto">
                <path d="M0,0 L3,1.5 L0,3 Z" className={`arrow-${t}-fill`} />
              </marker>
            ))}
          </defs>
          {allArrows.map((a, i) => {
            const A = squareXY(a.from, flip), B = squareXY(a.to, flip);
            const ax = A.x + 0.5, ay = A.y + 0.5, bx = B.x + 0.5, by = B.y + 0.5;
            const len = Math.hypot(bx - ax, by - ay) || 1;
            const ex = bx - ((bx - ax) / len) * 0.35, ey = by - ((by - ay) / len) * 0.35;
            const t = a.tone ?? "best";
            return <line key={i} x1={ax} y1={ay} x2={ex} y2={ey} className={`arrow-${t}`} strokeWidth={0.16}
              strokeLinecap="round" markerEnd={`url(#ah-${t})`} />;
          })}
        </svg>
      </div>
      {dragPiece && drag && (
        <img src={PIECE_URL(dragPiece.color, dragPiece.type)} alt="" className="pointer-events-none fixed z-50"
          style={{ width: size * 1.1, height: size * 1.1, left: drag.x - size * 0.55, top: drag.y - size * 0.55 }} />
      )}
      {promo && (
        <div className="absolute inset-0 z-40 flex items-center justify-center rounded-md bg-background/70 backdrop-blur-sm"
          onPointerDown={() => { setPromo(null); setSelected(null); }}>
          <div className="flex gap-2 rounded-lg border border-border bg-card p-2 shadow-panel" onPointerDown={(e) => e.stopPropagation()}>
            {["q", "r", "b", "n"].map((t) => (
              <button key={t} type="button" aria-label={`Promote to ${t}`}
                className="h-16 w-16 rounded-md bg-muted transition hover:bg-accent sm:h-20 sm:w-20"
                onClick={() => {
                  const m = { from: promo.from, to: promo.to, promotion: t };
                  if (promo.pre) onPremove?.(m); else onMove?.(m);
                  setPromo(null); setSelected(null);
                }}>
                <img src={PIECE_URL(promo.color, t)} alt="" className="h-full w-full p-1" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
