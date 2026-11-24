const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");
const { ensureStockfish } = require("./stockfish-manager");
const { StockfishUciEngine } = require("./uci-engine");

const APP_URL = process.env.CHESS_TOPPER_URL || "https://berserk-sigma.akatsuki-x-pain12.workers.dev/";
const APP_ORIGIN = new URL(APP_URL).origin;
const RELEASE_API = "https://api.github.com/repos/official-knightly/berserk-sigma/releases/latest";
let macUpdateUrl = null;
let mainWindow = null;
let stockfishPathPromise = null;
let stockfishEngine = null;

function assertTrustedRenderer(event) {
  const senderUrl = event.senderFrame?.url || "";
  try {
    if (new URL(senderUrl).origin === APP_ORIGIN) return;
  } catch {}
  throw new Error("This Chess Topper action is only available to the trusted app window.");
}

function isNewerVersion(candidate, current) {
  const parts = (value) => value.replace(/^v/i, "").split(/[.+-]/).slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);
  const next = parts(candidate);
  const installed = parts(current);
  for (let index = 0; index < 3; index += 1) {
    if ((next[index] || 0) !== (installed[index] || 0)) return (next[index] || 0) > (installed[index] || 0);
  }
  return false;
}

async function checkMacUpdate() {
  sendUpdateState({ status: "checking", message: "Checking for a Chess Topper DMG update…" });
  const response = await fetch(RELEASE_API, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "Chess-Topper-Desktop" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`GitHub update check returned HTTP ${response.status}.`);
  const release = await response.json();
  const version = typeof release.tag_name === "string" ? release.tag_name : "";
  if (release.draft || release.prerelease || !version || !isNewerVersion(version, app.getVersion())) {
    macUpdateUrl = null;
    sendUpdateState({ status: "not-available" });
    return;
  }
  const asset = (release.assets || []).find((item) => typeof item.name === "string" && /\.dmg$/i.test(item.name) && typeof item.browser_download_url === "string");
  if (!asset) {
    macUpdateUrl = null;
    sendUpdateState({ status: "error", version, message: "The latest release does not contain a macOS DMG." });
    return;
  }
  macUpdateUrl = asset.browser_download_url;
  sendUpdateState({
    status: "available",
    version,
    message: "A macOS update is ready. Download the DMG and install it over your current app."
  });
}

function sendUpdateState(state) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updates:state", state);
  }
}

function sendEngineState(state) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("stockfish:state", state);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 680,
    show: false,
    backgroundColor: "#171717",
    title: "Chess Topper",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow && mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:") void shell.openExternal(url);
    } catch {}
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      if (new URL(url).origin !== APP_ORIGIN) {
        event.preventDefault();
        if (url.startsWith("https://")) void shell.openExternal(url);
      }
    } catch {
      event.preventDefault();
    }
  });
  mainWindow.on("closed", () => { mainWindow = null; });
  void mainWindow.loadURL(APP_URL);
}

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.on("checking-for-update", () => sendUpdateState({ status: "checking", message: "Checking for a Chess Topper update…" }));
autoUpdater.on("update-available", (info) => sendUpdateState({ status: "available", version: info.version, message: "A new version is ready to download." }));
autoUpdater.on("update-not-available", () => sendUpdateState({ status: "not-available" }));
autoUpdater.on("download-progress", (progress) => sendUpdateState({ status: "downloading", percent: Math.round(progress.percent), message: `Downloading update · ${Math.round(progress.percent)}%` }));
autoUpdater.on("update-downloaded", (info) => sendUpdateState({ status: "downloaded", version: info.version, message: "The update has been downloaded. Restart to install it." }));
autoUpdater.on("error", (error) => sendUpdateState({ status: "error", message: error.message || "The update could not be downloaded." }));

ipcMain.handle("app:version", (event) => { assertTrustedRenderer(event); return app.getVersion(); });
ipcMain.handle("stockfish:native-available", (event) => { assertTrustedRenderer(event); return process.platform === "win32"; });
ipcMain.handle("updates:check", async (event) => {
  assertTrustedRenderer(event);
  if (!app.isPackaged) {
    sendUpdateState({ status: "not-available", message: "Updates are checked in packaged builds." });
    return;
  }
  if (process.platform === "darwin") {
    await checkMacUpdate();
    return;
  }
  await autoUpdater.checkForUpdates();
});
ipcMain.handle("updates:download", async (event) => {
  assertTrustedRenderer(event);
  if (!app.isPackaged) throw new Error("The updater is available in installed builds.");
  if (process.platform === "darwin") {
    if (!macUpdateUrl) await checkMacUpdate();
    if (!macUpdateUrl) throw new Error("No macOS DMG update is currently available.");
    await shell.openExternal(macUpdateUrl);
    return;
  }
  await autoUpdater.downloadUpdate();
});
ipcMain.handle("updates:install", (event) => {
  assertTrustedRenderer(event);
  autoUpdater.quitAndInstall(false, true);
});

async function getStockfishPath() {
  if (!stockfishPathPromise) {
    stockfishPathPromise = ensureStockfish(app.getPath("userData"), (state) => sendEngineState(state))
      .catch((error) => {
        stockfishPathPromise = null;
        throw error;
      });
  }
  return stockfishPathPromise;
}

ipcMain.handle("stockfish:ensure", async (event) => {
  assertTrustedRenderer(event);
  const executable = await getStockfishPath();
  sendEngineState({ status: "ready", message: "Native Stockfish is ready." });
  return { ready: true, executable };
});

ipcMain.handle("stockfish:search", async (event, request) => {
  assertTrustedRenderer(event);
  const fen = typeof request?.fen === "string" ? request.fen : "";
  if (!fen || fen.length > 240 || /[\r\n\0]/.test(fen) || fen.split(/\s+/).length !== 6) {
    throw new Error("Invalid FEN supplied to Stockfish.");
  }
  const milliseconds = Math.max(100, Math.min(10000, Math.round(Number(request?.milliseconds) || 500)));
  const multiPV = Math.max(1, Math.min(5, Math.round(Number(request?.multiPV) || 1)));
  const executable = await getStockfishPath();
  if (!stockfishEngine) stockfishEngine = new StockfishUciEngine(executable);
  return stockfishEngine.search(fen, milliseconds, multiPV);
});

app.whenReady().then(() => {
  app.setAppUserModelId("com.officialknightly.chesstopper");
  createWindow();
  if (app.isPackaged) {
    setTimeout(() => {
      const check = process.platform === "darwin" ? checkMacUpdate() : autoUpdater.checkForUpdates();
      void check.catch((error) => sendUpdateState({ status: "error", message: error.message }));
    }, 4500);
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  stockfishEngine?.stop();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
