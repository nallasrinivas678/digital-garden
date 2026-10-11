// Portfolio project list — Section 3, Option A of docs/portfolio-plan.md.
// Hardcoded on purpose: this changes rarely, so a redeploy-to-edit constant
// is less overhead than a Supabase table. Edit this file directly to add,
// reorder, or update projects (liveUrl/relatedPostSlug are optional).
export interface Project {
  id: string
  name: string
  description: string
  liveUrl?: string
  repoUrl: string
  stack: string[]
  highlights: string[]
  relatedPostSlug?: string
}

export const projects: Project[] = [
  {
    id: 'tasktide',
    name: 'TaskTide',
    description:
      'A personal task, career, and notes hub with a React + Supabase web app and an Expo/React Native mobile app sharing one backend.',
    repoUrl: 'https://github.com/nallasrinivas678/digital-garden',
    stack: ['React', 'TypeScript', 'React Native', 'Expo', 'Supabase', 'Vercel'],
    highlights: [
      'Shared hooks/types layer ported verbatim between the web and mobile clients, with only auth and the Supabase client swapped per platform',
      'Postgres row-level security as the single authorization boundary across both clients — no separate API layer',
      'Shipped end-to-end: custom domain + Vercel on web, EAS Build/Submit to TestFlight on iOS',
    ],
  },
  {
    id: 'llm-gateway',
    name: 'llm-gateway',
    description: 'A .NET backend for orchestrating LLM providers and tool-calling, built as the planned AI-assistant backend for TaskTide.',
    repoUrl: 'https://github.com/nallasrinivas678/llm-gateway',
    stack: ['.NET', 'C#', 'Azure'],
    highlights: [
      'Provider-agnostic gateway in front of multiple LLM providers',
      'Designed as the foundation for a tool-calling orchestrator (chat, web search, Google connectors) consumed by the TaskTide mobile app',
    ],
  },
]
