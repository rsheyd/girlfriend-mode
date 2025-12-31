// app/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/useAuth';
import { Auth } from './Auth';
import { createGame, listGamesForUser, deleteGame, GameWithId } from '../lib/game';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const resolveDisplayName = (displayName?: string | null, email?: string | null) => {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  const prefix = email?.split('@')[0]?.trim();
  if (prefix) return prefix;
  return 'Player';
};

export default function Page() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [creatingGame, setCreatingGame] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [games, setGames] = useState<GameWithId[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [recentInvites, setRecentInvites] = useState<string[]>([]);
  const [selectedInvite, setSelectedInvite] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentInvites');
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) {
          setRecentInvites(parsed.filter((value) => typeof value === 'string'));
        }
      }
    } catch {
      setRecentInvites([]);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadGames = async () => {
      setGamesLoading(true);
      setGamesError(null);
      try {
        const userGames = await listGamesForUser(user.uid, user.email ?? undefined);
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
      const creatorName = resolveDisplayName(user.displayName, user.email);
      const gameId = await createGame(user.uid, inviteEmail, creatorName);
      if (inviteEmail) {
        setRecentInvites((prev) => {
          const next = [inviteEmail, ...prev.filter((email) => email !== inviteEmail)].slice(0, 5);
          try {
            localStorage.setItem('recentInvites', JSON.stringify(next));
          } catch {
            // Ignore storage errors.
          }
          return next;
        });
        setSelectedInvite(inviteEmail);
      }
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
          <div>
            <h1 className="text-2xl font-bold">Girlfriend Mode</h1>
            <div className="text-xs text-neutral-500">-- a slightly unfair word game</div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
          <label className="text-sm font-medium text-neutral-700" htmlFor="invite-email">
            Invite player (Google email)
          </label>
          {recentInvites.length > 0 && (
            <select
              value={selectedInvite}
              onChange={(event) => {
                setSelectedInvite(event.target.value);
                setInviteEmail(event.target.value);
              }}
              className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Choose a recent invite</option>
              {recentInvites.map((email) => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </select>
          )}
          <input
            id="invite-email"
            type="email"
            placeholder="name@gmail.com"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleCreateGame}
            disabled={creatingGame}
            className="mt-4 w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
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
              {games.map(({ id, game }) => {
                const invitedForUser =
                  !!game.invitedEmail &&
                  !!user.email &&
                  game.invitedEmail.toLowerCase() === user.email.toLowerCase() &&
                  game.player1Uid !== user.uid &&
                  game.player2Uid !== user.uid;
                const statusLabel = invitedForUser ? 'invited' : game.status;

                return (
                <div
                  key={id}
                  onClick={() => router.push(`/${id}`)}
                  className="w-full cursor-pointer rounded-lg border border-neutral-200 px-3 py-2 text-left hover:bg-neutral-50"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") router.push(`/${id}`);
                  }}
                >
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Game {id}</span>
                    <span className="text-xs text-neutral-500">{statusLabel}</span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    Last updated: {new Date(game.updatedAt).toLocaleString()}
                  </div>
                  {game.player1Uid === user.uid && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={async (event) => {
                          event.stopPropagation();
                          try {
                            await deleteGame(id);
                            setGames((prev) => prev.filter((g) => g.id !== id));
                          } catch (error) {
                            console.error('Failed to delete game:', error);
                            alert('Failed to delete game. Please try again.');
                          }
                        }}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete game
                      </button>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
