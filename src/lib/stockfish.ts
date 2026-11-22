import type { Candidate, SearchResult } from "./engine";

type ParsedInfo = Candidate & { multipv: number; nodes: string };

function parseInfo(line: string): ParsedInfo | null {
  if (!line.startsWith("info ")) return null;
  const tokens = line.trim().split(/\s+/);
  const value = (name: string) => {
    const index = tokens.indexOf(name);
    return index >= 0 ? tokens[index + 1] : undefined;
  };
  const depth = Number(value("depth") || 0);
  const multipv = Number(value("multipv") || 1);
  const scoreIndex = tokens.indexOf("score");
  const scoreType = scoreIndex >= 0 ? tokens[scoreIndex + 1] : undefined;
  const scoreValue = scoreIndex >= 0 ? Number(tokens[scoreIndex + 2]) : 0;
  const pvIndex = tokens.indexOf("pv");
  const pv = pvIndex >= 0 ? tokens.slice(pvIndex + 1).filter((move) => /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move)) : [];
  const uci = pv[0] || "";
  if (!uci || !Number.isFinite(scoreValue)) return null;
  const scoreCp = scoreType === "mate"
    ? Math.sign(scoreValue || 1) * (30000 - Math.min(999, Math.abs(scoreValue)) * 10)
    : scoreValue;
  return {
    rank: multipv,
    multipv,
    depth,
    uci,
    pv,
    scoreCp,
    mate: scoreType === "mate" ? scoreValue : null,
    nodes: value("nodes") || "0",
  };
}

class StockfishBrowserEngine {
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private pendingSearch: {
    resolve: (result: SearchResult) => void;
    reject: (error: Error) => void;
    infos: Map<number, ParsedInfo>;
    depth: number;
    nodes: string;
    startedAt: number;
  } | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private readyState = false;

  private ensureWorker() {
    if (typeof window === "undefined") return Promise.reject(new Error("Stockfish is available only in a browser."));
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      const worker = new Worker("/engine/stockfish-19-lite-single.js", {
        name: "Berserk-Sigma-Stockfish-19",
      });
      this.worker = worker;

      worker.onmessage = (event: MessageEvent<string>) => {
        const payload = typeof event.data === "string" ? event.data : String(event.data ?? "");
        for (const rawLine of payload.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (!line) continue;
          if (line === "uciok") {
            worker.postMessage("setoption name Threads value 1");
            worker.postMessage("setoption name Hash value 32");
            worker.postMessage("isready");
          } else if (line === "readyok") {
            this.readyState = true;
            resolve();
          } else if (line.startsWith("info ")) {
            const info = parseInfo(line);
            const active = this.pendingSearch;
            if (info && active) {
              const previous = active.infos.get(info.multipv);
              if (!previous || info.depth >= previous.depth) active.infos.set(info.multipv, info);
              active.depth = Math.max(active.depth, info.depth);
              active.nodes = info.nodes;
            }
          } else if (line.startsWith("bestmove ")) {
            const active = this.pendingSearch;
            if (!active) continue;
            const bestmove = line.split(/\s+/)[1] || "(none)";
            const candidates = [...active.infos.values()]
              .sort((a, b) => a.rank - b.rank)
              .map(({ multipv: _multipv, ...candidate }) => candidate);
            const best = candidates[0];
            const result: SearchResult = {
              bestmove,
              scoreCp: best?.scoreCp ?? 0,
              depth: active.depth,
              nodes: active.nodes,
              candidates,
            };
            this.pendingSearch = null;
            active.resolve(result);
          }
        }
      };

      worker.onerror = (event) => {
        const error = new Error(event.message || "Stockfish worker failed to load.");
        this.pendingSearch?.reject(error);
        this.pendingSearch = null;
        this.readyState = false;
        this.initPromise = null;
        reject(error);
      };

      worker.postMessage("uci");
    });
    return this.initPromise;
  }

  async ready() {
    await this.ensureWorker();
    return this.readyState;
  }

  search(fen: string, ms: number, multiPV = 3): Promise<SearchResult> {
    const run = async () => {
      await this.ensureWorker();
      if (!this.worker || !this.readyState) throw new Error("Stockfish did not become ready.");
      const count = Math.max(1, Math.min(5, Math.round(multiPV)));
      this.worker.postMessage("setoption name MultiPV value " + count);
      this.worker.postMessage("isready");
      await new Promise<void>((resolve) => {
        const check = (event: MessageEvent<string>) => {
          if (event.data === "readyok") {
            this.worker?.removeEventListener("message", check);
            resolve();
          }
        };
        this.worker?.addEventListener("message", check);
      });
      return new Promise<SearchResult>((resolve, reject) => {
        this.pendingSearch = {
          resolve,
          reject,
          infos: new Map(),
          depth: 0,
          nodes: "0",
          startedAt: performance.now(),
        };
        this.worker!.postMessage("position fen " + fen);
        this.worker!.postMessage("go movetime " + Math.max(100, Math.min(10000, Math.round(ms))));
      });
    };
    const task = this.queue.then(run, run);
    this.queue = task.catch(() => {});
    return task;
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.initPromise = null;
    this.readyState = false;
    this.pendingSearch?.reject(new Error("Stockfish worker was stopped."));
    this.pendingSearch = null;
  }
}

export const stockfishEngine = new StockfishBrowserEngine();
