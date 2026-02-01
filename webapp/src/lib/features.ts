/**
 * Feature flags for the application.
 * Set via environment variables or defaults for development.
 */
export const features = {
  /** Enable "Try Now" demo mode with mock auth credentials */
  DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV === "development",
};

/** Mock user for demo mode */
export const DEMO_USER = {
  id: "demo-user-001",
  fullName: "Jane Demo",
  email: "demo@auditreadycpd.com",
  role: "Independent financial adviser / planner",
  credential: "CFP (Certified Financial Planner)",
  jurisdiction: "United States",
  renewalDeadline: "2027-03-31",
  hoursRequired: 40,
  hoursCompleted: 14,
  plan: "Managed",
  tier: "managed" as const,
};
