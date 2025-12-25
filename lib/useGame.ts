// lib/useGame.ts
import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from './firebase';
import type { Game } from './game';

type GameState = {
  game: Game | null;
  loading: boolean;
  error: string | null;
};

// The function subscribes to a single game in RTDB (games/{gameId}),
// keeps it in React state, and returns { game, loading, error }.
export function useGame(gameId?: string): GameState {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(!!gameId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setGame(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const gameRef = ref(db, `games/${gameId}`);
    const unsubscribe = onValue(
      gameRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setGame(null);
          setError('Game not found.');
        } else {
          setGame(snapshot.val() as Game);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to game:', err);
        setError('Failed to load game.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [gameId]);

  return { game, loading, error };
}
