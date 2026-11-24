import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { ArrowDownToLine, CheckCircle2, LoaderCircle, RefreshCw, ShieldCheck, X } from "lucide-react";
import type { DesktopUpdateState } from "@/lib/desktop-api";

type NoticeState = DesktopUpdateState & { downloadUrl?: string; releaseUrl?: string; platform?: "android" | "desktop" | "web" };

const OWNER = "official-knightly";
const REPOSITORY = "berserk-sigma";
const RELEASE_API = `https://api.github.com/repos/${OWNER}/${REPOSITORY}/releases/latest`;
const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

function versionParts(value: string) {
  return value.replace(/^v/i, "").split(/[.+-]/).slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);
}

function isNewerVersion(candidate: string, current: string) {
  const next = versionParts(candidate);
  const installed = versionParts(current);
  for (let index = 0; index < 3; index += 1) {
    if ((next[index] || 0) !== (installed[index] || 0)) return (next[index] || 0) > (installed[index] || 0);
  }
  return false;
}

function detectDesktopAsset(assets: Array<{ name: string; browser_download_url: string }>) {
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent.toLowerCase();
  if (userAgent.includes("windows")) return assets.find((asset) => /setup.*\.exe$/i.test(asset.name) || /\.msi$/i.test(asset.name));
  if (userAgent.includes("mac")) return assets.find((asset) => /\.dmg$/i.test(asset.name));
  return assets.find((asset) => /\.appimage$/i.test(asset.name)) || assets.find((asset) => /\.deb$/i.test(asset.name));
}

export function AppUpdateNotice() {
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const nativeDesktop = window.chessTopperDesktop;

    if (nativeDesktop) {
      const unsubscribe = nativeDesktop.updates.onState((state) => {
        if (!active) return;
        if (state.status === "not-available") {
          setNotice(null);
          return;
        }
        setNotice({ ...state, platform: "desktop" });
      });
      void nativeDesktop.updates.check().catch((error: unknown) => {
        if (active) setNotice({ status: "error", message: error instanceof Error ? error.message : "Update check failed.", platform: "desktop" });
      });
      return () => {
        active = false;
        unsubscribe();
      };
    }

    const checkRelease = async () => {
      try {
        const response = await fetch(RELEASE_API, {
          headers: { Accept: "application/vnd.github+json" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`GitHub update check returned ${response.status}`);
        const release = await response.json() as {
          tag_name?: string;
          html_url?: string;
          prerelease?: boolean;
          draft?: boolean;
          assets?: Array<{ name: string; browser_download_url: string }>;
        };
        const version = release.tag_name || "";
        if (!active || release.draft || release.prerelease || !version || !isNewerVersion(version, CURRENT_VERSION)) return;
        const assets = release.assets || [];
        const platform = Capacitor.getPlatform() === "android" ? "android" : "web";
        const selected = platform === "android"
          ? assets.find((asset) => /^chess-topper\.apk$/i.test(asset.name))
          : detectDesktopAsset(assets);
        setNotice({
          status: "available",
          version,
          downloadUrl: selected?.browser_download_url,
          releaseUrl: release.html_url,
          platform,
          message: selected ? "A newer Chess Topper version is ready." : "A new version is available on GitHub.",
        });
      } catch {
        // Update checks are best-effort; the app remains usable offline.
      }
    };

    void checkRelease();
    const interval = window.setInterval(() => void checkRelease(), 6 * 60 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const handleUpdate = useCallback(async () => {
    setBusy(true);
    try {
      if (window.chessTopperDesktop) {
        if (notice?.status === "downloaded") {
          await window.chessTopperDesktop.updates.install();
        } else {
          await window.chessTopperDesktop.updates.download();
        }
        return;
      }
      if (notice?.downloadUrl) {
        if (Capacitor.getPlatform() === "android") {
          await Browser.open({ url: notice.downloadUrl });
        } else {
          window.open(notice.downloadUrl, "_blank", "noopener,noreferrer");
        }
      } else if (notice?.releaseUrl) {
        window.open(notice.releaseUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setBusy(false);
    }
  }, [notice]);

  if (!notice || dismissed) return null;
  const isDesktop = notice.platform === "desktop";
  const isDownloading = notice.status === "downloading";
  const isDownloaded = notice.status === "downloaded";
  const title = isDownloaded
    ? "Update ready to install"
    : isDownloading
      ? "Downloading Chess Topper update"
      : notice.status === "error"
        ? "Update check needs attention"
        : `Chess Topper ${notice.version || "update"} is available`;

  return (
    <section className="panel mb-4 flex flex-wrap items-center gap-3 border-primary/40 bg-primary/5 p-3 sm:p-4" aria-live="polite">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
        {isDownloaded ? <CheckCircle2 className="h-5 w-5" /> : isDownloading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ArrowDownToLine className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold">{title}</p>
          <span className="status-pill"><ShieldCheck className="h-3 w-3" /> Official GitHub release</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {notice.message || (isDownloading ? `${Math.round(notice.percent || 0)}% downloaded` : "Update available. Your games and settings stay on this device.")}
        </p>
        {isDownloading && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, notice.percent || 0))}%` }} /></div>}
      </div>
      {!isDownloading && (
        <button type="button" className="btn btn-primary btn-sm" onClick={handleUpdate} disabled={busy}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : isDownloaded ? <RefreshCw className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}
          {isDownloaded ? "Restart & install" : isDesktop ? "Download update" : "Update now"}
        </button>
      )}
      <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Dismiss update notice" onClick={() => setDismissed(true)}>
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}
