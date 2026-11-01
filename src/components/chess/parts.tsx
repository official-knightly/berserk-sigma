import { useEffect, useRef, useState } from "react";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Cpu } from "lucide-react";
import { engine, type EngineStatus } from "@/lib/engine";
import { GRADE_ICON, formatEval, type Grade } from "@/lib/chess-logic";
import { cn } from "@/lib/utils";

export function useEngineStatus(autoStart = true) {
  const [s, setS] = useState<{ status: EngineStatus; progress: number; error?: string }>({ status: "idle", progress: 0 });
  useEffect(() => {
    const off = engine.subscribe(setS);
    if (autoStart) engine.start();
    return () => { off(); };
  }, [autoStart]);
  return s;
}

export function EngineBadge({ busy }: { busy?: boolean }) {
  const s = useEngineStatus();
  const label =
    s.status === "ready" ? (busy ? "Thinking" : "Ready")
      : s.status === "loading" ? `Loading ${Math.round(s.progress * 100)}%`
        : s.status === "error" ? "Unavailable" : "Idle";
  return (
    <span className={cn("status-pill", `status-${s.status === "ready" && busy ? "busy" : s.status}`)} title={s.error}>
      <span className="status-dot" />
      <Cpu className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function GradeIcon({ grade, size = 16, className }: { grade: Grade; size?: number; className?: string }) {
  return <img src={GRADE_ICON[grade]} alt={grade} title={grade} width={size} height={size} className={cn("inline-block shrink-0", className)} />;
}

/** cpWhite: evaluation from White's perspective. */
export function EvalBar({ cpWhite, orientation = "white", className }: { cpWhite: number | null; orientation?: "white" | "black"; className?: string }) {
  const cp = cpWhite ?? 0;
  const pct = 50 + 50 * (2 / (1 + Math.exp(-cp / 400)) - 1);
  const flip = orientation === "black";
  return (
    <div className={cn("eval-bar", className)} aria-label={`Evaluation ${formatEval(cpWhite)}`}>
      <div className="eval-white" style={{ height: `${pct}%`, [flip ? "top" : "bottom"]: 0 } as React.CSSProperties} />
      <span className={cn("eval-text", cp >= 0 !== flip ? "bottom-1 text-background" : "top-1 text-foreground")}>
        {formatEval(cpWhite).replace("+", "")}
      </span>
    </div>
  );
}

export type ListMove = { san: string; grade?: Grade | null };

export function MoveList({ moves, ply, onSelect, startNumber = 1, className, empty = "No moves yet." }: {
  moves: ListMove[]; ply: number; onSelect?: (ply: number) => void; startNumber?: number; className?: string; empty?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [ply]);
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push(
      <div key={i} className="move-row">
        <span className="move-num">{startNumber + i / 2}.</span>
        {[0, 1].map((k) => {
          const m = moves[i + k];
          const p = i + k + 1;
          if (!m) return <span key={k} />;
          return (
            <button key={k} type="button" data-active={p === ply} onClick={() => onSelect?.(p)}
              className={cn("move-cell", p === ply && "move-active")}>
              {m.grade && <GradeIcon grade={m.grade} size={15} />}
              <span className="truncate">{m.san}</span>
            </button>
          );
        })}
      </div>,
    );
  }
  return (
    <div ref={ref} className={cn("move-list scroll-thin", className)}>
      {moves.length ? rows : <p className="p-3 text-sm text-muted-foreground">{empty}</p>}
    </div>
  );
}

export function NavControls({ ply, max, onChange }: { ply: number; max: number; onChange: (p: number) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") onChange(Math.max(0, ply - 1));
      else if (e.key === "ArrowRight") onChange(Math.min(max, ply + 1));
      else if (e.key === "Home") onChange(0);
      else if (e.key === "End") onChange(max);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [ply, max, onChange]);
  const btn = "nav-ctrl";
  return (
    <div className="grid grid-cols-4 gap-1.5">
      <button type="button" className={btn} aria-label="First move" disabled={ply === 0} onClick={() => onChange(0)}><ChevronFirst className="h-5 w-5" /></button>
      <button type="button" className={btn} aria-label="Previous move" disabled={ply === 0} onClick={() => onChange(ply - 1)}><ChevronLeft className="h-5 w-5" /></button>
      <button type="button" className={btn} aria-label="Next move" disabled={ply >= max} onClick={() => onChange(ply + 1)}><ChevronRight className="h-5 w-5" /></button>
      <button type="button" className={btn} aria-label="Last move" disabled={ply >= max} onClick={() => onChange(max)}><ChevronLast className="h-5 w-5" /></button>
    </div>
  );
}

export function PlayerStrip({ name, sub, avatar, active, right }: { name: string; sub?: string; avatar?: React.ReactNode; active?: boolean; right?: React.ReactNode }) {
  return (
    <div className={cn("player-strip", active && "player-active")}>
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="player-avatar">{avatar}</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{name}</div>
          {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Panel({ title, icon, action, children, className }: { title?: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("panel", className)}>
      {title && (
        <header className="panel-head">
          <h2 className="flex items-center gap-2">{icon}{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
