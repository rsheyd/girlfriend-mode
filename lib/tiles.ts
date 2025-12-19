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
