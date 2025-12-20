// lib/tiles.ts
export type Tile = {
  id: string;
  letter: string;
  value: number;
};

const DISTRIBUTION: Record<string, { count: number; value: number }> = {
  A: { count: 9, value: 1 },
  B: { count: 2, value: 3 },
  C: { count: 2, value: 3 },
  D: { count: 4, value: 2 },
  E: { count: 12, value: 1 },
  F: { count: 2, value: 4 },
  G: { count: 3, value: 2 },
  H: { count: 2, value: 4 },
  I: { count: 9, value: 1 },
  J: { count: 1, value: 8 },
  K: { count: 1, value: 5 },
  L: { count: 4, value: 1 },
  M: { count: 2, value: 3 },
  N: { count: 6, value: 1 },
  O: { count: 8, value: 1 },
  P: { count: 2, value: 3 },
  Q: { count: 1, value: 10 },
  R: { count: 6, value: 1 },
  S: { count: 4, value: 1 },
  T: { count: 6, value: 1 },
  U: { count: 4, value: 1 },
  V: { count: 2, value: 4 },
  W: { count: 2, value: 4 },
  X: { count: 1, value: 8 },
  Y: { count: 4, value: 4 },
  Z: { count: 1, value: 10 },
  "?": { count: 2, value: 0 }, // blank tiles
};

export function buildBag(): Tile[] {
  const bag: Tile[] = [];
  let id = 0;

  for (const letter in DISTRIBUTION) {
    const { count, value } = DISTRIBUTION[letter];
    for (let i = 0; i < count; i++) {
      bag.push({ id: `t${id++}`, letter, value });
    }
  }

  // shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }

  return bag;
}
