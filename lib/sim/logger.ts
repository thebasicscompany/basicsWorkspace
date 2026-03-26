export const createLogger = (name: string) => ({
  info: (...args: unknown[]) => console.log(`[${name}]`, ...args),
  warn: (...args: unknown[]) => console.warn(`[${name}]`, ...args),
  error: (...args: unknown[]) => console.error(`[${name}]`, ...args),
  debug: (...args: unknown[]) => console.debug(`[${name}]`, ...args),
})

export type Logger = ReturnType<typeof createLogger>
