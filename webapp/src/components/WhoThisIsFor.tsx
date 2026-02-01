const credentials = [
  { name: "CFP", label: "Certified Financial Planner", region: "US / CA" },
  { name: "IAR", label: "Investment Adviser Rep", region: "US (state)" },
  { name: "RIA", label: "Registered Investment Adviser", region: "US" },
  { name: "Series 6/7/63/65/66", label: "FINRA registered", region: "US" },
  { name: "FCA Adviser", label: "Retail investment adviser", region: "UK" },
  { name: "CII / PFS", label: "Chartered Insurance Institute", region: "UK" },
  { name: "CISI", label: "Chartered Institute for Securities", region: "UK" },
  { name: "FASEA", label: "Financial adviser", region: "Australia" },
  { name: "QAFP / CFP", label: "FP Canada certified", region: "Canada" },
  { name: "MAS Licensed", label: "Financial adviser rep", region: "Singapore" },
  { name: "SFC Licensed", label: "Licensed representative", region: "Hong Kong" },
  { name: "Insurance", label: "Life / P&C licensed", region: "Multi" },
];

export function WhoThisIsFor() {
  return (
    <section className="bg-surface-alt px-6 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text md:text-4xl">
            Who this is for
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            If you hold any of these credentials, we map your exact requirements and build your plan.
          </p>
        </div>
        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {credentials.map((cred) => (
            <div
              key={cred.name}
              className="flex items-center gap-4 rounded-lg border border-border-light bg-white px-5 py-4"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent-50 text-sm font-bold text-accent">
                {cred.name.slice(0, 2)}
              </div>
              <div>
                <div className="text-sm font-semibold text-text">{cred.name}</div>
                <div className="text-xs text-text-light">
                  {cred.label} &middot; {cred.region}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-text-light">
          Don&apos;t see your credential? We cover 50+ credential and jurisdiction combinations.{" "}
          <a href="#faq" className="text-accent underline">
            Ask us
          </a>
          .
        </p>
      </div>
    </section>
  );
}
