const API_BASE = "https://www.chessigma.com/public-api/v1";

export type ChessigmaGameSubmission = {
  gameId: string;
  url: string;
  status: "submitted";
  message?: string;
};

export type ChessigmaDailyPuzzle = {
  date: string;
  puzzleId: string;
  fen: string;
  sideToMove: "white" | "black";
  rating: number;
  themes: string[];
  solution: string[];
  gameUrl: string | null;
};

export type ChessigmaEloResult = {
  newRating: number;
  change: number;
  expectedScore: number;
  [key: string]: unknown;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body?.error === "string" ? body.error : typeof body?.message === "string" ? body.message : `Chessigma API error (${response.status})`;
    throw new Error(response.status === 429 ? `${message}. Please wait before trying again.` : message);
  }
  return body as T;
}

/** Submit a PGN to Chessigma. Analysis itself runs on Chessigma after opening the returned URL. */
export function submitChessigmaGame(pgn: string) {
  const value = pgn.trim();
  if (!value || value.length > 10_000) {
    throw new Error("PGN must contain between 1 and 10,000 characters.");
  }
  return request<ChessigmaGameSubmission>("/game", {
    method: "POST",
    body: JSON.stringify({ pgn: value }),
  });
}

/** Read analysis for a game previously submitted through this public API. */
export function getChessigmaGame(gameId: string) {
  return request<Record<string, unknown>>(`/game/${encodeURIComponent(gameId)}`);
}

/** Fetch today's puzzle, or a historical puzzle using YYYY-MM-DD. */
export function getChessigmaDailyPuzzle(date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return request<ChessigmaDailyPuzzle>(`/daily-puzzle${query}`);
}

/** Calculate rating change for one game. */
export function calculateChessigmaElo(input: {
  yourRating: number;
  opponentRating: number;
  result: "win" | "draw" | "loss";
  system?: "fide" | "chesscom" | "lichess";
  kFactor?: number;
}) {
  const params = new URLSearchParams({
    yourRating: String(input.yourRating),
    opponentRating: String(input.opponentRating),
    result: input.result,
  });
  if (input.system) params.set("system", input.system);
  if (input.kFactor) params.set("kFactor", String(input.kFactor));
  return request<ChessigmaEloResult>(`/elo-calculator?${params.toString()}`);
}

export const CHESSIGMA_ATTRIBUTION = {
  name: "Chessigma",
  developersUrl: "https://www.chessigma.com/developers",
} as const;
