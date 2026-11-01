import { createServerFn } from "@tanstack/react-start";

type ChessComGameType = "live" | "daily";

/** Fetch a public Chess.com game on the server because its callback endpoint does not expose browser CORS. */
export const fetchChessComGamePgn = createServerFn({ method: "GET" })
  .validator((input: { gameType: ChessComGameType; gameId: string }) => {
    if (!/^(live|daily)$/.test(input.gameType) || !/^\\d+$/.test(input.gameId)) {
      throw new Error("Invalid Chess.com game URL.");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const response = await fetch(
      `https://www.chess.com/callback/${data.gameType}/game/${data.gameId}`,
      { headers: { Accept: "application/json", Referer: "https://www.chess.com/" } },
    );
    if (!response.ok) throw new Error(`Chess.com game request failed (${response.status}).`);

    const body = await response.text();
    let pgn = "";
    try {
      const payload = JSON.parse(body) as { pgn?: string; game?: { pgn?: string } };
      pgn = payload.game?.pgn || payload.pgn || "";
    } catch {
      if (/^\\s*\\[Event\\s+/m.test(body)) pgn = body;
    }
    if (!pgn.trim()) {
      throw new Error("Chess.com did not return a PGN for this game. Try again or use its PGN export.");
    }
    return pgn;
  });
