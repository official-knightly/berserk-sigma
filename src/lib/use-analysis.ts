import { Chess, type Move } from "chess.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { engine, type SearchResult } from "./engine";
import { classify, pvToSan, scoreOf, toWhite, type Grade } from "./chess-logic";
import { isBookPly } from "./openings";

export type MoveReview = {
  ply: number; san: string; color: "w" | "b"; from: string; to: string;
  grade: Grade; loss: number; accuracy: number; beforeWhite: number; afterWhite: number;
  bestUci: string; bestSan?: string; bestPvSan: string[]; beforeFen: string; afterFen: string;
};

/** Parse a PGN (or empty) into a start FEN + verbose moves. */
export function parseGame(pgn: string) {
  const c = new Chess();
  c.loadPgn(pgn);
  const headers = c.header() as Record<string, string>;
  const moves = c.history({ verbose: true });
  const startFen = moves[0]?.before ?? c.fen();
  return { headers, moves, startFen };
}

/**
 * Incrementally analyze every position of a move sequence with real Berserk searches.
 * positions[i] = search of the position after i plies. New plies (live games) are analyzed as they arrive.
 */
export function useGameAnalysis(moves: Move[], startFen: string, ms: number, enabled = true) {
  const [positions, setPositions] = useState<(SearchResult | undefined)[]>([]);
  const [running, setRunning] = useState(false);
  const keyRef = useRef("");
  const tokenRef = useRef(0);
  const fens = useMemo(() => [startFen, ...moves.map((m) => m.after)], [moves, startFen]);

  useEffect(() => {
    // Reset when the game itself changes (not when moves are appended).
    const key = startFen + "|" + (moves[0]?.san ?? "");
    if (key !== keyRef.current) { keyRef.current = key; tokenRef.current++; setPositions([]); }
  }, [startFen, moves]);

  useEffect(() => {
    if (!enabled) return;
    const token = ++tokenRef.current;
    let cancelled = false;
    (async () => {
      setRunning(true);
      for (let i = 0; i < fens.length; i++) {
        if (cancelled || token !== tokenRef.current) return;
        let have = false;
        setPositions((p) => { have = !!p[i] && (p[i] as SearchResult & { fen?: string }).fen === fens[i]; return p; });
        await Promise.resolve();
        if (have) continue;
        const c = new Chess(fens[i]);
        if (c.isGameOver()) {
          const score = c.isCheckmate() ? -30000 : 0;
          const r = { bestmove: "(none)", scoreCp: score, depth: 0, nodes: "0", candidates: [], fen: fens[i] } as SearchResult & { fen: string };
          setPositions((p) => { const n = p.slice(); n[i] = r; return n; });
          continue;
        }
        try {
          const r = await engine.search(fens[i], ms, 3);
          if (cancelled || token !== tokenRef.current) return;
          setPositions((p) => { const n = p.slice(); n[i] = Object.assign(r, { fen: fens[i] }); return n; });
        } catch {
          if (!cancelled && token === tokenRef.current) setRunning(false);
          return;
        }
      }
      if (!cancelled && token === tokenRef.current) setRunning(false);
    })();
    return () => { cancelled = true; setRunning(false); };
  }, [fens, ms, enabled]);

  const reviews = useMemo(() => {
    const sans = moves.map((m) => m.san);
    const out: (MoveReview | undefined)[] = [];
    for (let i = 0; i < moves.length; i++) {
      const b = positions[i], a = positions[i + 1];
      if (!b || !a) { out.push(undefined); continue; }
      const m = moves[i];
      const afterWhite = toWhite(scoreOf(a), m.after);
      const c = classify(m.before, m, b, afterWhite, isBookPly(sans, i + 1));
      const bestSanList = pvToSan(m.before, c.bestPv.length ? c.bestPv : [c.bestUci], 8);
      out.push({
        ply: i + 1, san: m.san, color: m.color, from: m.from, to: m.to,
        grade: c.grade, loss: c.loss, accuracy: c.accuracy, beforeWhite: c.beforeWhite, afterWhite,
        bestUci: c.bestUci, bestSan: bestSanList[0], bestPvSan: bestSanList, beforeFen: m.before, afterFen: m.after,
      });
    }
    return out;
  }, [positions, moves]);

  const done = positions.filter(Boolean).length;
  return { positions, reviews, running, progress: fens.length ? done / fens.length : 0, total: fens.length, done };
}


/**
 * Review a SAN move list from the starting position.
 * This adapter keeps the review route API small while reusing the same
 * Berserk-backed position analysis and move classification as live analysis.
 */
export function useGameReview(
  sans: string[],
  startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
) {
  const moves = useMemo(() => {
    const chess = new Chess(startFen);
    const parsed: Move[] = [];
    for (const san of sans) {
      const move = chess.move(san);
      if (move) parsed.push(move);
    }
    return parsed;
  }, [sans]);

  const analysis = useGameAnalysis(moves, startFen, 150, sans.length > 0);
  return {
    reviews: analysis.reviews,
    running: analysis.running,
    progress: analysis.progress,
  };
}

export function summarize(reviews: (MoveReview | undefined)[]) {
  const side = (c: "w" | "b") => {
    const list = reviews.filter((r): r is MoveReview => !!r && r.color === c);
    const counts: Partial<Record<Grade, number>> = {};
    list.forEach((r) => { counts[r.grade] = (counts[r.grade] ?? 0) + 1; });
    const acc = list.length ? list.reduce((s, r) => s + r.accuracy, 0) / list.length : null;
    const acpl = list.length ? list.reduce((s, r) => s + Math.min(r.loss, 1000), 0) / list.length : null;
    return { list, counts, acc, acpl };
  };
  return { w: side("w"), b: side("b") };
}
