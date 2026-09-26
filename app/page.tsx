import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-purple-500">
            BizPilot AI
          </h1>

          <div className="flex gap-4">
            <Link
              href="/login"
              className="text-zinc-300 hover:text-white"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="bg-purple-600 hover:bg-purple-700 px-5 py-2 rounded-lg"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-28 text-center">
        <h2 className="text-6xl font-extrabold leading-tight">
          Build Your Business
          <br />
          with AI
        </h2>

        <p className="text-zinc-400 text-xl mt-8 max-w-2xl mx-auto">
          BizPilot AI helps entrepreneurs create business plans,
          marketing strategies, financial forecasts and launch
          startups faster using artificial intelligence.
        </p>

        <div className="mt-12 flex justify-center gap-5">
          <Link
            href="/register"
            className="bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-xl font-semibold"
          >
            Get Started
          </Link>

          <Link
            href="/login"
            className="border border-zinc-700 px-8 py-4 rounded-xl hover:border-purple-500"
          >
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}
