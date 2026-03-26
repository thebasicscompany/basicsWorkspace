/** Returns the base URL for internal API calls (server-side). */
export function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

/** Returns the internal API base URL (same as getBaseUrl in our setup). */
export function getInternalApiBaseUrl(): string {
  return getBaseUrl()
}
