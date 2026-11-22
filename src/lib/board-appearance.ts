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

type Palette = { light: string; dark: string; outline: string; accent: string; pixel?: boolean; fish?: boolean };
export type PieceStyle = { id: PieceStyleId; label: string; palette: Palette; credit: string };

export const PIECE_STYLES: PieceStyle[] = [
  { id: "staunty", label: "Staunty", palette: { light: "#f7f4e9", dark: "#343638", outline: "#242628", accent: "#c2a35c" }, credit: "Original Berserk Sigma Staunton-inspired SVG artwork" },
  { id: "staunty-wood", label: "Staunty Wood", palette: { light: "#e7c39c", dark: "#86553b", outline: "#543a2c", accent: "#f3d5ae" }, credit: "Original Berserk Sigma SVG artwork and wood palette" },
  { id: "governor", label: "Governor", palette: { light: "#ffffff", dark: "#161616", outline: "#111111", accent: "#c8a34e" }, credit: "Original Berserk Sigma SVG artwork and gold detailing" },
  { id: "merida", label: "Merida", palette: { light: "#f2eddd", dark: "#302d2c", outline: "#242323", accent: "#a79d88" }, credit: "Original Berserk Sigma classical SVG style" },
  { id: "merida-traffic", label: "Merida Traffic", palette: { light: "#f2c84f", dark: "#233b5d", outline: "#172a44", accent: "#e45a3e" }, credit: "Original Berserk Sigma SVG artwork and traffic palette" },
  { id: "companion", label: "Companion", palette: { light: "#fff8ed", dark: "#55545d", outline: "#363640", accent: "#96b4d3" }, credit: "Original Berserk Sigma rounded SVG style" },
  { id: "smart", label: "Smart", palette: { light: "#ffffff", dark: "#202124", outline: "#141414", accent: "#a7adb2" }, credit: "Original Berserk Sigma clean monochrome SVG style" },
  { id: "alpha-wood", label: "Alpha Wood", palette: { light: "#dfbd92", dark: "#67452f", outline: "#4b3323", accent: "#c38b56" }, credit: "Original Berserk Sigma SVG artwork and wood palette" },
  { id: "fresca", label: "Fresca", palette: { light: "#fff5e6", dark: "#3c8880", outline: "#245b55", accent: "#ef816b" }, credit: "Original Berserk Sigma fresh-colour SVG style" },
  { id: "mediaeval", label: "Mediaeval", palette: { light: "#e9dfc9", dark: "#3e352b", outline: "#28231c", accent: "#b38c4f" }, credit: "Original Berserk Sigma ornamental SVG style" },
  { id: "echiquier-ink", label: "Echiquier Ink", palette: { light: "#c9e4f4", dark: "#183452", outline: "#10263f", accent: "#5aa6cc" }, credit: "Original Berserk Sigma ink-blue SVG style" },
  { id: "kosal-violet", label: "Kosal Violet", palette: { light: "#e2d4f4", dark: "#59457d", outline: "#3b2c59", accent: "#b18bdc" }, credit: "Original Berserk Sigma violet SVG style" },
  { id: "horsey", label: "Horsey", palette: { light: "#f7f5eb", dark: "#777e87", outline: "#41464d", accent: "#cad0d4" }, credit: "Original Berserk Sigma horse-profile knight SVG style" },
  { id: "byte-gambit", label: "1K Byte Gambit", palette: { light: "#24ddd5", dark: "#c63dc5", outline: "#15151b", accent: "#ffdc50", pixel: true }, credit: "Original Berserk Sigma pixel-inspired SVG style" },
  { id: "fish", label: "Fish", palette: { light: "#f2ddb6", dark: "#24485c", outline: "#173647", accent: "#f2ae45", fish: true }, credit: "Original Berserk Sigma fish-themed SVG artwork" },
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

function encodeSvg(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27")}`;
}

const CLASSIC_SHAPES: Record<string, string> = {
  p: `<circle cx="50" cy="22" r="12"/><path d="M41 37 Q34 48 34 61 L29 72 L71 72 L66 61 Q66 48 59 37Z"/>`,
  r: `<path d="M24 16 H37 V27 H46 V16 H57 V27 H66 V16 H78 V39 H73 V69 H27 V39 H24Z"/>`,
  n: `<path d="M25 72 Q26 60 33 50 Q29 42 35 33 L48 20 L62 24 L72 15 L76 33 Q70 42 64 47 Q74 54 72 70Z"/><path d="M40 35 L52 44 L43 50" fill="none"/>`,
  b: `<path d="M50 12 Q67 27 64 42 Q62 49 57 54 L67 69 H33 L43 54 Q38 48 36 42 Q33 27 50 12Z"/><path d="M45 23 L56 44" fill="none" stroke-width="5"/>`,
  q: `<path d="M23 30 L34 44 L42 21 L50 42 L59 21 L67 44 L78 30 L70 68 H30Z"/><circle cx="23" cy="24" r="5"/><circle cx="42" cy="15" r="5"/><circle cx="59" cy="15" r="5"/><circle cx="78" cy="24" r="5"/>`,
  k: `<path d="M25 39 L37 48 L43 29 L50 44 L57 29 L63 48 L75 39 L69 69 H31Z"/><path d="M50 7 V27 M39 17 H61" fill="none" stroke-width="6" stroke-linecap="round"/>`,
};

const BASES = `<path d="M28 72 Q50 66 72 72 L78 83 Q50 90 22 83Z"/><path d="M18 88 Q50 82 82 88 L86 95 H14Z"/>`;

function fishPiece(type: string, palette: Palette) {
  const fishBodies: Record<string, string> = {
    p: `<path d="M18 51 Q31 29 61 40 Q79 46 82 56 Q70 72 47 70 Q28 68 18 51Z"/><path d="M20 51 L6 37 L8 62Z"/>`,
    n: `<path d="M20 58 Q19 37 42 31 Q52 11 72 21 Q62 32 69 43 Q84 53 75 69 Q52 79 29 69Z"/><path d="M38 36 Q47 21 53 17 L53 38Z"/>`,
    b: `<path d="M18 57 Q28 35 55 35 Q77 37 83 55 Q68 72 43 71 Q27 68 18 57Z"/><path d="M41 37 L53 18 L65 37"/>`,
    r: `<path d="M18 57 Q26 37 51 37 Q75 37 83 57 L75 69 L28 69Z"/><path d="M28 42 L28 24 L40 31 L50 20 L61 31 L73 23 L73 43Z"/>`,
    q: `<path d="M18 58 Q25 37 51 37 Q77 37 83 58 L73 70 L28 70Z"/><path d="M26 39 L20 20 L37 31 L51 12 L65 31 L81 20 L75 41Z"/><circle cx="20" cy="17" r="4"/><circle cx="51" cy="9" r="4"/><circle cx="81" cy="17" r="4"/>`,
    k: `<path d="M18 59 Q27 39 51 39 Q76 39 83 59 L74 71 L28 71Z"/><path d="M51 5 V32 M39 18 H63" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  };
  const body = fishBodies[type.toLowerCase()] || fishBodies["p"];
  return `<g fill="${palette.light}" stroke="${palette.outline}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">${body}<path d="M43 66 Q49 78 57 84" fill="none"/><path d="M58 45 Q63 51 70 49" fill="none" stroke="${palette.accent}" stroke-width="3"/></g><circle cx="65" cy="48" r="4.5" fill="${palette.outline}"/><circle cx="66" cy="48" r="1.8" fill="${palette.light}"/><path d="M29 48 Q36 54 29 61" fill="none" stroke="${palette.accent}" stroke-width="3" stroke-linecap="round"/>`;
}

function pixelPiece(type: string, palette: Palette) {
  const blocks: Record<string, string> = {
    p: `<rect x="39" y="13" width="22" height="18"/><rect x="32" y="32" width="36" height="31"/>`,
    r: `<rect x="22" y="14" width="16" height="18"/><rect x="42" y="14" width="16" height="18"/><rect x="62" y="14" width="16" height="18"/><rect x="27" y="33" width="46" height="38"/>`,
    n: `<path d="M28 72 V48 H38 V36 H50 V23 H68 V34 H78 V54 H66 V72Z"/>`,
    b: `<path d="M50 10 L69 31 L64 48 L75 69 H25 L36 48 L31 31Z"/>`,
    q: `<path d="M18 27 H30 V16 H42 V30 H50 V12 H60 V30 H71 V16 H82 V29 L73 70 H27Z"/>`,
    k: `<path d="M44 8 H56 V28 H72 V40 H62 V69 H38 V40 H28 V28 H44Z"/>`,
  };
  return `<g fill="${palette.light}" stroke="${palette.outline}" stroke-width="5" shape-rendering="crispEdges">${blocks[type.toLowerCase()] || blocks["p"]}</g><path d="M22 80 H78 M16 91 H84" stroke="${palette.accent}" stroke-width="7" stroke-linecap="square"/>`;
}

export function pieceImageSource(color: "w" | "b", type: string, styleId: PieceStyleId) {
  const style = PIECE_STYLES.find((item) => item.id === styleId) ?? PIECE_STYLES[0];
  const palette = style.palette;
  const light = color === "w" ? palette.light : palette.dark;
  const other = color === "w" ? palette.dark : palette.light;
  const outline = color === "w" ? palette.outline : palette.light;
  let body: string;
  if (palette.fish) {
    body = fishPiece(type, { ...palette, light, dark: other, outline });
  } else if (palette.pixel) {
    body = pixelPiece(type, { ...palette, light, dark: other, outline });
  } else {
    const shape = CLASSIC_SHAPES[type.toLowerCase()] ?? CLASSIC_SHAPES["p"];
    body = `<g fill="${light}" stroke="${outline}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">${shape}</g><path d="M28 72 Q50 66 72 72 L78 83 Q50 90 22 83Z" fill="${light}" stroke="${outline}" stroke-width="4"/><path d="M18 88 Q50 82 82 88 L86 95 H14Z" fill="${light}" stroke="${outline}" stroke-width="4"/><path d="M39 79 Q50 82 61 79" fill="none" stroke="${palette.accent}" stroke-width="2.8"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${other}"/></linearGradient></defs><ellipse cx="50" cy="96" rx="31" ry="2.5" fill="#000" opacity=".18"/>${body}</svg>`;
  return encodeSvg(svg);
}

export function pieceImageFilter(_color: "w" | "b", _styleId: PieceStyleId) {
  return undefined;
}
