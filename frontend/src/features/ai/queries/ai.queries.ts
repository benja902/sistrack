import { useMutation } from '@tanstack/react-query'

import { analyzeDifferences, explainTraceability, queryAiContext } from '../api/ai.api'
import type { AiContext, AiResponse } from '../types/ai.types'

export type AiAction =
  | { operation: 'query'; question: string }
  | { operation: 'explain' }
  | { operation: 'difference'; dispatchId: string }

export function useAiAssistant(context: AiContext) {
  return useMutation({
    retry: false,
    mutationFn: ({ action, signal }: { action: AiAction; signal: AbortSignal }): Promise<AiResponse> => {
      if (action.operation === 'explain') return explainTraceability(context, signal)
      if (action.operation === 'difference') return analyzeDifferences(action.dispatchId, signal)
      return queryAiContext(context, action.question, signal)
    },
  })
}
