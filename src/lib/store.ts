// Small local persistence for settings and finished games (Statistics page).
import { useEffect, useState } from "react";
import type { Grade } from "./chess-logic";
import { saveCloudGame } from "./supabase";

export type Settings = { elo: number; attack: number; think: number; side: "w" | "b" | "random"; reviewMs: number; coords: boolean };
export const DEFAULT_SETTINGS: Settings = { elo: 1800, attack: 5, think: 1, side: "w", reviewMs: 300, coords: true };

export type ChessAccount = { provider: "lichess" | "chesscom"; username: string };
const CHESS_ACCOUNTS_KEY = "berserk.chess.accounts";
export function getConnectedChessAccounts(): ChessAccount[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CHESS_ACCOUNTS_KEY) || "[]") as ChessAccount[]; } catch { return []; }
}
export function saveConnectedChessAccounts(accounts: ChessAccount[]) {
  if (typeof window !== "undefined") localStorage.setItem(CHESS_ACCOUNTS_KEY, JSON.stringify(accounts));
}
export function setPendingChessProfile(account: ChessAccount) {
  if (typeof window !== "undefined") sessionStorage.setItem("berserk.pendingChessProfile", JSON.stringify(account));
}
export function takePendingChessProfile(): ChessAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("berserk.pendingChessProfile");
    sessionStorage.removeItem("berserk.pendingChessProfile");
    return raw ? JSON.parse(raw) as ChessAccount : null;
  } catch { return null; }
}

export type SavedGame = {
  id: string; date: number; pgn: string; result: string; humanSide: "w" | "b";
  elo: number; accuracy: number | null; grades: Partial<Record<Grade, number>>;
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? { ...fallback, ...JSON.parse(v) } : fallback; } catch { return fallback; }
}

export function useSettings() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => { setS(read("berserk.settings", DEFAULT_SETTINGS)); }, []);
  const update = (patch: Partial<Settings>) => setS((prev) => {
    const next = { ...prev, ...patch };
    localStorage.setItem("berserk.settings", JSON.stringify(next));
    return next;
  });
  return [s, update] as const;
}

function gamesStorageKey() {
  if (typeof window === "undefined") return "berserk.games";
  try {
    const session = JSON.parse(localStorage.getItem("berserk.supabase.session") || "null");
    return session?.user?.id ? `berserk.games.${session.user.id}` : "berserk.games";
  } catch { return "berserk.games"; }
}

export function loadGames(): SavedGame[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(gamesStorageKey()) || "[]"); } catch { return []; }
}
export function saveLocalGames(games: SavedGame[]) {
  if (typeof window !== "undefined") localStorage.setItem(gamesStorageKey(), JSON.stringify(games.slice(0, 200)));
}
export function saveGame(g: SavedGame) {
  const all = [g, ...loadGames()].slice(0, 200);
  saveLocalGames(all);
  void saveCloudGame(g).catch((error) => console.warn("Berserk cloud save failed:", error));
}
export function clearGames() { localStorage.removeItem(gamesStorageKey()); }

/** Hand-off of a PGN from Play / Live to the Review page. */
export function setPendingPgn(pgn: string) { sessionStorage.setItem("berserk.pendingPgn", pgn); }
export function takePendingPgn() {
  const v = sessionStorage.getItem("berserk.pendingPgn");
  sessionStorage.removeItem("berserk.pendingPgn");
  return v;
}
