/**
 * Variables store — workflow-scoped variables.
 * Simplified from Sim (no socket ops, no JSON5 validation yet).
 * Interface matches Sim's VariablesStore for compatibility.
 */
import { createLogger } from '@/lib/sim/logger'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { normalizeName } from '@/lib/sim/executor/constants'
import { useWorkflowRegistry } from '@/apps/automations/stores/registry'
import { useSubBlockStore } from '@/apps/automations/stores/subblock'

const logger = createLogger('VariablesStore')

export type VariableType = 'plain' | 'number' | 'boolean' | 'object' | 'array' | 'string'

export interface Variable {
  id: string
  workflowId: string
  name: string
  type: VariableType
  value: unknown
  validationError?: string
}

export interface VariablesStore {
  variables: Record<string, Variable>
  isLoading: boolean
  error: string | null
  isEditing: string | null
  loadForWorkflow: (workflowId: string) => Promise<void>
  addVariable: (variable: Omit<Variable, 'id'>, providedId?: string) => string
  updateVariable: (id: string, update: Partial<Omit<Variable, 'id' | 'workflowId'>>) => void
  deleteVariable: (id: string) => void
  getVariablesByWorkflowId: (workflowId: string) => Variable[]
}

export const useVariablesStore = create<VariablesStore>()(
  devtools((set, get) => ({
    variables: {},
    isLoading: false,
    error: null,
    isEditing: null,

    async loadForWorkflow(workflowId) {
      try {
        set({ isLoading: true, error: null })
        const res = await fetch(`/api/workflows/${workflowId}/variables`, { method: 'GET' })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `Failed to load variables: ${res.statusText}`)
        }
        const data = await res.json()
        const variables = (data?.data as Record<string, Variable>) || {}
        set((state) => {
          const withoutWorkflow = Object.fromEntries(
            Object.entries(state.variables).filter(
              (entry): entry is [string, Variable] => entry[1].workflowId !== workflowId
            )
          )
          return {
            variables: { ...withoutWorkflow, ...variables },
            isLoading: false,
            error: null,
          }
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        logger.warn('Failed to load variables', message)
        set({ isLoading: false, error: message })
      }
    },

    addVariable: (variable, providedId?: string) => {
      const id = providedId || crypto.randomUUID()
      const workflowVariables = get().getVariablesByWorkflowId(variable.workflowId)

      let name = variable.name
      if (!name || /^variable\d+$/.test(name)) {
        const existingNumbers = workflowVariables
          .map((v) => {
            const match = v.name.match(/^variable(\d+)$/)
            return match ? Number.parseInt(match[1]) : 0
          })
          .filter((n) => !Number.isNaN(n))
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
        name = `variable${nextNumber}`
      }

      let uniqueName = name
      let nameIndex = 1
      while (workflowVariables.some((v) => v.name === uniqueName)) {
        uniqueName = `${name} (${nameIndex})`
        nameIndex++
      }

      const type = variable.type === 'string' ? 'plain' : variable.type

      const newVariable: Variable = {
        id,
        workflowId: variable.workflowId,
        name: uniqueName,
        type,
        value: variable.value || '',
        validationError: undefined,
      }

      set((state) => ({
        variables: { ...state.variables, [id]: newVariable },
      }))

      return id
    },

    updateVariable: (id, update) => {
      set((state) => {
        if (!state.variables[id]) return state

        if (update.name !== undefined) {
          const oldVariable = state.variables[id]
          const oldVariableName = oldVariable.name
          const newName = update.name.trim()

          if (!newName) {
            update = { ...update }
            update.name = undefined
          } else if (newName !== oldVariableName) {
            // Update references in subblock values
            const subBlockStore = useSubBlockStore.getState()
            const activeWorkflowId = useWorkflowRegistry.getState().activeWorkflowId

            if (activeWorkflowId) {
              const workflowValues = subBlockStore.workflowValues[activeWorkflowId] || {}
              const updatedWorkflowValues = { ...workflowValues }

              const oldVarName = normalizeName(oldVariableName)
              const newVarName = normalizeName(newName)
              const regex = new RegExp(`<variable\\.${oldVarName}>`, 'gi')

              const updateReferences = (value: any, pattern: RegExp, replacement: string): any => {
                if (typeof value === 'string') {
                  return pattern.test(value) ? value.replace(pattern, replacement) : value
                }
                if (Array.isArray(value)) {
                  return value.map((item) => updateReferences(item, pattern, replacement))
                }
                if (value !== null && typeof value === 'object') {
                  const result = { ...value }
                  for (const key in result) {
                    result[key] = updateReferences(result[key], pattern, replacement)
                  }
                  return result
                }
                return value
              }

              Object.entries(workflowValues).forEach(([blockId, blockValues]) => {
                Object.entries(blockValues as Record<string, any>).forEach(
                  ([subBlockId, value]) => {
                    const updatedValue = updateReferences(value, regex, `<variable.${newVarName}>`)
                    if (JSON.stringify(updatedValue) !== JSON.stringify(value)) {
                      if (!updatedWorkflowValues[blockId]) {
                        updatedWorkflowValues[blockId] = { ...workflowValues[blockId] }
                      }
                      updatedWorkflowValues[blockId][subBlockId] = updatedValue
                    }
                  }
                )
              })

              useSubBlockStore.setState({
                workflowValues: {
                  ...subBlockStore.workflowValues,
                  [activeWorkflowId]: updatedWorkflowValues,
                },
              })
            }
          }
        }

        const type = update.type === 'string' ? 'plain' : update.type

        const updatedVariable: Variable = {
          ...state.variables[id],
          ...update,
          ...(type ? { type } : {}),
          validationError: undefined,
        }

        return { variables: { ...state.variables, [id]: updatedVariable } }
      })
    },

    deleteVariable: (id) => {
      set((state) => {
        if (!state.variables[id]) return state
        const { [id]: _, ...rest } = state.variables
        return { variables: rest }
      })
    },

    getVariablesByWorkflowId: (workflowId) => {
      return Object.values(get().variables).filter((variable) => variable.workflowId === workflowId)
    },
  }))
)
