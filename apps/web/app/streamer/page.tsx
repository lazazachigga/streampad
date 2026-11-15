'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND = 'https://streampad-backend.onrender.com';

export default function StreamerPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-twitch to-kick flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-black text-white">S</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Streamer sign-in</h1>
        <p className="text-text-secondary">Sign in with your platform to launch tokens and claim fees.</p>
      </div>
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
          href={`${BACKEND}/auth/x/login`}
          className="flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Continue with X
        </a>
      </div>
      <p className="text-xs text-text-secondary text-center mt-6">
        Identity is the platform&apos;s numeric ID (not the handle). No yield promises.
      </p>
      <div className="mt-8 text-center">
        <a href="/" className="text-sm text-text-secondary hover:text-volt transition">← Back to home</a>
      </div>
    </div>
  );
}
