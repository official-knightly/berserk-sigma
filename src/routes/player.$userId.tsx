import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { getPublicPlayerProfile, type PublicPlayerProfile } from "@/lib/supabase";

export const Route = createFileRoute("/player/$userId")({
  head: () => ({ meta: [
    { title: "Berserk Player Profile" },
    { name: "description", content: "Public Berserk chess profile and connected chess accounts." },
  ] }),
  component: PlayerProfilePage,
});

function PlayerProfilePage() {
  const { userId } = Route.useParams();
  const [profile, setProfile] = useState<PublicPlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPublicPlayerProfile(userId)
      .then((result) => { if (active) setProfile(result); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load this profile."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-5">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to Berserk</Link>
      <section className="panel overflow-hidden">
        <div className="border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-transparent p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><UserRound className="h-7 w-7" /></div>
            <div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary"><ShieldCheck className="h-3.5 w-3.5" /> Berserk player</div><h1 className="mt-1 font-display text-2xl font-bold">{profile?.display_name || "Player profile"}</h1><p className="mt-1 text-xs text-muted-foreground">Public chess identity and connected profiles</p></div>
          </div>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading player profile…</div> :
            error ? <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> :
            !profile ? <div className="py-8 text-center"><UserRound className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">Profile not found</h2><p className="mt-1 text-xs text-muted-foreground">This player hasn't created a public Berserk profile yet.</p></div> :
            <>
              <div><h2 className="font-display text-lg font-semibold">Connected chess accounts</h2><p className="mt-1 text-xs text-muted-foreground">Public profiles connected by this player.</p></div>
              {profile.chess_accounts.length ? profile.chess_accounts.map((account) => (
                <a key={account.id} href={account.profile_url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-4 transition hover:border-primary/40 hover:bg-primary/5">
                  <div><div className="text-sm font-semibold">{account.platform === "lichess" ? "Lichess" : "Chess.com"}</div><div className="mt-1 text-xs text-muted-foreground">@{account.username}</div></div>
                  <span className="btn btn-secondary btn-sm">View profile <ExternalLink className="h-3.5 w-3.5" /></span>
                </a>
              )) : <p className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">No chess accounts connected yet.</p>}
            </>
          }
        </div>
      </section>
    </div>
  );
}
