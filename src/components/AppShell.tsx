import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3,
  Brain,
  Brush,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Gamepad2,
  Home,
  Radio,
  Sparkles,
  Settings,
  Swords,
  Play,
  UserRound,
  Dumbbell,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { EngineBadge } from "./chess/parts";
import { AppUpdateNotice } from "./AppUpdateNotice";

const PRIMARY_NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/train", label: "Train", icon: Dumbbell },
  { to: "/stats", label: "Coach", icon: BarChart3 },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/brain", label: "Brain", icon: Brain, badge: "NEW" },
  { to: "/ai-coach", label: "AI Coach", icon: Sparkles, badge: "AI" },
] as const;

const TOOL_NAV = [
  { to: "/play", label: "Play Chess Topper", icon: Swords },
  { to: "/review", label: "Game Review", icon: BookOpen },
  { to: "/analysis", label: "Analysis board", icon: Crosshair },
  { to: "/board-pieces", label: "Board & pieces", icon: Brush },
  { to: "/live", label: "Live games", icon: Radio },
  { to: "/account", label: "Account", icon: UserRound },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Logo({ size = 32 }: { size?: number }) {
  return <img src="/brand/chess-topper-icon.svg" alt="Chess Topper" width={size} height={size} className="shrink-0 rounded-lg object-contain" />;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const renderNav = (items: typeof PRIMARY_NAV | typeof TOOL_NAV) => items.map((item) => (
    <Link
      key={item.to}
      to={item.to}
      title={collapsed ? item.label : undefined}
      aria-label={item.label}
      className={`nav-item group relative ${collapsed ? "justify-center px-0" : ""}`}
      activeOptions={{ exact: item.to === "/" }}
    >
      <item.icon className="h-[19px] w-[19px] shrink-0" />
      {!collapsed && <span className="min-w-0 flex-1">{item.label}</span>}
      {!collapsed && "badge" in item && item.badge && (
        <span className="rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-primary-foreground">{item.badge}</span>
      )}
      {collapsed && <span className="pointer-events-none absolute left-[calc(100%+10px)] z-50 hidden whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-lg group-hover:block">{item.label}</span>}
    </Link>
  ));

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 transition-[width] duration-200 lg:flex ${collapsed ? "w-[76px]" : "w-[248px]"}`}>
        <div className={`mb-7 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          <Link to="/" className={`flex min-w-0 items-center gap-2.5 ${collapsed ? "justify-center" : "px-1"}`}>
            <Logo size={34} />
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-display text-base font-bold leading-tight tracking-tight">CHESS TOPPER</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Play · Train · Review</div>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:bg-accent hover:text-foreground ${collapsed ? "mt-2" : ""}`}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed && <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>}
        <nav aria-label="Main navigation" className="flex flex-col gap-1">
          {renderNav(PRIMARY_NAV)}
        </nav>

        <div className="my-4 border-t border-sidebar-border" />
        {!collapsed && <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">More tools</p>}
        <nav aria-label="More tools" className="flex flex-col gap-1">
          {renderNav(TOOL_NAV)}
        </nav>

        <div className="mt-auto space-y-3 pt-4">
          <div className={`rounded-xl border border-sidebar-border bg-surface p-3 ${collapsed ? "flex justify-center px-1" : ""}`}>
            {collapsed ? (
              <EngineBadge />
            ) : (
              <>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Engine status</div>
                <EngineBadge />
                <p className="mt-2 text-[11px] leading-4 text-muted-foreground">Stockfish-powered chess analysis and training.</p>
              </>
            )}
          </div>
          <Link to="/account" className={`flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-105 ${collapsed ? "justify-center px-0" : "justify-center"}`} title={collapsed ? "Account" : undefined}>
            <UserRound className="h-4 w-4 shrink-0" />
            {!collapsed && (user ? "Your account" : "Sign in / Create account")}
          </Link>
          {!collapsed && (
            <div className="px-1 text-[10px] leading-4 text-muted-foreground">
              {user ? `Signed in: ${user.email || "Chess Topper player"}` : "Free chess tools · Local-first"}
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-3 backdrop-blur lg:hidden">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <Logo size={29} />
            <span className="truncate font-display text-sm font-extrabold tracking-tight">CHESS TOPPER</span>
          </Link>
          <div className="flex items-center gap-2">
            <EngineBadge />
            <Link to="/settings" aria-label="Settings" className="btn btn-ghost btn-sm btn-icon"><Settings className="h-4 w-4" /></Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5 lg:px-7 lg:pb-7 lg:pt-6">
          <AppUpdateNotice />
          {children}
        </main>
        <footer className="border-t border-border px-4 py-5">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold text-foreground">Chess Topper</p>
              <p className="mt-1 text-xs text-muted-foreground">Free chess play, analysis and training tools.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="https://buymeacoffee.com/Officialknightly" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-muted-foreground transition hover:text-primary">Support the developer</a>
              <a href="https://linktr.ee/OfficialKnightly" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-muted-foreground transition hover:text-primary">OfficialKnightly links</a>
            </div>
          </div>
        </footer>
      </div>

      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-sidebar/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,.25)] backdrop-blur lg:hidden">
        {PRIMARY_NAV.map((item) => (
          <Link key={item.to} to={item.to} className="mnav-item min-h-[58px] gap-1 py-2" activeOptions={{ exact: item.to === "/" }}>
            <span className="relative">
              <item.icon className="h-[19px] w-[19px]" />
              {"badge" in item && item.badge && <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-primary" />}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
