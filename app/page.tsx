// app/page.tsx
"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/useAuth';
import { Auth } from './Auth';
import { createGame, listGamesForUser, GameWithId } from '../lib/game';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const Game = dynamic(() => import('./Game'), { ssr: false });

export default function Page() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [creatingGame, setCreatingGame] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [games, setGames] = useState<GameWithId[]>([]);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadGames = async () => {
      setGamesLoading(true);
      setGamesError(null);
      try {
        const userGames = await listGamesForUser(user.uid);
        if (!cancelled) setGames(userGames);
      } catch (error) {
        console.error('Failed to load games:', error);
        if (!cancelled) setGamesError('Failed to load games.');
      } finally {
        if (!cancelled) setGamesLoading(false);
      }
    };

    loadGames();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) return <div>Loading...</div>;

  if (!user) return <Auth />;

  const handleCreateGame = async () => {
    try {
      setCreatingGame(true);
      const gameId = await createGame(user.uid);
      router.push(`/${gameId}`);
    } catch (error) {
      console.error('Failed to create game:', error);
      alert('Failed to create game. Please try again.');
    } finally {
      setCreatingGame(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut(auth);
    } catch (error) {
      console.error('Failed to sign out:', error);
      alert('Failed to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 p-4 flex items-center justify-center text-slate-800">
      <div className="w-full max-w-md flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Girlfriend Mode</h1>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
          <button
            onClick={handleCreateGame}
            disabled={creatingGame}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
          >
            {creatingGame ? 'Creating Game...' : 'Create New Game'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
          <div className="text-sm font-semibold text-neutral-700 mb-3">Your Games</div>
          {gamesLoading && <div className="text-sm text-neutral-600">Loading games...</div>}
          {gamesError && <div className="text-sm text-red-600">{gamesError}</div>}
          {!gamesLoading && !gamesError && games.length === 0 && (
            <div className="text-sm text-neutral-600">No games yet.</div>
          )}
          {!gamesLoading && !gamesError && games.length > 0 && (
            <div className="flex flex-col gap-2">
              {games.map(({ id, game }) => (
                <button
                  key={id}
                  onClick={() => router.push(`/${id}`)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-left hover:bg-neutral-50"
                >
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Game {id}</span>
                    <span className="text-xs text-neutral-500">{game.status}</span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    Last updated: {new Date(game.updatedAt).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-center text-sm text-neutral-600">
          Scrabble for two players
        </div>
      </div>
    </main>
  );
}
