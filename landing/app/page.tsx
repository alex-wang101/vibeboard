import Link from "next/link"

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
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
          className="font-serif text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-white opacity-0 animate-fade-up"
          style={{ animationDelay: '0.2s' }}
        >
          VIBEBOARD
        </h1>

        <p
          className="mt-6 max-w-xl text-lg leading-relaxed text-white/80 opacity-0 animate-fade-up"
          style={{ animationDelay: '0.5s' }}
        >
          Architecture that speaks for itself. Import a codebase or
          design from scratch - then let your agents reference the
          model as they build.
        </p>

        <div
          className="mt-10 flex items-center gap-4 opacity-0 animate-fade-up"
          style={{ animationDelay: '0.8s' }}
        >
          <Link
            href="/about"
            className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
          >
            Learn More
          </Link>
          <Link
            href="/waitlist"
            className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Waitlist
          </Link>
        </div>
      </div>
    </main>
  )
}
