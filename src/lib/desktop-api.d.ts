import type { SearchResult } from "./engine";

export type DesktopUpdateState = {
  status: "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
  version?: string;
  percent?: number;
  message?: string;
};

declare global {
  interface Window {
    chessTopperDesktop?: {
      version: () => Promise<string>;
      updates: {
        check: () => Promise<void>;
        download: () => Promise<void>;
        install: () => Promise<void>;
        onState: (callback: (state: DesktopUpdateState) => void) => () => void;
      };
      stockfish: {
        ensure: () => Promise<{ ready: boolean; message?: string }>;
        search: (fen: string, milliseconds: number, multiPV?: number) => Promise<SearchResult>;
      };
    };
  }
}
