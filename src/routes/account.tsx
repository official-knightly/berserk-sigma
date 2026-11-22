import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Brush, ChevronRight, Cloud, Gift, Grid3X3, Loader2, LogIn, LogOut, Mail, Scale, Send, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getConnectedChessAccounts, loadGames, saveLocalGames } from "@/lib/store";
import { saveProfile, signIn, signOut, signUp, syncCloudGames } from "@/lib/supabase";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Berserk Account" }, { name: "description", content: "Sign in to Berserk and sync your chess history across devices." }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [accounts] = useState(() => getConnectedChessAccounts());
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
          setMessage("Check your email to confirm your account, then come back and sign in.");
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
        if (signedIn.user_metadata?.display_name) await saveProfile(signedIn, signedIn.user_metadata.display_name);
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat"><div className="stat-label">Saved locally</div><div className="stat-value">{loadGames().length}</div></div>
              <div className="stat"><div className="stat-label">Sync status</div><div className="stat-value text-base text-primary">Connected</div></div>
            </div>
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
      <section className="panel space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <img src="/brand/berserk-emblem.png" alt="Berserk Sigma" className="h-14 w-14 rounded-xl border border-border object-cover" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Guest profile"}</h2>
            <p className="truncate text-xs text-muted-foreground">{user?.email || "Sign in to sync your saved games across devices"}</p>
          </div>
          <span className="rounded-lg border border-border bg-background px-2 py-1 text-[10px] font-bold text-primary">{user ? "SIGNED IN" : "GUEST"}</span>
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-muted-foreground">PLAN</p>
          <Link to="/train" className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary px-4 py-4 text-sm font-extrabold text-primary-foreground shadow-[0_4px_0_#8b5e00] transition hover:brightness-105">
            <span>Open free training</span><ChevronRight className="h-5 w-5" />
          </Link>
          <p className="mt-2 text-[10px] text-muted-foreground">Training, board settings and game analysis are available without a paid plan.</p>
        </div>
      </section>

      <section className="panel divide-y divide-border overflow-hidden">
        <div className="px-4 pb-2 pt-4"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-muted-foreground">CHESS</p></div>
        <Link to="/settings" className="account-setting-row"><span className="account-setting-icon"><Users className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Chess accounts</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{accounts.length ? accounts.length + " connected public profiles" : "Connect Chess.com or Lichess profiles"}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>
        <Link to="/openings" className="account-setting-row"><span className="account-setting-icon"><BookOpen className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Opening repertoire</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Practice standard opening lines</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>
      </section>

      <section className="panel divide-y divide-border overflow-hidden">
        <div className="px-4 pb-2 pt-4"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-muted-foreground">APP</p></div>
        <Link to="/board-pieces" className="account-setting-row"><span className="account-setting-icon"><Grid3X3 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Board and pieces</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Six board themes · fifteen SVG piece sets</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>
        <Link to="/settings" className="account-setting-row"><span className="account-setting-icon"><Brush className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Engine preferences</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Strength, attack style, thinking time and review engine</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>
        <div className="account-setting-row"><span className="account-setting-icon"><ShieldCheck className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Appearance</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Dark workspace · customise your board colours above</span></span><span className="text-xs text-muted-foreground">Dark</span></div>
      </section>

      <section className="panel divide-y divide-border overflow-hidden">
        <div className="px-4 pb-2 pt-4"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-muted-foreground">NOTIFICATIONS</p></div>
        <div className="account-setting-row"><span className="account-setting-icon"><Mail className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Email preferences</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Managed by your sign-in email provider settings</span></span></div>
        <div className="px-4 py-3 text-[10px] leading-5 text-muted-foreground">This web version does not schedule background streak reminders or send promotional email. No notification permission is requested.</div>
      </section>

      <section className="panel divide-y divide-border overflow-hidden">
        <div className="px-4 pb-2 pt-4"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-muted-foreground">SUPPORT</p></div>
        <a href="https://github.com/official-knightly/berserk-sigma/releases" target="_blank" rel="noreferrer" className="account-setting-row"><span className="account-setting-icon"><Gift className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">What’s new</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Repository releases and updates</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></a>
        <a href="https://github.com/official-knightly/berserk-sigma/issues/new" target="_blank" rel="noreferrer" className="account-setting-row"><span className="account-setting-icon"><Send className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Send feedback</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Report an issue or request a feature</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></a>
        <a href="/engine/STOCKFISH-LICENSE.md" target="_blank" rel="noreferrer" className="account-setting-row"><span className="account-setting-icon"><Scale className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Legal and engine licences</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Stockfish GPL notices and attribution</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></a>
      </section>

      <section className="panel p-4">
        <div className="flex items-center gap-2"><Cloud className="h-4 w-4 text-primary" /><h2 className="text-[10px] font-extrabold uppercase tracking-[.16em] text-muted-foreground">ACCOUNT</h2></div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{user ? "Your games are stored locally and synced to your signed-in account." : "Sign in to sync your games. Guest games stay in this browser."}</p>
        {user && <button type="button" onClick={handleSignOut} disabled={busy} className="btn btn-secondary mt-3 w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out</button>}
      </section>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">Account deletion and scheduled notifications are not available in this web version.</p>    </div>
  );
}
