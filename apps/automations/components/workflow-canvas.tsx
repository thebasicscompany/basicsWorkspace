'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Play, ArrowLeft, Plus, MagnifyingGlass, X } from '@phosphor-icons/react'
import { getBlock, getBlocksByCategory, type BlockConfig } from '@/lib/sim/blocks'
import {
  prepareBlockState,
  blockStateToApiBlock,
  apiBlockToBlockState,
  type BlockState,
} from '@/apps/automations/stores/workflows/utils'
import { useSubBlockStore } from '@/apps/automations/stores/subblock'
import { useWorkflowRegistry } from '@/apps/automations/stores/registry'
import { useWorkflowStore } from '@/apps/automations/stores/workflow'
import { WorkflowBlockNode, type BlockNodeData } from './workflow-block-node'
import { BlockEditorPanel } from './block-editor-panel'
import { ExecutionLogPanel, type ExecutionEvent } from './execution-log-panel'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiWorkflow {
  id: string
  name: string
  description: string | null
}

interface ApiEdge {
  id: string
  sourceBlockId: string
  targetBlockId: string
  sourceHandle: string | null
  targetHandle: string | null
}

const NODE_TYPES: NodeTypes = {
  workflowBlock: WorkflowBlockNode,
}

// ─── Convert between BlockState and ReactFlow Nodes ──────────────────────────

function blockStateToNode(block: BlockState): Node<BlockNodeData> {
  return {
    id: block.id,
    type: 'workflowBlock',
    position: block.position,
    data: {
      type: block.type,
      name: block.name,
      enabled: block.enabled,
    },
  }
}

function apiEdgeToReactFlowEdge(e: ApiEdge): Edge {
  return {
    id: e.id,
    source: e.sourceBlockId,
    target: e.targetBlockId,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
  }
}

function reactFlowEdgeToApi(e: Edge) {
  return {
    sourceBlockId: e.source,
    targetBlockId: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
  }
}

// ─── Canvas Inner ────────────────────────────────────────────────────────────

function CanvasInner({ workflowId }: { workflowId: string }) {
  const router = useRouter()
  const reactFlow = useReactFlow()
  const [workflow, setWorkflow] = useState<ApiWorkflow | null>(null)
  const [blockStates, setBlockStates] = useState<Record<string, BlockState>>({})
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [toolbarOpen, setToolbarOpen] = useState(false)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [executionEvents, setExecutionEvents] = useState<ExecutionEvent[]>([])
  const [logPanelOpen, setLogPanelOpen] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  // Set active workflow in registry so stores work correctly
  useEffect(() => {
    useWorkflowRegistry.setState({ activeWorkflowId: workflowId })
    return () => useWorkflowRegistry.setState({ activeWorkflowId: null })
  }, [workflowId])

  // Load workflow + blocks + edges from API
  useEffect(() => {
    fetch(`/api/workflows/${workflowId}`)
      .then((r) => r.json())
      .then(({ workflow: wf, blocks: apiBlocks, edges: apiEdges }) => {
        setWorkflow(wf)
        setDraftName(wf.name)

        const states: Record<string, BlockState> = {}
        const subBlockValues: Record<string, Record<string, any>> = {}

        for (const ab of apiBlocks) {
          const bs = apiBlockToBlockState(ab)
          states[bs.id] = bs

          if (bs.subBlocks && Object.keys(bs.subBlocks).length > 0) {
            subBlockValues[bs.id] = {}
            for (const [sbId, sb] of Object.entries(bs.subBlocks)) {
              subBlockValues[bs.id][sbId] = (sb as any).value
            }
          }
        }

        setBlockStates(states)
        setNodes(Object.values(states).map(blockStateToNode))

        // Load edges
        if (apiEdges && Array.isArray(apiEdges)) {
          setEdges(apiEdges.map(apiEdgeToReactFlowEdge))
        }

        // Hydrate the subblock store
        useSubBlockStore.getState().setWorkflowValues(workflowId, subBlockValues)

        // Hydrate the workflow store so useSubBlockValue, tag system, etc. can read blocks/edges
        useWorkflowStore.setState({
          blocks: states as any,
          edges: apiEdges ? apiEdges.map(apiEdgeToReactFlowEdge) : [],
        })
      })
  }, [workflowId, setNodes, setEdges])

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  )

  // Sync node position changes back to blockStates
  useEffect(() => {
    setBlockStates((prev) => {
      const next = { ...prev }
      let changed = false
      for (const node of nodes) {
        if (
          next[node.id] &&
          (next[node.id].position.x !== node.position.x ||
            next[node.id].position.y !== node.position.y)
        ) {
          next[node.id] = {
            ...next[node.id],
            position: { x: node.position.x, y: node.position.y },
          }
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [nodes])

  // Keep the workflow store in sync with local state so hooks (useSubBlockValue, tag system) work
  useEffect(() => {
    useWorkflowStore.setState({ blocks: blockStates as any, edges })
  }, [blockStates, edges])

  // Subscribe to subblock store changes so edits trigger auto-save
  const subBlockValues = useSubBlockStore((s) => s.workflowValues[workflowId])

  // Debounced auto-save (blocks + edges + subblock edits)
  useEffect(() => {
    if (!workflow || (Object.keys(blockStates).length === 0 && nodes.length === 0))
      return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const wfValues = subBlockValues ?? {}

      const blocksToSave = Object.values(blockStates).map((bs) => {
        const mergedSubBlocks = { ...bs.subBlocks }
        const blockValues = wfValues[bs.id]
        if (blockValues) {
          for (const [sbId, val] of Object.entries(blockValues)) {
            if (mergedSubBlocks[sbId]) {
              mergedSubBlocks[sbId] = { ...mergedSubBlocks[sbId], value: val }
            } else {
              // Include values not in block structure (orphaned/runtime values)
              mergedSubBlocks[sbId] = { id: sbId, type: 'short-input' as any, value: val }
            }
          }
        }
        return blockStateToApiBlock({ ...bs, subBlocks: mergedSubBlocks })
      })

      const edgesToSave = edges.map(reactFlowEdgeToApi)

      await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: blocksToSave, edges: edgesToSave }),
      })
    }, 1500)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [blockStates, edges, workflow, workflowId, subBlockValues])

  async function runWorkflow() {
    if (isRunning) return
    setIsRunning(true)
    setExecutionEvents([])
    setLogPanelOpen(true)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: 'POST',
      })
      if (!res.body) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6)) as ExecutionEvent
              setExecutionEvents((prev) => [...prev, event])
            } catch {
              // Ignore malformed events
            }
          }
        }
      }
    } catch (err) {
      console.error('Workflow execution failed:', err)
      setExecutionEvents((prev) => [
        ...prev,
        { type: 'error', error: err instanceof Error ? err.message : 'Execution failed' },
      ])
    } finally {
      setIsRunning(false)
    }
  }

  async function saveName() {
    if (!draftName.trim() || draftName === workflow?.name) {
      setEditingName(false)
      return
    }
    await fetch(`/api/workflows/${workflowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: draftName.trim() }),
    })
    setWorkflow((w) => (w ? { ...w, name: draftName.trim() } : w))
    setEditingName(false)
  }

  function addBlock(
    type: string,
    name: string,
    dropPosition?: { x: number; y: number }
  ) {
    const position = dropPosition ?? {
      x: 200 + Object.keys(blockStates).length * 250,
      y: 200,
    }
    const id = crypto.randomUUID()
    const bs = prepareBlockState({ id, type, name, position })

    setBlockStates((prev) => ({ ...prev, [id]: bs }))
    setNodes((ns) => [...ns, blockStateToNode(bs)])

    // Initialize subblock values in the store
    const initialValues: Record<string, any> = {}
    for (const [sbId, sb] of Object.entries(bs.subBlocks)) {
      initialValues[sbId] = sb.value
    }
    const subBlockStore = useSubBlockStore.getState()
    const existing = subBlockStore.workflowValues[workflowId] ?? {}
    subBlockStore.setWorkflowValues(workflowId, {
      ...existing,
      [id]: initialValues,
    })
  }

  // Handle drop from toolbar drag
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/block-type')
      const name = event.dataTransfer.getData('application/block-name')
      if (!type) return

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      addBlock(type, name, position)
    },
    [reactFlow, blockStates, workflowId]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Selected block config
  const selectedBlock = selectedBlockId ? blockStates[selectedBlockId] : null
  const selectedConfig = selectedBlock ? getBlock(selectedBlock.type) : null

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: 'var(--color-bg-base)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 h-12 flex-shrink-0 z-10"
        style={{
          background: 'var(--color-bg-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={() => router.push('/automations')}
          className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          <ArrowLeft
            size={16}
            style={{ color: 'var(--color-text-secondary)' }}
          />
        </button>

        {editingName ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName()
              if (e.key === 'Escape') {
                setDraftName(workflow?.name ?? '')
                setEditingName(false)
              }
            }}
            className="text-sm font-semibold bg-transparent border-0 outline-none border-b border-[var(--color-accent)]"
            style={{ color: 'var(--color-text-primary)', minWidth: 160 }}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-sm font-semibold hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {workflow?.name ?? '\u2026'}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setToolbarOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: toolbarOpen
                ? 'var(--color-accent-light)'
                : 'var(--color-bg-base)',
              border: `1px solid ${toolbarOpen ? 'var(--color-accent)' : 'var(--color-border)'}`,
              color: toolbarOpen
                ? 'var(--color-accent)'
                : 'var(--color-text-primary)',
            }}
          >
            <Plus size={12} weight="bold" />
            Add Block
          </button>
          <button
            onClick={runWorkflow}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}
          >
            <Play size={12} weight="fill" />
            {isRunning ? 'Running\u2026' : 'Run'}
          </button>
        </div>
      </div>

      {/* Main: toolbar + canvas + info panel */}
      <div className="flex flex-1 overflow-hidden">
        {toolbarOpen && (
          <BlockToolbar
            onAdd={(type, name) => addBlock(type, name)}
            onClose={() => setToolbarOpen(false)}
          />
        )}

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_e, node) => setSelectedBlockId(node.id)}
            onPaneClick={() => setSelectedBlockId(null)}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.3 }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#D4D2CE"
            />
            <Controls
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
              }}
            />
          </ReactFlow>

          <ExecutionLogPanel
            events={executionEvents}
            isRunning={isRunning}
            isOpen={logPanelOpen}
            onToggle={() => setLogPanelOpen((o) => !o)}
            onClose={() => { setLogPanelOpen(false); setExecutionEvents([]) }}
          />
        </div>

        {selectedConfig && selectedBlock && (
          <BlockEditorPanel
            workflowId={workflowId}
            block={selectedBlock}
            config={selectedConfig}
            onClose={() => setSelectedBlockId(null)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Block Toolbar (left panel — click to add OR drag to canvas) ─────────────

function BlockToolbar({
  onAdd,
  onClose,
}: {
  onAdd: (type: string, name: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')

  const triggers = useMemo(() => getBlocksByCategory('triggers'), [])
  const blocks = useMemo(() => getBlocksByCategory('blocks'), [])
  const tools = useMemo(() => getBlocksByCategory('tools'), [])

  const lc = search.toLowerCase()
  const filterBlock = (b: BlockConfig<any>) =>
    !search ||
    b.name.toLowerCase().includes(lc) ||
    b.type.toLowerCase().includes(lc)

  const filteredTriggers = triggers.filter(filterBlock)
  const filteredBlocks = blocks.filter(filterBlock)
  const filteredTools = tools.filter(filterBlock)

  return (
    <div
      className="w-64 flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        background: 'var(--color-bg-surface)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      <div
        className="p-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{
            background: 'var(--color-bg-base)',
            border: '1px solid var(--color-border)',
          }}
        >
          <MagnifyingGlass
            size={12}
            style={{ color: 'var(--color-text-tertiary)' }}
          />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks\u2026"
            className="text-xs bg-transparent border-0 outline-none flex-1"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X
                size={10}
                style={{ color: 'var(--color-text-tertiary)' }}
              />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredTriggers.length > 0 && (
          <BlockSection
            title="Triggers"
            items={filteredTriggers}
            onAdd={onAdd}
          />
        )}
        {filteredBlocks.length > 0 && (
          <BlockSection
            title="Blocks"
            items={filteredBlocks}
            onAdd={onAdd}
          />
        )}
        {filteredTools.length > 0 && (
          <BlockSection title="Tools" items={filteredTools} onAdd={onAdd} />
        )}
        {filteredTriggers.length +
          filteredBlocks.length +
          filteredTools.length ===
          0 && (
          <p
            className="text-xs text-center py-8"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            No blocks match &ldquo;{search}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}

function BlockSection({
  title,
  items,
  onAdd,
}: {
  title: string
  items: BlockConfig<any>[]
  onAdd: (type: string, name: string) => void
}) {
  return (
    <div className="mb-3">
      <p
        className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {title} ({items.length})
      </p>
      {items.map((block) => {
        const Icon = block.icon
        return (
          <button
            key={block.type}
            draggable
            onClick={() => onAdd(block.type, block.name)}
            onDragStart={(e) => {
              e.dataTransfer.setData('application/block-type', block.type)
              e.dataTransfer.setData('application/block-name', block.name)
              e.dataTransfer.effectAllowed = 'move'
            }}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors text-left cursor-grab active:cursor-grabbing"
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: `${block.bgColor}18` }}
            >
              {Icon && (
                <Icon
                  width={12}
                  height={12}
                  style={{ color: block.bgColor }}
                />
              )}
            </div>
            <span
              className="text-xs truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {block.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Root export ─────────────────────────────────────────────────────────────

export function WorkflowCanvas({ workflowId }: { workflowId: string }) {
  return (
    <ReactFlowProvider>
      <CanvasInner workflowId={workflowId} />
    </ReactFlowProvider>
  )
}
