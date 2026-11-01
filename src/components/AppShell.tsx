import { Link } from "@tanstack/react-router";
import { BarChart3, Crosshair, Home, Microscope, Radio, Settings, Swords } from "lucide-react";
import { EngineBadge } from "./chess/parts";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/play", label: "Play", icon: Swords },
  { to: "/analysis", label: "Analysis", icon: Crosshair },
  { to: "/review", label: "Game Review", short: "Review", icon: Microscope },
  { to: "/live", label: "Live Games", short: "Live", icon: Radio },
  { to: "/stats", label: "Statistics", short: "Stats", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Logo({ size = 32 }: { size?: number }) {
  return <img src="/brand/berserk-emblem.png" alt="Berserk" width={size} height={size} className="rounded-md" />;
}

export function AppShell({ children }: { children: React.ReactNode }) {
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
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
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
