import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Chess } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Lightbulb, Loader2, Microscope, Play as PlayIcon, Plus, RotateCcw, Shuffle, Swords, Undo2, User, X } from "lucide-react";
import { Board, type Premove } from "@/components/chess/Board";
import { EngineBadge, GradeIcon, MoveList, Panel, PlayerStrip, useEngineStatus } from "@/components/chess/parts";
import { Logo } from "@/components/AppShell";
import { engine, type SearchResult } from "@/lib/engine";
import { stockfishEngine } from "@/lib/stockfish";
import { chooseEngineMove, classify, formatEval, multiPvForElo, scoreOf, toWhite, type Grade } from "@/lib/chess-logic";
import { isBookPly } from "@/lib/openings";
import { saveGame, setPendingPgn, useSettings } from "@/lib/store";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play vs Chess Engines — Chess Topper" },
      { name: "description", content: "Play chess against Berserk or Stockfish with adjustable strength and thinking time." },
      { property: "og:title", content: "Play vs Berserk — Chess Topper" },
      { property: "og:description", content: "Challenge Berserk or Stockfish right in Chess Topper." },
    ],
  }),
  component: PlayPage,
});

type Review = { ply: number; grade: Grade; loss: number; beforeWhite: number; afterWhite: number; bestSan?: string };

function PlayPage() {
  const [settings, update] = useSettings();
  const engineState = useEngineStatus();
  const navigate = useNavigate();
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [started, setStarted] = useState(false);
  const [engineChoice, setEngineChoice] = useState<"berserk" | "stockfish">("berserk");
  const [stockfishReady, setStockfishReady] = useState(false);
  const [stockfishError, setStockfishError] = useState<string | null>(null);
  const [human, setHuman] = useState<"w" | "b">("w");
  const [busy, setBusy] = useState(false);
  const [premove, setPremove] = useState<Premove | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<number, Review>>({});
  const [lastEval, setLastEval] = useState<number | null>(null);
  const [hint, setHint] = useState<{ from: string; to: string; san: string } | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const tokenRef = useRef(0);
  const beforeRef = useRef<{ fen: string; p: Promise<SearchResult> } | null>(null);
  const premoveRef = useRef<Premove | null>(null);
  const humanMoveRef = useRef<(m: Premove) => boolean>(() => false);
  premoveRef.current = premove;

  const game = gameRef.current;
  const history = game.history({ verbose: true });
  const last = history[history.length - 1];
  const ready = engineChoice === "berserk" ? engineState.status === "ready" : stockfishReady;
  const engineLabel = engineChoice === "berserk" ? "Berserk" : "Stockfish";

  useEffect(() => {
    if (engineChoice !== "stockfish") return;
    let active = true;
    setStockfishReady(false);
    setStockfishError(null);
    stockfishEngine.ready().then(() => { if (active) setStockfishReady(true); }).catch((error: unknown) => {
      if (active) setStockfishError(error instanceof Error ? error.message : "Stockfish could not start.");
    });
    return () => { active = false; };
  }, [engineChoice]);

  const searchPosition = (position: string, milliseconds: number, multiPV: number) =>
    engineChoice === "stockfish"
      ? stockfishEngine.search(position, milliseconds, multiPV)
      : engine.search(position, milliseconds, multiPV);

  const sync = () => setFen(gameRef.current.fen());

  const finish = useCallback((res: string) => {
    setResult(res);
    setPremove(null);
    const g = gameRef.current;
    g.header("White", human === "w" ? "You" : `${engineLabel} (${settings.elo})`, "Black", human === "b" ? "You" : `${engineLabel} (${settings.elo})`, "Result", res.split(" ")[0]);
    setReviews((r) => {
      const list = Object.values(r);
      const grades: Partial<Record<Grade, number>> = {};
      list.forEach((x) => { grades[x.grade] = (grades[x.grade] ?? 0) + 1; });
      const acc = list.length ? list.reduce((s, x) => s + Math.max(0, Math.min(100, 100 * Math.exp(-x.loss / 300))), 0) / list.length : null;
      if (g.history().length > 0) {
        saveGame({ id: crypto.randomUUID(), date: Date.now(), pgn: g.pgn(), result: res.split(" ")[0], humanSide: human, elo: settings.elo, accuracy: acc, grades });
      }
      return r;
    });
  }, [human, settings.elo, engineLabel]);

  const checkOver = useCallback(() => {
    const g = gameRef.current;
    if (!g.isGameOver()) return false;
    if (g.isCheckmate()) finish(g.turn() === "w" ? "0-1 · Checkmate" : "1-0 · Checkmate");
    else finish("½-½ · " + (g.isStalemate() ? "Stalemate" : g.isThreefoldRepetition() ? "Repetition" : g.isInsufficientMaterial() ? "Insufficient material" : "Draw"));
    return true;
  }, [finish]);

  /** Start a background evaluation of the position the human is about to move in. */
  const prepareBefore = () => {
    const f = gameRef.current.fen();
    const token = tokenRef.current;
    beforeRef.current = { fen: f, p: searchPosition(f, 500, 3) };
    beforeRef.current.p.then((r) => {
      if (token !== tokenRef.current || gameRef.current.fen() !== f) return;
      setLastEval(toWhite(scoreOf(r), f));
      // This background search grades the position only. A board arrow is
      // shown exclusively after the player explicitly presses the Hint button.
    }).catch(() => {});
  };

  const engineTurn = useCallback(async () => {
    const token = tokenRef.current;
    const g = gameRef.current;
    setBusy(true);
    try {
      const searchFen = g.fen();
      const res = await searchPosition(searchFen, settings.think * 1000, multiPvForElo(settings.elo));
      if (token !== tokenRef.current) return;
      setLastEval(toWhite(scoreOf(res), searchFen));
      // Grade the human's previous move with real engine data.
      const hist = g.history({ verbose: true });
      const hm = hist[hist.length - 1];
      const before = beforeRef.current;
      if (hm && before && hm.before === before.fen) {
        before.p.then((b) => {
          if (token !== tokenRef.current) return;
          const sans = g.history().slice(0, hist.length);
          const c = classify(before.fen, hm, b, toWhite(scoreOf(res), searchFen), isBookPly(sans, hist.length));
          const bestSan = (() => { try { return new Chess(before.fen).move({ from: c.bestUci.slice(0, 2), to: c.bestUci.slice(2, 4), promotion: c.bestUci[4] }).san; } catch { return undefined; } })();
          setReviews((r) => ({ ...r, [hist.length]: { ply: hist.length, grade: c.grade, loss: c.loss, beforeWhite: c.beforeWhite, afterWhite: c.afterWhite, bestSan } }));
        }).catch(() => {});
      }
      const uci = chooseEngineMove(searchFen, res, settings.elo, settings.attack);
      let played = null;
      try { played = uci ? g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" }) : null; } catch { played = null; }
      if (!played && res.bestmove) { try { g.move({ from: res.bestmove.slice(0, 2), to: res.bestmove.slice(2, 4), promotion: res.bestmove[4] ?? "q" }); } catch { /* none */ } }
      sync();
      setBusy(false);
      if (checkOver()) return;
      prepareBefore();
      // Execute or discard the premove.
      const pm = premoveRef.current;
      if (pm) {
        setPremove(null);
        setTimeout(() => { if (token === tokenRef.current) humanMoveRef.current(pm); }, 60);
      }
    } catch {
      if (token === tokenRef.current) setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.think, settings.elo, settings.attack, checkOver, engineChoice]);

  function humanMove(m: { from: string; to: string; promotion?: string }) {
    const g = gameRef.current;
    if (!started || result || g.turn() !== human) return false;
    try {
      g.move({ from: m.from, to: m.to, promotion: m.promotion ?? "q" });
    } catch {
      return false; // invalid premove: silently cleared
    }
    setHint(null);
    sync();
    if (!checkOver()) engineTurn();
    return true;
  }

  humanMoveRef.current = humanMove;

  function start(side = settings.side) {
    tokenRef.current++;
    const s: "w" | "b" = side === "random" ? (Math.random() < 0.5 ? "w" : "b") : side;
    gameRef.current = new Chess();
    setHuman(s);
    setResult(null);
    setReviews({});
    setPremove(null);
    setLastEval(null);
    setHint(null);
    setHintLoading(false);
    setBusy(false);
    setStarted(true);
    sync();
    if (s === "w") prepareBefore();
  }
  useEffect(() => {
    if (started && !result && gameRef.current.turn() !== human && !busy && gameRef.current.history().length === 0) engineTurn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, human]);

  function newGame() { tokenRef.current++; gameRef.current = new Chess(); setStarted(false); setResult(null); setReviews({}); setPremove(null); setBusy(false); setLastEval(null); setHint(null); setHintLoading(false); sync(); }

  function undo() {
    const g = gameRef.current;
    if (!started || g.history().length === 0) return;

    tokenRef.current++;
    const engineWasThinking = g.turn() !== human;
    setBusy(false);
    setPremove(null);
    setResult(null);
    setHint(null);
    setHintLoading(false);
    g.undo();

    // Undo the human's previous move too when Berserk has already replied.
    if (!engineWasThinking && g.history().length > 0 && g.turn() !== human) g.undo();

    sync();
    const remainingPly = g.history().length;
    setReviews((current) => Object.fromEntries(Object.entries(current).filter(([ply]) => Number(ply) <= remainingPly)));
    beforeRef.current = null;

    if (g.turn() === human) prepareBefore();
    else engineTurn();
  }

  async function showHint() {
    const g = gameRef.current;
    if (!started || result || busy || g.turn() !== human || hintLoading) return;
    const position = g.fen();
    const token = tokenRef.current;
    setHintLoading(true);
    setHint(null);
    try {
      const search = await searchPosition(position, Math.max(1000, settings.think * 1000), 1);
      if (token !== tokenRef.current || gameRef.current.fen() !== position) return;
      const uci = search.candidates?.[0]?.uci || search.bestmove;
      if (!uci || uci === "(none)" || uci === "0000") return;
      const move = new Chess(position).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" });
      if (move) setHint({ from: move.from, to: move.to, san: move.san });
    } catch {
      // Leave the board unchanged if the engine cannot provide a hint.
    } finally {
      if (token === tokenRef.current) setHintLoading(false);
    }
  }

  function resign() { if (started && !result) finish(human === "w" ? "0-1 · You resigned" : "1-0 · You resigned"); }
  function review() { setPendingPgn(gameRef.current.pgn()); navigate({ to: "/review" }); }

  const orientation = human === "w" ? "white" : "black";
  const berserkTop = (
    <PlayerStrip name={engineLabel} sub={`${settings.elo} Elo · attack ${settings.attack}/10 · ${settings.think}s`}
      avatar={<Logo size={32} />} active={started && !result && game.turn() !== human}
      right={<EngineBadge busy={busy} />} />
  );
  const youBottom = (
    <PlayerStrip name="You" sub={human === "w" ? "White" : "Black"} avatar={<User className="h-4 w-4 text-muted-foreground" />}
      active={started && !result && game.turn() === human}
      right={premove ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPremove(null)}><X className="h-3.5 w-3.5" />Cancel premove</button>
      ) : lastEval !== null ? <span className="font-mono text-xs text-muted-foreground">Eval {formatEval(lastEval)}</span> : null} />
  );
  const lastReview = reviews[history.length] ?? reviews[history.length - 1];

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="mx-auto w-full board-col space-y-2">
        {berserkTop}
        <Board fen={fen} orientation={orientation}
          movable={started && !result ? human : null}
          premoveColor={started && !result ? human : null}
          premove={premove} onPremove={setPremove}
          onMove={(m) => humanMove(m)}
          lastMove={last ? { from: last.from, to: last.to } : null}
          arrows={hint ? [{ from: hint.from, to: hint.to, tone: "best" }] : []}
          badge={lastReview && history[lastReview.ply - 1] ? { square: history[lastReview.ply - 1].to, icon: `/classification/${gradeFile(lastReview.grade)}`, label: lastReview.grade } : null} />
        {hint && <p className="px-1 text-xs text-muted-foreground">Berserk suggestion: <span className="font-semibold text-foreground">{hint.san}</span></p>}
        {youBottom}
      </div>

      <div className="space-y-3">
        {!started ? (
          <Panel title="New game" icon={<Swords className="h-4 w-4" />}>
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <Logo size={44} />
                <div>
                  <div className="font-display text-lg font-semibold">Berserk</div>
                  <div className="text-xs text-muted-foreground">Target strength {settings.elo} Elo</div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Play as</label>
                <div className="seg">
                  {([["w", "White"], ["random", "Random"], ["b", "Black"]] as const).map(([v, l]) => (
                    <button key={v} type="button" data-on={settings.side === v} onClick={() => update({ side: v })}>
                      {v === "random" ? <Shuffle className="h-3.5 w-3.5" /> : <span className={v === "w" ? "h-3 w-3 rounded-sm bg-foreground" : "h-3 w-3 rounded-sm border border-muted-foreground bg-background"} />}
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Chess engine</label>
                <div className="seg">
                  <button type="button" data-on={engineChoice === "berserk"} onClick={() => setEngineChoice("berserk")}>Berserk</button>
                  <button type="button" data-on={engineChoice === "stockfish"} onClick={() => setEngineChoice("stockfish")}>Stockfish 19</button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{engineChoice === "berserk" ? "Play against Berserk with adjustable strength and aggression." : "Play against Stockfish 19 running locally in a Web Worker."}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Choose your Stockfish bot</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {([
                    { name: "Beginner", elo: 600, note: "Learning" },
                    { name: "Casual", elo: 1000, note: "Relaxed" },
                    { name: "Club Player", elo: 1500, note: "Club level" },
                    { name: "Advanced", elo: 2000, note: "Strong" },
                    { name: "Expert", elo: 2600, note: "Very strong" },
                    { name: "Maximum", elo: 3500, note: "Full strength" },
                  ] as const).map((bot) => (
                    <button key={bot.name} type="button" data-on={settings.elo === bot.elo}
                      onClick={() => update({ elo: bot.elo })}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-left transition hover:border-primary/60"
                      aria-pressed={settings.elo === bot.elo}>
                      <span className="block text-xs font-bold">{bot.name}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{bot.elo} target · {bot.note}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-4 text-muted-foreground">These are selectable strength profiles using Stockfish's candidate moves and Chess Topper's move-selection logic; the displayed Elo is a target setting, not a certified playing rating.</p>
              </div>
              <EngineSliders settings={settings} update={update} />
              <button type="button" className="btn btn-primary w-full" disabled={!ready} onClick={() => start()}>
                {ready ? <PlayIcon className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                {ready ? "Start game" : engineState.status === "error" ? "Engine unavailable" : `Loading engine ${Math.round(engineState.progress * 100)}%`}
              </button>
              {engineChoice === "berserk" && engineState.status === "error" && <p className="text-xs text-danger">{engineState.error}</p>}
              {engineChoice === "stockfish" && stockfishError && <p className="text-xs text-danger">{stockfishError}</p>}
            </div>
          </Panel>
        ) : (
          <Panel title={result ? "Game over" : busy ? "Berserk is thinking" : game.turn() === human ? "Your move" : "Berserk to move"}
            icon={busy ? <Loader2 className="h-4 w-4 animate-spin text-warn" /> : <Swords className="h-4 w-4" />}
            action={<span className="text-xs text-muted-foreground">Move {Math.floor(history.length / 2) + 1}</span>}>
            {result && (
              <div className="fade-in border-b border-border bg-sage-soft p-4">
                <div className="font-display text-xl font-semibold">{result}</div>
                <button type="button" className="btn btn-primary btn-sm mt-3" onClick={review}><Microscope className="h-4 w-4" />Review game</button>
              </div>
            )}
            {lastReview && (
              <div className="fade-in flex items-start gap-3 border-b border-border p-3">
                <GradeIcon grade={lastReview.grade} size={28} />
                <div className="min-w-0 text-sm">
                  <div className="font-semibold">{history[lastReview.ply - 1]?.san} is {/^[AEIO]/.test(lastReview.grade) ? "an" : "a"} {lastReview.grade.toLowerCase()} move</div>
                  <div className="text-xs text-muted-foreground">
                    {formatEval(lastReview.beforeWhite)} → {formatEval(lastReview.afterWhite)} · {Math.round(lastReview.loss)} cp loss
                    {lastReview.bestSan && lastReview.grade !== "Best" && ` · best ${lastReview.bestSan}`}
                  </div>
                </div>
              </div>
            )}
            <MoveList className="h-56 lg:h-72" ply={history.length}
              moves={history.map((h, i) => ({ san: h.san, grade: reviews[i + 1]?.grade }))} />
            <div className="grid grid-cols-5 gap-2 border-t border-border p-3">
              <button type="button" className="btn btn-ghost btn-sm" disabled={!history.length} onClick={undo}><Undo2 className="h-4 w-4" />Undo</button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={!!result || busy || game.turn() !== human || hintLoading} onClick={showHint}>{hintLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}Hint</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={newGame}><Plus className="h-4 w-4" />New</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => start(human)}><RotateCcw className="h-4 w-4" />Restart</button>
              <button type="button" className="btn btn-danger btn-sm" disabled={!!result} onClick={resign}><Flag className="h-4 w-4" />Resign</button>
            </div>
          </Panel>
        )}
        {started && (
          <details className="panel group">
            <summary className="panel-head cursor-pointer list-none"><h2>Engine settings</h2><span className="text-xs text-muted-foreground">applies next move</span></summary>
            <div className="p-4"><EngineSliders settings={settings} update={update} /></div>
          </details>
        )}
        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
          Tap a piece to see its legal moves, then tap a square — or drag. During Berserk's turn you can queue a premove; tap an empty square to cancel it.
        </p>
      </div>
    </div>
  );
}

function gradeFile(g: Grade) {
  return { Brilliant: "cls-brilliant.svg", Great: "cls-great.svg", Best: "cls-excellent.svg", Excellent: "cls-excellent.svg", Good: "cls-good.svg", Inaccuracy: "cls-inaccuracy.svg", Mistake: "cls-mistake.svg", Blunder: "cls-blunder.svg", Book: "cls-book.svg" }[g];
}

export function EngineSliders({ settings, update }: { settings: { elo: number; attack: number; think: number }; update: (p: Partial<{ elo: number; attack: number; think: number }>) => void }) {
  return (
    <div className="space-y-4">
      <Slider label="Strength" value={`${settings.elo} Elo`} min={400} max={3500} step={100} v={settings.elo} onChange={(elo) => update({ elo })} lo="400" hi="3500" />
      <Slider label="Attack level" value={`${settings.attack} / 10`} min={1} max={10} step={1} v={settings.attack} onChange={(attack) => update({ attack })} lo="Positional" hi="Aggressive" />
      <Slider label="Thinking time" value={`${settings.think.toFixed(1)} s`} min={0.1} max={10} step={0.1} v={settings.think} onChange={(think) => update({ think })} lo="0.1 s" hi="10 s" />
    </div>
  );
}

function Slider({ label, value, v, min, max, step, onChange, lo, hi }: { label: string; value: string; v: number; min: number; max: number; step: number; onChange: (n: number) => void; lo: string; hi: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-sage">{value}</span>
      </div>
      <input type="range" className="w-full" min={min} max={max} step={step} value={v} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
      <div className="flex justify-between text-[10px] text-muted-foreground"><span>{lo}</span><span>{hi}</span></div>
    </div>
  );
}
