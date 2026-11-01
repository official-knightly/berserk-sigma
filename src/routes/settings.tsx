import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Berserk Web" }, { name: "description", content: "Settings with the Berserk chess engine." }, { property: "og:title", content: "Settings — Berserk Web" }, { property: "og:description", content: "Settings with the Berserk chess engine." }] }),
  component: () => (
    <div className="mx-auto max-w-xl panel p-6 text-center">
      <h1 className="font-display text-2xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">This section is being rebuilt and isn't finished yet.</p>
      <Link to="/play" className="btn btn-primary mt-4">Play Berserk</Link>
    </div>
  ),
});
