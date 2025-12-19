// app/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { buildBag, type Tile } from "@/lib/tiles";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

type Mult = "TW" | "DW" | "TL" | "DL" | null;

/* =========================================================
   Board layout helpers (multiplier map)
   - Pure functions: no React, no state
   ========================================================= */

function makeEmptyBoard(): Mult[][] {
  const size = 15;
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

/*** Classic Scrabble multiplier layout (15x15). This encodes one quadrant and mirrors it for symmetry. */
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

/* =========================================================
   UI helpers (how squares look)
   ========================================================= */

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

/* =========================================================
   Page component (state + rendering)
   ========================================================= */

export default function Page() {
  const multipliers = useMemo(() => buildScrabbleMultipliers(), []);

  // Game state (client-only right now)
  const [bag, setBag] = useState<Tile[]>([]);
  const [rack, setRack] = useState<Tile[]>([]);
  const [activePlayer] = useState("Player 1");

  // Client-only init: avoids hydration mismatch from Math.random() shuffle
  useEffect(() => {
    const b = buildBag();
    setBag(b);
    setRack(b.slice(0, 7));
  }, []);

  const hasRack = rack.length > 0;

  return (
    <main className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <h1 className="text-2xl font-semibold">Girlfriend Mode</h1>

        {/* Board + zoom/pan */}
        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
  {/* Square board viewport */}
  <div className="aspect-square w-full">
          <TransformWrapper
            initialScale={0.87}
            minScale={0.4}
            maxScale={2.2}
            centerOnInit
            doubleClick={{ disabled: true }}
            wheel={{ step: 0.08 }}
            panning={{ velocityDisabled: true }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Zoom controls */}
                <div className="mb-2 flex gap-2">
                  <button onClick={() => zoomOut()} className="rounded-md border px-2 py-1 text-sm">−</button>
                  <button onClick={() => zoomIn()} className="rounded-md border px-2 py-1 text-sm">+</button>
                  <button onClick={() => resetTransform()} className="rounded-md border px-2 py-1 text-sm">Reset</button>
                </div>

                {/* Zoom viewport */}
                <div className="overflow-hidden rounded-lg border border-neutral-200">
  <TransformComponent
    wrapperStyle={{ width: "100%", height: "100%" }}
    contentStyle={{
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {/* Board grid */}
    <div
      className="grid gap-[2px]"
      style={{
        // Responsive tiles: fits on iPhone, still looks good on desktop
        gridTemplateColumns: `repeat(15, clamp(18px, 5.5vw, 34px))`,
        gridTemplateRows: `repeat(15, clamp(18px, 5.5vw, 34px))`,
      }}
    >
      {multipliers.map((row, r) =>
        row.map((cell, c) => {
          const isCenter = r === 7 && c === 7;
          return (
            <div
              key={`${r}-${c}`}
              className={[
                "flex items-center justify-center rounded-md border border-neutral-200 text-[10px] font-semibold text-neutral-700",
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
  </TransformComponent>
</div>
              </>
            )}
          </TransformWrapper>
        </div>
        </div>

        {/* Turn + rack */}
        <div className="mt-6">
          <div className="text-sm text-neutral-600">Turn</div>
          <div className="text-lg font-semibold">{activePlayer}</div>

          <div className="mt-2 text-xs text-neutral-500">
            Tiles in bag: {bag.length}
          </div>

          {hasRack && (
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
          )}
        </div>
      </div>
    </main>
  );
}