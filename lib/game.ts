// lib/game.ts
import { ref, set, get, update, query, orderByChild, equalTo, remove } from 'firebase/database';
import { db } from './firebase';
import { buildBag, Tile } from './tiles';

export interface Game {
  status: 'waiting' | 'active' | 'finished';
  player1Uid: string;
  player2Uid: string | null;
  activePlayerUid: string;
  bag: Tile[];
  racks: Record<string, Tile[]>;
  boardTiles: Record<string, Tile>;
  scores: Record<string, number>;
  updatedAt: number;
}

export interface GameWithId {
  id: string;
  game: Game;
}

const GAME_ID_LENGTH = 5;
const GAME_ID_ALPHABET = 'abcdefghijkmnopqrstuvwxyz23456789';

function randomGameId(length = GAME_ID_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = '';

  for (let i = 0; i < length; i += 1) {
    id += GAME_ID_ALPHABET[bytes[i] % GAME_ID_ALPHABET.length];
  }

  return id;
}

async function generateUniqueGameId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomGameId();
    const snapshot = await get(ref(db, `games/${candidate}`));
    if (!snapshot.exists()) return candidate;
  }

  throw new Error('Failed to generate a unique game id');
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
    boardTiles: {},
    scores: {
      [creatorUid]: 0,
    },
    updatedAt: Date.now(),
  };

  const gameId = await generateUniqueGameId();
  const gameRef = ref(db, `games/${gameId}`);
  await set(gameRef, game);

  return gameId;
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
    scores: {
      ...(game.scores ?? {}),
      [playerUid]: 0
    },
    updatedAt: Date.now()
  });
}

export async function commitMove(gameId: string, updates: Partial<Game>): Promise<void> {
  const gameRef = ref(db, `games/${gameId}`);
  await update(gameRef, updates);
}

export async function deleteGame(gameId: string): Promise<void> {
  await remove(ref(db, `games/${gameId}`));
}

export async function listGamesForUser(userUid: string): Promise<GameWithId[]> {
  const gamesRef = ref(db, 'games');
  const player1Query = query(gamesRef, orderByChild('player1Uid'), equalTo(userUid));
  const player2Query = query(gamesRef, orderByChild('player2Uid'), equalTo(userUid));

  const [player1Snap, player2Snap] = await Promise.all([
    get(player1Query),
    get(player2Query),
  ]);

  const games = new Map<string, Game>();

  const addSnapshot = (snapshot: Awaited<ReturnType<typeof get>>) => {
    if (!snapshot.exists()) return;
    snapshot.forEach((child) => {
      if (child.key) {
        games.set(child.key, child.val() as Game);
      }
      return false;
    });
  };

  addSnapshot(player1Snap);
  addSnapshot(player2Snap);

  return Array.from(games.entries())
    .map(([id, game]) => ({ id, game }))
    .sort((a, b) => b.game.updatedAt - a.game.updatedAt);
}
