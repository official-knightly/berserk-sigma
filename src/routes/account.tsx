import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Cloud, Loader2, LogIn, LogOut, ShieldCheck, UserPlus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { loadGames, saveLocalGames } from "@/lib/store";
import { saveProfile, signIn, signOut, signUp, syncCloudGames } from "@/lib/supabase";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Berserk Account" }, { name: "description", content: "Sign in to Berserk and sync your chess history across devices." }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "signup") {
        const localBeforeAuth = loadGames();
        const data = await signUp(email.trim(), password, name.trim());
        if (!data.access_token) {
          setError("Instant signup is not enabled yet. Turn off Confirm email in Supabase → Authentication → Sign In / Providers → Email, then try again.");
        } else {
          await saveProfile(data.user, name.trim());
          const games = await syncCloudGames(localBeforeAuth);
          saveLocalGames(games);
          window.dispatchEvent(new Event("berserk-games-updated"));
          setMessage("Account created. Your game history is now syncing.");
        }
      } else {
        const localBeforeAuth = loadGames();
        const signedIn = await signIn(email.trim(), password);
        await saveProfile(signedIn, signedIn.user_metadata?.display_name || signedIn.email?.split("@")[0] || "Berserk Player");
        const games = await syncCloudGames(localBeforeAuth);
        saveLocalGames(games);
        window.dispatchEvent(new Event("berserk-games-updated"));
        setMessage("Signed in. Your games are synced across devices.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete that request.");
    } finally { setBusy(false); }
  };

  const handleSignOut = async () => {
    setBusy(true); setError(""); setMessage("");
    try { await signOut(); setMessage("Signed out. Your games remain saved on this device."); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not sign out."); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 py-5">
      <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Berserk</Link>
      <section className="panel p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Cloud className="h-6 w-6" /></div>
          <div><h1 className="font-display text-2xl font-bold">Berserk Account</h1><p className="text-xs text-muted-foreground">Your games, available on every device.</p></div>
        </div>
        {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking your session…</div> : user ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Signed in</div>
              <p className="mt-1 text-sm">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Cloud history is enabled for this account.</p>
              <a href={`/player/${user.id}`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">View public player profile ↗</a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat"><div className="stat-label">Saved locally</div><div className="stat-value">{loadGames().length}</div></div>
              <div className="stat"><div className="stat-label">Sync status</div><div className="stat-value text-base text-primary">Connected</div></div>
            </div>
            <button onClick={handleSignOut} disabled={busy} className="btn btn-secondary w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out</button>
          </div>
        ) : (
          <>
            <div className="seg mb-5">
              <button type="button" data-on={mode === "signin"} onClick={() => { setMode("signin"); setError(""); setMessage(""); }}><LogIn className="h-4 w-4" /> Sign in</button>
              <button type="button" data-on={mode === "signup"} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}><UserPlus className="h-4 w-4" /> Create account</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && <label className="block space-y-1.5 text-xs text-muted-foreground">Display name<input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your chess name" maxLength={40} required /></label>}
              <label className="block space-y-1.5 text-xs text-muted-foreground">Email<input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
              <label className="block space-y-1.5 text-xs text-muted-foreground">Password<input className="field" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required /></label>
              <button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
            </form>
          </>
        )}
        {error && <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive" role="alert">{error}</p>}
        {message && <p className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary" role="status">{message}</p>}
      </section>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">Your account is protected by Supabase authentication. Game records are private to your account and protected by database row-level security.</p>
    </div>
  );
}
