export interface ImportedGame {
  id: string;
  source: "lichess" | "chesscom" | "worldchess" | "pgn";
  white: { name: string; rating?: number };
  black: { name: string; rating?: number };
  result: string;
  date: string;
  timeControl?: string;
  pgn: string;
  url?: string;
}

/** Fetch last 10 games from Lichess public API */
export async function fetchLichessGames(username: string): Promise<ImportedGame[]> {
  const clean = username.trim().toLowerCase();
  if (!clean) return [];

  const res = await fetch(`https://lichess.org/api/games/user/${encodeURIComponent(clean)}?max=10&pgnInJson=true`, {
    headers: { Accept: "application/x-ndjson" },
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error(`Lichess player "${clean}" not found.`);
    throw new Error(`Lichess error (${res.status})`);
  }

  const text = await res.text();
  const lines = text.trim().split("\n").filter(Boolean);

  return lines.map((line) => {
    const g = JSON.parse(line);
    const whiteName = g.players?.white?.user?.name || "Anonymous";
    const blackName = g.players?.black?.user?.name || "Anonymous";
    let result = "1/2-1/2";
    if (g.winner === "white") result = "1-0";
    else if (g.winner === "black") result = "0-1";

    return {
      id: g.id,
      source: "lichess",
      white: { name: whiteName, rating: g.players?.white?.rating },
      black: { name: blackName, rating: g.players?.black?.rating },
      result,
      date: new Date(g.createdAt).toLocaleDateString(),
      timeControl: g.speed || (g.clock ? `${g.clock.initial / 60}+${g.clock.increment}` : "standard"),
      pgn: g.pgn || "",
      url: `https://lichess.org/${g.id}`,
    };
  });
}

/** Fetch games from Chess.com public API for current month */
export async function fetchChessComGames(username: string): Promise<ImportedGame[]> {
  const clean = username.trim().toLowerCase();
  if (!clean) return [];

  // 1. Get archives list
  const archRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(clean)}/games/archives`);
  if (!archRes.ok) {
    if (archRes.status === 404) throw new Error(`Chess.com user "${clean}" not found.`);
    throw new Error(`Chess.com error (${archRes.status})`);
  }

  const { archives } = await archRes.json();
  if (!archives || archives.length === 0) return [];

  // 2. Fetch the most recent archive (latest month)
  const latestUrl = archives[archives.length - 1];
  const gamesRes = await fetch(latestUrl);
  if (!gamesRes.ok) throw new Error("Could not fetch Chess.com games.");

  const { games } = await gamesRes.json();
  const recent = (games || []).slice(-10).reverse();

  return recent.map((g: any) => {
    let result = "1/2-1/2";
    if (g.white.result === "win") result = "1-0";
    else if (g.black.result === "win") result = "0-1";

    return {
      id: g.uuid || String(g.end_time),
      source: "chesscom",
      white: { name: g.white.username, rating: g.white.rating },
      black: { name: g.black.username, rating: g.black.rating },
      result,
      date: new Date(g.end_time * 1000).toLocaleDateString(),
      timeControl: g.time_class || g.time_control,
      pgn: g.pgn || "",
      url: g.url,
    };
  });
}

/** Parse raw PGN string from Worldchess or manual paste */
export function parsePgnGame(pgn: string): ImportedGame {
  const getHeader = (name: string, fallback = "") => {
    const m = pgn.match(new RegExp(`\\[${name}\\s+"([^"]+)"\\]`, "i"));
    return m ? m[1] : fallback;
  };

  return {
    id: "custom-" + Date.now(),
    source: "pgn",
    white: {
      name: getHeader("White", "White"),
      rating: parseInt(getHeader("WhiteElo", "0"), 10) || undefined,
    },
    black: {
      name: getHeader("Black", "Black"),
      rating: parseInt(getHeader("BlackElo", "0"), 10) || undefined,
    },
    result: getHeader("Result", "*"),
    date: getHeader("Date", new Date().toLocaleDateString()),
    timeControl: getHeader("TimeControl", "Standard"),
    pgn: pgn.trim(),
  };
}
