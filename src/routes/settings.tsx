import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Link2, Plus, Trash2, Zap } from "lucide-react";
import { getConnectedChessAccounts, saveConnectedChessAccounts, setPendingChessProfile, useSettings, type ChessAccount } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Berserk Sigma" }, { name: "description", content: "Configure Berserk Sigma and connect chess profiles." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [settings, update] = useSettings();
  const [accounts, setAccounts] = useState<ChessAccount[]>(() => getConnectedChessAccounts());
  const [provider, setProvider] = useState<ChessAccount["provider"]>("lichess");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  function addAccount() {
    const clean = username.trim().replace(/^@/, "");
    if (!clean) { setError("Enter a public username first."); return; }
    if (accounts.some((a) => a.provider === provider && a.username.toLowerCase() === clean.toLowerCase())) {
      setError("That profile is already connected."); return;
    }
    const next = [...accounts, { provider, username: clean }];
    setAccounts(next);
    saveConnectedChessAccounts(next);
    setUsername("");
    setError("");
  }

  function removeAccount(account: ChessAccount) {
    const next = accounts.filter((a) => !(a.provider === account.provider && a.username === account.username));
    setAccounts(next);
    saveConnectedChessAccounts(next);
  }

  function analyzeAccount(account: ChessAccount) {
    setPendingChessProfile(account);
    navigate({ to: "/review" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-3">
      <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <section className="panel p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Zap className="h-5 w-5" /></div>
          <div><h1 className="font-display text-2xl font-semibold">Settings</h1><p className="text-xs text-muted-foreground">Tune Berserk Sigma without changing your workspace.</p></div>
        </div>
        <div className="mt-6 space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Engine strength</h2><span className="font-mono text-sm font-bold text-sage">{settings.elo} Elo</span></div>
            <input aria-label="Engine strength" type="range" min="400" max="3500" step="100" value={settings.elo} onChange={(e) => update({ elo: Number(e.target.value) })} className="w-full" />
            <div className="flex justify-between text-[10px] text-muted-foreground"><span>400 · Casual</span><span>3500 · Maximum</span></div>
            <p className="mt-2 text-[11px] text-muted-foreground">At maximum, Berserk always chooses its top available engine line. Actual playing strength also depends on the configured thinking time and browser performance.</p>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Attack level</h2><span className="font-mono text-sm text-sage">{settings.attack}/10</span></div>
            <input aria-label="Attack level" type="range" min="1" max="10" step="1" value={settings.attack} onChange={(e) => update({ attack: Number(e.target.value) })} className="w-full" />
            <div className="flex justify-between text-[10px] text-muted-foreground"><span>Positional</span><span>Aggressive</span></div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Thinking time</h2><span className="font-mono text-sm text-sage">{settings.think.toFixed(1)}s</span></div>
            <input aria-label="Thinking time" type="range" min="0.1" max="10" step="0.1" value={settings.think} onChange={(e) => update({ think: Number(e.target.value) })} className="w-full" />
            <div className="flex justify-between text-[10px] text-muted-foreground"><span>0.1s · Faster</span><span>10s · Deeper</span></div>
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Connected chess profiles</h2></div>
        <p className="mt-1 text-xs text-muted-foreground">Save your public Lichess or Chess.com profile once. Then click its name to fetch recent games and start analysis automatically.</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[150px_1fr_auto]">
          <select aria-label="Chess platform" className="field" value={provider} onChange={(e) => setProvider(e.target.value as ChessAccount["provider"])}>
            <option value="lichess">Lichess</option><option value="chesscom">Chess.com</option>
          </select>
          <input className="field min-w-0" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAccount()} placeholder={provider === "lichess" ? "Lichess username" : "Chess.com username"} />
          <button type="button" className="btn btn-primary" onClick={addAccount}><Plus className="h-4 w-4" /> Connect</button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <div className="mt-4 space-y-2">
          {accounts.length ? accounts.map((account) => (
            <div key={account.provider + ":" + account.username} className="flex items-center gap-2 rounded-lg border border-border bg-background/40 p-2">
              <button type="button" onClick={() => analyzeAccount(account)} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-muted">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary">{account.provider === "lichess" ? "L" : "C"}</span>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{account.username}</span><span className="block text-[10px] capitalize text-muted-foreground">{account.provider} · click to analyze recent games</span></span>
              </button>
              <a href={account.provider === "lichess" ? `https://lichess.org/@/${encodeURIComponent(account.username)}` : `https://www.chess.com/member/${encodeURIComponent(account.username)}`} target="_blank" rel="noreferrer" aria-label="Open public profile" className="btn btn-ghost btn-sm btn-icon"><ExternalLink className="h-3.5 w-3.5" /></a>
              <button type="button" onClick={() => removeAccount(account)} aria-label="Remove connected profile" className="btn btn-ghost btn-sm btn-icon"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          )) : <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No chess profiles connected yet.</p>}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Note: this connects public game profiles, not private account authorization. Lichess OAuth requires an app client ID; Chess.com does not provide a general public OAuth sign-in flow. Private data and account actions are never accessed.</p>
      </section>
      <div className="flex flex-wrap gap-2"><Link to="/play" className="btn btn-primary">Play Berserk</Link><Link to="/account" className="btn btn-secondary">Berserk account</Link></div>
    </div>
  );
}
