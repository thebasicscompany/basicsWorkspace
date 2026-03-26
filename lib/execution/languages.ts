// Code execution language definitions (for function blocks)

/** CodeLanguage as a value-accessible const (used like CodeLanguage.JavaScript) */
export const CodeLanguage = {
  JavaScript: 'javascript' as const,
  TypeScript: 'typescript' as const,
  Python: 'python' as const,
}

export type CodeLanguage = (typeof CodeLanguage)[keyof typeof CodeLanguage]
export type ExecutionLanguage = CodeLanguage

export const SUPPORTED_LANGUAGES: CodeLanguage[] = ['javascript', 'typescript']
export const DEFAULT_CODE_LANGUAGE: CodeLanguage = 'javascript'

export function isSupported(lang: string): lang is CodeLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as CodeLanguage)
}

export function getLanguageDisplayName(lang: CodeLanguage): string {
  const names: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
  }
  return names[lang] ?? lang
}
