import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Chess } from "chess.js";
import {
  CalendarDays,
  ChevronDown,
  Download,
  ExternalLink,
  FileUp,
  Filter,
  Gamepad2,
  Loader2,
  Search,
  Swords,
  Upload,
} from "lucide-react";
import {
  fetchChessComGames,
  fetchLichessGames,
  parsePgnGame,
  type ImportedGame,
} from "@/lib/game-import";
import {
  getConnectedChessAccounts,
  loadGames,
  saveGame,
  setPendingPgn,
  type ChessAccount,
  type SavedGame,
} from "@/lib/store";
import { syncCloudGames } from "@/lib/supabase";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Games — Berserk Sigma" },
      { name: "description", content: "Manage imported and played chess games, filter your history and open game reviews." },
    ],
  }),
  component: GamesPage,
});

type ResultFilter = "all" | "win" | "draw" | "loss";
type PlatformFilter = "all" | "lichess" | "chesscom" | "local";
type TimeFilter = "all" | "bullet" | "blitz" | "rapid" | "classical";

function readPgn(pgn: string) {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const headers = chess.getHeaders();
    const history = chess.history();
    return {
      white: headers["White"] || "White",
      black: headers["Black"] || "Black",
      whiteElo: headers["White"]Elo || "",
      blackElo: headers["Black"]Elo || "",
      opening: headers["Opening"] || (headers["ECO"] ? `ECO ${headers["ECO"]}` : "Opening unavailable"),
      time: headers["TimeControl"] || headers["Time"] || "",
      date: headers["Date"] || "",
      moves: history.length,
    };
  } catch {
    return { white: "White", black: "Black", whiteElo: "", blackElo: "", opening: "Opening unavailable", time: "", date: "", moves: 0 };
  }
}

function inferPlatform(game: SavedGame): PlatformFilter {
  if (game.id.startsWith("lichess:")) return "lichess";
  if (game.id.startsWith("chesscom:")) return "chesscom";
  return "local";
}

function resultForPlayer(result: string, side: "w" | "b") {
  if (result === "1/2-1/2") return "draw";
  if (result !== "1-0" && result !== "0-1") return "unknown";
  const whiteWon = result === "1-0";
  return (side === "w") === whiteWon ? "win" : "loss";
}

function prettyResult(result: string, side: "w" | "b") {
  const value = resultForPlayer(result, side);
  return value === "win" ? "Win" : value === "loss" ? "Loss" : value === "draw" ? "Draw" : "Unknown";
}

function formatDate(value: number) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function GamesPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<SavedGame[]>(() => loadGames());
  const [accounts, setAccounts] = useState<ChessAccount[]>(() => getConnectedChessAccounts());
  const [activeAccount, setActiveAccount] = useState("all");
  const [username, setUsername] = useState("");
  const [provider, setProvider] = useState<"lichess" | "chesscom">("lichess");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [result, setResult] = useState<ResultFilter>("all");
  const [time, setTime] = useState<TimeFilter>("all");
  const [query, setQuery] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [pgnText, setPgnText] = useState("");
  const [pgnError, setPgnError] = useState("");

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const merged = await syncCloudGames(loadGames());
        if (active) setGames(merged);
      } catch {
        if (active) setGames(loadGames());
      }
      if (active) setAccounts(getConnectedChessAccounts());
    }
    void refresh();
    const onUpdate = () => { void refresh(); };
    window.addEventListener("berserk-games-updated", onUpdate);
    window.addEventListener("berserk-auth-change", onUpdate);
    return () => {
      active = false;
      window.removeEventListener("berserk-games-updated", onUpdate);
      window.removeEventListener("berserk-auth-change", onUpdate);
    };
  }, []);

  const counts = useMemo(() => {
    const value = { wins: 0, draws: 0, losses: 0 };
    games.forEach((game) => {
      const playerResult = resultForPlayer(game.result, game.humanSide);
      if (playerResult === "win") value.wins += 1;
      else if (playerResult === "draw") value.draws += 1;
      else if (playerResult === "loss") value.losses += 1;
    });
    return value;
  }, [games]);

  const visible = useMemo(() => {
    return [...games]
      .filter((game) => platform === "all" || inferPlatform(game) === platform)
      .filter((game) => result === "all" || resultForPlayer(game.result, game.humanSide) === result)
      .filter((game) => {
        if (time === "all") return true;
        const meta = readPgn(game.pgn);
        const control = meta.time.toLowerCase();
        if (time === "bullet") return control.includes("bullet") || /^\d+\+\d+$/.test(control) && Number(control.split("+")[0]) <= 179;
        if (time === "blitz") return control.includes("blitz") || /^\d+\+\d+$/.test(control) && Number(control.split("+")[0]) >= 180 && Number(control.split("+")[0]) <= 599;
        if (time === "rapid") return control.includes("rapid") || /^\d+\+\d+$/.test(control) && Number(control.split("+")[0]) >= 600 && Number(control.split("+")[0]) <= 1799;
        return control.includes("classical") || /^\d+\+\d+$/.test(control) && Number(control.split("+")[0]) >= 1800;
      })
      .filter((game) => {
        if (!query.trim()) return true;
        const meta = readPgn(game.pgn);
        const q = query.toLowerCase();
        return `${meta.white} ${meta.black} ${meta.opening}`.toLowerCase().includes(q);
      })
      .sort((a, b) => b.date - a.date);
  }, [games, platform, result, time, query]);

  const importProfile = async () => {
    const clean = username.trim().replace(/^@/, "");
    if (!clean || loading) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const fetched: ImportedGame[] = provider === "lichess" ? await fetchLichessGames(clean) : await fetchChessComGames(clean);
      if (!fetched.length) {
        setMessage(`No public games with PGN were found for ${clean}.`);
        return;
      }
      const existing = new Set(loadGames().map((game) => game.id));
      let added = 0;
      for (const item of fetched) {
        const userIsWhite = item.white.name.toLowerCase() === clean.toLowerCase();
        const userIsBlack = item.black.name.toLowerCase() === clean.toLowerCase();
        const id = `${provider}:${item.id}`;
        if (existing.has(id) || !item.pgn?.trim()) continue;
        const date = Date.parse(item.date) || Date.now();
        saveGame({
          id,
          date,
          pgn: item.pgn,
          result: item.result,
          humanSide: userIsWhite ? "w" : userIsBlack ? "b" : "w",
          elo: (userIsWhite ? item.white.rating : item.black.rating) || 0,
          accuracy: null,
          grades: {},
        });
        existing.add(id);
        added += 1;
      }
      setGames(loadGames());
      setMessage(added ? `Imported ${added} new games from ${provider === "lichess" ? "Lichess" : "Chess.com"}.` : "Those games are already in your library, or no PGNs were available.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import this profile.");
    } finally {
      setLoading(false);
    }
  };

  const importPgn = () => {
    setPgnError("");
    try {
      const imported = parsePgnGame(pgnText);
      if (!imported.pgn) throw new Error("Paste a complete PGN before importing.");
      const date = Date.parse(imported.date) || Date.now();
      saveGame({
        id: `pgn:${imported.id}`,
        date,
        pgn: imported.pgn,
        result: imported.result,
        humanSide: "w",
        elo: imported.white.rating || 0,
        accuracy: null,
        grades: {},
      });
      setGames(loadGames());
      setPgnText("");
      setShowImport(false);
      setMessage("PGN imported into your game library.");
    } catch (err) {
      setPgnError(err instanceof Error ? err.message : "This PGN could not be imported.");
    }
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 2_000_000) {
      setPgnError("PGN file must be smaller than 2 MB.");
      return;
    }
    try {
      setPgnText(await file.text());
      setPgnError("");
    } catch {
      setPgnError("Could not read that PGN file.");
    }
  };

  function openReview(game: SavedGame) {
    setPendingPgn(game.pgn);
    navigate({ to: "/review" });
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-primary">YOUR CHESS LIBRARY</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Games</h1><p className="mt-2 text-sm text-muted-foreground">Your played games, public imports and PGN library.</p></div>
        <button type="button" onClick={() => setShowImport((value) => !value)} className="btn btn-primary"><Upload className="h-4 w-4" /> Import games</button>
      </header>

      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="panel p-3 sm:p-4"><p className="text-[10px] text-muted-foreground">Wins</p><p className="mt-1 font-mono text-2xl font-extrabold text-emerald-400">{counts.wins}</p></div>
        <div className="panel p-3 sm:p-4"><p className="text-[10px] text-muted-foreground">Draws</p><p className="mt-1 font-mono text-2xl font-extrabold">{counts.draws}</p></div>
        <div className="panel p-3 sm:p-4"><p className="text-[10px] text-muted-foreground">Losses</p><p className="mt-1 font-mono text-2xl font-extrabold text-rose-400">{counts.losses}</p></div>
      </section>

      {showImport && (
        <section className="panel space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold">Import games</h2><p className="mt-1 text-xs text-muted-foreground">Fetch public games or paste a PGN file.</p></div><button type="button" onClick={() => setShowImport(false)} className="btn btn-ghost btn-sm">Close</button></div>
          <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
            <select className="field" value={provider} onChange={(event) => setProvider(event.target.value as "lichess" | "chesscom")} aria-label="Platform"><option value="lichess">Lichess</option><option value="chesscom">Chess.com</option></select>
            <input className="field min-w-0" value={username} onChange={(event) => setUsername(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void importProfile()} placeholder="Public username" aria-label="Chess username" />
            <button type="button" onClick={() => void importProfile()} disabled={loading || !username.trim()} className="btn btn-secondary">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Fetch games</button>
          </div>
          <div className="grid gap-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><label className="text-xs font-semibold" htmlFor="games-pgn">PGN text or file</label><label className="btn btn-secondary btn-sm cursor-pointer"><FileUp className="h-4 w-4" /> Choose PGN<input type="file" accept=".pgn,text/plain" className="sr-only" onChange={(event) => void importFile(event.target.files?.[0])} /></label></div>
            <textarea id="games-pgn" className="field min-h-28 w-full resize-y font-mono text-xs" value={pgnText} onChange={(event) => setPgnText(event.target.value)} placeholder={'[Event "Casual Game"]\n[White "Player"]\n[Black "Opponent"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 *'} />
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] text-muted-foreground">PGN file limit: 2 MB. Duplicate game IDs are skipped on public profile import.</span><button type="button" onClick={importPgn} disabled={!pgnText.trim()} className="btn btn-primary btn-sm">Add PGN</button></div>
            {pgnError && <p className="text-xs text-destructive" role="alert">{pgnError}</p>}
          </div>
          {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
          {message && <p className="text-xs text-primary" role="status">{message}</p>}
        </section>
      )}

      <section className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">GAME HISTORY</p><h2 className="mt-1 text-lg font-bold">{visible.length} games</h2></div>
          <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-2 sm:flex-initial">
            <div className="relative min-w-[155px] flex-1 sm:w-48 sm:flex-none"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className="field h-9 w-full pl-9 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player / opening" aria-label="Search games" /></div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="text-[10px] font-semibold text-muted-foreground" htmlFor="games-account-select">Account</label>
          <select id="games-account-select" className="field h-9 min-w-[190px] flex-1 text-xs" value={activeAccount} onChange={(event) => {
            const value = event.target.value;
            setActiveAccount(value);
            const account = accounts.find((item) => `${item.provider}:${item.username}` === value);
            if (account) { setProvider(account.provider); setUsername(account.username); }
          }}>
            <option value="all">All saved games</option>
            {accounts.map((account) => <option key={account.provider + ":" + account.username} value={account.provider + ":" + account.username}>{account.username} · {account.provider === "chesscom" ? "Chess.com" : "Lichess"}</option>)}
          </select>
          {accounts.length === 0 && <span className="text-[10px] text-muted-foreground">Connect profiles in Settings to import by account.</span>}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-[10px] text-muted-foreground"><Filter className="h-3.5 w-3.5" /> Platform<select className="field h-9 min-w-0 flex-1 text-xs" value={platform} onChange={(event) => setPlatform(event.target.value as PlatformFilter)}><option value="all">All platforms</option><option value="lichess">Lichess</option><option value="chesscom">Chess.com</option><option value="local">Local / PGN</option></select></label>
          <label className="flex items-center gap-2 text-[10px] text-muted-foreground">Result<select className="field h-9 min-w-0 flex-1 text-xs" value={result} onChange={(event) => setResult(event.target.value as ResultFilter)}><option value="all">All results</option><option value="win">Wins</option><option value="draw">Draws</option><option value="loss">Losses</option></select></label>
          <label className="flex items-center gap-2 text-[10px] text-muted-foreground">Time control<select className="field h-9 min-w-0 flex-1 text-xs" value={time} onChange={(event) => setTime(event.target.value as TimeFilter)}><option value="all">All time controls</option><option value="bullet">Bullet</option><option value="blitz">Blitz</option><option value="rapid">Rapid</option><option value="classical">Classical</option></select></label>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3"><div className="flex items-center gap-2 text-sm font-bold"><CalendarDays className="h-4 w-4 text-primary" /> Recent games</div><span className="text-[10px] text-muted-foreground">Newest first</span></div>
        {visible.length ? (
          <div className="divide-y divide-border">
            {visible.map((game) => {
              const meta = readPgn(game.pgn);
              const resultLabel = prettyResult(game.result, game.humanSide);
              const gamePlatform = inferPlatform(game);
              const opponent = game.humanSide === "w" ? meta.black : meta.white;
              const opponentRating = game.humanSide === "w" ? meta.blackElo : meta.whiteElo;
              return (
                <article key={game.id} className="flex min-w-0 items-center gap-3 px-3 py-3 sm:px-4">
                  <span className={`h-10 w-1 shrink-0 rounded-full ${resultLabel === "Win" ? "bg-emerald-400" : resultLabel === "Loss" ? "bg-rose-400" : "bg-muted-foreground"}`} />
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold text-muted-foreground">{opponent.slice(0,1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5"><span className="max-w-[160px] truncate text-sm font-bold">{opponent}</span>{opponentRating && <span className="font-mono text-[10px] text-muted-foreground">{opponentRating}</span>}<span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${resultLabel === "Win" ? "bg-emerald-500/10 text-emerald-400" : resultLabel === "Loss" ? "bg-rose-500/10 text-rose-400" : "bg-surface text-muted-foreground"}`}>{resultLabel}</span></div>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">{formatDate(game.date)} · {gamePlatform === "lichess" ? "Lichess" : gamePlatform === "chesscom" ? "Chess.com" : "Local / PGN"} · {meta.time || "Time control unknown"} · {meta.moves} plies</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{meta.opening}</p>
                  </div>
                  <button type="button" onClick={() => openReview(game)} className="btn btn-secondary btn-sm shrink-0"><Swords className="h-3.5 w-3.5" /><span className="hidden sm:inline">Analyze</span></button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface text-muted-foreground"><Gamepad2 className="h-6 w-6" /></div>
            <h3 className="mt-3 text-sm font-bold">No games match these filters</h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Connect a chess profile or import a PGN to fill your game library. You can also clear the filters to see all saved games.</p>
            <button type="button" onClick={() => { setPlatform("all"); setResult("all"); setTime("all"); setQuery(""); }} className="btn btn-secondary btn-sm mt-3">Clear filters</button>
            <button type="button" onClick={() => setShowImport(true)} className="btn btn-primary btn-sm mt-2"><Upload className="h-4 w-4" /> Import a game</button>
          </div>
        )}
      </section>
    </div>
  );
}
