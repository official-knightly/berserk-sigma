# Berserk Sigma

Berserk Sigma is a chess analysis and training web app built around the Berserk engine. It provides a fast browser-based experience for exploring positions, reviewing live games, and working with engine evaluations.

## Live demo

- Cloudflare: https://berserk-sigma.akatsuki-x-pain12.workers.dev
- Vercel: https://berserk-sage.vercel.app

## About

This project is designed to play with Berserk's free analysis tooling in the browser. The app loads the engine as a WebAssembly worker, falls back to the remote LFS-hosted WASM when needed, and exposes a clean client-side interface for analysis and evaluation.

## Features

- Chess board and analysis flows
- Built-in engine evaluation via a WebAssembly worker
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
