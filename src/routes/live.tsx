import { useState, useEffect, useRef, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Chess } from "chess.js";
import { Board } from "@/components/chess/Board";
import { EvalBar, MoveList, EngineBadge } from "@/components/chess/parts";
import { engine, type Candidate } from "@/lib/engine";
import { identifyOpening } from "@/lib/openings";
import { setPendingPgn } from "@/lib/store";
import { fetchChessComGamePgn } from "@/lib/chesscom-live.functions";
import {
  Radio,
  Search,
  Loader2,
  Tv,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Flame,
} from "lucide-react";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Games — Berserk Sigma" },
      { name: "description", content: "Watch live chess games with real-time Berserk engine evaluation and best-move analysis." },
      { property: "og:title", content: "Live Games — Berserk Sigma" },
      { property: "og:description", content: "Watch live chess games with real-time Berserk engine evaluation." },
    ],
  }),
  component: LiveGamesPage,
});

type LiveGameData = {
  id: string;
  white: { name: string; rating?: number };
  black: { name: string; rating?: number };
  status: string;
  pgn: string;
  fen: string;
  startFen: string;
  speed: string;
  provider: "lichess" | "chesscom";
  sourceId?: string;
  gameType?: "live" | "daily";
};

const FEATURED_CHANNELS = [
  { id: "best", label: "Top GM" },
  { id: "blitz", label: "Blitz" },
  { id: "rapid", label: "Rapid" },
  { id: "classical", label: "Classical" },
  { id: "bullet", label: "Bullet" },
  { id: "ultraBullet", label: "UltraBullet" },
  { id: "chess960", label: "Chess960" },
];

const LICHESS_TV_API = "https://lichess.org/api";

async function fetchLichessTvGame(channel: string): Promise<{ id: string; pgn: string }> {
  // Lichess TV returns newline-delimited JSON for pgnInJson. Requesting
  // application/json here can be rejected by its content negotiation.
  const response = await fetch(
    `${LICHESS_TV_API}/tv/${encodeURIComponent(channel)}?pgnInJson=true&nb=1&moves=true&tags=true&clocks=true&opening=true`,
    {
      headers: { Accept: "application/x-ndjson" },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Lichess ${channel} channel request failed (${response.status})${detail ? `: ${detail.slice(0, 120)}` : ""}.`);
  }

  const body = (await response.text()).trim();
  if (!body) throw new Error(`Lichess returned no games for the ${channel} channel.`);

  // The endpoint is NDJSON: parse each non-empty line independently.
  // Keep compatibility with a JSON object/array response as well.
  const records: any[] = [];
  try {
    const parsed = JSON.parse(body);
    if (Array.isArray(parsed)) records.push(...parsed);
    else records.push(parsed?.game ?? parsed);
  } catch {
    for (const line of body.split(/\\r?\\n/)) {
      if (!line.trim()) continue;
      try { records.push(JSON.parse(line)); } catch { /* A plain PGN response is handled below. */ }
    }
  }

  for (const record of records) {
    const id = String(record?.id ?? record?.gameId ?? "");
    const pgn = typeof record?.pgn === "string" ? record.pgn : "";
    if (id && pgn.trim()) return { id, pgn };
  }

  // Defensive fallback if a proxy/API negotiation returns plain PGN.
  if (/^\\[Event\\s+/m.test(body)) {
    const id = body.match(/^\\[GameId\\s+"([^"]+)"\\]/im)?.[1]
      || body.match(/^\\[Site\\s+"https?:\\/\\/lichess\\.org\\/(?:game|[A-Za-z0-9]+)\\/([^"]+)"\\]/im)?.[1];
    if (id) return { id, pgn: body };
  }

  throw new Error(`Lichess returned no usable live game for the ${channel} channel.`);
}

function isActivePgn(pgn: string) {
  const result = pgn.match(/^\[Result\s+"([^"]+)"\]/im)?.[1] || "*";
  if (result !== "*") return false;
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return !chess.isGameOver();
  } catch {
    return false;
  }
}

function LiveGamesPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<LiveGameData | null>(null);
  const [autoTv, setAutoTv] = useState(true);
  const seenGameIdsRef = useRef<Set<string>>(new Set());

  // Board navigation state
  const [moves, setMoves] = useState<{ san: string; uci: string; fenAfter: string }[]>([]);
  const [currentPly, setCurrentPly] = useState(0);
  const [autoFollow, setAutoFollow] = useState(true);

  // Berserk Live Engine Analysis
  const [evalCp, setEvalCp] = useState<number | null>(0);
  const [bestMove, setBestMove] = useState<{ uci: string; san?: string; depth: number } | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [engineBusy, setEngineBusy] = useState(false);

  // Polling ref for live game updates
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Accept a Lichess username or a Chess.com live/daily game URL.
  const loadUserLiveGame = async (targetUser: string) => {
    const input = targetUser.trim();
    if (!input) return;
    setSearching(true);
    setError(null);

    try {
      if (/^\s*\[Event\s+/m.test(input)) {
        applyPgnToLiveState(input, `pgn-${Date.now()}`, { provider: "lichess" });
        return;
      }

      const chessComMatch = input.match(/chess\.com\/(?:game\/|analysis\/game\/)(live|daily)\/(\d+)/i);
      if (chessComMatch) {
        const gameType = chessComMatch[1].toLowerCase() as "live" | "daily";
        const gameId = chessComMatch[2];
        const pgn = await fetchChessComGamePgn({ data: { gameType, gameId } });
        if (!pgn || pgn.length < 10) throw new Error("Chess.com returned an empty game.");
        applyPgnToLiveState(pgn, `chesscom-${gameId}`, { provider: "chesscom", sourceId: gameId, gameType });
        return;
      }

      const lichessMatch = input.match(/lichess\.org\/@\/([^/?#]+)/i);
      const clean = (lichessMatch?.[1] || input).toLowerCase();
      if (clean.includes("chess.com")) {
        throw new Error("Paste a Chess.com game URL ending in /game/live/ID or /game/daily/ID.");
      }

      const res = await fetch(`https://lichess.org/api/user/${encodeURIComponent(clean)}/current-game`);
      if (res.status === 404) {
        throw new Error(`Player "${clean}" is not currently in an active Lichess game.`);
      }
      if (!res.ok) throw new Error("Could not fetch player's live game.");

      const pgn = await res.text();
      if (!pgn || pgn.length < 10) {
        throw new Error(`No active live game found for ${clean}.`);
      }
      applyPgnToLiveState(pgn, `user-${clean}`, { provider: "lichess", sourceId: clean });
    } catch (e: any) {
      setError(e?.message || "Failed to find live game.");
    } finally {
      setSearching(false);
    }
  };

  const switchToLiveTv = async (excludeId?: string) => {
    if (!autoTv) {
      setError("The game has ended. Turn Auto TV back on to continue to another live game.");
      return false;
    }

    const channels = FEATURED_CHANNELS.map((channel) => channel.id);
    // Rotate through every real Lichess TV channel, preferring games not shown yet.
    for (const channel of channels) {
      try {
        const { id: nextId, pgn } = await fetchLichessTvGame(channel);
        if (!isActivePgn(pgn) || (excludeId && nextId === excludeId) || seenGameIdsRef.current.has(nextId)) continue;
        seenGameIdsRef.current.add(nextId);
        applyPgnToLiveState(pgn, nextId, {
          provider: "lichess",
          sourceId: `tv:${channel}`,
        });
        setError(null);
        return true;
      } catch {
        // Keep checking other channels if one has no active game or is unavailable.
      }
    }

    // After a full rotation, allow a previously watched active game again.
    for (const channel of channels) {
      try {
        const { id: nextId, pgn } = await fetchLichessTvGame(channel);
        if (!isActivePgn(pgn) || (excludeId && nextId === excludeId)) continue;
        seenGameIdsRef.current.add(nextId);
        applyPgnToLiveState(pgn, nextId, {
          provider: "lichess",
          sourceId: `tv:${channel}`,
        });
        setError(null);
        return true;
      } catch {
        // Continue through the channel list.
      }
    }

    setGame(null);
    setMoves([]);
    setCurrentPly(0);
    setError("No active game is available in the selected TV channels right now. Try another channel or come back shortly.");
    return false;
  };

  const loadTvChannel = async (channel: string) => {
    setSearching(true);
    setError(null);
    try {
      const { id, pgn } = await fetchLichessTvGame(channel);
      if (!isActivePgn(pgn)) {
        await switchToLiveTv(id);
        return;
      }
      seenGameIdsRef.current.add(id);
      applyPgnToLiveState(pgn, id, {
        provider: "lichess",
        sourceId: `tv:${channel}`,
      });
    } catch (e: any) {
      setError(e?.message || "Could not load TV channel.");
    } finally {
      setSearching(false);
    }
  };

  const applyPgnToLiveState = (
    pgn: string,
    gameId: string,
    source: { provider: "lichess" | "chesscom"; sourceId?: string; gameType?: "live" | "daily" } = { provider: "lichess" },
  ) => {
    const chess = new Chess();
    try {
      chess.loadPgn(pgn);
      const history = chess.history({ verbose: true });
      const startFen = history[0]?.before ?? chess.fen();
      const items = history.map((m) => ({
        san: m.san,
        uci: `${m.from}${m.to}${m.promotion || ""}`,
        fenAfter: m.after,
      }));

      const getHeader = (h: string, fallback = "") => {
        const m = pgn.match(new RegExp(`\\[${h}\\s+"([^"]+)"\\]`, "i"));
        return m ? m[1] : fallback;
      };

      if (!isActivePgn(pgn)) {
        setGame(null);
        setMoves([]);
        setCurrentPly(0);
        void switchToLiveTv(gameId);
        return;
      }

      seenGameIdsRef.current.add(gameId);
      setGame({
        id: gameId,
        white: { name: getHeader("White", "White"), rating: parseInt(getHeader("WhiteElo", "0"), 10) || undefined },
        black: { name: getHeader("Black", "Black"), rating: parseInt(getHeader("BlackElo", "0"), 10) || undefined },
        status: getHeader("Result", "*"),
        pgn,
        fen: chess.fen(),
        startFen,
        speed: getHeader("Event", "Live"),
        provider: source.provider,
        sourceId: source.sourceId,
        gameType: source.gameType,
      });

      setMoves(items);
      if (autoFollow || currentPly === 0) {
        setCurrentPly(items.length);
      }
    } catch {
      setError("Invalid game format.");
    }
  };

  // Refresh the selected provider's game while it is in progress.
  useEffect(() => {
    if (!game) return;
    pollTimerRef.current = setInterval(() => {
      if (game.provider === "chesscom" && game.sourceId && game.gameType) {
        fetchChessComGamePgn({ data: { gameType: game.gameType, gameId: game.sourceId } })
          .then(async (pgn) => {
            if (pgn && !isActivePgn(pgn)) {
              await switchToLiveTv(game.id);
              return;
            }
            if (pgn && pgn !== game.pgn) {
              applyPgnToLiveState(pgn, game.id, {
                provider: "chesscom", sourceId: game.sourceId, gameType: game.gameType,
              });
            }
          })
          .catch(() => {});
      } else if (game.provider === "lichess" && game.sourceId?.startsWith("tv:")) {
        const channel = game.sourceId.slice(3);
        fetchLichessTvGame(channel)
          .then(async ({ id: nextId, pgn }) => {
            if (!isActivePgn(pgn)) {
              await switchToLiveTv(game.id);
              return;
            }
            if (nextId !== game.id || pgn !== game.pgn) {
              seenGameIdsRef.current.add(nextId);
              applyPgnToLiveState(pgn, nextId, {
                provider: "lichess",
                sourceId: `tv:${channel}`,
              });
            }
          })
          .catch(() => {});
      } else if (game.provider === "lichess" && game.sourceId) {
        fetch(`https://lichess.org/api/user/${encodeURIComponent(game.sourceId)}/current-game`)
          .then(async (r) => {
            if (r.status === 404) {
              await switchToLiveTv(game.id);
              return "";
            }
            return r.ok ? r.text() : "";
          })
          .then(async (pgn) => {
            if (!pgn) return;
            if (!isActivePgn(pgn)) {
              await switchToLiveTv(game.id);
              return;
            }
            if (pgn !== game.pgn) {
              applyPgnToLiveState(pgn, game.id, { provider: "lichess", sourceId: game.sourceId });
            }
          })
          .catch(() => {});
      }
    }, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [game?.id, game?.pgn, game?.provider, game?.sourceId, game?.gameType, autoFollow, autoTv]);

  // Current position FEN
  const currentFen = useMemo(() => {
    if (currentPly === 0 || moves.length === 0) {
      return game?.startFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }
    return moves[currentPly - 1]?.fenAfter || game?.startFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  }, [moves, currentPly, game?.startFen]);

  const sans = useMemo(() => moves.slice(0, currentPly).map((m) => m.san), [moves, currentPly]);
  const opening = useMemo(() => identifyOpening(sans), [sans]);

  // Run Berserk engine analysis whenever current board position updates
  useEffect(() => {
    let active = true;
    setEngineBusy(true);
    setBestMove(null);
    setCandidates([]);

    engine
      .search(currentFen, 500, 3)
      .then((res) => {
        if (!active) return;
        const turn = currentFen.split(" ")[1] as "w" | "b";
        const cpWhite = turn === "w" ? res.scoreCp : -res.scoreCp;
        setEvalCp(cpWhite);

        if (res.bestmove) {
          try {
            const c = new Chess(currentFen);
            const uci = res.bestmove;
            const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
            setBestMove({ uci, san: m ? m.san : uci, depth: res.depth });
          } catch {
            setBestMove({ uci: res.bestmove, depth: res.depth });
          }
        }
        setCandidates(res.candidates || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setEngineBusy(false);
      });

    return () => {
      active = false;
    };
  }, [currentFen]);

  const bestArrow = useMemo(() => {
    const arrows = bestMove?.uci ? [{
      from: bestMove.uci.slice(0, 2),
      to: bestMove.uci.slice(2, 4),
      tone: "best" as const,
    }] : [];
    // Show the engine's next two alternatives as quieter blue arrows.
    // Ignore duplicate destinations so the board never becomes a pile of arrows.
    const seen = new Set(arrows.map((a) => `${a.from}-${a.to}`));
    for (const candidate of candidates.slice(1, 3)) {
      const from = candidate.uci.slice(0, 2);
      const to = candidate.uci.slice(2, 4);
      const key = `${from}-${to}`;
      if (from.length === 2 && to.length === 2 && !seen.has(key)) {
        arrows.push({ from, to, tone: "alt" as const });
        seen.add(key);
      }
    }
    return arrows;
  }, [bestMove, candidates]);

  const bestMoveExplanation = useMemo(() => {
    if (!bestMove?.uci) return "";
    try {
      const position = new Chess(currentFen);
      const move = position.move({
        from: bestMove.uci.slice(0, 2),
        to: bestMove.uci.slice(2, 4),
        promotion: bestMove.uci[4] ?? "q",
      });
      if (!move) return "Berserk's highest-ranked continuation for this position.";
      if (position.isCheckmate()) return "A forced checkmate — the game is over with best play.";
      if (move.promotion) return "Promotes the pawn, creating a new major piece.";
      if (move.captured) return `Wins the ${move.captured === "q" ? "queen" : move.captured === "r" ? "rook" : move.captured === "b" ? "bishop" : move.captured === "n" ? "knight" : "pawn"}.`;
      if (move.flags.includes("k") || move.flags.includes("q")) return "Castles to improve king safety and connect the rooks.";
      if (move.san.includes("+")) return "Gives check and forces the opponent to respond.";
      return "Berserk ranks this as the strongest continuation after comparing the available legal moves.";
    } catch {
      return "Berserk's highest-ranked continuation for this position.";
    }
  }, [bestMove, currentFen]);

  const handleReviewClick = () => {
    if (!game?.pgn) return;
    setPendingPgn(game.pgn);
    navigate({ to: "/review" });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Berserk Chess TV controls */}
      <div className="panel p-4 mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Tv className="h-4 w-4 text-primary" />
              <h1 className="font-display text-base font-semibold tracking-wide">BERSERK CHESS TV</h1>
              <button
                type="button"
                onClick={() => setAutoTv((value) => !value)}
                aria-pressed={autoTv}
                className={`status-pill transition-colors ${autoTv ? "status-ready" : "opacity-60"}`}
                title="Automatically switch to another active TV game when the current game ends"
              >
                <span className="status-dot" />{autoTv ? "AUTO TV ON" : "AUTO TV OFF"}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Continuous broadcasts, live engine arrows and move explanations. Auto TV moves to another active channel when a game ends.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Lichess username or Chess.com live game URL"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUserLiveGame(username)}
              className="input text-sm flex-1"
            />
            <button
              onClick={() => loadUserLiveGame(username)}
              disabled={searching || !username.trim()}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Watch Live
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1">
              <Tv className="w-3.5 h-3.5" /> Channels:
            </span>
            {FEATURED_CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => {
                  setUsername("");
                  loadTvChannel(ch.id);
                }}
                className="btn btn-secondary text-xs"
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
      </div>

      {game ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* Board View */}
          <div className="flex flex-col items-center">
            {/* Player Info (Top - Black) */}
            <div className="w-full max-w-[560px] flex justify-between items-center text-xs font-semibold py-2 px-1 text-muted-foreground">
              <span className="text-foreground">{game.black.name} ({game.black.rating || "?"})</span>
              <span className="flex items-center gap-2 text-[10px] font-mono">
                <span className="rounded border border-border px-1.5 py-0.5 uppercase">{game.provider === "chesscom" ? "Chess.com" : "Lichess"}</span>
                {game.speed}
              </span>
            </div>

            <div className="w-full max-w-[560px] flex items-stretch gap-3">
              <EvalBar cpWhite={evalCp} />
              <div className="flex-1">
                <Board
                  fen={currentFen}
                  orientation="white"
                  arrows={bestArrow}
                />
              </div>
            </div>

            {/* Player Info (Bottom - White) */}
            <div className="w-full max-w-[560px] flex justify-between items-center text-xs font-semibold py-2 px-1 text-muted-foreground">
              <span className="text-foreground">{game.white.name} ({game.white.rating || "?"})</span>
              <span className="text-[10px] text-accent flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse text-destructive" /> LIVE
              </span>
            </div>

            {/* Move Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <button onClick={() => { setCurrentPly(0); setAutoFollow(false); }} disabled={currentPly === 0} className="btn btn-secondary text-xs">|&lt;</button>
              <button onClick={() => { setCurrentPly((p) => Math.max(0, p - 1)); setAutoFollow(false); }} disabled={currentPly === 0} className="btn btn-secondary text-xs">&lt; Prev</button>
              <span className="text-sm font-mono px-3">{currentPly} / {moves.length}</span>
              <button onClick={() => { setCurrentPly((p) => Math.min(moves.length, p + 1)); }} disabled={currentPly >= moves.length} className="btn btn-secondary text-xs">Next &gt;</button>
              <button onClick={() => { setCurrentPly(moves.length); setAutoFollow(true); }} disabled={currentPly >= moves.length} className="btn btn-secondary text-xs">&gt;|</button>

              <button
                onClick={() => setAutoFollow(!autoFollow)}
                className={`btn text-xs ${autoFollow ? "btn-primary" : "btn-secondary"}`}
              >
                {autoFollow ? "Following Live" : "Follow Live"}
              </button>
            </div>
          </div>

          {/* Right Panel: Engine Evaluation & Candidates */}
          <div className="flex flex-col gap-4">
            {/* Berserk Engine Recommendation Card */}
            <div className="panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-xs font-semibold">Berserk Live Analysis</span>
                </div>
                <EngineBadge busy={engineBusy} />
              </div>

              {bestMove ? (
                <div className="bg-background/60 rounded-lg p-3 border border-border/50">
                  <div className="text-xs text-muted-foreground">Best Move:</div>
                  <div className="text-2xl font-bold font-mono text-accent mt-0.5">
                    {bestMove.san || bestMove.uci}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3">
                    <span>Depth: {bestMove.depth}</span>
                    <span>Eval: {evalCp !== null ? `${evalCp > 0 ? "+" : ""}${(evalCp / 100).toFixed(2)}` : "0.00"}</span>
                  </div>
                  <p className="mt-2 border-t border-border/40 pt-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">Why this move?</span> {bestMoveExplanation}
                  </p>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground py-4 text-center">Berserk is calculating...</div>
              )}

              {/* MultiPV candidate lines */}
              {candidates.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Top Engine Lines</span>
                  {candidates.slice(0, 3).map((c, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-1.5 rounded bg-background/30 font-mono">
                      <span>#{idx + 1} {c.uci}</span>
                      <span className="text-muted-foreground">{c.scoreCp > 0 ? "+" : ""}{(c.scoreCp / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {opening && (
                <div className="mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Opening:</span> {opening.name} ({opening.eco})
                </div>
              )}
            </div>

            {/* Move List */}
            <div className="panel p-4 flex-1 flex flex-col min-h-[220px]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold">Game Moves</span>
                <button onClick={handleReviewClick} className="text-xs text-primary hover:underline flex items-center gap-1">
                  Analyze in Review <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[280px]">
                <MoveList
                  moves={moves.map((m) => ({ san: m.san }))}
                  ply={currentPly}
                  onSelect={(p) => { setCurrentPly(p); setAutoFollow(false); }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="panel p-12 text-center max-w-xl mx-auto mt-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Radio className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-base font-semibold">Watch Any Game in Real Time</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Type any Lichess username above to spectate their active game, or pick a Grandmaster TV channel to watch live with Berserk's engine assistance.
          </p>
        </div>
      )}
    </div>
  );
}
