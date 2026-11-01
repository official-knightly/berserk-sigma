import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/live")({
  head: () => ({ meta: [{ title: "Live Games — Berserk Web" }, { name: "description", content: "Live Games with the Berserk chess engine." }, { property: "og:title", content: "Live Games — Berserk Web" }, { property: "og:description", content: "Live Games with the Berserk chess engine." }] }),
  component: () => (
    <div className="mx-auto max-w-xl panel p-6 text-center">
      <h1 className="font-display text-2xl font-semibold">Live Games</h1>
      <p className="mt-2 text-sm text-muted-foreground">This section is being rebuilt and isn't finished yet.</p>
      <Link to="/play" className="btn btn-primary mt-4">Play Berserk</Link>
    </div>
  ),
});
