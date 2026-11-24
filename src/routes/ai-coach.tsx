import { createFileRoute } from "@tanstack/react-router";
import { Chess } from "chess.js";
import { useRef, useState } from "react";
import { Bot, Brain, Loader2, Send, Sparkles, Download, Cpu } from "lucide-react";
import { stockfishEngine } from "@/lib/stockfish";

export const Route = createFileRoute("/ai-coach")({
  head: () => ({
    meta: [
      { title: "AI Chess Coach — Chess Topper" },
      { name: "description", content: "Ask Qwen to explain real Stockfish chess analysis locally in your browser." },
    ],
  }),
  component: AICoachPage,
});

type ChatMessage = { role: "user" | "assistant"; content: string };

const MODEL_ID = "onnx-community/Qwen3-0.6B-ONNX";

function AICoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey! I’m your Chess Topper AI coach. Load the local Qwen model, paste a FEN or ask a chess question. When you provide a position, Stockfish calculates the candidate moves first — I explain its results." },
  ]);
  const [prompt, setPrompt] = useState("");
  const [fen, setFen] = useState(new Chess().fen());
  const [modelStatus, setModelStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [modelError, setModelError] = useState("");
  const [busy, setBusy] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const generator = useRef<any>(null);

  async function loadModel() {
    if (generator.current || modelStatus === "loading") return;
    setModelStatus("loading");
    setModelError("");
    try {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowLocalModels = true;
      env.useBrowserCache = true;
      generator.current = await pipeline("text-generation", MODEL_ID, {
        device: "webgpu",
        dtype: "q4",
        progress_callback: (event: any) => {
          if (event?.status === "progress" && typeof event.progress === "number") {
            setModelError("Downloading model: " + Math.round(event.progress) + "%");
          }
        },
      });
      setModelStatus("ready");
      setModelError("");
    } catch (error) {
      // Retry on WASM for browsers without WebGPU.
      try {
        const { pipeline, env } = await import("@huggingface/transformers");
        env.allowLocalModels = true;
        env.useBrowserCache = true;
        generator.current = await pipeline("text-generation", MODEL_ID, { device: "wasm", dtype: "q4" });
        setModelStatus("ready");
        setModelError("");
      } catch (fallbackError) {
        setModelStatus("error");
        setModelError(fallbackError instanceof Error ? fallbackError.message : String(fallbackError || error));
      }
    }
  }

  async function sendMessage() {
    const question = prompt.trim();
    if (!question || busy || modelStatus !== "ready" || !generator.current) return;
    setPrompt("");
    setBusy(true);
    setMessages((current) => [...current, { role: "user", content: question }]);
    try {
      let chessContext = "";
      const candidateFen = fen.trim();
      if (candidateFen) {
        const position = new Chess(candidateFen);
        await stockfishEngine.ready();
        setEngineReady(true);
        const analysis = await stockfishEngine.search(position.fen(), 1800, 3);
        const lines = (analysis.candidates || []).map((candidate, index) => {
          let san = candidate.uci;
          try {
            const move = new Chess(position.fen()).move({
              from: candidate.uci.slice(0, 2),
              to: candidate.uci.slice(2, 4),
              promotion: candidate.uci[4] || "q",
            });
            if (move) san = move.san;
          } catch { /* retain UCI if SAN conversion is unavailable */ }
          return `${index + 1}. ${san} (${candidate.uci}), eval ${(candidate.scoreCp / 100).toFixed(2)}, depth ${candidate.depth}`;
        });
        chessContext = `\nVerified position: ${position.fen()}\nSide to move: ${position.turn() === "w" ? "White" : "Black"}\nStockfish 19 Lite results (scores are from the engine's side-to-move perspective):\n${lines.join("\n")}\nBest move: ${analysis.bestmove}. Stockfish depth: ${analysis.depth}.\nExplain these results; do not invent or change moves.`;
      }
      const conversation = [
        { role: "system", content: "You are Chess Topper Coach, a friendly chess tutor. Stockfish is the authority for legal moves and engine evaluations. Never claim to calculate engine-best moves yourself. If Stockfish results are provided, explain only those results, distinguish facts from ideas, and use clear beginner-friendly language. If no analysis is provided, answer general chess-learning questions without pretending to have analysed a position." },
        ...messages.slice(-8).map((message) => ({ role: message.role, content: message.content })),
        { role: "user", content: question + chessContext },
      ];
      const output = await generator.current(conversation, {
        max_new_tokens: 220,
        temperature: 0.65,
        do_sample: true,
        return_full_text: false,
      });
      const answer = output?.[0]?.generated_text;
      setMessages((current) => [...current, { role: "assistant", content: typeof answer === "string" ? answer.trim() : "I couldn't generate a reply. Try asking again." }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: "I couldn't analyse that position. Check that the FEN is valid and Stockfish is available. " + (error instanceof Error ? error.message : "") }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">LOCAL CHESS INTELLIGENCE</p>
          <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold"><Brain className="h-6 w-6 text-primary" /> AI Chess Coach</h1>
          <p className="mt-1 text-sm text-muted-foreground">Qwen explains. Stockfish calculates. Your position stays in this browser.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-border bg-card px-3 py-2 text-xs">{modelStatus === "ready" ? "Qwen ready" : modelStatus === "loading" ? "Loading Qwen…" : "Qwen not loaded"}</span>
          <span className="rounded-lg border border-border bg-card px-3 py-2 text-xs">{engineReady ? "Stockfish ready" : "Stockfish loads on analysis"}</span>
        </div>
      </div>

      <section className="panel space-y-3 p-4">
        <div className="flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /><h2 className="text-sm font-bold">Local AI model</h2></div>
        <p className="text-xs leading-5 text-muted-foreground">Qwen3 0.6B is downloaded from the model repository the first time. The browser caches model files for later use; after a successful download, it can work offline if the cache remains available. WebGPU is tried first, with a WASM fallback.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={loadModel} disabled={modelStatus === "loading" || modelStatus === "ready"}>
            {modelStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {modelStatus === "ready" ? "Model ready" : modelStatus === "loading" ? "Loading model…" : "Download & load Qwen"}
          </button>
          {modelError && <span className={modelStatus === "error" ? "text-xs text-danger" : "text-xs text-muted-foreground"}>{modelError}</span>}
        </div>
      </section>

      <section className="panel space-y-3 p-4">
        <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold">Position for analysis</h2><span className="text-[10px] text-muted-foreground">FEN · defaults to starting position</span></div>
        <textarea value={fen} onChange={(event) => setFen(event.target.value)} rows={2} spellCheck={false} className="w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary" aria-label="Chess position FEN" />
      </section>

      <section className="panel flex min-h-[420px] flex-col">
        <div className="flex items-center gap-2 border-b border-border p-4"><Sparkles className="h-4 w-4 text-primary" /><h2 className="text-sm font-bold">Coach chat</h2><span className="ml-auto text-[10px] text-muted-foreground">Qwen · local inference</span></div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((message, index) => (
            <div key={index} className={message.role === "user" ? "ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-primary p-3 text-sm text-primary-foreground" : "max-w-[90%] rounded-xl rounded-bl-sm border border-border bg-card p-3 text-sm leading-6"}>
              {message.role === "assistant" && <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary"><Bot className="h-3 w-3" /> Chess Topper Coach</div>}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Stockfish / Qwen is working…</div>}
        </div>
        <form className="flex gap-2 border-t border-border p-3" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
          <input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={modelStatus === "ready" ? "Ask why this move is strong…" : "Load Qwen to start chatting"} disabled={modelStatus !== "ready" || busy} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <button type="submit" className="btn btn-primary btn-icon" disabled={modelStatus !== "ready" || busy || !prompt.trim()} aria-label="Send message"><Send className="h-4 w-4" /></button>
        </form>
      </section>
      <p className="text-[11px] leading-5 text-muted-foreground">Model download requires internet once. Local inference may be slow on low-memory devices. Stockfish provides move calculations; Qwen is used only to explain them. Model availability, browser support and cache limits depend on your device.</p>
    </div>
  );
}
