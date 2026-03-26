/** Converts a value to a JSON string safe for use in HTTP headers. */
export function httpHeaderSafeJson(value: unknown): string {
  return JSON.stringify(value).replace(/[\x00-\x1f\x7f-\x9f]/g, '')
}
