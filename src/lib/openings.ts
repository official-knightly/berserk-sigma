// Compact opening table (standard ECO names) used for "Book" detection and the Opening tab.
// Lines are SAN sequences; the longest matching prefix wins.
const LINES: [string, string, string][] = [
  ["C20", "King's Pawn Opening", "e4 e5"],
  ["B00", "King's Pawn Game", "e4"],
  ["C40", "King's Knight Opening", "e4 e5 Nf3"],
  ["C44", "King's Pawn: Nc6", "e4 e5 Nf3 Nc6"],
  ["C60", "Ruy Lopez", "e4 e5 Nf3 Nc6 Bb5"],
  ["C68", "Ruy Lopez: Exchange", "e4 e5 Nf3 Nc6 Bb5 a6 Bxc6"],
  ["C65", "Ruy Lopez: Berlin Defense", "e4 e5 Nf3 Nc6 Bb5 Nf6"],
  ["C78", "Ruy Lopez: Morphy Defense", "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6"],
  ["C84", "Ruy Lopez: Closed", "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7"],
  ["C50", "Italian Game", "e4 e5 Nf3 Nc6 Bc4"],
  ["C53", "Italian Game: Giuoco Piano", "e4 e5 Nf3 Nc6 Bc4 Bc5 c3"],
  ["C51", "Evans Gambit", "e4 e5 Nf3 Nc6 Bc4 Bc5 b4"],
  ["C55", "Two Knights Defense", "e4 e5 Nf3 Nc6 Bc4 Nf6"],
  ["C57", "Two Knights: Fried Liver Attack", "e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7"],
  ["C45", "Scotch Game", "e4 e5 Nf3 Nc6 d4"],
  ["C46", "Four Knights Game", "e4 e5 Nf3 Nc6 Nc3 Nf6"],
  ["C42", "Petrov's Defense", "e4 e5 Nf3 Nf6"],
  ["C41", "Philidor Defense", "e4 e5 Nf3 d6"],
  ["C30", "King's Gambit", "e4 e5 f4"],
  ["C23", "Bishop's Opening", "e4 e5 Bc4"],
  ["C25", "Vienna Game", "e4 e5 Nc3"],
  ["C21", "Center Game", "e4 e5 d4 exd4"],
  ["B20", "Sicilian Defense", "e4 c5"],
  ["B27", "Sicilian Defense", "e4 c5 Nf3"],
  ["B90", "Sicilian: Najdorf", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6"],
  ["B70", "Sicilian: Dragon", "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6"],
  ["B33", "Sicilian: Sveshnikov", "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5"],
  ["B40", "Sicilian: French Variation", "e4 c5 Nf3 e6"],
  ["B22", "Sicilian: Alapin", "e4 c5 c3"],
  ["B23", "Sicilian: Closed", "e4 c5 Nc3"],
  ["B21", "Sicilian: Smith-Morra Gambit", "e4 c5 d4 cxd4 c3"],
  ["C00", "French Defense", "e4 e6"],
  ["C11", "French: Classical", "e4 e6 d4 d5 Nc3 Nf6"],
  ["C15", "French: Winawer", "e4 e6 d4 d5 Nc3 Bb4"],
  ["C02", "French: Advance", "e4 e6 d4 d5 e5"],
  ["C01", "French: Exchange", "e4 e6 d4 d5 exd5"],
  ["B10", "Caro-Kann Defense", "e4 c6"],
  ["B12", "Caro-Kann: Advance", "e4 c6 d4 d5 e5"],
  ["B13", "Caro-Kann: Exchange", "e4 c6 d4 d5 exd5"],
  ["B01", "Scandinavian Defense", "e4 d5"],
  ["B07", "Pirc Defense", "e4 d6 d4 Nf6"],
  ["B06", "Modern Defense", "e4 g6"],
  ["B02", "Alekhine's Defense", "e4 Nf6"],
  ["D00", "Queen's Pawn Game", "d4 d5"],
  ["A40", "Queen's Pawn Opening", "d4"],
  ["D02", "London System", "d4 d5 Nf3 Nf6 Bf4"],
  ["A48", "London System", "d4 Nf6 Nf3 g6 Bf4"],
  ["D06", "Queen's Gambit", "d4 d5 c4"],
  ["D30", "Queen's Gambit Declined", "d4 d5 c4 e6"],
  ["D20", "Queen's Gambit Accepted", "d4 d5 c4 dxc4"],
  ["D10", "Slav Defense", "d4 d5 c4 c6"],
  ["D43", "Semi-Slav Defense", "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6"],
  ["A45", "Indian Defense", "d4 Nf6"],
  ["E60", "King's Indian Defense", "d4 Nf6 c4 g6"],
  ["E90", "King's Indian: Classical", "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3"],
  ["D80", "Grünfeld Defense", "d4 Nf6 c4 g6 Nc3 d5"],
  ["E20", "Nimzo-Indian Defense", "d4 Nf6 c4 e6 Nc3 Bb4"],
  ["E12", "Queen's Indian Defense", "d4 Nf6 c4 e6 Nf3 b6"],
  ["E00", "Catalan Opening", "d4 Nf6 c4 e6 g3"],
  ["A56", "Benoni Defense", "d4 Nf6 c4 c5"],
  ["A57", "Benko Gambit", "d4 Nf6 c4 c5 d5 b5"],
  ["A80", "Dutch Defense", "d4 f5"],
  ["A10", "English Opening", "c4"],
  ["A20", "English: Reversed Sicilian", "c4 e5"],
  ["A04", "Réti Opening", "Nf3"],
  ["A07", "King's Indian Attack", "Nf3 d5 g3"],
  ["A00", "Van't Kruijs Opening", "e3"],
  ["A01", "Nimzo-Larsen Attack", "b3"],
  ["A02", "Bird's Opening", "f4"],
];

const PARSED = LINES.map(([eco, name, line]) => ({ eco, name, moves: line.split(" ") }));

export function identifyOpening(sans: string[]) {
  let best: { eco: string; name: string; plies: number } | null = null;
  for (const o of PARSED) {
    if (o.moves.length > sans.length) continue;
    if (o.moves.every((m, i) => sans[i] === m) && (!best || o.moves.length > best.plies)) {
      best = { eco: o.eco, name: o.name, plies: o.moves.length };
    }
  }
  return best;
}

/** Whether the first `ply` moves are inside a known book line. */
export function isBookPly(sans: string[], ply: number) {
  const prefix = sans.slice(0, ply);
  return PARSED.some((o) => o.moves.length >= ply && prefix.every((m, i) => o.moves[i] === m));
}
