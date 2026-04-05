'use client';

import Link from "next/link"

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-md mx-auto px-8 py-24">
        <Link
          href="/"
          className="text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          &larr; Back
        </Link>

        <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight mt-12 mb-4">
          Waitlist
        </h1>

        <p className="text-lg leading-relaxed text-white/70 mb-8">
          VibeBoard is in active development. Drop your email and
          we&apos;ll let you know when it&apos;s ready.
        </p>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-3"
        >
          <input
            type="email"
            placeholder="you@email.com"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
          />
          <button
            type="submit"
            className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
          >
            Join Waitlist
          </button>
        </form>

        <p className="mt-4 text-xs text-white/30">
          No spam. We&apos;ll only email you when there&apos;s something to share.
        </p>
      </div>
    </main>
  )
}
