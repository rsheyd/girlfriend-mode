// lib/Auth.tsx
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';

const provider = new GoogleAuthProvider();

export function Auth() {
  const { user, loading } = useAuth();

  const signIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign-in error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2f2ff,_#f8fafc_60%)] flex items-center justify-center p-6 text-slate-800">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg">
          <div className="h-5 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-slate-100" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-6 h-11 w-full animate-pulse rounded-xl bg-slate-200" />
        </div>
      </main>
    );
  }

  if (user) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2f2ff,_#f8fafc_60%)] flex items-center justify-center p-6 text-slate-800">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg">
          <div className="text-sm uppercase tracking-wide text-slate-500">You are signed in</div>
          <h1 className="mt-2 text-2xl font-semibold">Welcome, {user.displayName ?? "friend"}.</h1>
          <p className="mt-2 text-sm text-slate-600">
            You can jump back to the home screen to create or rejoin a game.
          </p>
          <button
            onClick={handleSignOut}
            className="mt-6 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2f2ff,_#f8fafc_60%)] flex items-center justify-center p-6 text-slate-800">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-xl">
        <div className="absolute -right-10 -top-16 h-32 w-32 rounded-full bg-sky-200/60 blur-2xl" />
        <div className="absolute -left-12 -bottom-16 h-36 w-36 rounded-full bg-amber-200/60 blur-2xl" />
        <div className="relative">
          <h1 className="mt-3 text-3xl font-semibold">Girlfriend Mode</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to create a game, share a link, and start playing together.
          </p>
          <button
            onClick={signIn}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path
                fill="#fff"
                d="M12 10.2v3.6h5.1c-.2 1.3-1.5 3.8-5.1 3.8-3.1 0-5.6-2.6-5.6-5.8S8.9 6 12 6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.7 3.4 14.6 2.4 12 2.4 7.8 2.4 4.4 5.8 4.4 9.8S7.8 17.2 12 17.2c4.9 0 6.7-3.4 6.7-5.6 0-.4-.1-.7-.1-1H12z"
              />
            </svg>
            Sign in with Google
          </button>
          <p className="mt-4 text-xs text-slate-500">
            We use Google to keep your games synced across devices.
          </p>
        </div>
      </div>
    </main>
  );
}
