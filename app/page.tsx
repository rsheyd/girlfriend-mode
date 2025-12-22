// app/page.tsx
"use client";

import dynamic from 'next/dynamic';
import { useAuth } from '../lib/useAuth';
import { Auth } from './Auth';

const Game = dynamic(() => import('./Game'), { ssr: false });

export default function Page() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) return <Auth />;

  return <Game />;
}
