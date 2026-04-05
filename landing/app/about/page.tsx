import Link from "next/link"

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-2xl mx-auto px-8 py-24">
        <Link
          href="/"
          className="text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          &larr; Back
        </Link>

        <h1 className="font-serif text-5xl sm:text-6xl font-bold tracking-tight mt-12 mb-8">
          VIBEBOARD
        </h1>

        <div className="space-y-8 text-lg leading-relaxed text-white/70">
          <p>
            Coding agents are getting better at writing code every month.
            The syntax, the boilerplate, the glue - that part is increasingly
            solved. What isn&apos;t solved is architecture. Knowing what to build,
            where it belongs in the system, how the pieces connect. That&apos;s
            still the developer&apos;s job, and as agents take over more of the
            implementation, getting the architecture right is becoming the
            only part that really matters.
          </p>

          <p>
            VibeBoard is a collaborative canvas for that architectural layer.
            Scan a GitHub repo to generate an interactive dependency graph,
            or start from a blank canvas and design the system before any
            code exists. Share the board with your team, import feature
            branches, merge separate project models - make the structural
            decisions together in real time. The architecture model is then
            exposed via MCP so your coding agents can reference it as they
            implement, writing code that fits the system instead of
            guessing at it.
          </p>

          <p>
            Existing tools don&apos;t do this. Static diagrams in Figma or Miro
            go stale the week after they&apos;re drawn. Auto-generated graphs
            dump every file and import into an unreadable mess no one
            actually uses. Neither is collaborative, neither stays in sync
            with the code, and neither is readable by agents. VibeBoard
            sits in between - it scans your code so you don&apos;t start from
            nothing, but you own the model. You rearrange it, annotate it,
            share it, and your agents read from it. One living document
            for both humans and machines.
          </p>

          <div className="w-12 h-px bg-white/10 my-4" />

          <p className="text-white/50">
            Three principles guided the build:
          </p>

          <ul className="space-y-5 pl-1">
            <li className="flex gap-4">
              <span className="text-white/20 font-serif text-2xl shrink-0 leading-tight">01</span>
              <span>
                <strong className="text-white">Make the invisible visible.</strong>{" "}
                Architecture lives in developers&apos; heads. It should live on a
                canvas where everyone - and every agent - can see it.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="text-white/20 font-serif text-2xl shrink-0 leading-tight">02</span>
              <span>
                <strong className="text-white">Bridge humans and agents.</strong>{" "}
                The same model a developer reviews on screen is the one an AI
                coding agent reads via MCP. One source of truth.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="text-white/20 font-serif text-2xl shrink-0 leading-tight">03</span>
              <span>
                <strong className="text-white">Start from what exists.</strong>{" "}
                Don&apos;t ask developers to document from scratch. Scan the repo,
                generate the graph, then let them refine it.
              </span>
            </li>
          </ul>

          <div className="w-12 h-px bg-white/10 my-4" />

          <p>
            This is a personal project, built in public. If you want early
            access, join the waitlist.
          </p>
        </div>

        <div className="mt-12">
          <Link
            href="/waitlist"
            className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
          >
            Join the Waitlist
          </Link>
        </div>
      </div>
    </main>
  )
}
