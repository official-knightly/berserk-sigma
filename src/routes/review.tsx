import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/review")({
  head: () => ({ meta: [{ title: "Game Review — Berserk Web" }, { name: "description", content: "Game Review with the Berserk chess engine." }, { property: "og:title", content: "Game Review — Berserk Web" }, { property: "og:description", content: "Game Review with the Berserk chess engine." }] }),
  component: () => (
    <div className="mx-auto max-w-xl panel p-6 text-center">
      <h1 className="font-display text-2xl font-semibold">Game Review</h1>
      <p className="mt-2 text-sm text-muted-foreground">This section is being rebuilt and isn't finished yet.</p>
      <Link to="/play" className="btn btn-primary mt-4">Play Berserk</Link>
    </div>
  ),
});
