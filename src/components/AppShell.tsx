import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { BarChart3, Crosshair, Home, Microscope, Radio, Settings, Swords, UserRound } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { EngineBadge } from "./chess/parts";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/play", label: "Play", icon: Swords },
  { to: "/analysis", label: "Analysis", icon: Crosshair },
  { to: "/review", label: "Game Review", short: "Review", icon: Microscope },
  { to: "/live", label: "Live Games", short: "Live", icon: Radio },
  { to: "/stats", label: "Statistics", short: "Stats", icon: BarChart3 },
  { to: "/account", label: "Account", short: "Account", icon: UserRound },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Logo({ size = 32 }: { size?: number }) {
  return <img src="/brand/berserk-emblem.png" alt="Berserk" width={size} height={size} className="rounded-md" />;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    const mount = document.getElementById("bmc-button-mount");
    if (!mount || mount.querySelector("script[data-name='bmc-button']")) return;

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js";
    script.dataset.name = "bmc-button";
    script.dataset.slug = "Officialknightly";
    script.dataset.color = "#FFDD00";
    script.dataset.emoji = "";
    script.dataset.font = "Cookie";
    script.dataset.text = "Buy me a coffee";
    script.dataset.outlineColor = "#000000";
    script.dataset.fontColor = "#000000";
    script.dataset.coffeeColor = "#ffffff";
    mount.appendChild(script);

    return () => {
      mount.replaceChildren();
    };
  }, []);
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 lg:flex">
        <Link to="/" className="mb-6 flex items-center gap-2.5 px-2 pt-1">
          <Logo />
          <div>
            <div className="font-display text-lg font-bold leading-none">Berserk</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Engine Lab</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="nav-item" activeOptions={{ exact: n.to === "/" }}>
              <n.icon className="h-[18px] w-[18px]" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 rounded-lg border border-sidebar-border p-3">
          <div className="text-xs text-muted-foreground">Engine</div>
          <EngineBadge />
          <p className="text-[11px] leading-snug text-muted-foreground">Berserk runs locally in your browser via WebAssembly.</p>
          <div className="border-t border-sidebar-border pt-2 text-[11px] text-muted-foreground">{user ? `Signed in: ${user.email || "Berserk player"}` : "Local mode · Sign in to sync games"}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-display text-base font-bold">Berserk</span>
          </Link>
          <div className="flex items-center gap-2">
            <EngineBadge />
            <Link to="/settings" aria-label="Settings" className="btn btn-ghost btn-sm btn-icon"><Settings className="h-4 w-4" /></Link>
          </div>
        </header>
        <main className="flex-1 px-3 pb-24 pt-3 sm:px-5 lg:px-6 lg:pb-6 lg:pt-5">{children}</main>
        <footer className="border-t border-border px-4 py-5 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold text-foreground">Support Berserk Sigma</p>
              <p className="mt-1 text-xs text-muted-foreground">Enjoying the project? Support independent development.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div id="bmc-button-mount" className="flex min-h-10 items-center" />
              <a
                href="https://linktr.ee/OfficialKnightly"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                OfficialKnightly Links
              </a>
            </div>
          </div>
        </footer>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.filter((n) => n.to !== "/settings").map((n) => (
          <Link key={n.to} to={n.to} className="mnav-item" activeOptions={{ exact: n.to === "/" }}>
            <n.icon className="h-5 w-5" />
            {"short" in n ? n.short : n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
