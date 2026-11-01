# Berserk Sigma

# PROJECT: BERSERK WEB — COMPLETE WEBSITE UI/UX REDESIGN

You are working on **Berserk Web**, a chess platform built around my Berserk chess engine.

Repository: `official-knightly/Berserk-web`  

Branch: `main`

Your job is to understand the entire existing website and significantly improve its visual design, user experience, responsiveness, and interface quality.

This is NOT a request to build a new website from scratch. Inspect the existing repository, understand its architecture, and improve the existing product without destroying working functionality.

## 1. What is Berserk Web?

Berserk Web is a chess-playing and chess-analysis platform.

Its main purpose is to let users:

- Play chess against my Berserk engine.

- Configure engine strength and playing behavior.

- Analyze chess positions and complete games.

- View engine recommendations and best moves.

- Watch games and analyze moves.

- Explore chess-related statistics and reports.

The website should feel like a professional chess platform, not a basic HTML chessboard.

Use Chessigma as inspiration for the analyzer experience and modern chess platforms as inspiration for the overall interface.

Do NOT copy Chessigma's branding, logo, or exact design.

## 2. Visual Identity

I want Berserk to have its own recognizable identity.

Design direction:

- Dark charcoal / near-black background.

- Muted sage-green controls and accents.

- Professional chess-focused interface.

- Clean typography.

- Beautiful spacing and alignment.

- Subtle animations and transitions.

- Modern icons.

- Consistent buttons and cards.

- Proper visual hierarchy.

Avoid:

- Rainbow gradients.

- Excessive neon colors.

- Huge empty spaces.

- Oversized windows.

- Randomly placed buttons.

- Unnecessary animations.

- Generic AI-generated dashboard aesthetics.

The interface should feel premium, polished, and carefully designed.

## 3. Main Website / Navigation

Inspect the existing navigation and improve it.

Create a consistent navigation system with useful sections such as:

- Home

- Play

- Analysis

- Game Review

- Live Games

- Statistics

- Settings

These sections should be organized logically. Reuse existing pages and functionality wherever possible.

Make navigation responsive, especially on mobile.

Desktop can use a proper navigation bar or sidebar. Mobile should use a compact navigation system with accessible buttons.

## 4. Play Against Berserk

This is one of the most important parts of the website.

Users should be able to play against the actual Berserk engine.

Existing engine settings and functionality must be preserved.

The interface should include:

- Interactive chessboard.

- Berserk logo.

- Berserk engine name and Elo.

- White / Black selection.

- Engine Elo or strength configuration.

- Attack-level configuration.

- Thinking time from 0.1 to 10 seconds.

- Start game.

- New game.

- Restart.

- Resign.

- Move history.

- Engine status indicator.

The board should be the main visual focus.

Engine settings should appear in a clean side panel rather than occupying excessive screen space.

Make the board and settings fit naturally on desktop and mobile.

## 5. Professional Game Analyzer

The current game analyzer needs a significant visual improvement.

Use Chessigma as a reference for the quality of the experience.

The analyzer should have:

**Chessboard**

- Properly sized board.

- Best-move arrows.

- Last-move highlights.

- Selected-square highlights.

- Legal-move dots.

- Smooth interactions.

**Move viewer**

- Complete move list.

- White and Black moves.

- Move numbers.

- Current move highlighting.

- Ability to click any move and navigate to that position.

- Previous and next move controls.

- First and last move controls.

**Move classification**

Show classification icons beside moves.

Support classifications such as:

- Brilliant

- Great

- Best

- Excellent

- Good

- Inaccuracy

- Mistake

- Blunder

- Book

Use the classification logos/assets already provided in the repository. Find and correctly connect the existing assets rather than creating unnecessary replacements.

Each move should have a clear classification label.

**Analysis information**

Display:

- Played move.

- Engine's best move.

- Evaluation before and after.

- Centipawn loss.

- Move classification.

- Best-move arrow.

- Engine principal variation.

- Short explanation when available.

Use actual Berserk engine analysis. Never display fake classifications or fabricated evaluations.

## 6. Live Game Analysis by Username

Add a feature where users can enter a chess username and watch their ongoing game.

The user should be able to:

1. Enter a username.

2. Find the user's currently playing game.

3. Load the game onto the chessboard.

4. Watch moves update as the game progresses.

5. Analyze positions using Berserk.

6. Display the engine's recommended move.

7. Draw the recommended move as an arrow.

8. Show whether the played move was good or bad.

9. Display the classification beside the move.

Make this feature visually polished.

Important: inspect the existing API and data sources before implementing this. Do not invent an API endpoint or assume that a username automatically provides access to an ongoing game. Handle unavailable games and unsupported providers gracefully.

## 7. Mobile Chessboard Interaction

Mobile interaction is extremely important.

Currently, dragging chess pieces on mobile is problematic.

Implement proper tap-to-move support.

Expected behavior:

1. User taps a piece.

2. The website identifies its legal moves.

3. Small dots appear on legal destination squares.

4. User taps a destination.

5. The piece moves.

Also support:

- Normal desktop dragging.

- Tap-to-move on mobile.

- Legal move highlighting.

- Capture-square indicators.

- Promotion selection.

- Clear selection when tapping elsewhere.

The mobile board must feel natural and responsive.

## 8. Premoves

Improve premove functionality.

Users should be able to prepare a move during the opponent's turn.

Important behavior:

- Display the premove visually.

- Execute it automatically when it becomes legal.

- If Berserk or the opponent plays a move that invalidates it, clear the premove automatically.

- Never leave stale premove arrows or highlights on the board.

- Allow users to cancel their premove.

## 9. Additional Analyzer Tabs

Add a proper tab system.

Possible tabs:

**Overview**

- Game summary.

- Accuracy.

- Best moves.

- Worst moves.

- Overall performance.

**Moves**

- Complete move list.

- Move classifications.

- Navigation.

**Engine**

- Best move.

- Evaluation.

- Principal variations.

- Alternative lines.

**Accuracy**

- White accuracy.

- Black accuracy.

- Move-quality distribution.

**Mistakes**

- Inaccuracies.

- Mistakes.

- Blunders.

- Positions that could have been played better.

**Opening**

- Opening name when identifiable.

- Opening moves.

- Opening performance.

Do not cram everything into one massive panel.

Use a well-organized layout where tabs change the visible content.

## 10. Responsive Design

The existing interface feels too large.

Fix the layout for both desktop and mobile.

Desktop:

- Efficient use of available space.

- Chessboard and analysis panels arranged intelligently.

- Compact settings.

- Properly sized cards.

- No unnecessary scrolling.

Mobile:

- Board scales to screen width.

- No horizontal overflow.

- Compact controls.

- Scrollable move list.

- Responsive tabs.

- Properly sized buttons.

- Touch-friendly interactions.

- No oversized modal windows.

Use responsive CSS and sensible breakpoints.

## 11. Buttons, Icons and Animations

Redesign the buttons throughout the website.

Buttons should have:

- Consistent sizing.

- Proper icons.

- Hover effects.

- Active states.

- Disabled states.

- Loading states.

- Clear labels.

Use the existing logos and icon assets where appropriate.

Animations should be subtle and smooth, not distracting.

## 12. Important Technical Restrictions

This is extremely important.

- Inspect the entire existing repository before editing.

- Do not delete important files.

- Do not remove existing features.

- Do not replace working functionality with static mockups.

- Do not fabricate engine analysis.

- Do not break existing chessboard interactions.

- Do not expose private API keys.

- Preserve the existing Berserk WASM and JS integration.

- Preserve existing engine configuration and functionality.

- Do not modify the actual Berserk engine repository.

- Do not modify Berserk API repositories.

- Work ONLY on the Berserk Web repository.

The actual Rust engine must remain untouched.

The website should communicate with the existing engine integration.

Preserve the existing Cloudflare deployment configuration and GitHub Pages workflow unless a change is genuinely necessary.

## 13. Development Workflow

Follow this process:

1. Inspect the complete repository.

2. Identify all existing pages and components.

3. Understand the existing engine integration.

4. Understand the existing chessboard and move system.

5. Identify existing logos and classification assets.

6. Create a consistent visual design system.

7. Redesign the website page by page.

8. Improve the analyzer.

9. Improve mobile interactions.

10. Test the existing gameplay and engine loading.

11. Test responsive layouts.

12. Fix build errors and regressions.

Do not make unnecessary architectural changes.

## FINAL OBJECTIVE

I want Berserk Web to look and feel like a professional chess platform.

Think of a combination of:

- Chessigma's game-analysis experience.

- A modern professional chess interface.

- A clean, premium dark design.

- A powerful chess engine experience.

The website should have its own identity and should not look like a clone of another chess website.

**Most importantly: improve the ENTIRE website, not only the game analyzer.**

Preserve the existing functionality, respect the existing architecture, and prioritize a beautiful, usable, responsive interface.

Before finishing, provide a summary of all modified files, features improved, tests performed, and anything that could not be implemented.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://berserk-sigma.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d36dd486-49b6-5a67-9225-aa8593e73aa3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
