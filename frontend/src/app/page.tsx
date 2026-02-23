import {
  Play,
  Users,
  Globe,
  Sparkles,
  Github,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <header className="px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            <Sparkles className="h-4 w-4" />
            powered by Comet Opik
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            OpenBrowserAI
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-xl text-slate-600">
            An AI agent that uses real browser automation to help people
            discover, connect with, and take action on causes that matter to them.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#try-it"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              <ArrowRight className="h-5 w-5" />
              Try it out
            </a>

            <a
              href="https://github.com/anirudhat101/OpenBrowserAI"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Github className="h-5 w-5" />
              View on GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Problem */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-900">
            The Problem
          </h2>
          <p className="text-lg text-slate-600">
            Millions of people want to volunteer or support social and environmental
            causes — but opportunities are fragmented across websites, forms,
            and platforms. Finding the right initiative takes time, effort,
            and repeated manual work.
          </p>
        </div>
      </section>

      {/* Solution / Features */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
            How OpenBrowser AI Helps
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 inline-flex rounded-lg bg-blue-100 p-3">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Real Browser Automation
              </h3>
              <p className="text-slate-600">
                The AI agent browses real websites to find local and global
                community initiatives, volunteer programs, and social causes.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 inline-flex rounded-lg bg-green-100 p-3">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Smart Cause Matching
              </h3>
              <p className="text-slate-600">
                Matches users with causes based on interests, skills,
                location, and availability — fostering meaningful connections.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 inline-flex rounded-lg bg-purple-100 p-3">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Automated Action
              </h3>
              <p className="text-slate-600">
                Automatically fills applications, submits forms,
                and initiates connections — turning intent into action.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="bg-slate-900 px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-white">
            Demo: From Intent to Impact
          </h2>
          <p className="mb-8 text-slate-400">
            See how OpenBrowser AI finds and applies to real volunteer opportunities.
          </p>

          <div className="aspect-video overflow-hidden rounded-xl bg-slate-800">
            <iframe
              src="https://drive.google.com/file/d/1H8ocpMhVtr5twvEHcH1OkLC8-s3eQDKa/preview"
              width="100%"
              height="100%"
              allow="autoplay"
              className="border-0"
            />
          </div>


        </div>
      </section>

      {/* How it Works */}
      <section id="try-it" className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
            How to Try It
          </h2>

          <div className="space-y-6">
            {[
              {
                step: 1,
                title: "Install the CLI",
                desc: "npm install -g openbrowseraicli@latest",
              },
              {
                step: 2,
                title: "Install Playwright",
                desc: "npx playwright install",
              },
              {
                step: 3,
                title: "Run Your First Command",
                desc: 'openbrowserai "find education wellness volunteer program in US"',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <code className="mt-2 block rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    {item.desc}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Building Tools for Real-World Change
          </h2>
          <p className="mb-8 text-blue-100">
            OpenBrowserAI helps people move from intention to action
            by removing friction from community participation.
          </p>

          <a
            href="https://github.com/anirudhat101/OpenBrowserAI"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 font-bold text-blue-600 transition hover:bg-blue-50"
          >
            <Github className="h-5 w-5" />
            Explore the Project
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 px-4 py-8 text-center text-slate-400">
        <p>
          Built for the Social & Community Impact Track · Supported by Comet
        </p>
      </footer>
    </div>
  );
}
