// Compile-time feature flags — flip a value here and rebuild/redeploy.
// A lightweight way to hide an in-progress or optional module without
// deleting its code, routes, or data. Not user-facing/remote-configurable;
// just a single source of truth read by whatever needs to gate on it.
export const featureFlags = {
  jobTracker: false, // the Career (job application tracker) module
  notes: true, // the Garden (notes) module
  pdfQa: true, // PDF Q&A (upload a PDF, ask questions) via llm-gateway's /assistant/docs endpoints
  resumeMatch: true, // Resume match: score a resume against a job description via assistant-node's /resume endpoints
} as const
