// app/page.tsx
"use client";

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/useAuth';
import { Auth } from './Auth';
import { createGame } from '../lib/game';

const Game = dynamic(() => import('./Game'), { ssr: false });

export default function Page() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [creatingGame, setCreatingGame] = useState(false);

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

  return (
    <main className="min-h-screen bg-neutral-50 p-4 flex items-center justify-center text-slate-800">
      <div className="w-full max-w-md flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-center">Girlfriend Mode</h1>

        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
          <button
            onClick={handleCreateGame}
            disabled={creatingGame}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
          >
            {creatingGame ? 'Creating Game...' : 'Create New Game'}
          </button>
        </div>

        <div className="text-center text-sm text-neutral-600">
          Scrabble for two players
        </div>
      </div>
    </main>
  );
}
