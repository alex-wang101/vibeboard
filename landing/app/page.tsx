import { ArrowRight, Play, Shield, Zap, Globe, Code2, BarChart3, Lock, ChevronRight } from "lucide-react"

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-xl font-semibold tracking-tight">Vibeboard</span>
          <span className="text-[10px] text-neutral-400 mt-1 tracking-widest">TM</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            How it works
          </a>
          <a href="#developers" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Developers
          </a>
          <a href="#pricing" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Pricing
          </a>
        </div>

        <div className="flex items-center gap-4">
          <a href="/signin" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Sign in
          </a>
          <a
            href="/signin"
            className="bg-neutral-900 text-white text-sm px-5 py-2 rounded-full hover:bg-neutral-800 transition-colors"
          >
            Start creating
          </a>
        </div>
      </div>
    </nav>
  )
}

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] opacity-[0.07]">
        {Array.from({ length: 20 }).map((_, row) => (
          <div key={row} className="flex">
            {Array.from({ length: 20 }).map((_, col) => {
              const distance = Math.sqrt(
                Math.pow(col - 10, 2) + Math.pow(row - 10, 2)
              )
              const size = Math.max(2, 8 - distance * 0.5)
              const opacity = Math.max(0.1, 1 - distance * 0.08)
              return (
                <div
                  key={col}
                  className="flex items-center justify-center"
                  style={{ width: 40, height: 40 }}
                >
                  <div
                    className="bg-neutral-900 rounded-[1px]"
                    style={{
                      width: size,
                      height: size,
                      opacity,
                    }}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {/* Concentric arcs */}
      <div className="absolute top-32 right-48">
        <svg width="300" height="300" viewBox="0 0 300 300" className="opacity-[0.06]">
          {[60, 90, 120, 150].map((r) => (
            <circle
              key={r}
              cx="150"
              cy="150"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      <GridBackground />
      <div className="max-w-7xl mx-auto relative">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-[2px] bg-neutral-300" />
          <span className="text-sm text-neutral-500 tracking-wide">
            The platform for modern teams
          </span>
        </div>

        <h1 className="text-[clamp(3rem,8vw,7rem)] font-bold leading-[0.95] tracking-tight text-neutral-900 max-w-4xl">
          The platform
          <br />
          to scale
        </h1>

        <div className="w-[280px] h-[3px] bg-neutral-300 mt-4 mb-10" />

        <div className="flex flex-col md:flex-row md:items-end gap-8 md:gap-16">
          <p className="text-lg text-neutral-500 max-w-md leading-relaxed">
            Your toolkit to stop configuring and start innovating. Securely
            build, deploy, and scale the best experiences.
          </p>

          <div className="flex items-center gap-4">
            <a
              href="/signin"
              className="inline-flex items-center gap-2 bg-neutral-900 text-white px-7 py-3.5 rounded-full text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Start free trial
              <ArrowRight className="w-4 h-4" />
            </a>
            <button className="inline-flex items-center gap-2 border border-neutral-300 px-7 py-3.5 rounded-full text-sm font-medium hover:bg-neutral-50 transition-colors">
              Watch demo
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

const stats = [
  { value: "98%", label: "faster deployment", company: "STRIPE" },
  { value: "300%", label: "throughput increase", company: "LINEAR" },
  { value: "6x", label: "faster to ship", company: "NOTION" },
  { value: "20 days", label: "saved on builds", company: "NETFLIX" },
]

function StatsBar() {
  return (
    <section className="border-y border-neutral-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <div key={stat.company} className="flex items-baseline gap-3">
            <span className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900">
              {stat.value}
            </span>
            <div>
              <p className="text-sm text-neutral-500">{stat.label}</p>
              <p className="text-xs text-neutral-400 tracking-wider mt-0.5">
                {stat.company}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

const features = [
  {
    icon: Zap,
    title: "Lightning fast builds",
    description:
      "Deploy in seconds with incremental builds and smart caching across your entire pipeline.",
  },
  {
    icon: Shield,
    title: "Enterprise security",
    description:
      "SOC 2, ISO 27001, HIPAA, and GDPR compliant. Your data stays protected at every layer.",
  },
  {
    icon: Globe,
    title: "Global edge network",
    description:
      "17 data centers worldwide. Content delivered from the closest node for sub-50ms responses.",
  },
  {
    icon: Code2,
    title: "Developer SDK",
    description:
      "First-class SDKs for every major language. Build integrations in minutes, not weeks.",
  },
  {
    icon: BarChart3,
    title: "Real-time analytics",
    description:
      "Monitor performance, track errors, and optimize in real-time with built-in observability.",
  },
  {
    icon: Lock,
    title: "200+ integrations",
    description:
      "Connect with your existing tools. GitHub, Slack, Jira, and hundreds more out of the box.",
  },
]

function Features() {
  return (
    <section id="features" className="py-24 px-6 bg-neutral-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-[2px] bg-neutral-300" />
          <span className="text-sm text-neutral-500 tracking-wide">Features</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-4">
          Everything you need
        </h2>
        <p className="text-lg text-neutral-500 max-w-lg mb-16">
          A complete platform to build, deploy, and scale your applications
          without the complexity.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-8 border border-neutral-200 hover:border-neutral-300 transition-colors"
            >
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mb-5">
                <feature.icon className="w-5 h-5 text-neutral-700" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const steps = [
  {
    step: "01",
    title: "Connect your repo",
    description:
      "Link your GitHub, GitLab, or Bitbucket repository in one click. We auto-detect your framework.",
  },
  {
    step: "02",
    title: "Configure your pipeline",
    description:
      "Set up build, test, and deploy stages with our visual pipeline editor or YAML config.",
  },
  {
    step: "03",
    title: "Deploy globally",
    description:
      "Push to production with zero-downtime deployments across our global edge network.",
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-[2px] bg-neutral-300" />
          <span className="text-sm text-neutral-500 tracking-wide">How it works</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-16">
          Three steps to ship
        </h2>

        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((s) => (
            <div key={s.step}>
              <span className="text-6xl font-bold text-neutral-100">{s.step}</span>
              <h3 className="text-xl font-semibold text-neutral-900 mt-4 mb-3">
                {s.title}
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Developers() {
  return (
    <section id="developers" className="py-24 px-6 bg-neutral-900 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-[2px] bg-neutral-600" />
          <span className="text-sm text-neutral-400 tracking-wide">
            For developers
          </span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Built for developers,
          <br />
          by developers
        </h2>
        <p className="text-lg text-neutral-400 max-w-lg mb-12">
          First-class CLI, REST APIs, and SDKs in every major language. Ship
          faster with tools that feel native.
        </p>

        <div className="bg-neutral-800 rounded-2xl p-8 border border-neutral-700 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <pre className="text-sm text-neutral-300 font-mono leading-relaxed overflow-x-auto">
            <code>{`$ npm install @vibeboard/sdk

import { Vibeboard } from '@vibeboard/sdk'

const vb = new Vibeboard({
  apiKey: process.env.VIBEBOARD_API_KEY
})

const deployment = await vb.deploy({
  project: 'my-app',
  branch: 'main',
  environment: 'production'
})

console.log(\`Deployed to \${deployment.url}\`)`}</code>
          </pre>
        </div>
      </div>
    </section>
  )
}

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "For individuals and small projects",
    features: [
      "3 projects",
      "1 GB storage",
      "Community support",
      "Basic analytics",
    ],
    cta: "Get started",
    featured: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "For growing teams that need more",
    features: [
      "Unlimited projects",
      "100 GB storage",
      "Priority support",
      "Advanced analytics",
      "Custom domains",
      "Team collaboration",
    ],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For organizations at scale",
    features: [
      "Everything in Pro",
      "Unlimited storage",
      "24/7 dedicated support",
      "SLA guarantee",
      "SSO & SAML",
      "Audit logs",
    ],
    cta: "Contact sales",
    featured: false,
  },
]

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 bg-neutral-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-[2px] bg-neutral-300" />
            <span className="text-sm text-neutral-500 tracking-wide">Pricing</span>
            <div className="w-8 h-[2px] bg-neutral-300" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-neutral-500">
            No hidden fees. No surprises. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 border ${
                plan.featured
                  ? "bg-neutral-900 text-white border-neutral-800 scale-105"
                  : "bg-white border-neutral-200"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-1 ${
                  plan.featured ? "text-white" : "text-neutral-900"
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`text-sm mb-6 ${
                  plan.featured ? "text-neutral-400" : "text-neutral-500"
                }`}
              >
                {plan.description}
              </p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span
                    className={`text-sm ${
                      plan.featured ? "text-neutral-400" : "text-neutral-500"
                    }`}
                  >
                    {plan.period}
                  </span>
                )}
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex items-center gap-2 text-sm ${
                      plan.featured ? "text-neutral-300" : "text-neutral-600"
                    }`}
                  >
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href="/signin"
                className={`block text-center py-3 rounded-full text-sm font-medium transition-colors ${
                  plan.featured
                    ? "bg-white text-neutral-900 hover:bg-neutral-100"
                    : "bg-neutral-900 text-white hover:bg-neutral-800"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-1">
          <span className="text-lg font-semibold tracking-tight">Vibeboard</span>
          <span className="text-[9px] text-neutral-400 mt-0.5 tracking-widest">TM</span>
        </div>
        <p className="text-sm text-neutral-400">
          &copy; {new Date().getFullYear()} Vibeboard. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            Privacy
          </a>
          <a href="#" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            Terms
          </a>
          <a href="#" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <Developers />
      <Pricing />
      <Footer />
    </main>
  )
}
