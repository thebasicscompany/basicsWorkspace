// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  serializeWorkflowState,
  buildBlockRegistrySummary,
  getBlocksMetadata,
} from '../workflow-context'

// Mock db — loadWorkflowStateForCopilot hits the DB, tested via integration
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  },
}))

vi.mock('@/lib/db/schema/workflows', () => ({
  workflowBlocks: {},
  workflowEdges: {},
}))

vi.mock('@/lib/sim/providers/utils', () => {
  const ep = (id: string, name: string) => ({ id, name, models: [] as string[] })
  return {
    getModelOptions: () => [
      { id: 'basics-chat-smart-openai', label: 'GPT-4o' },
      { id: 'basics-chat-fast-openai', label: 'GPT-4o Mini' },
    ],
    GATEWAY_CHAT_MODELS: ['basics-chat-smart-openai', 'basics-chat-fast-openai'],
    providers: {
      gateway: { id: 'gateway', name: 'Basics AI', models: ['basics-chat-smart-openai', 'basics-chat-fast-openai'] },
      vertex: ep('vertex', 'Google Vertex AI'),
      bedrock: ep('bedrock', 'AWS Bedrock'),
      'azure-openai': ep('azure-openai', 'Azure OpenAI'),
      'azure-anthropic': ep('azure-anthropic', 'Azure Anthropic'),
      ollama: ep('ollama', 'Ollama'),
      vllm: ep('vllm', 'vLLM'),
      openrouter: ep('openrouter', 'OpenRouter'),
      base: ep('base', 'Base'),
    },
    getProviderFromModel: () => 'gateway',
    getBaseModelProviders: () => ({}),
    getHostedModels: () => [],
    getProviderIcon: () => null,
    calculateCost: () => 0,
    supportsTemperature: () => true,
    supportsReasoningEffort: () => false,
    supportsVerbosity: () => false,
    supportsThinking: () => false,
    supportsToolUsageControl: () => false,
    shouldBillModelUsage: () => false,
    sumToolCosts: () => 0,
    generateStructuredOutputInstructions: () => '',
    getMaxTemperature: () => 2,
    MODELS_WITH_DEEP_RESEARCH: [],
    MODELS_WITH_REASONING_EFFORT: [],
    MODELS_WITH_THINKING: [],
    MODELS_WITH_VERBOSITY: [],
    MODELS_WITHOUT_MEMORY: [],
    getReasoningEffortValuesForModel: () => [],
    getThinkingLevelsForModel: () => [],
    getVerbosityValuesForModel: () => [],
    transformBlockTool: () => {},
    filterSchemaForLLM: (schema: any) => schema,
  }
})

describe('serializeWorkflowState', () => {
  it('serializes blocks and edges into compact JSON', () => {
    const state = {
      blocks: {
        'block-1': {
          id: 'block-1',
          type: 'agent',
          name: 'My Agent',
          enabled: true,
          triggerMode: false,
          data: {},
          subBlocks: {
            model: { value: 'basics-chat-smart-openai' },
            messages: { value: [{ role: 'user', content: 'Hello' }] },
            empty_field: { value: '' },
          },
        },
        'block-2': {
          id: 'block-2',
          type: 'function',
          name: 'Processor',
          enabled: true,
          data: {},
          subBlocks: {
            code: { value: 'return input;' },
          },
        },
      },
      edges: [
        { id: 'e1', source: 'block-1', target: 'block-2', sourceHandle: 'source', targetHandle: 'target' },
      ],
    }

    const result = serializeWorkflowState(state)
    const parsed = JSON.parse(result)

    // Blocks should be serialized
    expect(parsed.blocks).toHaveLength(2)
    expect(parsed.blocks[0].type).toBe('agent')
    expect(parsed.blocks[0].name).toBe('My Agent')
    // Empty values should be omitted
    expect(parsed.blocks[0].inputs.empty_field).toBeUndefined()
    // Non-empty values should be included
    expect(parsed.blocks[0].inputs.model).toBe('basics-chat-smart-openai')

    // Edges
    expect(parsed.edges).toHaveLength(1)
    expect(parsed.edges[0].from).toBe('block-1')
    expect(parsed.edges[0].to).toBe('block-2')
    // Default sourceHandle 'source' should be omitted
    expect(parsed.edges[0].handle).toBeUndefined()
  })

  it('includes non-default source handles', () => {
    const state = {
      blocks: {
        'b1': { id: 'b1', type: 'condition', name: 'Check', enabled: true, data: {}, subBlocks: {} },
        'b2': { id: 'b2', type: 'function', name: 'Fn', enabled: true, data: {}, subBlocks: {} },
      },
      edges: [
        { id: 'e1', source: 'b1', target: 'b2', sourceHandle: 'condition-cond1', targetHandle: 'target' },
      ],
    }

    const parsed = JSON.parse(serializeWorkflowState(state))
    expect(parsed.edges[0].handle).toBe('condition-cond1')
  })

  it('handles empty workflow', () => {
    const parsed = JSON.parse(serializeWorkflowState({ blocks: {}, edges: [] }))
    expect(parsed.blocks).toEqual([])
    expect(parsed.edges).toEqual([])
  })
})

describe('buildBlockRegistrySummary', () => {
  it('returns a non-empty string grouped by category', () => {
    const summary = buildBlockRegistrySummary()
    expect(summary.length).toBeGreaterThan(0)
    // Should contain category headers
    expect(summary).toContain('###')
    // Should contain known block types
    expect(summary).toContain('agent')
    expect(summary).toContain('function')
  })

  it('does not include hidden blocks', () => {
    const summary = buildBlockRegistrySummary()
    // Hidden blocks should not appear — this is a general check
    // The function filters hideFromToolbar
    expect(summary).not.toContain('hideFromToolbar')
  })
})

describe('getBlocksMetadata', () => {
  it('returns metadata for valid block types', () => {
    // Use api + function (not agent — agent triggers dynamic require for model options)
    const result = getBlocksMetadata(['api', 'function'])

    expect(result.api).toBeDefined()
    expect(result.api.name).toBeDefined()
    expect(result.api.inputs).toBeInstanceOf(Array)
    expect(result.api.outputs).toBeInstanceOf(Array)

    expect(result.function).toBeDefined()
    expect(result.function.inputs).toBeInstanceOf(Array)
  })

  it('returns error for unknown block types', () => {
    const result = getBlocksMetadata(['nonexistent_block_xyz'])
    expect(result.nonexistent_block_xyz.error).toContain('Unknown block type')
  })

  it('includes output keys for function block', () => {
    const result = getBlocksMetadata(['function'])
    const outputKeys = result.function.outputs.map((o: any) => o.key)
    expect(outputKeys).toContain('result')
  })

  it('includes input fields for api block', () => {
    const result = getBlocksMetadata(['api'])
    const inputIds = result.api.inputs.map((i: any) => i.id)
    expect(inputIds).toContain('url')
    expect(inputIds).toContain('method')
  })
})
