import { createFileRoute } from "@tanstack/react-router";
import { GameReviewPage } from "./review";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "Analysis — Berserk Web" },
      { name: "description", content: "Import and analyze chess games with the Berserk engine." },
      { property: "og:title", content: "Analysis — Berserk Web" },
      { property: "og:description", content: "Import and analyze chess games with the Berserk engine." },
    ],
  }),
  component: GameReviewPage,
});
