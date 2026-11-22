import { useCallback, useEffect, useState } from "react";

export type BoardThemeId = "green" | "grey" | "blue" | "light-wood" | "dark-wood" | "dark-blue";
export type PieceStyleId =
  | "staunty" | "staunty-wood" | "governor" | "merida" | "merida-traffic"
  | "companion" | "smart" | "alpha-wood" | "fresca" | "mediaeval"
  | "echiquier-ink" | "kosal-violet" | "horsey" | "byte-gambit" | "fish";

export type BoardTheme = {
  id: BoardThemeId;
  label: string;
  light: string;
  dark: string;
  lightText: string;
  darkText: string;
};

export const BOARD_THEMES: BoardTheme[] = [
  { id: "green", label: "Green", light: "#eff1dc", dark: "#78965a", lightText: "#78965a", darkText: "#eff1dc" },
  { id: "grey", label: "Grey", light: "#f0f0f0", dark: "#a0a0a0", lightText: "#707070", darkText: "#f8f8f8" },
  { id: "blue", label: "Blue", light: "#e5eaf1", dark: "#55789f", lightText: "#55789f", darkText: "#eef4fb" },
  { id: "light-wood", label: "Light Wood", light: "#efd09c", dark: "#bd925d", lightText: "#9a693d", darkText: "#fff1d7" },
  { id: "dark-wood", label: "Dark Wood", light: "#dfb993", dark: "#815037", lightText: "#815037", darkText: "#f4dfc7" },
  { id: "dark-blue", label: "Dark Blue", light: "#e1e4ef", dark: "#3c4963", lightText: "#3c4963", darkText: "#f2f4fb" },
];

export type PieceStyle = {
  id: PieceStyleId;
  label: string;
  asset: string;
  whiteFilter?: string;
  blackFilter?: string;
  customFish?: boolean;
  credit: string;
};

export const PIECE_STYLES: PieceStyle[] = [
  { id: "staunty", label: "Staunty", asset: "staunty", credit: "Staunty chess-piece artwork, Lichess piece assets" },
  { id: "staunty-wood", label: "Staunty Wood", asset: "staunty", whiteFilter: "sepia(.72) saturate(.76) brightness(1.12)", blackFilter: "sepia(.8) saturate(1.15) brightness(.82)", credit: "Staunty chess-piece artwork, Lichess piece assets; original warm colour treatment" },
  { id: "governor", label: "Governor", asset: "governor", credit: "Governor chess-piece artwork, Lichess piece assets" },
  { id: "merida", label: "Merida", asset: "merida", credit: "Merida by Armando H. Marroquín, GPL-2.0-or-later" },
  { id: "merida-traffic", label: "Merida Traffic", asset: "merida", whiteFilter: "sepia(.7) saturate(1.9) hue-rotate(350deg)", blackFilter: "sepia(.55) saturate(2.2) hue-rotate(185deg)", credit: "Merida by Armando H. Marroquín; original colour treatment" },
  { id: "companion", label: "Companion", asset: "companion", credit: "Companion chess-piece artwork, Lichess piece assets" },
  { id: "smart", label: "Smart", asset: "cburnett", credit: "Cburnett by Colin M. L. Burnett; multi-licensed artwork" },
  { id: "alpha-wood", label: "Alpha Wood", asset: "alpha", whiteFilter: "sepia(.72) saturate(.85) brightness(1.08)", blackFilter: "sepia(.85) saturate(1.2) brightness(.82)", credit: "Alpha chess-piece artwork, Lichess piece assets; original warm colour treatment" },
  { id: "fresca", label: "Fresca", asset: "fresca", credit: "Fresca chess-piece artwork, Lichess piece assets" },
  { id: "mediaeval", label: "Mediaeval", asset: "fantasy", credit: "Fantasy by Maurizio Monge, MIT" },
  { id: "echiquier-ink", label: "Echiquier Ink", asset: "letter", credit: "Letter chess-piece artwork, Lichess piece assets" },
  { id: "kosal-violet", label: "Kosal Violet", asset: "kosal", whiteFilter: "hue-rotate(220deg) saturate(1.4)", blackFilter: "hue-rotate(220deg) saturate(1.5) brightness(.9)", credit: "Kosal by Philatype, CC BY 4.0; original violet colour treatment" },
  { id: "horsey", label: "Horsey", asset: "horsey", credit: "Horsey chess-piece artwork, Lichess piece assets" },
  { id: "byte-gambit", label: "1K Byte Gambit", asset: "pixel", credit: "Pixel chess-piece artwork, Lichess piece assets" },
  { id: "fish", label: "Fish", asset: "fish", customFish: true, credit: "Original Berserk Sigma fish-themed SVG pieces" },
];

export type BoardAppearance = { board: BoardThemeId; pieces: PieceStyleId };
export const DEFAULT_BOARD_APPEARANCE: BoardAppearance = { board: "dark-blue", pieces: "staunty" };
const STORAGE_KEY = "berserk.board.appearance";
const CHANGE_EVENT = "berserk-board-appearance-change";

export function readBoardAppearance(): BoardAppearance {
  if (typeof window === "undefined") return DEFAULT_BOARD_APPEARANCE;
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Partial<BoardAppearance> | null;
    return {
      board: BOARD_THEMES.some((theme) => theme.id === value?.board) ? value!.board! : DEFAULT_BOARD_APPEARANCE.board,
      pieces: PIECE_STYLES.some((style) => style.id === value?.pieces) ? value!.pieces! : DEFAULT_BOARD_APPEARANCE.pieces,
    };
  } catch {
    return DEFAULT_BOARD_APPEARANCE;
  }
}

export function saveBoardAppearance(value: BoardAppearance) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useBoardAppearance() {
  const [appearance, setAppearance] = useState<BoardAppearance>(DEFAULT_BOARD_APPEARANCE);
  useEffect(() => {
    const refresh = () => setAppearance(readBoardAppearance());
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => window.removeEventListener(CHANGE_EVENT, refresh);
  }, []);
  const update = useCallback((patch: Partial<BoardAppearance>) => {
    const next = { ...readBoardAppearance(), ...patch };
    saveBoardAppearance(next);
    setAppearance(next);
  }, []);
  return [appearance, update] as const;
}

function escapeSvg(value: string) {
  return encodeURIComponent(value).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");
}

function fishSvg(color: "w" | "b", type: string) {
  const white = color === "w";
  const fill = white ? "#f8efd9" : "#263b49";
  const stroke = white ? "#31404b" : "#e1d5bd";
  const gold = white ? "#d5a443" : "#efb94f";
  const eye = white ? "#26333a" : "#fff8e8";
  const bodies: Record<string, string> = {
    p: '<path d="M18 51 Q31 29 61 40 Q79 46 82 56 Q70 72 47 70 Q28 68 18 51Z"/><path d="M20 51 L6 37 L8 62Z"/>',
    n: '<path d="M20 58 Q19 37 42 31 Q52 11 72 21 Q62 32 69 43 Q84 53 75 69 Q52 79 29 69Z"/><path d="M38 36 Q47 21 53 17 L53 38Z"/>',
    b: '<path d="M18 57 Q28 35 55 35 Q77 37 83 55 Q68 72 43 71 Q27 68 18 57Z"/><path d="M41 37 L53 18 L65 37"/>',
    r: '<path d="M18 57 Q26 37 51 37 Q75 37 83 57 L75 69 L28 69Z"/><path d="M28 42 L28 24 L40 31 L50 20 L61 31 L73 23 L73 43Z"/>',
    q: '<path d="M18 58 Q25 37 51 37 Q77 37 83 58 L73 70 L28 70Z"/><path d="M26 39 L20 20 L37 31 L51 12 L65 31 L81 20 L75 41Z"/><circle cx="20" cy="17" r="4"/><circle cx="51" cy="9" r="4"/><circle cx="81" cy="17" r="4"/>',
    k: '<path d="M18 59 Q27 39 51 39 Q76 39 83 59 L74 71 L28 71Z"/><path d="M51 5 V32 M39 18 H63" stroke-width="7" fill="none" stroke-linecap="round"/>',
  };
  const body = bodies[type.toLowerCase()] || bodies.p;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="${fill}" stroke="${stroke}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">${body}<path d="M43 66 Q49 78 57 84" fill="none"/><path d="M58 45 Q63 51 70 49" fill="none" stroke="${gold}" stroke-width="3"/></g><circle cx="65" cy="48" r="4.5" fill="${eye}"/><circle cx="66" cy="48" r="1.8" fill="${stroke}"/><path d="M29 48 Q36 54 29 61" fill="none" stroke="${gold}" stroke-width="3" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml,${escapeSvg(svg)}`;
}

export function pieceImageSource(color: "w" | "b", type: string, styleId: PieceStyleId) {
  const style = PIECE_STYLES.find((item) => item.id === styleId) || PIECE_STYLES[0];
  if (style.customFish) return fishSvg(color, type);
  return `https://lichess1.org/assets/piece/${style.asset}/${color}${type.toUpperCase()}.svg`;
}

export function pieceImageFilter(color: "w" | "b", styleId: PieceStyleId) {
  const style = PIECE_STYLES.find((item) => item.id === styleId);
  return color === "w" ? style?.whiteFilter : style?.blackFilter;
}
