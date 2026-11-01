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

## Engine details

The engine integration lives in:

- `src/lib/engine.ts`
- `public/engine/engine-worker.js`

It loads the Berserk WASM binary from the official GitHub media endpoint and includes a fallback path for environments where the local asset is a Git LFS pointer instead of the real binary.

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
