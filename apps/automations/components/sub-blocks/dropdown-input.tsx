'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSubBlockValue } from '@/apps/automations/components/sub-blocks/hooks/use-sub-block-value'
import type { SubBlockConfig } from '@/lib/sim/blocks/types'

interface DropdownOption {
  label: string
  id: string
  icon?: any
  disabled?: boolean
}

interface DropdownProps {
  blockId: string
  subBlockId: string
  config?: SubBlockConfig
  isPreview?: boolean
  previewValue?: string | null
  disabled?: boolean
  // Legacy props from SubBlockField — ignored, we read from store
  value?: any
  onChange?: any
}

export const Dropdown = memo(function Dropdown({
  blockId,
  subBlockId,
  config,
  isPreview,
  previewValue,
  disabled,
}: DropdownProps) {
  const [storeValue, setStoreValue] = useSubBlockValue<string>(blockId, subBlockId)
  const [fetchedOptions, setFetchedOptions] = useState<DropdownOption[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const value = isPreview ? previewValue : storeValue
  const options = config?.options

  // Evaluate static options
  const staticOptions = useMemo(() => {
    const opts = typeof options === 'function' ? options() : options ?? []
    return opts as DropdownOption[]
  }, [options])

  // Fetch dynamic options if fetchOptions is defined
  useEffect(() => {
    if (!config?.fetchOptions || isPreview || disabled) return
    let cancelled = false
    setIsLoading(true)
    config.fetchOptions(blockId, subBlockId).then((result: any) => {
      if (!cancelled) {
        setFetchedOptions(Array.isArray(result) ? result : [])
        setIsLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [config?.fetchOptions, blockId, isPreview, disabled])

  const allOptions = useMemo(() => {
    return config?.fetchOptions && fetchedOptions.length > 0
      ? fetchedOptions
      : staticOptions
  }, [config?.fetchOptions, fetchedOptions, staticOptions])

  const handleChange = useCallback((newValue: string | null) => {
    if (!isPreview && !disabled && newValue) {
      setStoreValue(newValue)
    }
  }, [isPreview, disabled, setStoreValue])

  const displayValue = typeof value === 'string' ? value : ''

  return (
    <Select
      value={displayValue}
      onValueChange={handleChange}
      disabled={isPreview || disabled || isLoading}
    >
      <SelectTrigger
        size="sm"
        className="w-full text-xs"
      >
        <SelectValue placeholder={config?.placeholder ?? 'Select...'} />
      </SelectTrigger>
      <SelectContent>
        {allOptions.map((opt) => {
          const optId = typeof opt === 'string' ? opt : opt.id
          const optLabel = typeof opt === 'string' ? opt : opt.label
          return (
            <SelectItem key={optId} value={optId} disabled={(opt as DropdownOption)?.disabled}>
              {optLabel}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
})
