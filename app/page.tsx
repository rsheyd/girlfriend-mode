// app/page.tsx
"use client";
import React from "react";
import { useState } from "react";
import { buildBag, type Tile } from "@/lib/tiles";


type Mult = "TW" | "DW" | "TL" | "DL" | null;

function makeEmptyBoard(): Mult[][] {
  const size = 15;
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

/**
 * Classic Scrabble multiplier layout (15x15).
 * Coordinates are [row, col], 0-indexed.
 * This encodes one quadrant and mirrors it for symmetry.
 */
function buildScrabbleMultipliers(): Mult[][] {
  const b = makeEmptyBoard();

  const set = (r: number, c: number, m: Mult) => {
    b[r][c] = m;
  };

  // Define multipliers for top-left quadrant (including center lines where appropriate)
  // Source: standard Scrabble board pattern (symmetric across center).
  const TL: Array<[number, number]> = [
    [1, 5],
    [5, 1],
    [5, 5],
  ];

  const DL: Array<[number, number]> = [
    [0, 3],
    [2, 6],
    [3, 0],
    [3, 7],
    [6, 2],
    [6, 6],
    [7, 3],
  ];

  const DW: Array<[number, number]> = [
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [7, 7], // center star is DW in classic scrabble
  ];

  const TW: Array<[number, number]> = [
    [0, 0],
    [0, 7],
    [7, 0],
  ];

  // Apply to board with 4-way symmetry
  const size = 15;
  const mirrorCoords = (r: number, c: number): Array<[number, number]> => {
    const r2 = size - 1 - r;
    const c2 = size - 1 - c;
    return [
      [r, c],
      [r, c2],
      [r2, c],
      [r2, c2],
    ];
  };

  const placeSym = (coords: Array<[number, number]>, m: Mult) => {
    for (const [r, c] of coords) {
      for (const [rr, cc] of mirrorCoords(r, c)) {
        set(rr, cc, m);
      }
    }
  };

  placeSym(TW, "TW");
  placeSym(DW, "DW");
  placeSym(TL, "TL");
  placeSym(DL, "DL");

  // The center square is special; keep it DW (already set via DW list).
  return b;
}

function labelFor(mult: Mult): string {
  if (!mult) return "";
  return mult;
}

function bgClass(mult: Mult): string {
  // Keep it simple + readable; tweak later.
  switch (mult) {
    case "TW":
      return "bg-red-200";
    case "DW":
      return "bg-pink-200";
    case "TL":
      return "bg-blue-200";
    case "DL":
      return "bg-sky-200";
    default:
      return "bg-stone-100";
  }
}

export default function Page() {
  const [bag] = useState(() => buildBag());
  const [rack] = useState<Tile[]>(() => bag.slice(0, 7));
  const [activePlayer] = useState("Player 1");

  const multipliers = buildScrabbleMultipliers();

  return (
    <main className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold">Girlfriend Mode</h1>
        <p className="mt-1 text-sm text-neutral-600">
          v0: board layout + multipliers only
        </p>

        <div className="mt-6 overflow-auto rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div
            className="grid gap-[2px]"
            style={{
              gridTemplateColumns: `repeat(15, 40px)`,
              gridTemplateRows: `repeat(15, 40px)`,
            }}
          >
            {multipliers.map((row, r) =>
              row.map((cell, c) => {
                const isCenter = r === 7 && c === 7;
                return (
                  <div
                    key={`${r}-${c}`}
                    className={[
                      "flex items-center justify-center rounded-md border border-neutral-200 text-xs font-semibold text-neutral-700",
                      bgClass(cell),
                    ].join(" ")}
                    title={`(${r + 1}, ${c + 1}) ${cell ?? "—"}`}
                  >
                    {isCenter ? "★" : labelFor(cell)}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-6">
        <div className="text-sm text-neutral-600">Turn</div>
        <div className="text-lg font-semibold">{activePlayer}</div>

        <div className="mt-4 flex gap-2">
          {rack.map((t) => (
            <div
              key={t.id}
              className="relative h-12 w-12 rounded-lg border border-neutral-300 bg-amber-50 shadow-sm"
            >
              <div className="flex h-full items-center justify-center text-lg font-bold">
                {t.letter}
              </div>
              <div className="absolute bottom-1 right-1 text-[10px] font-semibold">
                {t.value}
              </div>
            </div>
          ))}
        </div>
      </div>


        <div className="mt-4 text-xs text-neutral-500">
          Legend: TW (triple word), DW (double word), TL (triple letter), DL (double letter)
        </div>
      </div>
    </main>
  );
}
