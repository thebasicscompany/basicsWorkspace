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
  type EdgeTypes,
  type Node,
  type NodeTypes,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Play, MagnifyingGlass, X, BracketsCurly, ArrowCounterClockwise, ArrowClockwise, Check, CircleNotch, Warning, Lightning, Clock, WebhooksLogo, ChatCircle, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { DeployModal } from './deploy/deploy-modal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
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
import { SubflowNodeComponent, type SubflowNodeData } from './subflow-node'
import { CONTAINER_DIMENSIONS } from '@/lib/workflows/blocks/block-dimensions'
import { BlockEditorPanel } from './block-editor-panel'
import { Terminal } from './terminal/terminal'
import { useTerminalConsoleStore } from '@/apps/automations/stores/terminal'
import { WorkflowEdge } from './workflow-edge'
import { wouldCreateCycle } from '@/apps/automations/stores/workflows/edge-validation'
import { BlockContextMenu } from './block-context-menu'
import { runPreDeployChecks } from '@/apps/automations/lib/pre-deploy-checks'
import { useVariablesStore } from '@/apps/automations/stores/variables'
import { VariablesPanel } from './variables-panel'
import { ExecutionLogPanel, type ExecutionEvent } from './execution-log-panel'
import { CopilotModal } from './copilot-modal'
import { WorkflowChat } from './workflow-chat'
import { useChatStore } from '@/apps/automations/stores/chat'
import { applyWorkflowStateToStores } from '@/apps/automations/lib/apply-workflow-state'

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
  subflowNode: SubflowNodeComponent,
}

const EDGE_TYPES: EdgeTypes = {
  workflow: WorkflowEdge,
}

// ─── Convert between BlockState and ReactFlow Nodes ──────────────────────────

function blockStateToNode(block: BlockState, allBlocks?: Record<string, BlockState>): Node {
  // Handle container nodes (loop/parallel) differently
  if (block.type === 'loop' || block.type === 'parallel') {
    // Compute nesting depth so children always render above parents
    let depth = 0
    let pid = block.data?.parentId as string | undefined
    while (pid && depth < 100 && allBlocks) {
      depth++
      pid = allBlocks[pid]?.data?.parentId as string | undefined
    }
    return {
      id: block.id,
      type: 'subflowNode',
      position: block.position,
      parentId: block.data?.parentId as string | undefined,
      extent: (block.data?.extent as 'parent' | undefined) || undefined,
      dragHandle: '.workflow-drag-handle',
      zIndex: depth,
      data: {
        ...block.data,
        name: block.name,
        width: (block.data?.width as number | undefined) || CONTAINER_DIMENSIONS.DEFAULT_WIDTH,
        height: (block.data?.height as number | undefined) || CONTAINER_DIMENSIONS.DEFAULT_HEIGHT,
        kind: block.type === 'loop' ? 'loop' : 'parallel',
      } satisfies SubflowNodeData,
    }
  }

  // Compute zIndex for blocks inside containers so they render above the
  // parent subflow's interactive body area
  const childZIndex = block.data?.parentId ? 1000 : undefined

  // Clamp children to subflow body (exclude header)
  let extent: Node['extent'] = undefined
  const parentId = block.data?.parentId as string | undefined
  if (parentId) {
    const headerHeight = 42
    const leftPadding = 16
    extent = [
      [leftPadding, headerHeight],
      [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    ] as [[number, number], [number, number]]
  }

  return {
    id: block.id,
    type: 'workflowBlock',
    position: block.position,
    parentId,
    ...(childZIndex !== undefined && { zIndex: childZIndex }),
    extent,
    data: {
      type: block.type,
      name: block.name,
      enabled: block.enabled,
    } satisfies BlockNodeData,
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
  const [toolbarOpen, setToolbarOpen] = useState(true)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isDeployed, setIsDeployed] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployedAt, setDeployedAt] = useState<string | null>(null)
  const [needsRedeployment, setNeedsRedeployment] = useState(false)
  const [deployModalOpen, setDeployModalOpen] = useState(false)
  const [variablesPanelOpen, setVariablesPanelOpen] = useState(false)
  const isChatOpen = useChatStore((s) => s.isOpen)
  const toggleChat = useChatStore((s) => s.setOpen)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; blockId: string } | null>(null)
  const [executionEvents, setExecutionEvents] = useState<ExecutionEvent[]>([])
  const [execLogOpen, setExecLogOpen] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  // Save status indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveStatusTimer = useRef<NodeJS.Timeout | null>(null)

  // Undo/Redo history
  type CanvasSnapshot = { blocks: Record<string, BlockState>; edges: Edge[] }
  const undoStack = useRef<CanvasSnapshot[]>([])
  const redoStack = useRef<CanvasSnapshot[]>([])
  const pushUndoSnapshot = useCallback(() => {
    undoStack.current.push({
      blocks: structuredClone(blockStates),
      edges: structuredClone(edges),
    })
    // Cap history at 50 entries
    if (undoStack.current.length > 50) undoStack.current.shift()
    redoStack.current = []
  }, [blockStates, edges])

  // Delete confirmation dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{ ids: Set<string>; names: string[] } | null>(null)

  // Deploy validation dialog (replaces alert())
  const [deployError, setDeployError] = useState<string | null>(null)

  // Set active workflow in registry so stores work correctly
  useEffect(() => {
    useWorkflowRegistry.setState({ activeWorkflowId: workflowId })
    return () => useWorkflowRegistry.setState({ activeWorkflowId: null })
  }, [workflowId])

  // Load workflow + blocks + edges from API
  useEffect(() => {
    fetch(`/api/workflows/${workflowId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Workflow not found')
        return r.json()
      })
      .then(({ workflow: wf, blocks: apiBlocks, edges: apiEdges }) => {
        if (!wf) { router.push('/automations'); return }
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
        setNodes(Object.values(states).map(b => blockStateToNode(b, states)))

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

        // Load workflow variables
        useVariablesStore.getState().loadForWorkflow(workflowId)
      })
      .catch(() => { router.push('/automations') })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, setNodes, setEdges])

  // Re-fetch workflow when copilot makes edits (Sim-style: fetch then applyWorkflowStateToStores)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.workflowId !== workflowId) return

      fetch(`/api/workflows/${workflowId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data) return
          const { blocks: apiBlocks, edges: apiEdges } = data

          // Convert API blocks to BlockState and build WorkflowState
          const states: Record<string, BlockState> = {}
          for (const ab of apiBlocks) {
            const bs = apiBlockToBlockState(ab)
            states[bs.id] = bs
          }
          const rfEdges = apiEdges ? apiEdges.map(apiEdgeToReactFlowEdge) : []

          // Apply to stores (Sim's applyWorkflowStateToStores pattern)
          applyWorkflowStateToStores(workflowId, {
            blocks: states as any,
            edges: rfEdges,
            loops: {},
            parallels: {},
          })

          // Update local React state for ReactFlow nodes/edges
          setBlockStates(states)
          setNodes(Object.values(states).map(b => blockStateToNode(b, states)))
          setEdges(rfEdges)
        })
        .catch(() => {})
    }

    window.addEventListener('copilot:workflow-updated', handler)
    return () => window.removeEventListener('copilot:workflow-updated', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, setNodes, setEdges])

  // Check deployment status
  const checkDeployStatus = useCallback(() => {
    fetch(`/api/workflows/${workflowId}/deploy`)
      .then((r) => r.json())
      .then((data) => {
        setIsDeployed(!!data.isDeployed)
        setDeployedAt(data.deployedAt ?? null)
        setNeedsRedeployment(!!data.needsRedeployment)
      })
      .catch(() => {})
  }, [workflowId])

  useEffect(() => {
    checkDeployStatus()
  }, [checkDeployStatus])

  const handleDeployClick = useCallback(async () => {
    // If deployed and no changes, just open the modal
    if (isDeployed && !needsRedeployment) {
      setDeployModalOpen(true)
      return
    }

    // Run pre-deploy validation
    const checkResult = runPreDeployChecks({
      blocks: blockStates as any,
      edges,
      workflowId,
    })
    if (!checkResult.passed) {
      setDeployError(checkResult.error || 'Pre-deploy validation failed')
      return
    }

    setIsDeploying(true)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/deploy`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to deploy')
      setIsDeployed(true)
      setDeployedAt(data.deployedAt ?? new Date().toISOString())
      setNeedsRedeployment(false)
      setDeployModalOpen(true)
    } catch (err: any) {
      console.error('Deploy error:', err)
      setDeployError(err.message || 'Deploy failed')
    } finally {
      setIsDeploying(false)
    }
  }, [workflowId, isDeployed, needsRedeployment, blockStates, edges])

  const handleUndeploy = useCallback(async () => {
    const res = await fetch(`/api/workflows/${workflowId}/deploy`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to undeploy')
    setIsDeployed(false)
    setDeployedAt(null)
    setNeedsRedeployment(false)
  }, [workflowId])

  const handleDeploy = useCallback(async () => {
    // Run pre-deploy validation
    const checkResult = runPreDeployChecks({
      blocks: blockStates as any,
      edges,
      workflowId,
    })
    if (!checkResult.passed) {
      setDeployError(checkResult.error || 'Pre-deploy validation failed')
      return
    }

    setIsDeploying(true)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/deploy`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to deploy')
      setIsDeployed(true)
      setDeployedAt(data.deployedAt ?? new Date().toISOString())
      setNeedsRedeployment(false)
    } catch (err: any) {
      setDeployError(err.message || 'Deploy failed')
    } finally {
      setIsDeploying(false)
    }
  }, [workflowId, blockStates, edges])

  // Connection drag state for visual feedback
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const connectionErrorTimer = useRef<NodeJS.Timeout | null>(null)

  const onConnectStart = useCallback(() => setIsConnecting(true), [])
  const onConnectEnd = useCallback(() => setIsConnecting(false), [])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      if (connection.source === connection.target) {
        setConnectionError("Can't connect a block to itself")
        if (connectionErrorTimer.current) clearTimeout(connectionErrorTimer.current)
        connectionErrorTimer.current = setTimeout(() => setConnectionError(null), 2500)
        return
      }
      if (wouldCreateCycle(connection.source, connection.target, edges)) {
        setConnectionError("Can't connect — would create a cycle")
        if (connectionErrorTimer.current) clearTimeout(connectionErrorTimer.current)
        connectionErrorTimer.current = setTimeout(() => setConnectionError(null), 2500)
        return
      }
      setEdges((eds) => addEdge({ ...connection, type: 'workflow' }, eds))
    },
    [setEdges, edges]
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

  // Subscribe to variables store changes so variable edits trigger auto-save
  const allVariables = useVariablesStore((s) => s.variables)
  const workflowVariables = useMemo(
    () => Object.values(allVariables).filter((v) => v.workflowId === workflowId),
    [allVariables, workflowId]
  )

  // ── Save helpers ─────────────────────────────────────────────────────────

  const saveNow = useCallback(async (
    currentBlocks: Record<string, BlockState>,
    currentEdges: Edge[],
  ) => {
    const wfValues = useSubBlockStore.getState().workflowValues[workflowId] ?? {}

    const blocksToSave = Object.values(currentBlocks).map((bs) => {
      const mergedSubBlocks = { ...bs.subBlocks }
      const blockValues = wfValues[bs.id]
      if (blockValues) {
        for (const [sbId, val] of Object.entries(blockValues)) {
          if (mergedSubBlocks[sbId]) {
            mergedSubBlocks[sbId] = { ...mergedSubBlocks[sbId], value: val }
          } else {
            mergedSubBlocks[sbId] = { id: sbId, type: 'short-input' as any, value: val }
          }
        }
      }
      return blockStateToApiBlock({ ...bs, subBlocks: mergedSubBlocks })
    })

    const edgesToSave = currentEdges.map(reactFlowEdgeToApi)

    setSaveStatus('saving')
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: blocksToSave, edges: edgesToSave }),
      })

      const vars = Object.values(useVariablesStore.getState().variables)
        .filter((v) => v.workflowId === workflowId)
      if (vars.length > 0) {
        const variablesRecord: Record<string, unknown> = {}
        for (const v of vars) variablesRecord[v.id] = v
        await fetch(`/api/workflows/${workflowId}/variables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variables: variablesRecord }),
        })
      }

      // Re-check deploy status after save to detect drift from deployed version
      if (isDeployed) checkDeployStatus()

      setSaveStatus('saved')
      if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current)
      saveStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current)
      saveStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 4000)
    }
  }, [workflowId, isDeployed, checkDeployStatus])

  // Debounced auto-save (subblock edits, position changes, variable edits)
  useEffect(() => {
    if (!workflow) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveNow(blockStates, edges)
    }, 1500)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [blockStates, edges, workflow, workflowId, subBlockValues, workflowVariables, saveNow])

  async function runWorkflow() {
    if (isRunning) return
    setIsRunning(true)
    setExecutionEvents([])
    setExecLogOpen(true)

    const executionId = crypto.randomUUID()
    const { addConsole, updateConsole, toggleConsole, isOpen } = useTerminalConsoleStore.getState()

    // Open terminal if closed
    if (!isOpen) toggleConsole()

    let blockOrder = 0

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

              // Feed execution log panel
              setExecutionEvents((prev) => [...prev, event])

              if (event.type === 'block:complete') {
                blockOrder++
                addConsole({
                  workflowId,
                  blockId: event.blockId || 'unknown',
                  blockName: event.blockName || event.blockType || 'Block',
                  blockType: event.blockType || 'unknown',
                  executionId,
                  executionOrder: blockOrder,
                  startedAt: event.startedAt || new Date().toISOString(),
                  endedAt: event.endedAt || new Date().toISOString(),
                  durationMs: event.durationMs,
                  success: event.success !== false,
                  output: event.output,
                  error: event.error || null,
                })
              } else if (event.type === 'error') {
                blockOrder++
                addConsole({
                  workflowId,
                  blockId: event.blockId || 'error',
                  blockName: event.blockName || 'Error',
                  blockType: 'error',
                  executionId,
                  executionOrder: blockOrder,
                  startedAt: new Date().toISOString(),
                  success: false,
                  error: event.error || 'Unknown error',
                })
              }
            } catch {
              // Ignore malformed events
            }
          }
        }
      }
    } catch (err) {
      console.error('Workflow execution failed:', err)
      blockOrder++
      addConsole({
        workflowId,
        blockId: 'error',
        blockName: 'Execution Error',
        blockType: 'error',
        executionId,
        executionOrder: blockOrder,
        startedAt: new Date().toISOString(),
        success: false,
        error: err instanceof Error ? err.message : 'Execution failed',
      })
    } finally {
      setIsRunning(false)
    }
  }

  /**
   * Run workflow starting from a specific block.
   * Passes runFromBlockId to the run endpoint.
   */
  async function runFromBlock(blockId: string) {
    if (isRunning) return
    setIsRunning(true)

    const executionId = crypto.randomUUID()
    const { addConsole, toggleConsole, isOpen } = useTerminalConsoleStore.getState()
    if (!isOpen) toggleConsole()

    let blockOrder = 0

    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runFromBlockId: blockId }),
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
              const event = JSON.parse(line.slice(6))
              if (event.type === 'block:complete') {
                blockOrder++
                addConsole({
                  workflowId,
                  blockId: event.blockId || 'unknown',
                  blockName: event.blockName || event.blockType || 'Block',
                  blockType: event.blockType || 'unknown',
                  executionId,
                  executionOrder: blockOrder,
                  startedAt: event.startedAt || new Date().toISOString(),
                  endedAt: event.endedAt || new Date().toISOString(),
                  durationMs: event.durationMs,
                  success: event.success !== false,
                  output: event.output,
                  error: event.error || null,
                })
              } else if (event.type === 'error') {
                blockOrder++
                addConsole({
                  workflowId,
                  blockId: event.blockId || 'error',
                  blockName: event.blockName || 'Error',
                  blockType: 'error',
                  executionId,
                  executionOrder: blockOrder,
                  startedAt: new Date().toISOString(),
                  success: false,
                  error: event.error || 'Unknown error',
                })
              }
            } catch {
              // Ignore malformed events
            }
          }
        }
      }
    } catch (err) {
      console.error('Run from block failed:', err)
    } finally {
      setIsRunning(false)
    }
  }

  /**
   * Run workflow until (and including) a specific block.
   * Passes runUntilBlockId to the run endpoint.
   */
  async function runUntilBlock(blockId: string) {
    if (isRunning) return
    setIsRunning(true)

    const executionId = crypto.randomUUID()
    const { addConsole, toggleConsole, isOpen } = useTerminalConsoleStore.getState()
    if (!isOpen) toggleConsole()

    let blockOrder = 0

    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runUntilBlockId: blockId }),
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
              const event = JSON.parse(line.slice(6))
              if (event.type === 'block:complete') {
                blockOrder++
                addConsole({
                  workflowId,
                  blockId: event.blockId || 'unknown',
                  blockName: event.blockName || event.blockType || 'Block',
                  blockType: event.blockType || 'unknown',
                  executionId,
                  executionOrder: blockOrder,
                  startedAt: event.startedAt || new Date().toISOString(),
                  endedAt: event.endedAt || new Date().toISOString(),
                  durationMs: event.durationMs,
                  success: event.success !== false,
                  output: event.output,
                  error: event.error || null,
                })
              } else if (event.type === 'error') {
                blockOrder++
                addConsole({
                  workflowId,
                  blockId: event.blockId || 'error',
                  blockName: event.blockName || 'Error',
                  blockType: 'error',
                  executionId,
                  executionOrder: blockOrder,
                  startedAt: new Date().toISOString(),
                  success: false,
                  error: event.error || 'Unknown error',
                })
              }
            } catch {
              // Ignore malformed events
            }
          }
        }
      }
    } catch (err) {
      console.error('Run until block failed:', err)
    } finally {
      setIsRunning(false)
    }
  }

  // ─── Context menu handlers ──────────────────────────────────────────────────

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      setContextMenu({ x: event.clientX, y: event.clientY, blockId: node.id })
    },
    []
  )

  const executeDelete = useCallback(
    (idsToRemove: Set<string>) => {
      pushUndoSnapshot()
      const newBlocks = { ...blockStates }
      for (const id of idsToRemove) delete newBlocks[id]
      const newEdges = edges.filter(
        (e) => !idsToRemove.has(e.source) && !idsToRemove.has(e.target)
      )

      setBlockStates(newBlocks)
      setNodes((ns) => ns.filter((n) => !idsToRemove.has(n.id)))
      setEdges(newEdges)

      const subBlockStore = useSubBlockStore.getState()
      const existing = { ...subBlockStore.workflowValues[workflowId] }
      for (const id of idsToRemove) delete existing[id]
      subBlockStore.setWorkflowValues(workflowId, existing)

      if (selectedBlockId && idsToRemove.has(selectedBlockId)) setSelectedBlockId(null)

      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveNow(newBlocks, newEdges)
    },
    [workflowId, selectedBlockId, blockStates, edges, setNodes, setEdges, saveNow, pushUndoSnapshot]
  )

  const deleteBlock = useCallback(
    (blockId: string) => {
      const block = blockStates[blockId]
      setDeleteConfirm({
        ids: new Set([blockId]),
        names: [block?.name || 'Untitled'],
      })
    },
    [blockStates]
  )

  const duplicateBlock = useCallback(
    (blockId: string) => {
      const registry = useWorkflowRegistry.getState()
      registry.copyBlocks([blockId])
      const pasteData = registry.preparePasteData({ x: 50, y: 50 })
      if (!pasteData) return

      const subBlockStore = useSubBlockStore.getState()
      const existingSubBlocks = { ...subBlockStore.workflowValues[workflowId] }
      const newNodes: Node<BlockNodeData>[] = []

      setBlockStates((prev) => {
        const next = { ...prev }
        for (const [id, block] of Object.entries(pasteData.blocks)) {
          next[id] = block
          newNodes.push(blockStateToNode(block, next))
          if (pasteData.subBlockValues[id]) {
            existingSubBlocks[id] = pasteData.subBlockValues[id]
          } else {
            const vals: Record<string, any> = {}
            for (const [sbId, sb] of Object.entries(block.subBlocks)) vals[sbId] = sb.value
            existingSubBlocks[id] = vals
          }
        }
        return next
      })
      setNodes((ns) => [...ns, ...newNodes])
      setEdges((es) => [...es, ...pasteData.edges])
      subBlockStore.setWorkflowValues(workflowId, existingSubBlocks)
    },
    [workflowId, setNodes, setEdges]
  )

  const copyBlock = useCallback(
    (blockId: string) => {
      useWorkflowRegistry.getState().copyBlocks([blockId])
    },
    []
  )

  // ─── Keyboard shortcuts (Delete, Copy, Paste) ───────────────────────────────

  useEffect(() => {
    function isInEditableElement(): boolean {
      const el = document.activeElement
      if (!el) return false
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return true
      if ((el as HTMLElement).isContentEditable) return true
      const role = el.getAttribute('role')
      if (role === 'textbox' || role === 'combobox') return true
      return false
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isInEditableElement()) return

      const isCtrl = event.ctrlKey || event.metaKey

      // Ctrl+Z — Undo
      if (isCtrl && event.key === 'z' && !event.shiftKey) {
        const snapshot = undoStack.current.pop()
        if (!snapshot) return
        event.preventDefault()
        redoStack.current.push({
          blocks: structuredClone(blockStates),
          edges: structuredClone(edges),
        })
        setBlockStates(snapshot.blocks)
        setNodes(Object.values(snapshot.blocks).map(b => blockStateToNode(b, snapshot.blocks)))
        setEdges(snapshot.edges)

        // Re-hydrate subblock store from snapshot
        const subBlockValues: Record<string, Record<string, any>> = {}
        for (const [bId, bs] of Object.entries(snapshot.blocks)) {
          subBlockValues[bId] = {}
          for (const [sbId, sb] of Object.entries(bs.subBlocks)) {
            subBlockValues[bId][sbId] = (sb as any).value
          }
        }
        useSubBlockStore.getState().setWorkflowValues(workflowId, subBlockValues)

        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveNow(snapshot.blocks, snapshot.edges)
        return
      }

      // Ctrl+Shift+Z — Redo
      if (isCtrl && event.key === 'z' && event.shiftKey) {
        const snapshot = redoStack.current.pop()
        if (!snapshot) return
        event.preventDefault()
        undoStack.current.push({
          blocks: structuredClone(blockStates),
          edges: structuredClone(edges),
        })
        setBlockStates(snapshot.blocks)
        setNodes(Object.values(snapshot.blocks).map(b => blockStateToNode(b, snapshot.blocks)))
        setEdges(snapshot.edges)

        const subBlockValues: Record<string, Record<string, any>> = {}
        for (const [bId, bs] of Object.entries(snapshot.blocks)) {
          subBlockValues[bId] = {}
          for (const [sbId, sb] of Object.entries(bs.subBlocks)) {
            subBlockValues[bId][sbId] = (sb as any).value
          }
        }
        useSubBlockStore.getState().setWorkflowValues(workflowId, subBlockValues)

        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveNow(snapshot.blocks, snapshot.edges)
        return
      }

      // Delete / Backspace — show confirmation before removing selected blocks
      if (event.key === 'Delete' || event.key === 'Backspace') {
        let selectedNodes = reactFlow.getNodes().filter((n) => n.selected)
        if (selectedNodes.length === 0 && selectedBlockId) {
          const node = reactFlow.getNode(selectedBlockId)
          if (node) selectedNodes = [node]
        }
        if (selectedNodes.length === 0) return

        event.preventDefault()
        const idsToRemove = new Set(selectedNodes.map((n) => n.id))
        const names = selectedNodes.map((n) => blockStates[n.id]?.name || 'Untitled')
        setDeleteConfirm({ ids: idsToRemove, names })
        return
      }

      // Ctrl+C — Copy selected blocks
      if (isCtrl && event.key === 'c') {
        const selection = window.getSelection()
        if (selection && selection.toString().length > 0) return // allow native text copy

        const selectedNodes = reactFlow.getNodes().filter((n) => n.selected)
        const blockIds = selectedNodes.length > 0
          ? selectedNodes.map((n) => n.id)
          : selectedBlockId ? [selectedBlockId] : []

        if (blockIds.length > 0) {
          event.preventDefault()
          useWorkflowRegistry.getState().copyBlocks(blockIds)
        }
        return
      }

      // Ctrl+V — Paste blocks
      if (isCtrl && event.key === 'v') {
        const registry = useWorkflowRegistry.getState()
        if (!registry.hasClipboard()) return

        event.preventDefault()
        const viewport = reactFlow.getViewport()
        const center = reactFlow.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        })
        const pasteData = registry.preparePasteData({ x: 50, y: 50 })
        if (!pasteData) return

        // Add each pasted block
        const newNodes: Node<BlockNodeData>[] = []
        const subBlockStore = useSubBlockStore.getState()
        const existingSubBlocks = { ...subBlockStore.workflowValues[workflowId] }

        setBlockStates((prev) => {
          const next = { ...prev }
          for (const [id, block] of Object.entries(pasteData.blocks)) {
            next[id] = block
            newNodes.push(blockStateToNode(block, next))
            if (pasteData.subBlockValues[id]) {
              existingSubBlocks[id] = pasteData.subBlockValues[id]
            } else {
              const vals: Record<string, any> = {}
              for (const [sbId, sb] of Object.entries(block.subBlocks)) {
                vals[sbId] = sb.value
              }
              existingSubBlocks[id] = vals
            }
          }
          return next
        })
        setNodes((ns) => [...ns, ...newNodes])
        setEdges((es) => [...es, ...pasteData.edges])

        subBlockStore.setWorkflowValues(workflowId, existingSubBlocks)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [reactFlow, workflowId, selectedBlockId, blockStates, edges, setNodes, setEdges, saveNow, pushUndoSnapshot])

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
    pushUndoSnapshot()
    const position = dropPosition ?? {
      x: 200 + Object.keys(blockStates).length * 250,
      y: 200,
    }
    const id = crypto.randomUUID()
    const bs = prepareBlockState({ id, type, name, position })

    setBlockStates((prev) => {
      const next = { ...prev, [id]: bs }
      setNodes(Object.values(next).map(b => blockStateToNode(b, next)))
      return next
    })

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

  // Live validation awareness
  const validationIssues = useMemo(() => {
    const blockIds = Object.keys(blockStates)
    if (blockIds.length === 0) return null

    const issues: string[] = []

    // Check for unconnected blocks (no incoming or outgoing edges)
    const connectedSources = new Set(edges.map((e) => e.source))
    const connectedTargets = new Set(edges.map((e) => e.target))
    let unconnected = 0
    for (const id of blockIds) {
      const block = blockStates[id]
      // Start/trigger blocks don't need incoming edges
      const config = getBlock(block.type)
      const isTrigger = config?.category === 'triggers' || block.triggerMode
      const hasIncoming = connectedTargets.has(id)
      const hasOutgoing = connectedSources.has(id)
      if (!isTrigger && !hasIncoming && !hasOutgoing) unconnected++
    }
    if (unconnected > 0) issues.push(`${unconnected} block${unconnected > 1 ? 's' : ''} not connected`)

    // Check for required fields that are empty
    let missingFields = 0
    for (const [blockId, block] of Object.entries(blockStates)) {
      const config = getBlock(block.type)
      if (!config) continue
      for (const sb of config.subBlocks ?? []) {
        if (!sb.required) continue
        const required = typeof sb.required === 'boolean' ? sb.required : false
        if (!required) continue
        const val = block.subBlocks?.[sb.id]?.value
        if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
          missingFields++
        }
      }
    }
    if (missingFields > 0) issues.push(`${missingFields} required field${missingFields > 1 ? 's' : ''} empty`)

    return issues.length > 0 ? issues : null
  }, [blockStates, edges])

  // Selected block config
  const selectedBlock = selectedBlockId ? blockStates[selectedBlockId] : null
  const selectedConfig = selectedBlock ? getBlock(selectedBlock.type) : null

  return (
    <div className="flex flex-col h-screen bg-bg-base">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-[72px] shrink-0 z-10 bg-bg-surface border-b border-border">
        {/* Left: breadcrumb + save status */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-2.5 text-xl font-display">
            <button
              onClick={() => router.push('/automations')}
              className="text-text-tertiary font-normal hover:text-zinc-600 transition-colors"
            >
              Automations
            </button>
            <span className="text-text-primary font-light opacity-30">/</span>
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
                className="text-text-primary font-medium min-w-40 bg-transparent border-0 border-b border-accent outline-none text-[inherit]"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-text-primary font-medium hover:opacity-70 transition-opacity"
              >
                {workflow?.name ?? '...'}
              </button>
            )}
          </nav>

          <div className="flex items-center gap-1 text-[11px] text-text-tertiary min-w-[60px]">
            {saveStatus === 'saving' && (
              <>
                <CircleNotch size={11} className="animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <span className="text-green-600 flex items-center gap-1">
                <Check size={11} weight="bold" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-500 flex items-center gap-1">
                <Warning size={11} />
                Save failed
              </span>
            )}
          </div>

          {validationIssues && saveStatus === 'idle' && (
            <div className="flex items-center gap-1 text-[11px] text-amber-500">
              <Warning size={11} />
              <span>{validationIssues[0]}</span>
              {validationIssues.length > 1 && (
                <span className="text-text-tertiary">
                  +{validationIssues.length - 1} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: actions */}
        <TooltipProvider delay={400}>
          <div className="flex items-center gap-1">
            {/* Undo / Redo */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => {
                      const snapshot = undoStack.current.pop()
                      if (!snapshot) return
                      redoStack.current.push({ blocks: structuredClone(blockStates), edges: structuredClone(edges) })
                      setBlockStates(snapshot.blocks)
                      setNodes(Object.values(snapshot.blocks).map(b => blockStateToNode(b, snapshot.blocks)))
                      setEdges(snapshot.edges)
                      const sbv: Record<string, Record<string, any>> = {}
                      for (const [bId, bs] of Object.entries(snapshot.blocks)) {
                        sbv[bId] = {}
                        for (const [sbId, sb] of Object.entries(bs.subBlocks)) sbv[bId][sbId] = (sb as any).value
                      }
                      useSubBlockStore.getState().setWorkflowValues(workflowId, sbv)
                      if (saveTimer.current) clearTimeout(saveTimer.current)
                      saveNow(snapshot.blocks, snapshot.edges)
                    }}
                    disabled={undoStack.current.length === 0}
                    className="p-1.5 rounded-lg text-text-tertiary hover:bg-black/5 transition-colors disabled:opacity-30"
                  />
                }
              >
                <ArrowCounterClockwise size={14} />
              </TooltipTrigger>
              <TooltipContent side="bottom">Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => {
                      const snapshot = redoStack.current.pop()
                      if (!snapshot) return
                      undoStack.current.push({ blocks: structuredClone(blockStates), edges: structuredClone(edges) })
                      setBlockStates(snapshot.blocks)
                      setNodes(Object.values(snapshot.blocks).map(b => blockStateToNode(b, snapshot.blocks)))
                      setEdges(snapshot.edges)
                      const sbv: Record<string, Record<string, any>> = {}
                      for (const [bId, bs] of Object.entries(snapshot.blocks)) {
                        sbv[bId] = {}
                        for (const [sbId, sb] of Object.entries(bs.subBlocks)) sbv[bId][sbId] = (sb as any).value
                      }
                      useSubBlockStore.getState().setWorkflowValues(workflowId, sbv)
                      if (saveTimer.current) clearTimeout(saveTimer.current)
                      saveNow(snapshot.blocks, snapshot.edges)
                    }}
                    disabled={redoStack.current.length === 0}
                    className="p-1.5 rounded-lg text-text-tertiary hover:bg-black/5 transition-colors disabled:opacity-30"
                  />
                }
              >
                <ArrowClockwise size={14} />
              </TooltipTrigger>
              <TooltipContent side="bottom">Redo</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 mx-2 bg-border" />

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => toggleChat(!isChatOpen)}
                    className={`p-1.5 rounded-lg transition-colors ${isChatOpen ? 'bg-accent-light text-accent' : 'text-text-tertiary hover:bg-black/5'}`}
                  />
                }
              >
                <ChatCircle size={16} weight={isChatOpen ? 'fill' : 'regular'} />
              </TooltipTrigger>
              <TooltipContent side="bottom">Chat</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => setVariablesPanelOpen((v) => !v)}
                    className={`p-1.5 rounded-lg transition-colors ${variablesPanelOpen ? 'bg-accent-light text-accent' : 'text-text-tertiary hover:bg-black/5'}`}
                  />
                }
              >
                <BracketsCurly size={16} weight={variablesPanelOpen ? 'fill' : 'regular'} />
              </TooltipTrigger>
              <TooltipContent side="bottom">Variables</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 mx-2 bg-border" />

            {/* Deploy */}
            {isDeployed && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${needsRedeployment ? 'bg-amber-50 text-amber-500' : 'bg-accent-light text-accent'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${needsRedeployment ? 'bg-amber-500' : 'bg-green-500'}`} />
                {needsRedeployment ? 'Out of sync' : 'Live'}
              </span>
            )}

            <button
              onClick={() => setDeployModalOpen(true)}
              disabled={isDeploying}
              className="text-[13px] font-medium text-text-secondary underline underline-offset-4 hover:opacity-70 transition-opacity disabled:opacity-50"
            >
              {isDeploying ? 'Deploying...' : 'Deploy'}
            </button>

            <div className="w-px h-4 mx-2 bg-border" />

            {/* Run */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={runWorkflow}
                    disabled={isRunning}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium text-white bg-accent transition-opacity disabled:opacity-50"
                  />
                }
              >
                {isRunning ? (
                  <CircleNotch size={12} className="animate-spin" />
                ) : (
                  <Play size={12} weight="fill" />
                )}
                {isRunning ? 'Running...' : 'Run'}
              </TooltipTrigger>
              <TooltipContent side="bottom">Run workflow</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </header>

      {/* Main: toolbar + canvas + info panel */}
      <div className="flex flex-1 overflow-hidden">
        <BlockToolbar
          isOpen={toolbarOpen}
          onToggle={() => setToolbarOpen((o) => !o)}
          onAdd={(type, name) => addBlock(type, name)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              onNodeClick={(_e, node) => { setSelectedBlockId(node.id); setContextMenu(null) }}
              onSelectionChange={({ nodes: sel }) => {
                if (sel.length === 1) setSelectedBlockId(sel[0].id)
                else if (sel.length === 0) setSelectedBlockId(null)
              }}
              onNodeContextMenu={onNodeContextMenu}
              onPaneClick={() => { setSelectedBlockId(null); setContextMenu(null) }}
              elementsSelectable={true}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              defaultEdgeOptions={{ type: 'workflow' }}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              className={isConnecting ? 'connecting' : ''}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#D4D2CE"
              />
              <Controls
                showInteractive={false}
                style={{
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                }}
              />
            </ReactFlow>

            {/* Empty canvas onboarding prompt */}
            {Object.keys(blockStates).length === 0 && workflow && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div
                  className="pointer-events-auto rounded-xl p-6 max-w-sm text-center"
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  <p
                    className="text-sm font-medium mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Every workflow starts with a trigger.
                  </p>
                  <p
                    className="text-xs mb-4"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Pick one to begin, or drag a block from the toolbar.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {[
                      { type: 'start_trigger', name: 'Start', icon: Lightning, color: '#34B5FF' },
                      { type: 'schedule', name: 'Schedule', icon: Clock, color: '#6366F1' },
                      { type: 'generic_webhook', name: 'Webhook', icon: WebhooksLogo, color: '#10B981' },
                    ].map((trigger) => (
                      <button
                        key={trigger.type}
                        onClick={() => {
                          addBlock(trigger.type, trigger.name)
                          setToolbarOpen(false)
                        }}
                        className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg transition-colors hover:bg-[var(--color-bg-base)]"
                        style={{ border: '1px solid var(--color-border)' }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: `${trigger.color}18` }}
                        >
                          <trigger.icon size={16} weight="fill" style={{ color: trigger.color }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {trigger.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Connection error toast */}
            {connectionError && (
              <div
                className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium animate-in fade-in-0 slide-in-from-top-2"
                style={{
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-error)',
                  color: 'var(--color-error)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <Warning size={14} weight="fill" />
                {connectionError}
              </div>
            )}

            <ExecutionLogPanel
              events={executionEvents}
              isRunning={isRunning}
              isOpen={execLogOpen}
              onToggle={() => setExecLogOpen((o) => !o)}
              onClose={() => { setExecLogOpen(false); setExecutionEvents([]) }}
            />
          </div>

          <Terminal workflowId={workflowId} />
        </div>

        {contextMenu && blockStates[contextMenu.blockId] && (
          <BlockContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            blockId={contextMenu.blockId}
            blockName={blockStates[contextMenu.blockId].name}
            onClose={() => setContextMenu(null)}
            onDelete={deleteBlock}
            onDuplicate={duplicateBlock}
            onCopy={copyBlock}
            onRunFrom={runFromBlock}
            onRunUntil={runUntilBlock}
          />
        )}

        {selectedConfig && selectedBlock && (
          <BlockEditorPanel
            workflowId={workflowId}
            block={selectedBlock}
            config={selectedConfig}
            onClose={() => setSelectedBlockId(null)}
            isDeployed={isDeployed}
          />
        )}
      </div>

      <DeployModal
        open={deployModalOpen}
        onOpenChange={setDeployModalOpen}
        workflowId={workflowId}
        isDeployed={isDeployed}
        deployedAt={deployedAt}
        blockStates={blockStates}
        onUndeploy={handleUndeploy}
        onDeploy={handleDeploy}
      />

      <VariablesPanel
        isOpen={variablesPanelOpen}
        onClose={() => setVariablesPanelOpen(false)}
      />

      <WorkflowChat workflowId={workflowId} />
      <CopilotModal workflowId={workflowId} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteConfirm && deleteConfirm.ids.size > 1 ? `${deleteConfirm.ids.size} blocks` : 'block'}?</DialogTitle>
            <DialogDescription>
              {deleteConfirm && deleteConfirm.names.length === 1
                ? <><strong>{deleteConfirm.names[0]}</strong> will be permanently removed along with its connections.</>
                : <>The selected blocks will be permanently removed along with their connections.</>
              }
              {' '}You can undo this with Ctrl+Z.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirm) {
                  executeDelete(deleteConfirm.ids)
                  setDeleteConfirm(null)
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deploy Error Dialog (replaces alert()) */}
      <Dialog open={!!deployError} onOpenChange={(open) => { if (!open) setDeployError(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deploy failed</DialogTitle>
            <DialogDescription>{deployError}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeployError(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Block Toolbar (left panel — click to add OR drag to canvas) ─────────────

function BlockToolbar({
  isOpen,
  onToggle,
  onAdd,
}: {
  isOpen: boolean
  onToggle: () => void
  onAdd: (type: string, name: string) => void
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
    <div className="flex flex-shrink-0 h-full">
      {/* Panel content */}
      {isOpen && (
        <div
          className="w-64 flex flex-col overflow-hidden"
          style={{
            background: 'var(--color-bg-surface)',
          }}
        >
          <div
            className="p-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-[12px] shadow-sm"
              style={{
                background: 'var(--color-bg-base)',
                border: '1px solid rgba(0,0,0,0.06)',
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
                placeholder="Search blocks..."
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
      )}

      {/* Notch toggle — always visible, flush against panel edge */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center w-[14px] self-stretch cursor-pointer hover:bg-[var(--color-bg-base)] transition-colors"
        style={{
          background: 'var(--color-bg-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {isOpen ? (
          <CaretLeft size={10} weight="bold" style={{ color: 'var(--color-text-tertiary)' }} />
        ) : (
          <CaretRight size={10} weight="bold" style={{ color: 'var(--color-text-tertiary)' }} />
        )}
      </button>
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] hover:bg-black/[0.03] transition-colors text-left cursor-grab active:cursor-grabbing"
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
