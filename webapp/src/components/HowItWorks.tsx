const steps = [
  {
    number: "1",
    title: "Buy",
    description: "Choose your tier. Setup starts from $119. Takes 30 seconds.",
  },
  {
    number: "2",
    title: "Answer 10 questions",
    description:
      "Credential, jurisdiction, role, deadlines. We use this to map your exact requirements.",
  },
  {
    number: "3",
    title: "We set up everything",
    description:
      "Dashboard, CPD plan, reminders, audit binder  - delivered to your inbox within 24 hours.",
  },
  {
    number: "4",
    title: "You complete learning, we keep it audit-ready",
    description:
      "Focus on the content. We track evidence, send reminders, and keep your records export-ready.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text md:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-text-muted">Four steps. No tech skills required.</p>
        </div>
        <div className="mt-14 space-y-8">
          {steps.map((step, i) => (
            <div key={step.number} className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                  {step.number}
                </div>
                {i < steps.length - 1 && <div className="mt-2 h-full w-px bg-primary-200" />}
              </div>
              <div className="pb-8">
                <h3 className="text-xl font-semibold text-text">{step.title}</h3>
                <p className="mt-2 text-text-muted">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
