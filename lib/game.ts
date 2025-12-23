// lib/game.ts
import { ref, push, set, get, update } from 'firebase/database';
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

export async function joinGame(gameId: string, playerUid: string): Promise<void> {
  const gameRef = ref(db, `games/${gameId}`);
  const snapshot = await get(gameRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.val() as Game;

  if (game.status !== 'waiting') {
    throw new Error('Game is not available to join');
  }

  if (game.player1Uid === playerUid) {
    throw new Error('Cannot join your own game');
  }

  if (game.player2Uid) {
    throw new Error('Game is already full');
  }

  // Deal tiles to joining player
  const playerRack = game.bag.slice(0, 7);
  const remainingBag = game.bag.slice(7);

  await update(gameRef, {
    player2Uid: playerUid,
    status: 'active',
    bag: remainingBag,
    racks: {
      ...game.racks,
      [playerUid]: playerRack
    },
    updatedAt: Date.now()
  });
}