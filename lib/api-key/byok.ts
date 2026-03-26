/**
 * BYOK (Bring Your Own Key) resolution.
 * In Phase 3, BYOK keys are stored on the org (organization.byokProvider / byokApiKey)
 * and passed as x-byok-provider / x-byok-api-key headers directly to the gateway.
 * Tools never need a key resolved here — the gateway handles it.
 */

export async function getBYOKKey(
  _provider: string,
  _orgId?: string
): Promise<{ apiKey: string } | null> {
  return null
}

export async function getApiKeyWithBYOK(
  _providerId: string,
  _model: string,
  _orgId?: string,
  passedKey?: string
): Promise<{ apiKey: string; isBYOK: boolean }> {
  return { apiKey: passedKey ?? '', isBYOK: false }
}
