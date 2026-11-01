import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Chess } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Loader2, Microscope, Play as PlayIcon, Plus, RotateCcw, Shuffle, Swords, User, X } from "lucide-react";
import { Board, type Premove } from "@/components/chess/Board";
import { EngineBadge, GradeIcon, MoveList, Panel, PlayerStrip, useEngineStatus } from "@/components/chess/parts";
import { Logo } from "@/components/AppShell";
import { engine, type SearchResult } from "@/lib/engine";
import { chooseEngineMove, classify, formatEval, multiPvForElo, scoreOf, toWhite, type Grade } from "@/lib/chess-logic";
import { isBookPly } from "@/lib/openings";
import { saveGame, setPendingPgn, useSettings } from "@/lib/store";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play vs Berserk — Berserk Web" },
      { name: "description", content: "Play chess against the Berserk engine with adjustable Elo, attack level and thinking time." },
      { property: "og:title", content: "Play vs Berserk — Berserk Web" },
      { property: "og:description", content: "Challenge the Berserk chess engine right in your browser." },
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
  const [human, setHuman] = useState<"w" | "b">("w");
  const [busy, setBusy] = useState(false);
  const [premove, setPremove] = useState<Premove | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<number, Review>>({});
  const [lastEval, setLastEval] = useState<number | null>(null);
  const tokenRef = useRef(0);
  const beforeRef = useRef<{ fen: string; p: Promise<SearchResult> } | null>(null);
  const premoveRef = useRef<Premove | null>(null);
  const humanMoveRef = useRef<(m: Premove) => boolean>(() => false);
  premoveRef.current = premove;

  const game = gameRef.current;
  const history = game.history({ verbose: true });
  const last = history[history.length - 1];
  const ready = engineState.status === "ready";

  const sync = () => setFen(gameRef.current.fen());

  const finish = useCallback((res: string) => {
    setResult(res);
    setPremove(null);
    const g = gameRef.current;
    g.header("White", human === "w" ? "You" : `Berserk (${settings.elo})`, "Black", human === "b" ? "You" : `Berserk (${settings.elo})`, "Result", res.split(" ")[0]);
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
  }, [human, settings.elo]);

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
    beforeRef.current = { fen: f, p: engine.search(f, 300, 2) };
    beforeRef.current.p.then((r) => setLastEval(toWhite(scoreOf(r), f))).catch(() => {});
  };

  const engineTurn = useCallback(async () => {
    const token = tokenRef.current;
    const g = gameRef.current;
    setBusy(true);
    try {
      const searchFen = g.fen();
      const res = await engine.search(searchFen, settings.think * 1000, multiPvForElo(settings.elo));
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
  }, [settings.think, settings.elo, settings.attack, checkOver]);

  function humanMove(m: { from: string; to: string; promotion?: string }) {
    const g = gameRef.current;
    if (!started || result || g.turn() !== human) return false;
    try {
      g.move({ from: m.from, to: m.to, promotion: m.promotion ?? "q" });
    } catch {
      return false; // invalid premove: silently cleared
    }
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
    setBusy(false);
    setStarted(true);
    sync();
    if (s === "w") prepareBefore();
  }
  useEffect(() => {
    if (started && !result && gameRef.current.turn() !== human && !busy && gameRef.current.history().length === 0) engineTurn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, human]);

  function newGame() { tokenRef.current++; gameRef.current = new Chess(); setStarted(false); setResult(null); setReviews({}); setPremove(null); setBusy(false); setLastEval(null); sync(); }
  function resign() { if (started && !result) finish(human === "w" ? "0-1 · You resigned" : "1-0 · You resigned"); }
  function review() { setPendingPgn(gameRef.current.pgn()); navigate({ to: "/review" }); }

  const orientation = human === "w" ? "white" : "black";
  const berserkTop = (
    <PlayerStrip name="Berserk" sub={`${settings.elo} Elo · attack ${settings.attack}/10 · ${settings.think}s`}
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
          badge={lastReview && history[lastReview.ply - 1] ? { square: history[lastReview.ply - 1].to, icon: `/classification/${gradeFile(lastReview.grade)}`, label: lastReview.grade } : null} />
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
              <EngineSliders settings={settings} update={update} />
              <button type="button" className="btn btn-primary w-full" disabled={!ready} onClick={() => start()}>
                {ready ? <PlayIcon className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                {ready ? "Start game" : engineState.status === "error" ? "Engine unavailable" : `Loading engine ${Math.round(engineState.progress * 100)}%`}
              </button>
              {engineState.status === "error" && <p className="text-xs text-danger">{engineState.error}</p>}
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
            <div className="grid grid-cols-3 gap-2 border-t border-border p-3">
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
      <Slider label="Strength" value={`${settings.elo} Elo`} min={400} max={3000} step={100} v={settings.elo} onChange={(elo) => update({ elo })} lo="400" hi="3000" />
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
