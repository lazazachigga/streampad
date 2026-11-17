'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const BACKEND = 'https://streampad-backend.onrender.com';

export default function StreamerPage() {
  const searchParams = useSearchParams();
  const provider = searchParams.get('provider');
  const login = searchParams.get('login');
  const [session, setSession] = useState<{ provider: string; userId: string; login: string } | null>(null);

  useEffect(() => {
    // Check session
    fetch(`${BACKEND}/me`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.ok) setSession(data);
      })
      .catch(() => {});
  }, []);

  const isLoggedIn = !!session || !!provider;

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-twitch to-kick flex items-center justify-center mx-auto mb-4 shadow-lg shadow-volt/20">
          <span className="text-2xl font-black text-white">S</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Streamer Dashboard</h1>
        {provider && login ? (
          <div className="mb-6 p-4 rounded-xl bg-kick/10 border border-kick/30">
            <p className="text-kick font-semibold">✅ Connected!</p>
            <p className="text-text-secondary text-sm mt-1">
              {provider === 'twitch' ? '🟣' : '🟢'} @{login} on {provider}
            </p>
          </div>
        ) : session ? (
          <div className="mb-6 p-4 rounded-xl bg-kick/10 border border-kick/30">
            <p className="text-kick font-semibold">✅ Connected!</p>
            <p className="text-text-secondary text-sm mt-1">
              {session.provider === 'twitch' ? '🟣' : '🟢'} @{session.login} on {session.provider}
            </p>
          </div>
        ) : (
          <p className="text-text-secondary">Sign in with your platform to launch tokens and claim fees.</p>
        )}
      </div>

      {!isLoggedIn && (
        <div className="space-y-3">
          <a
            href={`${BACKEND}/auth/twitch/login`}
            className="flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-twitch text-white font-semibold hover:bg-twitch-dark transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-twitch/20"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
            </svg>
            Continue with Twitch
          </a>
          <a
            href={`${BACKEND}/auth/kick/login`}
            className="flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-kick text-black font-semibold hover:bg-kick-dark transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-kick/20"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            Continue with Kick
          </a>
        </div>
      )}

      {isLoggedIn && (
        <div className="space-y-4">
          <div className="rounded-xl border border-surface-3 bg-surface-1 p-5">
            <div className="text-xs text-text-secondary mb-1">Wallet balance</div>
            <div className="text-2xl font-mono font-bold">0.00 SOL</div>
          </div>
          <div className="rounded-xl border border-surface-3 bg-surface-1 p-5">
            <div className="text-xs text-text-secondary mb-1">Claimable fees</div>
            <div className="text-2xl font-mono font-bold text-kick">0.00 SOL</div>
          </div>
          <div className="rounded-xl border border-surface-3 bg-surface-1 p-5">
            <div className="text-xs text-text-secondary mb-1">Tokens launched</div>
            <div className="text-2xl font-mono font-bold">0</div>
          </div>
          <div className="flex gap-3 mt-4">
            <a href="/launch" className="px-4 py-2 rounded-xl bg-volt text-black text-sm font-bold hover:bg-volt-dark transition">
              Launch token
            </a>
            <button className="px-4 py-2 rounded-xl border border-surface-3 text-sm hover:bg-surface-2 transition">
              Claim fees
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <a href="/" className="text-sm text-text-secondary hover:text-volt transition">← Back to home</a>
      </div>
    </div>
  );
}
