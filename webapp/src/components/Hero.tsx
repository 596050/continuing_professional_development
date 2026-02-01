export function Hero() {
  return (
    <section className="bg-primary-dark px-6 pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-block rounded-full border border-warning/30 bg-warning-light px-4 py-1.5 text-sm font-medium text-warning">
          CFP CE increasing to 40 hours in 2027 - are you ready?
        </div>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl">
          CPD/CE compliance,
          <br />
          <span className="text-accent-light">done-for-you.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary-200 md:text-xl">
          Plan + tracking + audit pack set up in 24 hours.
          <br className="hidden md:block" />
          No spreadsheets. No portals. No guesswork.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="#pricing"
            className="rounded-lg bg-accent px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-accent-dark"
          >
            Get set up - from $119
          </a>
          <a
            href="/dashboard"
            className="rounded-lg border border-primary-400 bg-primary-500/30 px-8 py-4 text-lg font-semibold text-white transition hover:bg-primary-500/50"
          >
            Try now - free demo
          </a>
          <a
            href="#how-it-works"
            className="text-lg font-semibold text-primary-300 underline underline-offset-4 transition hover:text-white"
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}
