/**
 * Selector combobox component.
 * Adapted from Sim's sub-block/components/selector-combobox/selector-combobox.tsx
 * Uses our UI primitives instead of Sim's emcn components.
 */
'use client'

import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { SubBlockInputController } from '@/apps/automations/components/sub-blocks/sub-block-input-controller'
import { useSubBlockValue } from '@/apps/automations/components/sub-blocks/hooks/use-sub-block-value'
import type { SubBlockConfig } from '@/lib/sim/blocks/types'
import type { SelectorContext, SelectorKey } from '@/hooks/selectors/types'
import {
  useSelectorOptionDetail,
  useSelectorOptionMap,
  useSelectorOptions,
} from '@/hooks/selectors/use-selector-query'

interface SelectorComboboxProps {
  blockId: string
  subBlock: SubBlockConfig
  selectorKey: SelectorKey
  selectorContext: SelectorContext
  disabled?: boolean
  isPreview?: boolean
  previewValue?: string | null
  placeholder?: string
  readOnly?: boolean
  onOptionChange?: (value: string) => void
  allowSearch?: boolean
  missingOptionLabel?: string
}

export function SelectorCombobox({
  blockId,
  subBlock,
  selectorKey,
  selectorContext,
  disabled,
  isPreview,
  previewValue,
  placeholder,
  readOnly,
  onOptionChange,
  allowSearch = true,
  missingOptionLabel,
}: SelectorComboboxProps) {
  const [storeValueRaw, setStoreValue] = useSubBlockValue<string | null | undefined>(
    blockId,
    subBlock.id
  )
  const storeValue = storeValueRaw ?? undefined
  const previewedValue = previewValue ?? undefined
  const activeValue: string | undefined = isPreview ? previewedValue : storeValue
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const {
    data: options = [],
    isLoading,
    error,
  } = useSelectorOptions(selectorKey, {
    context: selectorContext,
    search: allowSearch ? searchTerm : undefined,
  })
  const { data: detailOption } = useSelectorOptionDetail(selectorKey, {
    context: selectorContext,
    detailId: activeValue,
  })
  const optionMap = useSelectorOptionMap(options, detailOption ?? undefined)
  const hasMissingOption =
    Boolean(activeValue) &&
    Boolean(missingOptionLabel) &&
    !isLoading &&
    !optionMap.get(activeValue!)
  const selectedLabel = activeValue
    ? hasMissingOption
      ? missingOptionLabel
      : (optionMap.get(activeValue)?.label ?? activeValue)
    : ''
  const [inputValue, setInputValue] = useState(selectedLabel)
  const previousActiveValue = useRef<string | undefined>(activeValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (previousActiveValue.current !== activeValue) {
      previousActiveValue.current = activeValue
      setIsOpen(false)
    }
  }, [activeValue])

  useEffect(() => {
    if (!allowSearch) return
    if (!isOpen) {
      setInputValue(selectedLabel)
    }
  }, [selectedLabel, allowSearch, isOpen])

  const comboboxOptions = useMemo(
    () =>
      Array.from(optionMap.values()).map((option) => ({
        label: option.label,
        value: option.id,
      })),
    [optionMap]
  )

  const handleSelection = useCallback(
    (value: string) => {
      if (readOnly || disabled) return
      setStoreValue(value)
      setIsOpen(false)
      onOptionChange?.(value)
    },
    [setStoreValue, onOptionChange, readOnly, disabled]
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (readOnly || disabled) return
      setStoreValue(null)
      setInputValue('')
      onOptionChange?.('')
    },
    [setStoreValue, onOptionChange, readOnly, disabled]
  )

  const filteredOptions = useMemo(() => {
    if (!allowSearch || !searchTerm) return comboboxOptions
    const lower = searchTerm.toLowerCase()
    return comboboxOptions.filter((o) => o.label.toLowerCase().includes(lower))
  }, [comboboxOptions, searchTerm, allowSearch])

  const showClearButton = Boolean(activeValue) && !disabled && !readOnly

  return (
    <div className="w-full">
      <SubBlockInputController
        blockId={blockId}
        subBlockId={subBlock.id}
        config={subBlock}
        value={activeValue ?? ''}
        disabled={disabled || readOnly}
        isPreview={isPreview}
      >
        {({ ref, onDrop, onDragOver }) => (
          <div className="relative w-full">
            <input
              ref={(el) => {
                (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
                if (typeof ref === 'function') (ref as any)(el)
                else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el
              }}
              type="text"
              value={allowSearch ? inputValue : (selectedLabel || '')}
              onChange={(e) => {
                if (!allowSearch) return
                setInputValue(e.target.value)
                setSearchTerm(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              onBlur={() => setTimeout(() => setIsOpen(false), 200)}
              placeholder={placeholder || subBlock.placeholder || 'Select an option'}
              disabled={disabled || readOnly}
              readOnly={!allowSearch}
              className="w-full rounded-md border px-3 py-1.5 text-sm"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-bg-surface)',
                paddingRight: showClearButton ? '60px' : undefined,
              }}
              onDrop={onDrop as any}
              onDragOver={onDragOver as any}
            />
            {showClearButton && (
              <button
                type="button"
                className="absolute top-1/2 right-[8px] z-10 -translate-y-1/2 p-1 opacity-50 hover:opacity-100"
                onClick={handleClear}
              >
                <X size={14} />
              </button>
            )}
            {isOpen && filteredOptions.length > 0 && (
              <div
                className="absolute z-50 mt-1 w-full rounded-md border shadow-md"
                style={{
                  background: 'var(--color-bg-surface)',
                  borderColor: 'var(--color-border)',
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    className="cursor-pointer px-3 py-1.5 text-sm hover:bg-black/5"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelection(opt.value)
                      setInputValue(opt.label)
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
            {isLoading && (
              <div className="absolute top-1/2 right-[28px] -translate-y-1/2 text-xs opacity-50">
                Loading...
              </div>
            )}
          </div>
        )}
      </SubBlockInputController>
    </div>
  )
}
