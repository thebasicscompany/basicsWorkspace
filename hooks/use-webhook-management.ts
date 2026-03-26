/**
 * Stub for useWebhookManagement.
 * Returns no-op webhook utilities. Wire when webhook infrastructure is built.
 */
export function useWebhookManagement(_opts?: any) {
  return {
    webhookUrl: '',
    isLoading: false,
    isRegistered: false,
    register: async () => {},
    unregister: async () => {},
    refresh: async () => {},
  }
}
