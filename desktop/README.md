# Chess Topper desktop shell

The Electron shell loads the hosted Chess Topper client over HTTPS. Its renderer has no Node.js access; the preload exposes only version, update and validated Stockfish operations.

## Updates

Packaged apps check the latest GitHub Release at startup. The app shows a notification, downloads the signed-by-transport release assets, and restarts to install. Windows/macOS publisher signing is still recommended for distribution trust; this project never disables SmartScreen, Gatekeeper or other OS security checks.

## Native Stockfish

On Windows, the supplied Stockfish release downloader checks the official Stockfish GitHub release, chooses a build matching x64 or ARM64, verifies the PE architecture, and stores the executable under the app user-data folder. The UCI bridge starts the executable directly without invoking a shell. macOS and Linux continue using the bundled Stockfish WebAssembly engine.

Stockfish is GPLv3. Preserve the upstream licence and corresponding source notices with distributed builds.
