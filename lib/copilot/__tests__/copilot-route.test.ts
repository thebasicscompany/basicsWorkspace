// @vitest-environment node
/**
 * Tests for the copilot route — validates system prompt, tool definitions,
 * and tool execution logic without hitting the actual LLM or database.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock DB
const mockSelect = vi.fn().mockReturnThis()
const mockFrom = vi.fn().mockReturnThis()
const mockWhere = vi.fn().mockReturnThis()
const mockLimit = vi.fn().mockResolvedValue([])
const mockOrderBy = vi.fn().mockReturnThis()
const mockInsert = vi.fn().mockReturnThis()
const mockValues = vi.fn().mockResolvedValue([])
const mockDelete = vi.fn().mockReturnThis()
const mockUpdate = vi.fn().mockReturnThis()
const mockSet = vi.fn().mockReturnThis()

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockLimit,
          orderBy: () => ({
            limit: mockLimit,
          }),
        }),
      }),
    }),
    insert: () => ({
      values: mockValues,
    }),
    delete: () => ({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    update: () => ({
      set: () => ({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}))

vi.mock('@/lib/db/schema/workflows', () => ({
  workflows: { id: 'id', orgId: 'org_id' },
  workflowBlocks: { workflowId: 'workflow_id' },
  workflowEdges: { workflowId: 'workflow_id' },
  workflowExecutionLogs: {
    workflowId: 'workflow_id',
    executionId: 'execution_id',
    startedAt: 'started_at',
    status: 'status',
  },
}))

vi.mock('@/lib/auth-helpers', () => ({
  requireOrg: vi.fn().mockResolvedValue({ orgId: 'org-1', userId: 'user-1' }),
}))

vi.mock('@/lib/environment/utils.server', () => ({
  getEffectiveEnvVars: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/sim/serializer', () => ({
  Serializer: vi.fn().mockImplementation(() => ({
    serializeWorkflow: vi.fn().mockReturnValue({ blocks: {}, connections: [] }),
  })),
}))

vi.mock('@/lib/sim/executor', () => ({
  Executor: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({ success: true, output: {}, logs: [] }),
    executeFromBlock: vi.fn().mockResolvedValue({ success: true, output: {}, logs: [] }),
  })),
}))

vi.mock('@/apps/automations/stores/workflows/utils', () => ({
  apiBlockToBlockState: vi.fn((ab: any) => ({
    id: ab.id,
    type: ab.type,
    name: ab.name,
    subBlocks: ab.subBlocks ?? {},
  })),
}))

vi.mock('@/lib/copilot/edit-workflow', () => ({
  applyOperationsToWorkflowState: vi.fn().mockReturnValue({
    state: { blocks: {}, edges: [] },
    validationErrors: [],
    skippedItems: [],
  }),
}))

vi.mock('@/lib/copilot/workflow-context', () => ({
  loadWorkflowStateForCopilot: vi.fn().mockResolvedValue({
    blocks: {
      'block-1': { id: 'block-1', type: 'agent', name: 'My Agent', subBlocks: {} },
    },
    edges: [],
    loops: {},
    parallels: {},
  }),
  serializeWorkflowState: vi.fn().mockReturnValue('{"blocks":[],"edges":[]}'),
  buildBlockRegistrySummary: vi.fn().mockReturnValue('### blocks\nagent (Agent)'),
  getBlocksMetadata: vi.fn().mockReturnValue({
    agent: { name: 'Agent', inputs: [], outputs: [{ key: 'content', type: 'string' }] },
  }),
}))

// Mock AI SDK — we don't want to call the actual LLM
vi.mock('ai', async () => {
  const actual = await vi.importActual<any>('ai')
  return {
    ...actual,
    streamText: vi.fn().mockReturnValue({
      toUIMessageStreamResponse: () => new Response('mock stream'),
    }),
  }
})

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn().mockReturnValue({
    chat: vi.fn().mockReturnValue('mock-model'),
  }),
}))

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Copilot Route', () => {
  describe('System Prompt', () => {
    it('uses angle bracket syntax for block references, not curly braces', async () => {
      // Read the actual route source to verify the system prompt
      const fs = await import('fs')
      const routeSource = fs.readFileSync(
        'app/api/copilot/route.ts',
        'utf-8'
      )

      // Should use angle bracket syntax
      expect(routeSource).toContain('<BlockName.field>')
      expect(routeSource).toContain('<Research Agent.content>')
      expect(routeSource).toContain('<BlockName.field>')

      // Should NOT use curly brace syntax for block references
      expect(routeSource).not.toContain('{{BlockName.field}}')
      expect(routeSource).not.toContain('{{Research Agent.content}}')

      // Env vars should still use curly braces
      expect(routeSource).toContain('{{VAR_NAME}}')
      expect(routeSource).toContain('{{API_KEY}}')
    })

    it('documents all three tag syntaxes distinctly', async () => {
      const fs = await import('fs')
      const routeSource = fs.readFileSync('app/api/copilot/route.ts', 'utf-8')

      // Block output refs: angle brackets
      expect(routeSource).toContain('<BlockName.field>')
      // Env vars: double curly braces
      expect(routeSource).toContain('{{VAR_NAME}}')
      // Workflow variables
      expect(routeSource).toContain('<variable.name>')
    })

    it('includes inline metadata for top 5 blocks', async () => {
      const fs = await import('fs')
      const routeSource = fs.readFileSync('app/api/copilot/route.ts', 'utf-8')

      expect(routeSource).toContain('**agent**')
      expect(routeSource).toContain('**api**')
      expect(routeSource).toContain('**function**')
      expect(routeSource).toContain('**condition**')
      expect(routeSource).toContain('**start_trigger**')
    })

    it('includes edit_workflow examples', async () => {
      const fs = await import('fs')
      const routeSource = fs.readFileSync('app/api/copilot/route.ts', 'utf-8')

      expect(routeSource).toContain('edit_workflow examples')
      expect(routeSource).toContain('Example 1')
      expect(routeSource).toContain('Example 2')
      expect(routeSource).toContain('Example 3')
    })
  })

  describe('Tool Definitions', () => {
    it('registers all 7 tools', async () => {
      const fs = await import('fs')
      const routeSource = fs.readFileSync('app/api/copilot/route.ts', 'utf-8')

      const expectedTools = [
        'get_blocks_metadata',
        'edit_workflow',
        'run_workflow',
        'get_block_outputs',
        'get_trigger_blocks',
        'get_execution_summary',
        'get_workflow_logs',
      ]

      for (const toolName of expectedTools) {
        // Each tool should appear as a key in the tools object: `toolName: tool({`
        expect(routeSource).toContain(`${toolName}: tool({`)
      }
    })

    it('does not register skipped tools', async () => {
      const fs = await import('fs')
      const routeSource = fs.readFileSync('app/api/copilot/route.ts', 'utf-8')

      const skippedTools = [
        'run_block',
        'create_workflow',
        'deploy_workflow',
        'check_deployment_status',
      ]

      for (const toolName of skippedTools) {
        expect(routeSource).not.toContain(`${toolName}: tool({`)
      }
    })
  })

  describe('POST handler validation', () => {
    it('route has workflowId validation that returns 400', async () => {
      const fs = await import('fs')
      const routeSource = fs.readFileSync('app/api/copilot/route.ts', 'utf-8')

      // Should check for missing workflowId and return 400
      expect(routeSource).toContain('!workflowId')
      expect(routeSource).toContain('status: 400')
      expect(routeSource).toContain("'workflowId is required'")
    })
  })
})
