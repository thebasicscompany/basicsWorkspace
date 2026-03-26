'use client'

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

// ─── SubBlockField ───────────────────────────────────────────────────────────

export function SubBlockField({
  blockId,
  config,
}: {
  blockId: string
  config: SubBlockConfig
}) {
  const [value, setValue] = useSubBlockValue(blockId, config.id)
  const label = config.title || config.id

  return (
    <div>
      <label
        className="text-[11px] font-medium block mb-1"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
        {config.required === true && (
          <span style={{ color: '#ef4444' }}> *</span>
        )}
      </label>

      {TAG_ENABLED_TYPES.has(config.type) ? (
        <TagEnabledInput blockId={blockId} config={config} />
      ) : INPUT_COMPONENTS[config.type] ? (
        (() => {
          const Component = INPUT_COMPONENTS[config.type]!
          return (
            <Component
              blockId={blockId}
              subBlockId={config.id}
              config={config}
              value={value}
              onChange={setValue}
            />
          )
        })()
      ) : (
        <TagEnabledInput blockId={blockId} config={{ ...config, type: 'short-input' as any }} />
      )}
    </div>
  )
}

// ─── Tag-enabled text inputs with controller ─────────────────────────────────

function TagEnabledInput({
  blockId,
  config,
}: {
  blockId: string
  config: SubBlockConfig
}) {
  return (
    <SubBlockInputController
      blockId={blockId}
      subBlockId={config.id}
      config={config}
    >
      {({ ref, value, disabled, onChange, onKeyDown, onDrop, onDragOver, onFocus, onScroll }) => {
        const isLong = config.type === 'long-input'
        const isCode = config.type === 'code'
        const rows = isCode ? (config.rows ?? 4) : isLong ? (config.rows ?? 3) : undefined

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
              disabled={disabled}
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
            disabled={disabled}
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
