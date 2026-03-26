/**
 * Stub for useWand — AI generation hook.
 * The real implementation calls an AI API for content generation.
 * Stub returns no-ops; wire when AI generation is built.
 */
import { useCallback, useState } from 'react'

export function useWand(_opts?: any) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generate = useCallback(async (_promptOrOpts: any) => {}, [])
  const generateStream = useCallback(async (_promptOrOpts: any, _onChunk?: (chunk: any) => void, _onDone?: (content: any) => void) => {}, [])
  const cancel = useCallback(() => { setIsGenerating(false) }, [])
  const cancelGeneration = cancel

  return {
    generate,
    generateStream,
    cancel,
    cancelGeneration,
    isGenerating,
    isStreaming: false,
    isLoading: false,
    streamedContent: '',
    isPromptVisible: false,
    promptInputValue: '',
    showPromptInline: () => {},
    hidePromptInline: () => {},
    updatePromptValue: (_val: string) => {},
  }
}

export function useWandState() {
  return {
    isWandActive: false,
    isWandStreaming: false,
  }
}
