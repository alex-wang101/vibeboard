'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 animate-fade-in"
        style={{
          backgroundImage: "url('/background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center text-center px-10 sm:px-16 md:px-24">
        <h1
          className="font-serif text-5xl sm:text-6xl font-bold tracking-tight text-white opacity-0 animate-fade-up"
          style={{ animationDelay: '0.2s' }}
        >
          Sign in
        </h1>

        <p
          className="mt-6 max-w-md text-lg leading-relaxed text-white/80 opacity-0 animate-fade-up"
          style={{ animationDelay: '0.5s' }}
        >
          Connect your GitHub account to import repositories
          and start visualizing your architecture.
        </p>

        <div
          className="mt-10 opacity-0 animate-fade-up"
          style={{ animationDelay: '0.8s' }}
        >
          <button
            onClick={() => signIn('github', { callbackUrl: '/projects' })}
            className="rounded-lg bg-white px-8 py-3 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
          >
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
