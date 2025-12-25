// app/Game.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildBag, Tile } from "@/lib/tiles";
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
  const boardRef = useRef<HTMLDivElement | null>(null);
  const rackRef = useRef<HTMLDivElement | null>(null);
  const suppressClickRef = useRef(false);

  // Game state (client-only right now)
  const initialBag = useMemo(() => buildBag(), []);
  const [bag, setBag] = useState(() => initialBag.slice(7));
  const [rack, setRack] = useState(() => initialBag.slice(0, 7));
  const [boardTiles, setBoardTiles] = useState<(Tile | null)[][]>(() =>
    Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null))
  );
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [lockedPositions, setLockedPositions] = useState<Set<string>>(() => new Set());
  const [stagedPositions, setStagedPositions] = useState<Set<string>>(() => new Set());
  const [score, setScore] = useState(0);
  const [lastMoveScore, setLastMoveScore] = useState<number | null>(null);
  const [pointerDrag, setPointerDrag] = useState<{
    tile: Tile;
    source:
      | { type: "rack"; tileId: string }
      | { type: "board"; tileId: string; row: number; col: number };
    position: { x: number; y: number };
    start: { x: number; y: number };
    hasMoved: boolean;
  } | null>(null);
  const pointerDragRef = useRef<typeof pointerDrag>(null);
  const [activePlayer] = useState("Player 1");

  const hasRack = rack.length > 0;
  const selectedTile = selectedTileId ? rack.find((t) => t.id === selectedTileId) ?? null : null;
  const isLocked = (row: number, col: number) => lockedPositions.has(`${row},${col}`);
  const isStaged = (row: number, col: number) => stagedPositions.has(`${row},${col}`);

  const handleRackTileClick = (tileId: string) => {
    if (suppressClickRef.current) return;
    setSelectedTileId((current) => (current === tileId ? null : tileId));
  };

  const handleBoardCellClick = (row: number, col: number) => {
    if (suppressClickRef.current) return;
    setBoardTiles((current) => {
      const cell = current[row][col];

      if (selectedTile) {
        if (cell) return current;
        const next = current.map((r) => r.slice());
        next[row][col] = selectedTile;
        setRack((prevRack) => prevRack.filter((tile) => tile.id !== selectedTile.id));
        setStagedPositions((prev) => {
          const nextPositions = new Set(prev);
          nextPositions.add(`${row},${col}`);
          return nextPositions;
        });
        setSelectedTileId(null);
        return next;
      }

      if (cell) {
        if (isLocked(row, col)) return current;
        const next = current.map((r) => r.slice());
        next[row][col] = null;
        setRack((prevRack) => [...prevRack, cell]);
        setStagedPositions((prev) => {
          const nextPositions = new Set(prev);
          nextPositions.delete(`${row},${col}`);
          return nextPositions;
        });
        return next;
      }

      return current;
    });
  };

  const startPointerDrag = (
    tile: Tile,
    source:
      | { type: "rack"; tileId: string }
      | { type: "board"; tileId: string; row: number; col: number },
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedTileId(null);
    setPointerDrag({
      tile,
      source,
      position: { x: event.clientX, y: event.clientY },
      start: { x: event.clientX, y: event.clientY },
      hasMoved: false,
    });
  };

  const getBoardCellFromPoint = (x: number, y: number) => {
    const grid = boardRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;

    const style = getComputedStyle(grid);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const gap = parseFloat(style.columnGap || style.gap) || 0;

    const innerWidth = rect.width - paddingLeft - paddingRight;
    const innerHeight = rect.height - paddingTop - paddingBottom;
    const cellSize = (innerWidth - gap * 14) / 15;
    if (cellSize <= 0) return null;

    const relX = x - rect.left - paddingLeft;
    const relY = y - rect.top - paddingTop;
    if (relX < 0 || relY < 0 || relX > innerWidth || relY > innerHeight) return null;

    const col = Math.floor(relX / (cellSize + gap));
    const row = Math.floor(relY / (cellSize + gap));
    if (row < 0 || row > 14 || col < 0 || col > 14) return null;
    return { row, col };
  };

  const getDropTarget = (x: number, y: number) => {
    const boardCell = getBoardCellFromPoint(x, y);
    if (boardCell) return { type: "board" as const, ...boardCell };

    const rackEl = rackRef.current;
    if (rackEl) {
      const rect = rackEl.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return { type: "rack" as const };
      }
    }

    return null;
  };

  const commitDrop = (
    dragState: NonNullable<typeof pointerDrag>,
    dropTarget: ReturnType<typeof getDropTarget>
  ) => {
    if (!dropTarget) {
      setPointerDrag(null);
      return;
    }

    if (dropTarget.type === "board") {
      setBoardTiles((current) => {
        const cell = current[dropTarget.row][dropTarget.col];
        if (cell) return current;

        if (dragState.source.type === "rack") {
          const next = current.map((r) => r.slice());
          next[dropTarget.row][dropTarget.col] = dragState.tile;
          setRack((prevRack) => prevRack.filter((t) => t.id !== dragState.tile.id));
          setStagedPositions((prev) => {
            const nextPositions = new Set(prev);
            nextPositions.add(`${dropTarget.row},${dropTarget.col}`);
            return nextPositions;
          });
          return next;
        }

        if (dragState.source.type === "board") {
          if (isLocked(dragState.source.row, dragState.source.col)) return current;
          if (dragState.source.row === dropTarget.row && dragState.source.col === dropTarget.col) {
            return current;
          }
          const next = current.map((r) => r.slice());
          const tile = next[dragState.source.row][dragState.source.col];
          if (!tile) return current;
          next[dragState.source.row][dragState.source.col] = null;
          next[dropTarget.row][dropTarget.col] = tile;
          setStagedPositions((prev) => {
            const nextPositions = new Set(prev);
            nextPositions.delete(`${dragState.source.row},${dragState.source.col}`);
            nextPositions.add(`${dropTarget.row},${dropTarget.col}`);
            return nextPositions;
          });
          return next;
        }

        return current;
      });
    }

    if (dropTarget.type === "rack" && dragState.source.type === "board") {
      setBoardTiles((current) => {
        const next = current.map((r) => r.slice());
        const tile = next[dragState.source.row][dragState.source.col];
        if (!tile) return current;
        if (isLocked(dragState.source.row, dragState.source.col)) return current;
        next[dragState.source.row][dragState.source.col] = null;
        setRack((prevRack) => [...prevRack, tile]);
        setStagedPositions((prev) => {
          const nextPositions = new Set(prev);
          nextPositions.delete(`${dragState.source.row},${dragState.source.col}`);
          return nextPositions;
        });
        return next;
      });
    }

    setPointerDrag(null);
  };

  const computeMoveScore = () => {
    const staged = Array.from(stagedPositions).map((pos) => {
      const [row, col] = pos.split(",").map(Number);
      return { row, col };
    });

    if (staged.length === 0) return null;

    const sameRow = staged.every((pos) => pos.row === staged[0].row);
    const sameCol = staged.every((pos) => pos.col === staged[0].col);

    if (!sameRow && !sameCol) {
      return { error: "Place tiles in a single row or column." };
    }

    const isHorizontal = sameRow;
    const row = staged[0].row;
    const col = staged[0].col;

    let startRow = row;
    let startCol = col;
    let endRow = row;
    let endCol = col;

    if (isHorizontal) {
      const cols = staged.map((pos) => pos.col);
      startCol = Math.min(...cols);
      endCol = Math.max(...cols);
      while (startCol > 0 && boardTiles[row][startCol - 1]) startCol -= 1;
      while (endCol < 14 && boardTiles[row][endCol + 1]) endCol += 1;
    } else {
      const rows = staged.map((pos) => pos.row);
      startRow = Math.min(...rows);
      endRow = Math.max(...rows);
      while (startRow > 0 && boardTiles[startRow - 1][col]) startRow -= 1;
      while (endRow < 14 && boardTiles[endRow + 1][col]) endRow += 1;
    }

    const tiles: Array<{ row: number; col: number; tile: Tile }> = [];
    if (isHorizontal) {
      for (let c = startCol; c <= endCol; c += 1) {
        const tile = boardTiles[row][c];
        if (!tile) return { error: "There is a gap in the word." };
        tiles.push({ row, col: c, tile });
      }
    } else {
      for (let r = startRow; r <= endRow; r += 1) {
        const tile = boardTiles[r][col];
        if (!tile) return { error: "There is a gap in the word." };
        tiles.push({ row: r, col, tile });
      }
    }

    let wordMultiplier = 1;
    let letterSum = 0;

    for (const tile of tiles) {
      const base = tile.tile.value;
      if (isStaged(tile.row, tile.col)) {
        const mult = multipliers[tile.row][tile.col];
        if (mult === "DL") letterSum += base * 2;
        else if (mult === "TL") letterSum += base * 3;
        else letterSum += base;

        if (mult === "DW") wordMultiplier *= 2;
        if (mult === "TW") wordMultiplier *= 3;
      } else {
        letterSum += base;
      }
    }

    return { score: letterSum * wordMultiplier };
  };

  const handleCommitMove = () => {
    const result = computeMoveScore();
    if (!result) {
      alert("Place at least one tile before committing.");
      return;
    }
    if ("error" in result) {
      alert(result.error);
      return;
    }

    setScore((prev) => prev + result.score);
    setLastMoveScore(result.score);
    setLockedPositions((prev) => {
      const next = new Set(prev);
      for (const pos of stagedPositions) next.add(pos);
      return next;
    });
    setStagedPositions(new Set());

    setRack((prevRack) => {
      const need = Math.max(0, 7 - prevRack.length);
      if (need === 0) return prevRack;
      const drawn = bag.slice(0, need);
      setBag((prevBag) => prevBag.slice(need));
      return [...prevRack, ...drawn];
    });
  };

  useEffect(() => {
    pointerDragRef.current = pointerDrag;
  }, [pointerDrag]);

  useEffect(() => {
    if (!pointerDrag) return;

    const handlePointerMove = (event: PointerEvent) => {
      setPointerDrag((current) => {
        if (!current) return current;
        const dx = event.clientX - current.start.x;
        const dy = event.clientY - current.start.y;
        const hasMoved = current.hasMoved || Math.hypot(dx, dy) > 6;
        return {
          ...current,
          position: { x: event.clientX, y: event.clientY },
          hasMoved,
        };
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      const dragState = pointerDragRef.current;
      if (!dragState) return;

      if (!dragState.hasMoved) {
        if (dragState.source.type === "rack") {
          handleRackTileClick(dragState.tile.id);
        } else {
          handleBoardCellClick(dragState.source.row, dragState.source.col);
        }
        suppressClickRef.current = true;
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
        setPointerDrag(null);
        return;
      }

      const dropTarget = getDropTarget(event.clientX, event.clientY);
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      commitDrop(dragState, dropTarget);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [pointerDrag]);

  return (
<main className="min-h-screen bg-neutral-50 p-4 flex items-center justify-center text-slate-800">
      <div className="w-full max-w-md flex flex-col gap-3 -translate-y-10">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl">Girlfriend Mode</h1>
            {gameId && (
              <p className="text-sm text-neutral-600 mt-1">
                Game ID: <code className="bg-neutral-100 px-2 py-1 rounded text-xs">{gameId}</code>
              </p>
            )}
          </div>
          <Link
            href="/"
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
          >
            Home
          </Link>
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
            panning={{ velocityDisabled: true, disabled: !!pointerDrag }}
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
                      ref={boardRef}
                    >
                      {multipliers.map((row, r) =>
                        row.map((cell, c) => {
                          const isCenter = r === 7 && c === 7;
                          const tile = boardTiles[r][c];
                          return (
                            <div
                              key={`${r}-${c}`}
                              className={[
                                "aspect-square flex items-center justify-center rounded-md border border-neutral-200",
                                // font scales with cell size
                                "text-[clamp(8px,1.8vw,10px)]",
                                tile ? "bg-amber-50" : bgClass(cell),
                                isStaged(r, c) ? "ring-2 ring-blue-300" : "",
                                isLocked(r, c) ? "opacity-90" : "",
                              ].join(" ")}
                              title={`(${r + 1}, ${c + 1}) ${cell ?? "—"}`}
                              onClick={() => handleBoardCellClick(r, c)}
                            >
                              {tile ? (
                                <div
                                  className="relative h-full w-full touch-none"
                                  onPointerDown={(event) =>
                                    startPointerDrag(tile, { type: "board", tileId: tile.id, row: r, col: c }, event)
                                  }
                                >
                                  <div className="flex h-full items-center justify-center text-sm font-bold">
                                    {tile.letter}
                                  </div>
                                  <div className="absolute bottom-[2px] right-[3px] text-[9px]">
                                    {tile.value}
                                  </div>
                                </div>
                              ) : (
                                isCenter ? "★" : labelFor(cell)
                              )}
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
            <div
              className="mt-1 flex gap-2 overflow-x-auto pb-1 justify-center"
              ref={rackRef}
            >
              {rack.map((t) => (
                <div
                  key={t.id}
                  className={[
                    "relative h-12 w-12 rounded-lg border bg-amber-50 shadow-sm touch-none",
                    selectedTileId === t.id ? "border-blue-500 ring-2 ring-blue-200" : "border-neutral-300",
                  ].join(" ")}
                  onClick={() => handleRackTileClick(t.id)}
                  onPointerDown={(event) => startPointerDrag(t, { type: "rack", tileId: t.id }, event)}
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
          {/* Turn + Commit + Bag */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <div>Turn: {activePlayer}</div>
              <div>Tiles in bag: {bag.length}</div>
            </div>
            {stagedPositions.size > 0 && (
              <button
                onClick={handleCommitMove}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Play Word
              </button>
            )}
            <div>
            Your Score: {score}
            {lastMoveScore !== null && <span className="text-neutral-400"> (+{lastMoveScore})</span>}
          </div>
          </div>
          
        </div>
      </div>
      {pointerDrag && (
        <div
          className="fixed left-0 top-0 z-50 pointer-events-none"
          style={{
            transform: `translate(${pointerDrag.position.x - 24}px, ${pointerDrag.position.y - 24}px)`,
          }}
        >
          <div className="relative h-12 w-12 rounded-lg border border-neutral-300 bg-amber-50 shadow-sm">
            <div className="flex h-full items-center justify-center text-lg font-bold">
              {pointerDrag.tile.letter}
            </div>
            <div className="absolute bottom-1 right-1 text-[10px]">
              {pointerDrag.tile.value}
            </div>
          </div>
        </div>
      )}
    </main >
  );
}
