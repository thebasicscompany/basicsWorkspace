/**
 * OAuth credential utilities — wired to gateway's /v1/connections.
 */

const GATEWAY_URL = () => process.env.GATEWAY_URL
const GATEWAY_KEY = () => process.env.GATEWAY_API_KEY

export interface OAuthCredential {
  id: string
  provider: string
  name: string
  isConnected: boolean
}

/** Returns credentials for a provider that a user has connected via the gateway. */
export async function getOAuthCredentials(
  provider: string,
  _orgId?: string,
  userId?: string
): Promise<OAuthCredential[]> {
  const url = GATEWAY_URL()
  const key = GATEWAY_KEY()
  if (!url || !key) return []

  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${key}` }
    if (userId) headers["X-User-Id"] = userId

    const res = await fetch(`${url}/v1/connections`, { headers })
    if (!res.ok) return []

    const connections = (await res.json()) as Array<{
      provider: string
      accountName?: string | null
      userId?: string
    }>

    return connections
      .filter((c) => c.provider === provider)
      .map((c) => ({
        id: c.provider,
        provider: c.provider,
        name: c.accountName || c.provider,
        isConnected: true,
      }))
  } catch {
    return []
  }
}

/** Checks if a given credential (provider name) is connected. */
export async function validateCredential(
  credentialId: string,
  _orgId?: string,
  userId?: string
): Promise<boolean> {
  const creds = await getOAuthCredentials(credentialId, _orgId, userId)
  return creds.length > 0
}

/** Returns required OAuth scopes for a given service. */
export function getScopesForService(service: string): string[] {
  // Scope definitions match the gateway's PROVIDERS config
  const SCOPES: Record<string, string[]> = {
    slack: ["chat:write", "channels:read"],
    google: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
    github: ["repo", "read:user"],
    notion: [],
    hubspot: [
      "crm.objects.contacts.read",
      "crm.objects.contacts.write",
      "crm.objects.deals.read",
      "crm.objects.deals.write",
    ],
    linear: ["read", "write"],
    jira: ["read:jira-work", "write:jira-work", "read:jira-user"],
    salesforce: ["api", "refresh_token"],
    airtable: ["data.records:read", "data.records:write", "schema.bases:read"],
    asana: ["default"],
    dropbox: ["files.content.read", "files.content.write"],
    microsoft: ["User.Read", "Mail.ReadWrite", "Mail.Send", "Calendars.ReadWrite"],
    trello: ["read", "write"],
    shopify: ["read_products", "write_products", "read_orders"],
    zoom: ["meeting:write", "meeting:read", "user:read"],
  }
  return SCOPES[service] || []
}
