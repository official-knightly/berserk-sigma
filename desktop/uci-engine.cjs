const { spawn } = require("node:child_process");
const { createInterface } = require("node:readline");

function parseInfo(line) {
  if (!line.startsWith("info ")) return null;
  const tokens = line.trim().split(/\s+/);
  const value = (name) => {
    const index = tokens.indexOf(name);
    return index >= 0 ? tokens[index + 1] : undefined;
  };
  const depth = Number(value("depth") || 0);
  const rank = Number(value("multipv") || 1);
  const scoreIndex = tokens.indexOf("score");
  const scoreType = scoreIndex >= 0 ? tokens[scoreIndex + 1] : undefined;
  const scoreValue = scoreIndex >= 0 ? Number(tokens[scoreIndex + 2]) : 0;
  const pvIndex = tokens.indexOf("pv");
  const pv = pvIndex >= 0 ? tokens.slice(pvIndex + 1).filter((move) => /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move)) : [];
  if (!pv.length || !Number.isFinite(scoreValue)) return null;
  const scoreCp = scoreType === "mate"
    ? Math.sign(scoreValue || 1) * (30000 - Math.min(999, Math.abs(scoreValue)) * 10)
    : scoreValue;
  return {
    rank,
    depth,
    uci: pv[0],
    pv,
    scoreCp,
    mate: scoreType === "mate" ? scoreValue : null,
    nodes: value("nodes") || "0"
  };
}

class StockfishUciEngine {
  constructor(executable) {
    this.executable = executable;
    this.child = null;
    this.readyPromise = null;
    this.activeSearch = null;
    this.queue = Promise.resolve();
  }

  start() {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = new Promise((resolve, reject) => {
      const child = spawn(this.executable, [], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
      this.child = child;
      const reader = createInterface({ input: child.stdout });
      const startupTimeout = setTimeout(() => {
        child.kill();
        this.child = null;
        this.readyPromise = null;
        reject(new Error("Stockfish did not initialise in time."));
      }, 30000);
      reader.on("line", (line) => {
        const text = line.trim();
        if (text === "uciok") {
          child.stdin.write("setoption name Threads value 1\n");
          child.stdin.write("setoption name Hash value 64\n");
          child.stdin.write("isready\n");
        } else if (text === "readyok" && !this._ready) {
          this._ready = true;
          clearTimeout(startupTimeout);
          resolve();
        } else if (text.startsWith("info ")) {
          const parsed = parseInfo(text);
          if (parsed && this.activeSearch) {
            const previous = this.activeSearch.infos.get(parsed.rank);
            if (!previous || parsed.depth >= previous.depth) this.activeSearch.infos.set(parsed.rank, parsed);
            this.activeSearch.depth = Math.max(this.activeSearch.depth, parsed.depth);
          }
        } else if (text.startsWith("bestmove ") && this.activeSearch) {
          const active = this.activeSearch;
          this.activeSearch = null;
          clearTimeout(active.timeout);
          const candidates = [...active.infos.values()].sort((a, b) => a.rank - b.rank);
          const best = candidates[0];
          active.resolve({
            bestmove: text.split(/\s+/)[1] || "(none)",
            scoreCp: best?.scoreCp ?? 0,
            depth: active.depth,
            nodes: best?.nodes || "0",
            candidates
          });
        }
      });
      child.once("error", (error) => {
        clearTimeout(startupTimeout);
        this.activeSearch?.reject(error);
        this.activeSearch = null;
        this.child = null;
        this.readyPromise = null;
        reject(error);
      });
      child.once("exit", (code) => {
        this.activeSearch?.reject(new Error(`Stockfish exited unexpectedly (${code ?? "unknown"}).`));
        this.activeSearch = null;
        this.child = null;
        this.readyPromise = null;
        this._ready = false;
      });
      child.stdin.write("uci\n");
    });
    return this.readyPromise;
  }

  search(fen, milliseconds = 500, multiPV = 1) {
    const run = async () => {
      await this.start();
      if (!this.child || !this._ready) throw new Error("Stockfish is not ready.");
      if (this.activeSearch) throw new Error("A Stockfish search is already running.");
      return new Promise((resolve, reject) => {
        const active = {
          resolve,
          reject,
          infos: new Map(),
          depth: 0,
          timeout: setTimeout(() => {
            this.activeSearch = null;
            reject(new Error("Stockfish search timed out."));
          }, milliseconds + 15000)
        };
        this.activeSearch = active;
        this.child.stdin.write(`setoption name MultiPV value ${multiPV}\n`);
        this.child.stdin.write(`position fen ${fen}\n`);
        this.child.stdin.write(`go movetime ${milliseconds}\n`);
      });
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }

  stop() {
    if (this.child) {
      try { this.child.stdin.write("quit\n"); } catch {}
      this.child.kill();
    }
    this.child = null;
    this.activeSearch = null;
    this.readyPromise = null;
    this._ready = false;
  }
}

module.exports = { StockfishUciEngine };
