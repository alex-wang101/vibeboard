import Link from "next/link"

export default function Home() {
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

      <div className="relative z-10 flex min-h-screen flex-col justify-end px-10 pb-20 sm:px-16 md:px-24">
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
          design from scratch — then let your agents reference the
          model as they build.
        </p>

        <div
          className="mt-10 flex items-center gap-6 opacity-0 animate-fade-up"
          style={{ animationDelay: '0.8s' }}
        >
          <Link
            href="/auth/login"
            className="text-white/90 hover:text-white transition-colors text-sm tracking-widest uppercase"
          >
            [get started]
          </Link>
          <Link
            href="/projects"
            className="text-white/50 hover:text-white/80 transition-colors text-sm tracking-widest uppercase"
          >
            [projects]
          </Link>
        </div>
      </div>
    </main>
  )
}
