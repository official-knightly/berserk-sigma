import { createFileRoute } from "@tanstack/react-router";
import { GameReviewPage } from "./review";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "Analysis — Chess Topper" },
      { name: "description", content: "Import and analyze chess games with the Stockfish." },
      { property: "og:title", content: "Analysis — Chess Topper" },
      { property: "og:description", content: "Import and analyze chess games with the Stockfish." },
    ],
  }),
  component: GameReviewPage,
});
