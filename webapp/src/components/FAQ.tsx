"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Does this count towards my credential requirements?",
    answer:
      "We map your exact requirements based on your credential and jurisdiction, then help you choose approved activities from accredited providers. We track evidence and keep your records audit-ready. You choose what to study  - we handle the admin.",
  },
  {
    question: "Do you complete the learning for me?",
    answer:
      "No. We provide planning, tracking, evidence management, reminders, and audit packaging. You complete the learning yourself through approved providers. We never complete coursework, assessments, or falsify any records.",
  },
  {
    question: "How do you handle audits?",
    answer:
      "Your audit binder is always up to date. Every completed activity is logged with metadata (date, duration, learning outcome, provider), certificates are stored in your vault, and you can export a full audit report as PDF or CSV at any time.",
  },
  {
    question: "What credentials do you support?",
    answer:
      "We cover CFP, QAFP, IAR, RIA, FINRA-registered reps (Series 6/7/63/65/66), UK FCA advisers, CII/PFS, CISI, Australian FASEA, FP Canada, MAS-licensed reps (Singapore), SFC-licensed reps (Hong Kong), and insurance licensees across multiple jurisdictions.",
  },
  {
    question: "What if my CE requirements change?",
    answer:
      "We monitor regulatory changes (like the CFP Board's increase to 40 hours effective 2027) and update your plan automatically. Managed tier subscribers get proactive notifications when rules change.",
  },
  {
    question: "Can my firm use this for multiple advisers?",
    answer:
      "Yes. Our Firm tier includes a compliance admin dashboard, per-adviser tracking, consolidated audit reports, policy templates, and bulk onboarding. Contact us for pricing based on your team size.",
  },
  {
    question: "How quickly do I get set up?",
    answer:
      "Within 24 hours of purchase and completing the onboarding questionnaire, your dashboard, plan, reminders, and audit binder are live. You'll receive an email with everything you need to get started.",
  },
  {
    question: "Can I cancel the Managed plan?",
    answer:
      "Yes, cancel anytime. Your dashboard and records remain accessible. You just won't receive ongoing check-ins, evidence reviews, or priority support after cancellation.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text md:text-4xl">
            Frequently asked questions
          </h2>
        </div>
        <dl className="mt-14 space-y-0 divide-y divide-border">
          {faqs.map((faq, i) => (
            <div key={faq.question} className="py-6">
              <dt>
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="flex w-full cursor-pointer items-start justify-between text-left hover:text-accent transition-colors"
                >
                  <span className="text-base font-semibold text-text">{faq.question}</span>
                  <span className="ml-6 flex-shrink-0">
                    <svg
                      className={`h-5 w-5 text-text-light transition-transform ${
                        openIndex === i ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </span>
                </button>
              </dt>
              {openIndex === i && (
                <dd className="mt-3 text-sm leading-relaxed text-text-muted">{faq.answer}</dd>
              )}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
