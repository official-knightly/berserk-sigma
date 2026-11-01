import { createFileRoute, Link } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { Logo } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Berserk Web — Chess Engine Lab" }, { name: "description", content: "Play and analyze chess against the Berserk engine in your browser." }, { property: "og:title", content: "Berserk Web — Chess Engine Lab" }, { property: "og:description", content: "Play and analyze chess against the Berserk engine." }] }),
  component: Home,
});

function Home() {
  return (
    <div className="mx-auto max-w-3xl py-10 text-center">
      <div className="flex justify-center"><Logo size={72} /></div>
      <h1 className="mt-4 font-display text-4xl font-bold">Berserk</h1>
      <p className="mt-2 text-muted-foreground">A chess engine that runs right in your browser. Set its strength, style and thinking time, then play.</p>
      <Link to="/play" className="btn btn-primary mt-6"><Swords className="h-4 w-4" />Play Berserk</Link>
    </div>
  );
}
