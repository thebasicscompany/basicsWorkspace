'use client'

/**
 * Emcn compatibility layer — bridges Sim's emcn API to our shadcn/base-ui components.
 * Uses REAL shadcn Popover, Tooltip, etc. — no hand-rolled div stubs.
 */

// ─── Re-exports from real shadcn components ─────────────────────────────────

export { Button } from '@/components/ui/button'
export { Badge } from '@/components/ui/badge'
export { ScrollArea as PopoverScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
export { cn }
export { Input } from '@/components/ui/input'
export { Label } from '@/components/ui/label'
export { Textarea } from '@/components/ui/textarea'
export { Switch } from '@/components/ui/switch'

// ─── Popover (real shadcn, plus emcn-specific extras) ───────────────────────

import {
  Popover as ShadcnPopover,
  PopoverContent as ShadcnPopoverContent,
  PopoverTrigger as ShadcnPopoverTrigger,
} from '@/components/ui/popover'
import React from 'react'

// Popover — pass through to real shadcn, accept emcn's open/onOpenChange
export function Popover({ children, open, onOpenChange, ...props }: any) {
  return <ShadcnPopover open={open} onOpenChange={onOpenChange} {...props}>{children}</ShadcnPopover>
}

// PopoverTrigger — handle emcn's `asChild` by using base-ui's `render` prop
export function PopoverTrigger({ children, asChild, ...props }: any) {
  if (asChild && React.isValidElement(children)) {
    return <ShadcnPopoverTrigger render={children as React.ReactElement} {...props} />
  }
  return <ShadcnPopoverTrigger {...props}>{children}</ShadcnPopoverTrigger>
}

// PopoverContent — map emcn props (minWidth, etc.) to shadcn
export function PopoverContent({ children, minWidth, maxHeight, className, style, ...props }: any) {
  return (
    <ShadcnPopoverContent
      className={cn('w-auto p-1', className)}
      style={{ minWidth, maxHeight, ...style }}
      {...props}
    >
      {children}
    </ShadcnPopoverContent>
  )
}

// emcn extras that don't exist in shadcn — simple styled wrappers
export function PopoverAnchor({ children }: any) { return children ?? null }

export function PopoverDivider({ rootOnly, ...props }: any) {
  return <div className="mx-2 my-1 border-t" style={{ borderColor: 'var(--color-border)' }} {...props} />
}

export function PopoverSection({ children, rootOnly, ...props }: any) {
  return (
    <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider"
      style={{ color: 'var(--color-text-tertiary)' }} {...props}>
      {children}
    </div>
  )
}

export function PopoverItem({ children, active, rootOnly, ...props }: any) {
  return (
    <div
      role="option"
      data-active={active}
      className="px-2 py-1.5 text-xs cursor-pointer transition-colors rounded"
      style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
      {...props}
    >
      {children}
    </div>
  )
}

export function PopoverFolder({ children, title, id, active, onSelect, onMouseEnter, ...props }: any) {
  return <div {...props}>{children}</div>
}

export function usePopoverContext() {
  return {
    isKeyboardNav: false,
    setKeyboardNav: () => {},
    isInFolder: false,
    closeFolder: () => {},
    openFolder: () => {},
    currentFolder: null,
    size: 'sm',
  }
}

// ─── Tooltip (real shadcn, compound component pattern for emcn compat) ──────

import {
  Tooltip as ShadcnTooltip,
  TooltipTrigger as ShadcnTooltipTrigger,
  TooltipContent as ShadcnTooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'

function TooltipRoot({ children, ...props }: any) {
  return (
    <TooltipProvider>
      <ShadcnTooltip {...props}>{children}</ShadcnTooltip>
    </TooltipProvider>
  )
}
function TooltipTriggerCompat({ children, asChild, ...props }: any) {
  return <ShadcnTooltipTrigger {...props}>{children}</ShadcnTooltipTrigger>
}
function TooltipContentCompat({ children, ...props }: any) {
  return <ShadcnTooltipContent {...props}>{children}</ShadcnTooltipContent>
}

export const Tooltip = Object.assign(TooltipRoot, {
  Root: TooltipRoot,
  Trigger: TooltipTriggerCompat,
  Content: TooltipContentCompat,
})
export { TooltipTriggerCompat as TooltipTrigger, TooltipContentCompat as TooltipContent }

// ─── Code editor helpers (Prism-based) ──────────────────────────────────────

import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-python'

export const languages = Prism.languages
export const highlight = Prism.highlight
export const CODE_LINE_HEIGHT_PX = 20

function CodeRoot({ children, className, ...props }: any) {
  return <code className={`font-mono text-xs ${className ?? ''}`} {...props}>{children}</code>
}
function CodeContainer({ children, className, ...props }: any) {
  return <div className={`relative ${className ?? ''}`} {...props}>{children}</div>
}
function CodeGutter({ children, className, width, ...props }: any) {
  return (
    <div className={`absolute left-0 top-0 text-right select-none text-[10px] ${className ?? ''}`}
      style={{ width, color: 'var(--color-text-tertiary)' }} {...props}>
      {children}
    </div>
  )
}
function CodeContent({ children, className, paddingLeft, ...props }: any) {
  return <div className={className} style={{ paddingLeft }} {...props}>{children}</div>
}
function CodePlaceholder({ children, className, ...props }: any) {
  return (
    <div className={`absolute pointer-events-none ${className ?? ''}`}
      style={{ color: 'var(--color-text-tertiary)' }} {...props}>
      {children}
    </div>
  )
}

export const Code = Object.assign(CodeRoot, {
  Container: CodeContainer,
  Gutter: CodeGutter,
  Content: CodeContent,
  Placeholder: CodePlaceholder,
})

export function calculateGutterWidth(codeOrLineCount: string | number): number {
  const lineCount = typeof codeOrLineCount === 'number'
    ? codeOrLineCount
    : (codeOrLineCount.match(/\n/g) || []).length + 1
  return Math.max(30, String(lineCount).length * 10 + 20)
}

export function getCodeEditorProps(_opts?: any) {
  return {
    style: {
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      fontSize: '12px',
      lineHeight: '1.5',
    },
  }
}

// ─── Combobox (emcn-compatible wrapper) ─────────────────────────────────────

export { Combobox, ComboboxOptionItem } from '@/apps/automations/components/sub-blocks/stubs/emcn-components'
export type { ComboboxOption } from '@/apps/automations/components/sub-blocks/stubs/emcn-components'
export interface ComboboxOptionGroup { label: string; options: any[] }
