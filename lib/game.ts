// lib/game.ts
import { ref, push, set } from 'firebase/database';
import { db } from './firebase';
import { buildBag, Tile } from './tiles';

export interface Game {
  status: 'waiting' | 'active' | 'finished';
  player1Uid: string;
  player2Uid: string | null;
  activePlayerUid: string;
  bag: Tile[];
  racks: Record<string, Tile[]>;
  updatedAt: number;
}

export async function createGame(creatorUid: string): Promise<string> {
  const bag = buildBag();

  // Deal 7 tiles to creator
  const creatorRack = bag.splice(0, 7);

  const game: Game = {
    status: 'waiting',
    player1Uid: creatorUid,
    player2Uid: null,
    activePlayerUid: creatorUid,
    bag,
    racks: {
      [creatorUid]: creatorRack,
    },
    updatedAt: Date.now(),
  };

  const gamesRef = ref(db, 'games');
  const newGameRef = push(gamesRef);
  await set(newGameRef, game);

  return newGameRef.key!;
}