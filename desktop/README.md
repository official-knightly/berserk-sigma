# Chess Topper desktop app

The Windows, macOS and Linux installers include the built Chess Topper web interface inside the application. Electron serves those bundled files from a loopback-only HTTP server; the renderer does not depend on the hosted website to start or navigate. The renderer has no Node.js access. A narrow preload exposes only version, updater and validated Stockfish operations.

## Updates

Packaged apps check the latest GitHub Release at startup. Windows and Linux use Electron's updater metadata; macOS checks the latest DMG and opens it for installation. The app shows an update notification. This project never disables SmartScreen, Gatekeeper or other operating-system security checks. Publisher signing and notarization are required for the best public-distribution experience.

## Engines

Chess Topper lets players choose Berserk or Stockfish in Play. Game Review uses Stockfish 19 Lite locally in a Web Worker. On Windows, the desktop shell can additionally download the official native Stockfish release, verify the executable's PE architecture, and launch it through a UCI bridge without invoking a shell. macOS and Linux use the bundled Stockfish WebAssembly engine.

Stockfish is GPLv3. Preserve upstream copyright, licence and corresponding-source notices with distributed builds.
