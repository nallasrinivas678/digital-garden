// Compile-time feature flags — flip a value here and rebuild/redeploy.
// A lightweight way to hide an in-progress or optional module without
// deleting its code, routes, or data. Not user-facing/remote-configurable;
// just a single source of truth read by whatever needs to gate on it.
export const featureFlags = {
  jobTracker: false, // the Career (job application tracker) module
  notes: false, // the Garden (notes) module
} as const
