// app/[gameId]/page.tsx
"use client";

import { useParams } from 'next/navigation';
import dynamic from "next/dynamic";

const Game = dynamic(() => import("../Game"), { ssr: false });

export default function GamePage() {
  const { gameId } = useParams();
  return <Game gameId={gameId as string} />;
}