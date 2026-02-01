const deliverables = [
  {
    title: "Requirements mapped",
    description: "Your exact CPD/CE rules by credential and jurisdiction, in plain English.",
  },
  {
    title: "Personalised CPD plan",
    description: "A calendar of what to complete and when, matched to approved activities.",
  },
  {
    title: "Dashboard created",
    description: "Your tracking dashboard  - live progress, deadlines, next actions.",
  },
  {
    title: "Reminder system set",
    description: "Email and calendar reminders so nothing slips through the cracks.",
  },
  {
    title: "Audit binder ready",
    description: "Evidence vault with naming conventions, metadata, and export-ready reports.",
  },
  {
    title: "Compliance brief",
    description: "A 1-page PDF summary of your obligations  - share with your firm or keep on file.",
  },
];

export function WhatYouGet() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text md:text-4xl">
            What you get in 24 hours
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            Buy today, and by tomorrow you have a fully operational CPD compliance system.
          </p>
        </div>
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {deliverables.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border-light bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-text">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
