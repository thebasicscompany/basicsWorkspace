// Variable manager — resolves {{variable}} references in block inputs

/** VariableManager class for workflow variable storage and resolution (Phase 4 stub) */
export class VariableManager {
  private variables: Record<string, unknown> = {}

  /** Resolve a variable value for execution (Phase 4 stub) */
  static resolveForExecution(_value: unknown, _type?: string): unknown {
    return _value
  }

  set(key: string, value: unknown): void {
    this.variables[key] = value
  }

  get(key: string): unknown {
    return this.variables[key]
  }

  getAll(): Record<string, unknown> {
    return { ...this.variables }
  }

  resolve(template: string): string {
    return resolveVariables(template, this.variables)
  }
}

export function resolveVariables(
  template: string,
  variables: Record<string, unknown>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const value = variables[key.trim()]
    return value !== undefined ? String(value) : match
  })
}

export function extractVariableRefs(template: string): string[] {
  const matches = template.matchAll(/\{\{([^}]+)\}\}/g)
  return [...matches].map((m) => m[1].trim())
}
