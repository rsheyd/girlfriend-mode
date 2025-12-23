// app/[gameId]/page.tsx
"use client";

import { useParams } from 'next/navigation';
import Game from '../Game';

export default function GamePage() {
  const { gameId } = useParams();

  return <Game gameId={gameId as string} />;
}