import type { ToolResponse } from '@/lib/sim/tools/types'

export interface ResponseBlockOutput extends ToolResponse {
  success: boolean
  output: {
    data: Record<string, any>
    status: number
    headers: Record<string, string>
  }
}
