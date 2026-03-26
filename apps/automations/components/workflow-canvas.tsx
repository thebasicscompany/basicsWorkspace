'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  type Connection,
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
import type { SubBlockConfig } from '@/lib/sim/blocks/types'
import {
  prepareBlockState,
  blockStateToApiBlock,
  apiBlockToBlockState,
  type BlockState,
  type SubBlockState,
} from '@/apps/automations/stores/workflows/utils'
import { useSubBlockStore } from '@/apps/automations/stores/subblock'
import { useWorkflowRegistry } from '@/apps/automations/stores/registry'
import { WorkflowBlockNode, type BlockNodeData } from './workflow-block-node'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiWorkflow {
  id: string
  name: string
  description: string | null
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
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  // Set active workflow in registry so stores work correctly
  useEffect(() => {
    useWorkflowRegistry.setState({ activeWorkflowId: workflowId })
    return () => useWorkflowRegistry.setState({ activeWorkflowId: null })
  }, [workflowId])

  // Load workflow + blocks from API
  useEffect(() => {
    fetch(`/api/workflows/${workflowId}`)
      .then((r) => r.json())
      .then(({ workflow: wf, blocks: apiBlocks }) => {
        setWorkflow(wf)
        setDraftName(wf.name)

        const states: Record<string, BlockState> = {}
        const subBlockValues: Record<string, Record<string, any>> = {}

        for (const ab of apiBlocks) {
          const bs = apiBlockToBlockState(ab)
          states[bs.id] = bs

          // Initialize subblock store from persisted values
          if (bs.subBlocks && Object.keys(bs.subBlocks).length > 0) {
            subBlockValues[bs.id] = {}
            for (const [sbId, sb] of Object.entries(bs.subBlocks)) {
              subBlockValues[bs.id][sbId] = (sb as SubBlockState).value
            }
          }
        }

        setBlockStates(states)
        setNodes(Object.values(states).map(blockStateToNode))

        // Hydrate the subblock store
        useSubBlockStore.getState().setWorkflowValues(workflowId, subBlockValues)
      })
  }, [workflowId, setNodes])

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
        if (next[node.id] && (next[node.id].position.x !== node.position.x || next[node.id].position.y !== node.position.y)) {
          next[node.id] = { ...next[node.id], position: { x: node.position.x, y: node.position.y } }
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [nodes])

  // Debounced auto-save
  useEffect(() => {
    if (!workflow || Object.keys(blockStates).length === 0 && nodes.length === 0) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      // Merge current subblock values into block states before saving
      const subBlockStore = useSubBlockStore.getState()
      const wfValues = subBlockStore.workflowValues[workflowId] ?? {}

      const blocksToSave = Object.values(blockStates).map((bs) => {
        const mergedSubBlocks = { ...bs.subBlocks }
        const blockValues = wfValues[bs.id]
        if (blockValues) {
          for (const [sbId, val] of Object.entries(blockValues)) {
            if (mergedSubBlocks[sbId]) {
              mergedSubBlocks[sbId] = { ...mergedSubBlocks[sbId], value: val }
            }
          }
        }
        return blockStateToApiBlock({ ...bs, subBlocks: mergedSubBlocks })
      })

      await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: blocksToSave }),
      })
    }, 1500)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [blockStates, workflow, workflowId])

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

  function addBlock(type: string, name: string, dropPosition?: { x: number; y: number }) {
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
    subBlockStore.setWorkflowValues(workflowId, { ...existing, [id]: initialValues })
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
    <div className="flex flex-col h-screen" style={{ background: 'var(--color-bg-base)' }}>
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
          <ArrowLeft size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </button>

        {editingName ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName()
              if (e.key === 'Escape') { setDraftName(workflow?.name ?? ''); setEditingName(false) }
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
            {workflow?.name ?? '…'}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setToolbarOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: toolbarOpen ? 'var(--color-accent-light)' : 'var(--color-bg-base)',
              border: `1px solid ${toolbarOpen ? 'var(--color-accent)' : 'var(--color-border)'}`,
              color: toolbarOpen ? 'var(--color-accent)' : 'var(--color-text-primary)',
            }}
          >
            <Plus size={12} weight="bold" />
            Add Block
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}
          >
            <Play size={12} weight="fill" />
            Run
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

        <div className="flex-1">
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
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#D4D2CE" />
            <Controls
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
              }}
            />
          </ReactFlow>
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
    !search || b.name.toLowerCase().includes(lc) || b.type.toLowerCase().includes(lc)

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
      <div className="p-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}
        >
          <MagnifyingGlass size={12} style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks…"
            className="text-xs bg-transparent border-0 outline-none flex-1"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={10} style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredTriggers.length > 0 && (
          <BlockSection title="Triggers" items={filteredTriggers} onAdd={onAdd} />
        )}
        {filteredBlocks.length > 0 && (
          <BlockSection title="Blocks" items={filteredBlocks} onAdd={onAdd} />
        )}
        {filteredTools.length > 0 && (
          <BlockSection title="Tools" items={filteredTools} onAdd={onAdd} />
        )}
        {filteredTriggers.length + filteredBlocks.length + filteredTools.length === 0 && (
          <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>
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
              {Icon && <Icon width={12} height={12} style={{ color: block.bgColor }} />}
            </div>
            <span className="text-xs truncate" style={{ color: 'var(--color-text-primary)' }}>
              {block.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Block Editor Panel (right side — edits subblock values via the store) ───

function BlockEditorPanel({
  workflowId,
  block,
  config,
  onClose,
}: {
  workflowId: string
  block: BlockState
  config: BlockConfig<any>
  onClose: () => void
}) {
  const Icon = config.icon
  const basicSubBlocks = (config.subBlocks ?? []).filter(
    (sb: SubBlockConfig) => !sb.mode || sb.mode === 'basic' || sb.mode === 'both'
  )

  return (
    <div
      className="w-80 flex-shrink-0 overflow-y-auto"
      style={{
        background: 'var(--color-bg-surface)',
        borderLeft: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${config.bgColor}18` }}
        >
          {Icon && <Icon width={16} height={16} style={{ color: config.bgColor }} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {block.name}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {config.name}
          </p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-zinc-100">
          <X size={14} style={{ color: 'var(--color-text-tertiary)' }} />
        </button>
      </div>

      {config.description && (
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {config.description}
          </p>
        </div>
      )}

      {/* Sub-block fields — values go through useSubBlockStore */}
      {basicSubBlocks.length > 0 && (
        <div className="px-4 py-3">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Configuration
          </p>
          <div className="space-y-3">
            {basicSubBlocks.map((sb: SubBlockConfig) => (
              <SubBlockField
                key={sb.id}
                blockId={block.id}
                config={sb}
              />
            ))}
          </div>
        </div>
      )}

      {/* Outputs */}
      {config.outputs && Object.keys(config.outputs).length > 0 && (
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Outputs
          </p>
          <div className="space-y-1">
            {Object.entries(config.outputs).map(([key, def]) => {
              const typeName = typeof def === 'string' ? def : (def as any)?.type ?? 'any'
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>{key}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-tertiary)' }}
                  >
                    {typeName}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SubBlock Field — reads/writes via useSubBlockStore (Sim-compatible) ─────

function SubBlockField({ blockId, config }: { blockId: string; config: SubBlockConfig }) {
  const value = useSubBlockStore((s) => {
    const wfId = useWorkflowRegistry.getState().activeWorkflowId
    if (!wfId) return null
    return s.workflowValues[wfId]?.[blockId]?.[config.id] ?? null
  })

  const setValue = useCallback(
    (val: any) => useSubBlockStore.getState().setValue(blockId, config.id, val),
    [blockId, config.id]
  )

  const baseInputClass = 'w-full text-xs rounded-lg px-2.5 py-1.5 outline-none transition-colors focus:ring-1 focus:ring-[var(--color-accent)]'
  const baseStyle = {
    background: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  }

  const label = config.title || config.id

  return (
    <div>
      <label
        className="text-[11px] font-medium block mb-1"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
        {config.required === true && <span style={{ color: 'var(--color-error)' }}> *</span>}
      </label>
      {renderInput()}
    </div>
  )

  function renderInput() {
    switch (config.type) {
      case 'dropdown':
      case 'combobox': {
        const opts = Array.isArray(config.options) ? config.options : []
        return (
          <select
            value={value ?? ''}
            onChange={(e) => setValue(e.target.value)}
            className={baseInputClass}
            style={baseStyle}
          >
            <option value="">{config.placeholder ?? 'Select…'}</option>
            {opts.map((o: any) => (
              <option key={o.id ?? o} value={o.id ?? o}>
                {o.label ?? o}
              </option>
            ))}
          </select>
        )
      }

      case 'long-input':
        return (
          <textarea
            rows={3}
            value={value ?? ''}
            onChange={(e) => setValue(e.target.value)}
            placeholder={config.placeholder}
            className={`${baseInputClass} resize-none`}
            style={baseStyle}
          />
        )

      case 'code':
        return (
          <textarea
            rows={4}
            value={value ?? ''}
            onChange={(e) => setValue(e.target.value)}
            placeholder={config.placeholder}
            className={`${baseInputClass} resize-none font-mono`}
            style={baseStyle}
          />
        )

      case 'switch':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => setValue(e.target.checked)}
              className="rounded border-zinc-300"
            />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        )

      case 'slider':
        return (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={(config as any).min ?? 0}
              max={(config as any).max ?? 1}
              step={(config as any).step ?? 0.1}
              value={value ?? (config as any).defaultValue ?? 0.5}
              onChange={(e) => setValue(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs w-8 text-right" style={{ color: 'var(--color-text-tertiary)' }}>
              {typeof value === 'number' ? value.toFixed(1) : '—'}
            </span>
          </div>
        )

      case 'checkbox-list':
      case 'grouped-checkbox-list':
        return (
          <p className="text-[10px] italic" style={{ color: 'var(--color-text-tertiary)' }}>
            Checkbox list (configure in advanced mode)
          </p>
        )

      case 'tool-input':
      case 'oauth-input':
      case 'messages-input':
      case 'file-upload':
      case 'table':
      case 'condition-input':
      case 'filter-builder':
      case 'sort-builder':
      case 'input-format':
      case 'response-format':
      case 'mcp-server-selector':
      case 'mcp-tool-selector':
        return (
          <p className="text-[10px] italic" style={{ color: 'var(--color-text-tertiary)' }}>
            {config.type.replace(/-/g, ' ')} — available after executor integration
          </p>
        )

      case 'short-input':
      default:
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => setValue(e.target.value)}
            placeholder={config.placeholder}
            className={baseInputClass}
            style={baseStyle}
          />
        )
    }
  }
}

// ─── Root export ─────────────────────────────────────────────────────────────

export function WorkflowCanvas({ workflowId }: { workflowId: string }) {
  return (
    <ReactFlowProvider>
      <CanvasInner workflowId={workflowId} />
    </ReactFlowProvider>
  )
}
