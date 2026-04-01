// @vitest-environment node
/**
 * Tests for applyWorkflowStateToStores — the Sim-pattern utility
 * that applies workflow state to zustand stores for canvas refresh.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock stores
const mockReplaceWorkflowState = vi.fn()
const mockSetWorkflowValues = vi.fn()
let mockWorkflowStoreState: any = {}

vi.mock('@/apps/automations/stores/workflow', () => ({
  useWorkflowStore: {
    getState: () => ({
      replaceWorkflowState: mockReplaceWorkflowState,
      ...mockWorkflowStoreState,
    }),
  },
}))

vi.mock('@/apps/automations/stores/subblock', () => ({
  useSubBlockStore: {
    getState: () => ({
      setWorkflowValues: mockSetWorkflowValues,
    }),
  },
}))

import { applyWorkflowStateToStores } from '../apply-workflow-state'

describe('applyWorkflowStateToStores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkflowStoreState = {}
  })

  it('calls replaceWorkflowState with a cloned state', () => {
    const workflowState = {
      blocks: {
        'b1': {
          id: 'b1',
          type: 'agent',
          name: 'Agent',
          subBlocks: { model: { value: 'gpt-4' } },
        },
      },
      edges: [{ id: 'e1', source: 'b1', target: 'b2' }],
      loops: {},
      parallels: {},
    } as any

    applyWorkflowStateToStores('wf-1', workflowState)

    expect(mockReplaceWorkflowState).toHaveBeenCalledOnce()
    const calledWith = mockReplaceWorkflowState.mock.calls[0][0]

    // Should be a deep clone — not the same reference
    expect(calledWith).not.toBe(workflowState)
    expect(calledWith.blocks).not.toBe(workflowState.blocks)
    expect(calledWith.edges).not.toBe(workflowState.edges)

    // But should have the same values
    expect(calledWith.blocks.b1.type).toBe('agent')
    expect(calledWith.edges).toHaveLength(1)
  })

  it('extracts subblock values and sets them in the subblock store', () => {
    const workflowState = {
      blocks: {
        'b1': {
          id: 'b1',
          type: 'agent',
          name: 'Agent',
          subBlocks: {
            model: { value: 'basics-chat-smart-openai' },
            temperature: { value: 0.7 },
          },
        },
        'b2': {
          id: 'b2',
          type: 'function',
          name: 'Fn',
          subBlocks: {
            code: { value: 'return 1;' },
          },
        },
      },
      edges: [],
      loops: {},
      parallels: {},
    } as any

    applyWorkflowStateToStores('wf-1', workflowState)

    expect(mockSetWorkflowValues).toHaveBeenCalledOnce()
    const [wfId, values] = mockSetWorkflowValues.mock.calls[0]
    expect(wfId).toBe('wf-1')
    expect(values.b1.model).toBe('basics-chat-smart-openai')
    expect(values.b1.temperature).toBe(0.7)
    expect(values.b2.code).toBe('return 1;')
  })

  it('handles blocks with no subblocks', () => {
    const workflowState = {
      blocks: {
        'b1': { id: 'b1', type: 'start_trigger', name: 'Start', subBlocks: {} },
      },
      edges: [],
      loops: {},
      parallels: {},
    } as any

    applyWorkflowStateToStores('wf-1', workflowState)

    expect(mockReplaceWorkflowState).toHaveBeenCalledOnce()
    expect(mockSetWorkflowValues).toHaveBeenCalledOnce()
    const [, values] = mockSetWorkflowValues.mock.calls[0]
    expect(values.b1).toEqual({})
  })

  it('handles empty workflow state', () => {
    const workflowState = {
      blocks: {},
      edges: [],
      loops: {},
      parallels: {},
    } as any

    applyWorkflowStateToStores('wf-1', workflowState)

    expect(mockReplaceWorkflowState).toHaveBeenCalledOnce()
    expect(mockSetWorkflowValues).toHaveBeenCalledWith('wf-1', {})
  })

  it('handles null subblock values gracefully', () => {
    const workflowState = {
      blocks: {
        'b1': {
          id: 'b1',
          type: 'agent',
          name: 'Agent',
          subBlocks: {
            model: { value: null },
            empty: {},
          },
        },
      },
      edges: [],
      loops: {},
      parallels: {},
    } as any

    applyWorkflowStateToStores('wf-1', workflowState)

    const [, values] = mockSetWorkflowValues.mock.calls[0]
    expect(values.b1.model).toBeNull()
    expect(values.b1.empty).toBeNull()
  })

  it('passes options through to replaceWorkflowState', () => {
    const workflowState = {
      blocks: {},
      edges: [],
      loops: {},
      parallels: {},
    } as any

    applyWorkflowStateToStores('wf-1', workflowState, { updateLastSaved: true })

    expect(mockReplaceWorkflowState).toHaveBeenCalledWith(
      expect.any(Object),
      { updateLastSaved: true }
    )
  })
})
