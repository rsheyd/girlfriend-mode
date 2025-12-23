// app/Game.tsx
"use client";

import React, { useMemo, useState } from "react";
import { buildBag } from "@/lib/tiles";
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

export default function Game({ gameId }: { gameId?: string }) {
  const multipliers = useMemo(() => buildScrabbleMultipliers(), []);

  // Game state (client-only right now)
  const initialData = useMemo(() => {
    const b = buildBag();
    return { bag: b, rack: b.slice(0, 7) };
  }, []);

  const bag = initialData.bag;
  const rack = initialData.rack;
  const [activePlayer] = useState("Player 1");

  const hasRack = rack.length > 0;

  return (
<main className="min-h-screen bg-neutral-50 p-4 flex items-center justify-center text-slate-800">
      <div className="w-full max-w-md flex flex-col gap-3 -translate-y-10">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl">Girlfriend Mode</h1>
          {gameId && (
            <p className="text-sm text-neutral-600 mt-1">
              Game ID: <code className="bg-neutral-100 px-2 py-1 rounded text-xs">{gameId}</code>
            </p>
          )}
        </div>

        {/* Board + zoom/pan */}
        <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
          <TransformWrapper
            initialScale={1}
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

                {/* Square board viewport */}
                <div className="aspect-square w-full overflow-hidden rounded-lg border border-neutral-200">
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
                      className="grid gap-[2px] w-full h-full p-2"
                      style={{
                        gridTemplateColumns: "repeat(15, 1fr)",
                        gridTemplateRows: "repeat(15, 1fr)",
                      }}
                    >
                      {multipliers.map((row, r) =>
                        row.map((cell, c) => {
                          const isCenter = r === 7 && c === 7;
                          return (
                            <div
                              key={`${r}-${c}`}
                              className={[
                                "aspect-square flex items-center justify-center rounded-md border border-neutral-200",
                                // font scales with cell size
                                "text-[clamp(8px,1.8vw,10px)]",
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

        {/* Rack */}
        <div className="">
          {hasRack && (
            <div className="mt-1 flex gap-2 overflow-x-auto pb-1 justify-center">
              {rack.map((t) => (
                <div
                  key={t.id}
                  className="relative h-12 w-12 rounded-lg border border-neutral-300 bg-amber-50 shadow-sm"
                >
                  <div className="flex h-full items-center justify-center text-lg font-bold">
                    {t.letter}
                  </div>
                  <div className="absolute bottom-1 right-1 text-[10px]">
                    {t.value}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Turn + Player + Bag */}
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <div>
              Turn: {activePlayer}
            </div>
            <div>
              Tiles in bag: {bag.length}
            </div>
          </div>
        </div>
      </div>
    </main >
  );
}