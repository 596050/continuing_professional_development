export default function CheckoutCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg
            className="h-8 w-8 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Payment cancelled</h1>
        <p className="mt-3 text-gray-600">
          No worries - you haven&apos;t been charged. You can return to pricing and choose a plan
          whenever you&apos;re ready.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <a
            href="/#pricing"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Back to pricing
          </a>
          <a
            href="/"
            className="rounded-lg border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
