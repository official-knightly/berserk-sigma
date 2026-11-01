import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ExternalLink, Gamepad2, Link2, Loader2, Save, Settings2, Trash2, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useSettings } from "@/lib/store";
import { getChessAccounts, removeChessAccount, saveChessAccount, type ChessAccount } from "@/lib/supabase";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Settings — Berserk" },
    { name: "description", content: "Manage Berserk engine preferences and connected chess profiles." },
  ] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [settings, updateSettings] = useSettings();
  const [accounts, setAccounts] = useState<ChessAccount[]>([]);
  const [platform, setPlatform] = useState<"lichess" | "chesscom">("lichess");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) { setAccounts([]); return; }
    let active = true;
    setLoadingAccounts(true);
    getChessAccounts()
      .then((rows) => { if (active) setAccounts(rows); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load connected accounts."); })
      .finally(() => { if (active) setLoadingAccounts(false); });
    return () => { active = false; };
  }, [user]);

  const connectAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || busy || !username.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const saved = await saveChessAccount(platform, username);
      setAccounts((current) => [...current.filter((item) => item.platform !== platform), {
        id: `${platform}-${saved.username}`, platform: saved.platform, username: saved.username, profile_url: saved.profile_url,
      }]);
      const refreshed = await getChessAccounts();
      setAccounts(refreshed);
      setUsername("");
      setMessage(`${platform === "lichess" ? "Lichess" : "Chess.com"} profile connected and verified.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect that chess account.");
    } finally { setBusy(false); }
  };

  const disconnectAccount = async (account: ChessAccount) => {
    setBusy(true); setError(""); setMessage("");
    try {
      await removeChessAccount(account.id);
      setAccounts((current) => current.filter((item) => item.id !== account.id));
      setMessage(`${account.platform === "lichess" ? "Lichess" : "Chess.com"} profile disconnected.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect that account.");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-3">
      <div>
        <div className="flex items-center gap-2 text-primary"><Settings2 className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Preferences</span></div>
        <h1 className="mt-2 font-display text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tune Berserk and manage your chess identity.</p>
      </div>

      <section className="panel p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Gamepad2 className="h-5 w-5" /></div>
          <div><h2 className="font-display text-lg font-semibold">Engine preferences</h2><p className="text-xs text-muted-foreground">Default settings for new games.</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs text-muted-foreground">Default engine Elo
            <input className="field" type="number" min="100" max="3600" step="50" value={settings.elo} onChange={(e) => updateSettings({ elo: Math.max(100, Math.min(3600, Number(e.target.value) || 100)) })} />
          </label>
          <label className="space-y-1.5 text-xs text-muted-foreground">Attack level
            <input className="field" type="number" min="1" max="10" value={settings.attack} onChange={(e) => updateSettings({ attack: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} />
          </label>
          <label className="space-y-1.5 text-xs text-muted-foreground">Think time (seconds)
            <input className="field" type="number" min="0.1" max="10" step="0.1" value={settings.think} onChange={(e) => updateSettings({ think: Math.max(0.1, Math.min(10, Number(e.target.value) || 0.1)) })} />
          </label>
          <label className="space-y-1.5 text-xs text-muted-foreground">Play as
            <select className="field" value={settings.side} onChange={(e) => updateSettings({ side: e.target.value as "w" | "b" | "random" })}>
              <option value="w">White</option><option value="b">Black</option><option value="random">Random</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3">
          <div><div className="text-sm font-medium">Board coordinates</div><div className="text-xs text-muted-foreground">Show file and rank labels on the board.</div></div>
          <button type="button" aria-pressed={settings.coords} onClick={() => updateSettings({ coords: !settings.coords })} className={`btn btn-sm ${settings.coords ? "btn-primary" : "btn-secondary"}`}>{settings.coords ? "Enabled" : "Disabled"}</button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Save className="h-3.5 w-3.5" /> Preferences save automatically on this device.</div>
      </section>

      <section className="panel p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Link2 className="h-5 w-5" /></div>
          <div><h2 className="font-display text-lg font-semibold">Connected chess accounts</h2><p className="text-xs text-muted-foreground">Attach your public Lichess and Chess.com profiles to Berserk.</p></div>
        </div>
        {authLoading ? <p className="text-sm text-muted-foreground">Checking your Berserk account…</p> : !user ? (
          <div className="rounded-xl border border-dashed border-border bg-background/40 p-5 text-center">
            <UserRound className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Sign in to connect chess accounts</p>
            <p className="mt-1 text-xs text-muted-foreground">Your linked profiles will be saved to your Berserk account.</p>
            <Link to="/account" className="btn btn-primary mt-4">Open Berserk Account</Link>
          </div>
        ) : (
          <>
            <form onSubmit={connectAccount} className="grid gap-2 sm:grid-cols-[150px_1fr_auto]">
              <select className="field" value={platform} onChange={(e) => setPlatform(e.target.value as "lichess" | "chesscom")}>
                <option value="lichess">Lichess</option><option value="chesscom">Chess.com</option>
              </select>
              <input className="field min-w-0" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={platform === "lichess" ? "Lichess username" : "Chess.com username"} minLength={2} maxLength={30} />
              <button className="btn btn-primary" type="submit" disabled={busy || !username.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Connect</button>
            </form>
            <p className="text-[11px] text-muted-foreground">Berserk checks the public profile exists before linking it. This does not ask for your chess-site password or grant access to private data.</p>
            <div className="space-y-2">
              {loadingAccounts ? <p className="text-xs text-muted-foreground">Loading linked profiles…</p> : accounts.length ? accounts.map((account) => (
                <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold"><span className={account.platform === "lichess" ? "text-primary" : "text-foreground"}>{account.platform === "lichess" ? "Lichess" : "Chess.com"}</span><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Connected</span></div>
                    <a href={account.profile_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">@{account.username} <ExternalLink className="h-3 w-3" /></a>
                  </div>
                  <button type="button" onClick={() => disconnectAccount(account)} disabled={busy} className="btn btn-secondary btn-sm"><Trash2 className="h-3.5 w-3.5" /> Disconnect</button>
                </div>
              )) : <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No chess accounts connected yet.</p>}
            </div>
          </>
        )}
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
        {message && <p role="status" className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary"><Check className="h-4 w-4" />{message}</p>}
      </section>
    </div>
  );
}
