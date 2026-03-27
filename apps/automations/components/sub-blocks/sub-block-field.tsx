'use client'

import { type JSX, memo, useMemo, useRef, useState, useCallback } from 'react'
import { Warning, Copy, Check, ArrowsLeftRight } from '@phosphor-icons/react'
import type { SubBlockConfig } from '@/lib/sim/blocks/types'
import { useSubBlockValue } from './hooks/use-sub-block-value'
import { baseInputClass, baseStyle } from './shared'
import { SubBlockInputController } from './sub-block-input-controller'

// ─── Input type components ───────────────────────────────────────────────────
import { Dropdown } from './dropdown-input'
import { ComboBox } from './combobox-input'
import { SwitchInput } from './switch-input'
import { SliderInput } from './slider-input'
import { TextDisplay } from './text-display'
import { TimeInput } from './time-input'
import { CheckboxListInput } from './checkbox-list-input'
import { GroupedCheckboxListInput } from './grouped-checkbox-list-input'
import { MessagesInput } from './messages-input'
import { ConditionInput } from './condition-input'
import { EvalInput } from './eval-input'
import { Table } from './table-input'
import { VariablesInput } from './variables-input'
import { InputFormatInput, ResponseFormatInput } from './input-format'
import { FilterBuilder } from './filter-builder'
import { SortBuilder } from './sort-builder'
import { ToolInput } from './tool-input'
import { SkillInput } from './skill-input'
import { FileUploadInput } from './file-upload'
import { InputMapping } from './input-mapping'
import { SelectorInput } from './selector-input'
import { OAuthInput } from './oauth-input'
import { WorkflowSelector } from './workflow-selector'
import { McpServerSelector, McpToolSelector, McpDynamicArgs } from './mcp-inputs'
import { KnowledgeBaseSelector, KnowledgeTagFilters, DocumentTagEntry } from './knowledge-inputs'

// ─── Component map ───────────────────────────────────────────────────────────
// Use `any` for the component type since Sim components have varied prop interfaces
// (some take blockId+config, some take blockId+subBlockId, etc.)

const INPUT_COMPONENTS: Partial<Record<string, React.ComponentType<any>>> = {
  dropdown: Dropdown,
  combobox: ComboBox,
  switch: SwitchInput,
  slider: SliderInput,
  'checkbox-list': CheckboxListInput,
  'grouped-checkbox-list': GroupedCheckboxListInput,
  text: TextDisplay,
  'time-input': TimeInput,
  'messages-input': MessagesInput,
  'condition-input': ConditionInput,
  'router-input': ConditionInput,
  'eval-input': EvalInput,
  table: Table,
  'variables-input': VariablesInput,
  'input-format': InputFormatInput,
  'response-format': ResponseFormatInput,
  'filter-builder': FilterBuilder,
  'sort-builder': SortBuilder,
  'tool-input': ToolInput,
  'skill-input': SkillInput,
  'file-upload': FileUploadInput,
  'input-mapping': InputMapping,
  'oauth-input': OAuthInput,
  'file-selector': SelectorInput,
  'sheet-selector': SelectorInput,
  'project-selector': SelectorInput,
  'folder-selector': SelectorInput,
  'channel-selector': SelectorInput,
  'user-selector': SelectorInput,
  'document-selector': SelectorInput,
  'table-selector': SelectorInput,
  'workflow-selector': WorkflowSelector,
  'mcp-server-selector': McpServerSelector,
  'mcp-tool-selector': McpToolSelector,
  'mcp-dynamic-args': McpDynamicArgs,
  'knowledge-base-selector': KnowledgeBaseSelector,
  'knowledge-tag-filters': KnowledgeTagFilters,
  'document-tag-entry': DocumentTagEntry,
}

// Text-based types that get the tag controller wrapper + overlay
const TAG_ENABLED_TYPES = new Set(['short-input', 'long-input', 'code'])

// ─── Helpers from Sim's sub-block.tsx ────────────────────────────────────────

/**
 * Returns whether the field is required for validation.
 * Evaluates conditional requirements based on current field values.
 * Supports boolean, condition objects, and functions that return conditions.
 */
const isFieldRequired = (config: SubBlockConfig, subBlockValues?: Record<string, any>): boolean => {
  if (!config.required) return false
  if (typeof config.required === 'boolean') return config.required

  const evalCond = (
    cond: {
      field: string
      value: string | number | boolean | Array<string | number | boolean>
      not?: boolean
      and?: {
        field: string
        value: string | number | boolean | Array<string | number | boolean> | undefined
        not?: boolean
      }
    },
    values: Record<string, any>
  ): boolean => {
    const fieldValue = values[cond.field]?.value
    const condValue = cond.value

    let match: boolean
    if (Array.isArray(condValue)) {
      match = condValue.includes(fieldValue)
    } else {
      match = fieldValue === condValue
    }

    if (cond.not) match = !match

    if (cond.and) {
      const andFieldValue = values[cond.and.field]?.value
      const andCondValue = cond.and.value
      let andMatch: boolean
      if (Array.isArray(andCondValue)) {
        andMatch = andCondValue.includes(andFieldValue)
      } else {
        andMatch = andFieldValue === andCondValue
      }
      if (cond.and.not) andMatch = !andMatch
      match = match && andMatch
    }

    return match
  }

  const condition = typeof config.required === 'function' ? config.required() : config.required
  return evalCond(condition, subBlockValues || {})
}

/**
 * Retrieves the preview value for a specific sub-block.
 * Only returns a value when in preview mode and subBlockValues are provided.
 */
const getPreviewValue = (
  config: SubBlockConfig,
  isPreview: boolean,
  subBlockValues?: Record<string, any>
): unknown => {
  if (!isPreview || !subBlockValues) return undefined
  return subBlockValues[config.id]?.value ?? null
}

/**
 * Interface for wand control handlers exposed by sub-block inputs.
 * Stubbed — wand (AI generation) not yet wired.
 */
export interface WandControlHandlers {
  onWandTrigger: (prompt: string) => void
  isWandActive: boolean
  isWandStreaming: boolean
}

/**
 * Props for the SubBlock component.
 * Matches Sim's SubBlockProps interface.
 */
interface SubBlockProps {
  blockId: string
  config: SubBlockConfig
  isPreview?: boolean
  subBlockValues?: Record<string, any>
  disabled?: boolean
  allowExpandInPreview?: boolean
  canonicalToggle?: {
    mode: 'basic' | 'advanced'
    disabled?: boolean
    onToggle?: () => void
  }
  labelSuffix?: React.ReactNode
  dependencyContext?: Record<string, unknown>
}

/**
 * Renders the label with optional validation indicators.
 * Adapted from Sim — wand/copy/external-link stubbed.
 */
function renderLabel(
  config: SubBlockConfig,
  isValidJson: boolean,
  subBlockValues?: Record<string, any>,
  canonicalToggle?: SubBlockProps['canonicalToggle'],
  labelSuffix?: React.ReactNode
): JSX.Element | null {
  if (config.type === 'switch') return null
  if (!config.title) return null

  const required = isFieldRequired(config, subBlockValues)
  const showCanonicalToggle = !!canonicalToggle

  return (
    <div className="flex items-center justify-between gap-1.5 pl-0.5 mb-1">
      <label className="flex items-baseline gap-1.5 whitespace-nowrap text-[11px] font-medium text-[var(--color-text-secondary)]">
        {config.title}
        {required && <span className="ml-0.5 text-red-500">*</span>}
        {labelSuffix}
        {config.type === 'code' &&
          (config as any).language === 'json' &&
          !isValidJson && (
            <span className="inline-flex" title="Invalid JSON">
              <Warning size={12} className="text-red-500" />
            </span>
          )}
      </label>
      {config.description && (
        <span
          className="truncate text-[10px] text-[var(--color-text-tertiary)]"
          title={config.description}
        >
          {config.description}
        </span>
      )}
      {showCanonicalToggle && (
        <button
          type="button"
          onClick={canonicalToggle.onToggle}
          disabled={canonicalToggle.disabled}
          className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-base)] disabled:opacity-50"
          title={`Switch to ${canonicalToggle.mode === 'basic' ? 'advanced' : 'basic'} mode`}
        >
          <ArrowsLeftRight size={10} />
          {canonicalToggle.mode === 'basic' ? 'Advanced' : 'Basic'}
        </button>
      )}
    </div>
  )
}

// ─── SubBlockField ───────────────────────────────────────────────────────────

export const SubBlockField = memo(function SubBlockField({
  blockId,
  config,
  isPreview = false,
  subBlockValues,
  disabled = false,
  canonicalToggle,
  labelSuffix,
  dependencyContext,
}: SubBlockProps) {
  const [value, setValue] = useSubBlockValue(blockId, config.id)
  const [isValidJson, setIsValidJson] = useState(true)

  // Derive preview value
  const previewValue = getPreviewValue(config, isPreview, subBlockValues)

  // Build component props — spread config fields that sub-components need
  const componentProps = useMemo(
    () => ({
      blockId,
      subBlockId: config.id,
      config,
      value: isPreview ? previewValue : value,
      onChange: setValue,
      isPreview,
      previewValue,
      disabled,
      placeholder: config.placeholder,
      // Dropdown-specific
      options: (config as any).options,
      defaultValue: (config as any).defaultValue,
      multiSelect: (config as any).multiSelect,
      fetchOptions: (config as any).fetchOptions,
      fetchOptionById: (config as any).fetchOptionById,
      dependsOn: (config as any).dependsOn,
      searchable: (config as any).searchable,
      // Slider-specific
      min: (config as any).min,
      max: (config as any).max,
      step: (config as any).step,
    }),
    [blockId, config, value, setValue, isPreview, previewValue, disabled]
  )

  return (
    <div>
      {renderLabel(config, isValidJson, subBlockValues, canonicalToggle, labelSuffix)}

      {TAG_ENABLED_TYPES.has(config.type) ? (
        <TagEnabledInput
          blockId={blockId}
          config={config}
          isPreview={isPreview}
          disabled={disabled}
        />
      ) : INPUT_COMPONENTS[config.type] ? (
        (() => {
          const Component = INPUT_COMPONENTS[config.type]!
          return <Component {...componentProps} />
        })()
      ) : (
        <TagEnabledInput
          blockId={blockId}
          config={{ ...config, type: 'short-input' as any }}
          isPreview={isPreview}
          disabled={disabled}
        />
      )}
    </div>
  )
})

// ─── Tag-enabled text inputs with controller ─────────────────────────────────

function TagEnabledInput({
  blockId,
  config,
  isPreview = false,
  disabled = false,
}: {
  blockId: string
  config: SubBlockConfig
  isPreview?: boolean
  disabled?: boolean
}) {
  return (
    <SubBlockInputController
      blockId={blockId}
      subBlockId={config.id}
      config={config}
    >
      {({ ref, value, disabled: ctrlDisabled, onChange, onKeyDown, onDrop, onDragOver, onFocus, onScroll }) => {
        const isLong = config.type === 'long-input'
        const isCode = config.type === 'code'
        const rows = isCode ? (config.rows ?? 4) : isLong ? (config.rows ?? 3) : undefined
        const isDisabled = disabled || ctrlDisabled || isPreview

        if (isLong || isCode) {
          return (
            <textarea
              ref={ref as React.RefObject<HTMLTextAreaElement>}
              rows={rows}
              value={value}
              onChange={onChange}
              onKeyDown={onKeyDown}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onFocus={onFocus}
              onScroll={onScroll}
              placeholder={config.placeholder}
              disabled={isDisabled}
              className={`${baseInputClass} resize-none ${isCode ? 'font-mono' : ''}`}
              style={{
                ...baseStyle,
                background: 'var(--color-bg-base)',
              }}
            />
          )
        }

        // Short input
        return (
          <input
            ref={ref as React.RefObject<HTMLInputElement>}
            type={config.password ? 'password' : 'text'}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onFocus={onFocus}
            placeholder={config.placeholder}
            readOnly={config.readOnly}
            disabled={isDisabled}
            className={baseInputClass}
            style={{
              ...baseStyle,
              background: 'var(--color-bg-base)',
            }}
          />
        )
      }}
    </SubBlockInputController>
  )
}
