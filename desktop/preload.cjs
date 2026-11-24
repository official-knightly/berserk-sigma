const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chessTopperDesktop", {
  version: () => ipcRenderer.invoke("app:version"),
  updates: {
    check: () => ipcRenderer.invoke("updates:check"),
    download: () => ipcRenderer.invoke("updates:download"),
    install: () => ipcRenderer.invoke("updates:install"),
    onState: (callback) => {
      if (typeof callback !== "function") return () => {};
      const listener = (_event, state) => callback(state);
      ipcRenderer.on("updates:state", listener);
      return () => ipcRenderer.removeListener("updates:state", listener);
    }
  },
  stockfish: {
    ensure: () => ipcRenderer.invoke("stockfish:ensure"),
    search: (fen, milliseconds, multiPV = 1) => ipcRenderer.invoke("stockfish:search", { fen, milliseconds, multiPV }),
    onState: (callback) => {
      if (typeof callback !== "function") return () => {};
      const listener = (_event, state) => callback(state);
      ipcRenderer.on("stockfish:state", listener);
      return () => ipcRenderer.removeListener("stockfish:state", listener);
    }
  }
});
