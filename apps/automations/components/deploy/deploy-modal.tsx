'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { BlockState } from '@/apps/automations/stores/workflows/utils'

interface DeployModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
  isDeployed: boolean
  deployedAt: string | null
  blockStates: Record<string, BlockState>
  onUndeploy: () => Promise<void>
  onDeploy: () => Promise<void>
}

type TabView = 'general' | 'api' | 'mcp' | 'a2a' | 'chat'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="p-1 rounded hover:bg-zinc-100 transition-colors"
      title="Copy"
    >
      {copied ? (
        <Check size={14} style={{ color: 'var(--color-accent)' }} />
      ) : (
        <Copy size={14} style={{ color: 'var(--color-text-tertiary)' }} />
      )}
    </button>
  )
}

function GeneralTab({
  workflowId,
  isDeployed,
  deployedAt,
  isUndeploying,
  onUndeploy,
}: {
  workflowId: string
  isDeployed: boolean
  deployedAt: string | null
  isUndeploying: boolean
  onUndeploy: () => void
}) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-lg p-4"
        style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
            Status
          </span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              background: isDeployed ? '#dcfce7' : '#f3f4f6',
              color: isDeployed ? '#166534' : '#6b7280',
            }}
          >
            {isDeployed ? 'Live' : 'Not Deployed'}
          </span>
        </div>
        {deployedAt && (
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Deployed {new Date(deployedAt).toLocaleString()}
          </p>
        )}
      </div>

      {isDeployed && (
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
            Workflow ID
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs flex-1 font-mono" style={{ color: 'var(--color-text-primary)' }}>
              {workflowId}
            </code>
            <CopyButton text={workflowId} />
          </div>
        </div>
      )}

      {isDeployed && (
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={onUndeploy}
            disabled={isUndeploying}
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
          >
            {isUndeploying ? 'Undeploying\u2026' : 'Undeploy Workflow'}
          </Button>
        </div>
      )}
    </div>
  )
}

function ApiTab({
  workflowId,
  isDeployed,
  blockStates,
}: {
  workflowId: string
  isDeployed: boolean
  blockStates: Record<string, BlockState>
}) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  // Find trigger blocks and their webhook URLs
  const webhookUrls = useMemo(() => {
    const urls: Array<{ blockId: string; blockName: string; url: string; provider: string }> = []
    for (const block of Object.values(blockStates)) {
      const config = block as any
      // Check if block is a trigger type
      if (
        config.type === 'generic_webhook' ||
        config.type === 'start_trigger' ||
        config.triggerMode
      ) {
        const triggerPath = config.subBlocks?.triggerPath?.value || block.id
        urls.push({
          blockId: block.id,
          blockName: block.name || config.type,
          url: `${baseUrl}/api/webhooks/trigger/${triggerPath}`,
          provider: config.type,
        })
      }
    }
    return urls
  }, [blockStates, baseUrl])

  const executeEndpoint = `${baseUrl}/api/workflows/${workflowId}/run`

  const curlExample = `curl -X POST "${executeEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \\
  -d '{"input": "your data here"}'`

  const webhookCurlExample = (url: string) =>
    `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '{"event": "test", "data": {"key": "value"}}'`

  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const copyWithFeedback = (text: string, section: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  if (!isDeployed) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          Deploy your workflow to see API endpoints
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Webhook URLs */}
      {webhookUrls.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
            Webhook URLs
          </p>
          <div className="space-y-2">
            {webhookUrls.map((wh) => (
              <div
                key={wh.blockId}
                className="rounded-lg p-3"
                style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {wh.blockName}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#dcfce7', color: '#166534' }}>
                    {wh.provider}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] flex-1 font-mono break-all" style={{ color: 'var(--color-text-secondary)' }}>
                    {wh.url}
                  </code>
                  <CopyButton text={wh.url} />
                </div>
                <div className="mt-2">
                  <button
                    onClick={() => copyWithFeedback(webhookCurlExample(wh.url), `webhook-${wh.blockId}`)}
                    className="text-[10px] font-medium transition-colors"
                    style={{ color: copiedSection === `webhook-${wh.blockId}` ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}
                  >
                    {copiedSection === `webhook-${wh.blockId}` ? 'Copied curl!' : 'Copy curl example'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execute Endpoint */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
          Execute Endpoint
        </p>
        <div
          className="rounded-lg p-3"
          style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">POST</span>
            <code className="text-[11px] flex-1 font-mono break-all" style={{ color: 'var(--color-text-secondary)' }}>
              {executeEndpoint}
            </code>
            <CopyButton text={executeEndpoint} />
          </div>
        </div>
      </div>

      {/* Curl Example */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
            Example
          </p>
          <button
            onClick={() => copyWithFeedback(curlExample, 'curl')}
            className="text-[10px] font-medium transition-colors"
            style={{ color: copiedSection === 'curl' ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}
          >
            {copiedSection === 'curl' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre
          className="rounded-lg p-3 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap"
          style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            border: '1px solid var(--color-border)',
          }}
        >
          {curlExample}
        </pre>
      </div>
    </div>
  )
}

function ComingSoonTab({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-2">
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        {feature}
      </p>
      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        Coming soon
      </p>
    </div>
  )
}

export function DeployModal({
  open,
  onOpenChange,
  workflowId,
  isDeployed,
  deployedAt,
  blockStates,
  onUndeploy,
  onDeploy,
}: DeployModalProps) {
  const [activeTab, setActiveTab] = useState<TabView>('general')
  const [isUndeploying, setIsUndeploying] = useState(false)

  // Reset tab when opening
  useEffect(() => {
    if (open) {
      setActiveTab(isDeployed ? 'api' : 'general')
    }
  }, [open, isDeployed])

  const handleUndeploy = useCallback(async () => {
    setIsUndeploying(true)
    try {
      await onUndeploy()
      onOpenChange(false)
    } catch (err) {
      console.error('Undeploy failed:', err)
    } finally {
      setIsUndeploying(false)
    }
  }, [onUndeploy, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Workflow Deployment</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabView)}>
          <TabsList variant="line">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="mcp">MCP</TabsTrigger>
            <TabsTrigger value="a2a">A2A</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <div className="mt-4 max-h-[50vh] overflow-y-auto">
            <TabsContent value="general">
              <GeneralTab
                workflowId={workflowId}
                isDeployed={isDeployed}
                deployedAt={deployedAt}
                isUndeploying={isUndeploying}
                onUndeploy={handleUndeploy}
              />
            </TabsContent>

            <TabsContent value="api">
              <ApiTab
                workflowId={workflowId}
                isDeployed={isDeployed}
                blockStates={blockStates}
              />
            </TabsContent>

            <TabsContent value="mcp">
              <ComingSoonTab feature="MCP Tool Publishing" />
            </TabsContent>

            <TabsContent value="a2a">
              <ComingSoonTab feature="Agent-to-Agent Protocol" />
            </TabsContent>

            <TabsContent value="chat">
              <ComingSoonTab feature="Chat Widget Deployment" />
            </TabsContent>
          </div>
        </Tabs>

        {!isDeployed && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
