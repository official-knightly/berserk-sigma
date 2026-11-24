# Chess Topper

Chess Topper is a free chess training, analysis and game-review application. Imported games are automatically analysed with Stockfish 19 Lite. The project includes an Android application, desktop installers for Windows/macOS/Linux, and a responsive web client.

## Live demo

- Cloudflare: https://berserk-sigma.akatsuki-x-pain12.workers.dev
- Vercel: https://berserk-sage.vercel.app

## Android and desktop installers

Push a version tag such as `v1.0.1` to run **Chess Topper Release**. With the stable Android signing secrets configured, the workflow publishes a standalone `Chess-Topper.apk` GitHub Release asset (not an APK inside a ZIP). Without the keystore, it publishes `Chess-Topper-debug.apk` for testing only; the Android update notice will not offer that debug APK as an in-place update. Windows, macOS and Linux desktop installers plus Electron update manifests are published alongside the APK.

The Android updater checks the latest GitHub Release and opens the APK in the Android browser/package installer. Android still requires the user to approve the install. The app does not bypass Play Protect or Android's unknown-app safeguards.

Desktop builds use Electron's GitHub updater. They check for updates on startup, show a notification, download the new installer payload, and restart to install. The desktop window loads the hosted Chess Topper client over HTTPS, so it requires an internet connection.

Windows and Linux updates use the Electron updater release manifests. macOS automatic updates require a Developer ID signing certificate; for a public macOS installer, configure the signing/notarization secrets below. Unsigned macOS builds can be produced for testing but are not a complete auto-update distribution.

### Stable Android update signing

For Android to install an update over an existing install, every release must use the same signing key. Create a private release keystore and add these GitHub Actions secrets:

- `ANDROID_KEYSTORE_BASE64` — base64-encoded keystore file
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Example keystore creation (keep the generated file and passwords private):

```bash
keytool -genkeypair -v -keystore chess-topper-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias chess-topper
base64 -w 0 chess-topper-release.jks
```

Without those secrets, CI creates a debug-signed APK for testing. Debug APK signatures are not a stable public update-signing identity. For trusted public distribution, use a release key controlled by the maintainer and consider Google Play App Signing.

### Desktop code signing

For trusted Windows and macOS installers, keep certificate files and passwords in GitHub Actions secrets. Never commit certificates or passwords.

- Windows: `WIN_CSC_LINK` (PFX certificate or its base64 content) and `WIN_CSC_KEY_PASSWORD`
- macOS: `MAC_CSC_LINK` (Developer ID Application .p12 certificate or its base64 content), `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`

Without these secrets, CI can still produce test installers, but the operating system may show its normal publisher/security warnings. Chess Topper does not disable or bypass SmartScreen, Gatekeeper or Play Protect.

## Desktop native Stockfish

The Windows desktop shell downloads the latest stable Stockfish release on first native analysis, selects the x64 or ARM64 package, verifies the executable architecture, and stores it under the application's user-data directory. Native engine downloads use HTTPS and the official Stockfish GitHub release. macOS and Linux use the in-app Stockfish WASM engine.

Stockfish is GPLv3. Keep its upstream license and corresponding-source notices with distributed binaries.

## About

Chess Topper keeps the Berserk engine available for play and uses Stockfish for game review. Browser, Android, macOS and Linux builds use the Stockfish WebAssembly worker. The Windows desktop build can download a native Stockfish executable from the official Stockfish release and verify its PE architecture before using it.

## Features

- Chess board and analysis flows
- Automatic Stockfish 19 Lite game review with a native Windows engine option and WebAssembly fallback
- In-app update notifications for Android and browser clients
- Electron desktop auto-updater for Windows, macOS and Linux
- User-provided Chess Topper knight logo on app, favicon and installers
- Lichess and Chess.com related workflows
- Fast Vite + React frontend
- TypeScript-first app structure

## Engine script

This is the browser-side engine adapter used to load and query the Berserk WASM engine. Keep it in your app code as needed; no additional engine file was added here.

```ts
export const WASM_URL =
  "https://media.githubusercontent.com/media/official-knightly/Berserk-web/main/engine/berserk_bg.wasm";

export type Candidate = {
  rank: number;
  depth: number;
  uci: string;
  pv: string[];
  scoreCp: number;
  mate: number | null;
};

export type SearchResult = {
  bestmove: string;
  scoreCp: number;
  depth: number;
  nodes: string;
  candidates: Candidate[];
};

export type EngineStatus = "idle" | "loading" | "ready" | "error";

type Listener = (s: {
  status: EngineStatus;
  progress: number;
  error?: string;
}) => void;

class BerserkEngine {
  private worker: Worker | null = null;
  private pending = new Map<
    number,
    {
      resolve: (r: SearchResult) => void;
      reject: (e: Error) => void;
    }
  >();
  private seq = 0;
  private queue: Promise<unknown> = Promise.resolve();

  status: EngineStatus = "idle";
  progress = 0;
  error?: string;
  private listeners = new Set<Listener>();
  ready!: Promise<void>;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn({
      status: this.status,
      progress: this.progress,
      error: this.error,
    });
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((listener) =>
      listener({
        status: this.status,
        progress: this.progress,
        error: this.error,
      }),
    );
  }

  start() {
    if (this.worker || typeof window === "undefined") return this.ready;

    this.status = "loading";
    this.emit();

    this.ready = new Promise<void>((resolve, reject) => {
      const worker = new Worker("/engine/engine-worker.js", {
        type: "module",
        name: "Berserk-WASM",
      });

      this.worker = worker;

      worker.onmessage = (event) => {
        const message = event.data || {};

        if (message.type === "ready") {
          this.status = "ready";
          this.progress = 1;
          this.emit();
          resolve();
        } else if (message.type === "progress") {
          this.progress = message.total
            ? message.loaded / message.total
            : Math.min(0.95, message.loaded / 64_000_000);
          this.emit();
        } else if (message.type === "init-error") {
          this.fail(message.error || "Berserk WASM initialization failed.");
          reject(new Error(this.error));
        } else if (
          message.type === "result" ||
          message.type === "search-error"
        ) {
          const pending = this.pending.get(message.id);
          if (!pending) return;

          this.pending.delete(message.id);

          if (message.type === "search-error") {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message as SearchResult);
          }
        }
      };

      worker.onerror = (event) => {
        this.fail(event.message || "Berserk worker failed.");
        reject(new Error(this.error));
      };

      worker.postMessage({ type: "init", wasmUrl: WASM_URL });
    });

    this.ready.catch(() => {});
    return this.ready;
  }

  private fail(message: string) {
    this.status = "error";
    this.error = message;
    this.emit();

    this.pending.forEach((pending) =>
      pending.reject(new Error(message)),
    );
    this.pending.clear();
  }

  /** Searches are serialized because WASM search is synchronous in the worker. */
  search(
    fen: string,
    milliseconds: number,
    multiPV = 1,
  ): Promise<SearchResult> {
    const run = async () => {
      await this.start();

      if (!this.worker) {
        throw new Error("Berserk worker is unavailable.");
      }

      const id = ++this.seq;

      return new Promise<SearchResult>((resolve, reject) => {
        this.pending.set(id, { resolve, reject });

        this.worker!.postMessage({
          type: "search",
          id,
          fen,
          milliseconds: Math.max(
            100,
            Math.min(10_000, Math.round(milliseconds)),
          ),
          multiPV: Math.max(1, Math.min(8, Math.round(multiPV))),
        });
      });
    };

    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }
}

export const engine = new BerserkEngine();
```

## Engine details

The engine integration relies on a browser worker and the official WASM asset from the Berserk repository. The app also keeps a fallback remote URL for environments where the local WASM file is only a Git LFS pointer.

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
   or
   ```bash
   bun install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
   or
   ```bash
   bun dev
   ```
3. Open the local URL shown in the terminal.

## Useful scripts

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run lint
npm run format
```

## Repository links

- Engine repository: https://github.com/official-knightly/berserk
- Project repository: https://github.com/official-knightly/berserk-sigma

## Notes

If Vercel does not load fresh content, the Cloudflare deployment is usually the more reliable option for checking the latest build.
