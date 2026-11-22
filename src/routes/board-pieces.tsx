import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Board } from "@/components/chess/Board";
import {
  BOARD_THEMES,
  DEFAULT_BOARD_APPEARANCE,
  PIECE_STYLES,
  pieceImageFilter,
  pieceImageSource,
  useBoardAppearance,
} from "@/lib/board-appearance";

const PREVIEW_FEN = "rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";

export const Route = createFileRoute("/board-pieces")({
  head: () => ({
    meta: [
      { title: "Board and Pieces — Berserk Sigma" },
      { name: "description", content: "Customize chessboard colors and SVG chess piece styles in Berserk Sigma." },
    ],
  }),
  component: BoardPiecesPage,
});

function BoardSwatch({ light, dark }: { light: string; dark: string }) {
  return (
    <div className="grid aspect-square w-full grid-cols-4 overflow-hidden rounded-lg border border-white/10">
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} style={{ background: ((Math.floor(i / 4) + i % 4) % 2) ? dark : light }} />
      ))}
    </div>
  );
}

function BoardPiecesPage() {
  const [appearance, update] = useBoardAppearance();
  const selectedTheme = BOARD_THEMES.find((theme) => theme.id === appearance.board) ?? BOARD_THEMES[5];
  const selectedPieces = PIECE_STYLES.find((style) => style.id === appearance.pieces) ?? PIECE_STYLES[0];

  function reset() {
    update(DEFAULT_BOARD_APPEARANCE);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/settings" aria-label="Back to settings" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-primary hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-primary">PERSONALIZE</p>
            <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">Board and pieces</h1>
          </div>
        </div>
        <button type="button" onClick={reset} className="btn btn-secondary btn-sm"><RotateCcw className="h-4 w-4" /> Restore defaults</button>
      </header>

      <section className="panel overflow-hidden p-3 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold"><SlidersHorizontal className="h-4 w-4 text-primary" /> Live preview</div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-md border border-border bg-background px-2 py-1 text-muted-foreground">{selectedTheme.label}</span>
            <span className="rounded-md border border-border bg-background px-2 py-1 text-muted-foreground">{selectedPieces.label}</span>
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-primary"><Check className="h-3 w-3" /> Saved automatically</span>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[520px]">
          <Board fen={PREVIEW_FEN} orientation="white" />
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">Changes apply immediately to every board in Berserk Sigma and are saved on this device.</p>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-primary">BOARD</p>
          <h2 className="mt-1 text-lg font-bold">Choose a board color</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BOARD_THEMES.map((theme) => {
            const active = appearance.board === theme.id;
            return (
              <button key={theme.id} type="button" aria-pressed={active} onClick={() => update({ board: theme.id })} className={`appearance-choice group min-w-0 p-3 text-left transition sm:p-4 ${active ? "appearance-choice-active" : ""}`}>
                <BoardSwatch light={theme.light} dark={theme.dark} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{theme.label}</span>
                  {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-primary">PIECES</p>
          <h2 className="mt-1 text-lg font-bold">Choose a piece set</h2>
          <p className="mt-1 text-xs text-muted-foreground">Each preview uses real SVG chess artwork, not emoji or text glyphs.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PIECE_STYLES.map((style) => {
            const active = appearance.pieces === style.id;
            const whiteFilter = pieceImageFilter("w", style.id);
            const blackFilter = pieceImageFilter("b", style.id);
            return (
              <button key={style.id} type="button" aria-pressed={active} onClick={() => update({ pieces: style.id })} className={`appearance-choice min-w-0 p-3 text-left transition sm:p-4 ${active ? "appearance-choice-active" : ""}`}>
                <div className="flex h-[76px] items-center justify-center gap-3 overflow-hidden rounded-lg border border-white/5 bg-[#171717] px-2 sm:h-24">
                  <img src={pieceImageSource("w", "k", style.id)} alt="White king preview" style={whiteFilter ? { filter: whiteFilter } : undefined} className="h-full min-w-0 flex-1 object-contain p-1" />
                  <img src={pieceImageSource("b", "q", style.id)} alt="Black queen preview" style={blackFilter ? { filter: blackFilter } : undefined} className="h-full min-w-0 flex-1 object-contain p-1" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-1">
                  <span className="min-w-0 truncate text-xs font-semibold sm:text-sm">{style.label}</span>
                  {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
