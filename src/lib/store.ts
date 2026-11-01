// Small local persistence for settings and finished games (Statistics page).
import { useEffect, useState } from "react";
import type { Grade } from "./chess-logic";
import { saveCloudGame } from "./supabase";

export type Settings = { elo: number; attack: number; think: number; side: "w" | "b" | "random"; reviewMs: number; coords: boolean };
export const DEFAULT_SETTINGS: Settings = { elo: 1800, attack: 5, think: 1, side: "w", reviewMs: 300, coords: true };

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

export function loadGames(): SavedGame[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("berserk.games") || "[]"); } catch { return []; }
}
export function saveGame(g: SavedGame) {
  const all = [g, ...loadGames()].slice(0, 200);
  localStorage.setItem("berserk.games", JSON.stringify(all));
  void saveCloudGame(g).catch((error) => console.warn("Berserk cloud save failed:", error));
}
export function clearGames() { localStorage.removeItem("berserk.games"); }

/** Hand-off of a PGN from Play / Live to the Review page. */
export function setPendingPgn(pgn: string) { sessionStorage.setItem("berserk.pendingPgn", pgn); }
export function takePendingPgn() {
  const v = sessionStorage.getItem("berserk.pendingPgn");
  sessionStorage.removeItem("berserk.pendingPgn");
  return v;
}
