import { Chess } from "chess.js";
import type { Candidate, SearchResult } from "./engine";

export type Grade =
  | "Brilliant"
  | "Great"
  | "Best"
  | "Excellent"
  | "Good"
  | "Inaccuracy"
  | "Mistake"
  | "Blunder"
  | "Book";

export const GRADE_ICON: Record<Grade, string> = {
  Brilliant: "/classification/cls-brilliant.svg",
  Great: "/classification/cls-great.svg",
  Best: "/classification/cls-excellent.svg",
  Excellent: "/classification/cls-excellent.svg",
  Good: "/classification/cls-good.svg",
  Inaccuracy: "/classification/cls-inaccuracy.svg",
  Mistake: "/classification/cls-mistake.svg",
  Blunder: "/classification/cls-blunder.svg",
  Book: "/classification/cls-book.svg",
};

export const GRADE_ORDER: Grade[] = [
  "Brilliant", "Great", "Best", "Excellent", "Good", "Book", "Inaccuracy", "Mistake", "Blunder",
];

export const MATE_CP = 30000;
const CLAMP = 1500;

/** Engine scores are from the side to move; convert to White's perspective. */
export function toWhite(scoreCp: number, fen: string) {
  return fen.split(" ")[1] === "b" ? -scoreCp : scoreCp;
}
export function scoreOf(r: SearchResult): number {
  if (r.candidates?.length) return r.candidates[0].scoreCp;
  return r.scoreCp;
}
export function clampCp(cp: number) {
  return Math.max(-CLAMP, Math.min(CLAMP, cp));
}

export function formatEval(cpWhite: number | null | undefined, mate?: number | null) {
  if (cpWhite === null || cpWhite === undefined) return "—";
  if (Math.abs(cpWhite) >= MATE_CP - 1000) return (cpWhite > 0 ? "+" : "-") + "M" + (mate ? Math.abs(mate) : "");
  const v = cpWhite / 100;
  return (v > 0 ? "+" : "") + v.toFixed(2);
}

/** Centipawn-loss thresholds preserved from the original Berserk Web review. */
export function gradeFromLoss(loss: number): Grade {
  if (loss <= 10) return "Best";
  if (loss <= 25) return "Excellent";
  if (loss <= 50) return "Good";
  if (loss <= 100) return "Inaccuracy";
  if (loss <= 200) return "Mistake";
  return "Blunder";
}
export function accuracyFromLoss(loss: number) {
  return Math.max(0, Math.min(100, 100 * Math.exp(-loss / 300)));
}

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export type MoveInfo = { from: string; to: string; san: string; promotion?: string; color: "w" | "b" };

/**
 * Classify one move from real engine data.
 * before: search of the position before the move (multiPV ≥ 2 when available).
 * afterWhite: White-perspective evaluation of the position after the move.
 */
export function classify(
  beforeFen: string,
  move: MoveInfo,
  before: SearchResult,
  afterWhite: number,
  isBook: boolean,
) {
  const beforeWhite = toWhite(scoreOf(before), beforeFen);
  const sign = move.color === "w" ? 1 : -1;
  const loss = Math.max(0, sign * (clampCp(beforeWhite) - clampCp(afterWhite)));
  const best = before.candidates?.[0];
  const uci = move.from + move.to + (move.promotion ?? "");
  const playedBest = !!best && (best.uci === uci || best.uci.slice(0, 4) === uci.slice(0, 4));
  let grade: Grade = gradeFromLoss(loss);

  if (isBook && loss <= 50) grade = "Book";
  else if (playedBest || loss <= 10) {
    const second: Candidate | undefined = before.candidates?.[1];
    // Great: the only good move — engine's second choice is much worse.
    if (second && best && best.scoreCp - second.scoreCp >= 150 && Math.abs(best.scoreCp) < MATE_CP - 1000) grade = "Great";
    // Brilliant: best move that leaves a piece (minor or larger) en prise while staying sound.
    const c = new Chess(beforeFen);
    const m = c.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" });
    const opp = move.color === "w" ? "b" : "w";
    const pieceVal = VALUES[m.promotion ?? m.piece];
    const gained = m.captured ? VALUES[m.captured] : 0;
    const hanging = c.isAttacked(m.to as never, opp) && pieceVal >= 3 && pieceVal > gained + 1;
    if (playedBest && hanging && sign * afterWhite >= -50 && !c.isCheckmate()) grade = "Brilliant";
  }
  return {
    grade,
    loss,
    accuracy: accuracyFromLoss(loss),
    beforeWhite,
    afterWhite,
    bestUci: best?.uci ?? before.bestmove,
    bestPv: best?.pv ?? [],
  };
}

/** Engine move selection preserved from the original site (Elo + attack bias). */
export function chooseEngineMove(fen: string, result: SearchResult, elo: number, attack: number) {
  const raw = result.candidates ?? [];
  if (!raw.length) return result.bestmove && result.bestmove !== "(none)" && result.bestmove !== "0000" ? result.bestmove : null;
  const capturedValues: Record<string, number> = { p: 100, n: 310, b: 330, r: 500, q: 900 };
  const adjusted = raw.map((c) => {
    let tactical = 0;
    const copy = new Chess(fen);
    try {
      const m = copy.move({ from: c.uci.slice(0, 2), to: c.uci.slice(2, 4), promotion: c.uci[4] ?? "q" });
      if (m.captured) tactical += 20 + (capturedValues[m.captured] || 0) * 0.16;
      if (m.promotion) tactical += 70;
      if (copy.isCheckmate()) tactical += 600;
      else if (copy.inCheck()) tactical += 45;
    } catch { /* illegal candidate */ }
    const bias = Math.max(-125, Math.min(125, ((attack - 5) / 5) * tactical));
    return { uci: c.uci, rank: c.rank, score: (c.scoreCp || 0) + bias };
  });
  adjusted.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.rank - b.rank));
  const n = Math.max(0, Math.min(1, (elo - 400) / 3100));
  const maxCount = Math.max(1, Math.min(adjusted.length, 1 + Math.round((1 - n) * 7)));
  const choices = adjusted.slice(0, maxCount);
  if (elo >= 2950 || choices.length === 1) return choices[0].uci;
  const penalty = 0.15 + n * 2.85;
  const weights = choices.map((_, i) => Math.exp(-i * penalty));
  let pick = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < choices.length; i++) {
    pick -= weights[i];
    if (pick <= 0) return choices[i].uci;
  }
  return choices[0].uci;
}

export function multiPvForElo(elo: number) {
  return Math.max(1, Math.min(8, Math.ceil((3500 - elo) / 400) + 1));
}

/** Convert a UCI PV to SAN for display. */
export function pvToSan(fen: string, pv: string[], max = 10) {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of pv.slice(0, max)) {
    try {
      out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
    } catch {
      break;
    }
  }
  return out;
}

export function explain(grade: Grade, loss: number, bestSan?: string) {
  switch (grade) {
    case "Brilliant": return "A sound sacrifice — Berserk confirms the material investment pays off.";
    case "Great": return "The only strong move here; alternatives were clearly worse.";
    case "Best": return "Matches Berserk's top choice.";
    case "Book": return "A known opening move.";
    case "Excellent": return "Very close to the engine's best move.";
    case "Good": return "A reasonable move" + (bestSan ? `, though ${bestSan} was more precise.` : ".");
    default:
      return `Lost about ${Math.round(loss)} centipawns.` + (bestSan ? ` Berserk preferred ${bestSan}.` : "");
  }
}
