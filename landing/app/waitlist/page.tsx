'use client';

import Link from "next/link"
import { useState } from "react"

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'success' } | { kind: 'error'; message: string }

export default function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus({ kind: 'loading' })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      setStatus({ kind: 'error', message: 'Waitlist is not configured. Try again later.' })
      return
    }

    try {
      const res = await fetch(`${url}/rest/v1/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setStatus({ kind: 'success' })
        setEmail('')
        return
      }

      const body = await res.json().catch(() => null)
      if (res.status === 409 || body?.code === '23505') {
        setStatus({ kind: 'success' })
        setEmail('')
        return
      }
      setStatus({ kind: 'error', message: body?.message || 'Something went wrong. Please try again.' })
    } catch {
      setStatus({ kind: 'error', message: 'Network error. Please try again.' })
    }
  }

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

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status.kind === 'loading'}
            placeholder="you@email.com"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status.kind === 'loading'}
            className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-60"
          >
            {status.kind === 'loading' ? 'Joining...' : 'Join Waitlist'}
          </button>
        </form>

        {status.kind === 'success' && (
          <p className="mt-4 text-sm text-emerald-400">
            You&apos;re on the list. We&apos;ll be in touch.
          </p>
        )}
        {status.kind === 'error' && (
          <p className="mt-4 text-sm text-red-400">{status.message}</p>
        )}

        <p className="mt-4 text-xs text-white/30">
          No spam. We&apos;ll only email you when there&apos;s something to share.
        </p>
      </div>
    </main>
  )
}
