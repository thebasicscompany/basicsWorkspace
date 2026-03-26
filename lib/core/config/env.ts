// Phase 4 stub — environment config object
export const env = {
  GATEWAY_URL: process.env.GATEWAY_URL ?? '',
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  NODE_ENV: (process.env.NODE_ENV ?? 'development') as 'production' | 'test' | 'development',
  // Third-party service API keys (Phase 4 — injected from org BYOK or env)
  TRELLO_API_KEY: process.env.TRELLO_API_KEY ?? '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ?? '',
  SERPER_API_KEY: process.env.SERPER_API_KEY ?? '',
  EXA_API_KEY: process.env.EXA_API_KEY ?? '',
  FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY ?? '',
  JINA_API_KEY: process.env.JINA_API_KEY ?? '',
} as const
