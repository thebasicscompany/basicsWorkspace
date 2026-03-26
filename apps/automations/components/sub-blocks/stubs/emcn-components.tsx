'use client'

/**
 * Emcn component stubs — bridges Sim's emcn/components API to our shadcn components.
 * Sim's emcn Combobox takes `options` array prop; shadcn uses declarative children.
 * This wrapper bridges the gap.
 */
import { useState, useRef, useEffect } from 'react'
import { Check, CaretDown } from '@phosphor-icons/react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// Re-export real shadcn components
export { Button } from '@/components/ui/button'
export { Input } from '@/components/ui/input'
export { Label } from '@/components/ui/label'

export function Tooltip({ children }: any) { return <>{children}</> }
export function TooltipTrigger({ children, asChild, ...rest }: any) { return <>{children}</> }
export function TooltipContent({ children }: any) { return null }

/**
 * ComboboxOption interface matching emcn's API.
 */
export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
  description?: string
  icon?: any
  group?: string
  id?: string
}

/**
 * Combobox — emcn-compatible wrapper.
 * Takes `options` array, `value`, `onValueChange` / `onChange` and renders a searchable dropdown.
 * Uses portal-based dropdown for proper z-index layering.
 */
export function Combobox({
  children,
  value,
  selectedValue,
  onValueChange,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder,
  className,
  disabled,
  options = [],
  editable,
  multiSelectValues,
  onMultiSelectChange,
  onOpenChange,
  ...props
}: any) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const effectiveValue = selectedValue ?? value
  const effectiveOnChange = onChange ?? onValueChange

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        onOpenChange?.(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const filtered = options.filter((opt: ComboboxOption) =>
    !search || opt.label.toLowerCase().includes(search.toLowerCase()) ||
    opt.value.toLowerCase().includes(search.toLowerCase())
  )

  const selectedLabel = options.find((opt: ComboboxOption) => opt.value === effectiveValue)?.label

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          const next = !open
          setOpen(next)
          onOpenChange?.(next)
        }}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs',
          'outline-none transition-colors text-left',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        style={{
          background: 'var(--color-bg-base)',
          borderColor: 'var(--color-border)',
          color: effectiveValue ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        }}
      >
        <span className="truncate flex-1">{selectedLabel || effectiveValue || placeholder}</span>
        <CaretDown size={12} className="ml-1 shrink-0 opacity-50" />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-[9999] mt-1 w-full rounded-lg border shadow-md overflow-hidden"
          style={{
            background: 'var(--color-bg-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {searchPlaceholder !== false && (
            <div className="p-1.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={typeof searchPlaceholder === 'string' ? searchPlaceholder : 'Search...'}
                className="w-full text-xs px-2 py-1 outline-none bg-transparent"
                style={{ color: 'var(--color-text-primary)' }}
                autoFocus
              />
            </div>
          )}
          <ScrollArea style={{ maxHeight: '200px' }}>
            <div className="py-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  No results found.
                </div>
              ) : (
                filtered.map((opt: ComboboxOption) => {
                  const isSelected = multiSelectValues
                    ? multiSelectValues.includes(opt.value)
                    : opt.value === effectiveValue

                  return (
                    <button
                      key={opt.id || opt.value}
                      type="button"
                      disabled={opt.disabled}
                      className={cn(
                        'flex w-full items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer transition-colors text-left',
                        isSelected && 'bg-[var(--color-accent-light)]',
                        !isSelected && 'hover:bg-[var(--color-bg-base)]',
                        opt.disabled && 'opacity-50 cursor-not-allowed',
                      )}
                      style={{ color: 'var(--color-text-primary)' }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        if (opt.disabled) return

                        if (multiSelectValues && onMultiSelectChange) {
                          const next = multiSelectValues.includes(opt.value)
                            ? multiSelectValues.filter((v: string) => v !== opt.value)
                            : [...multiSelectValues, opt.value]
                          onMultiSelectChange(next)
                        } else {
                          effectiveOnChange?.(opt.value)
                          setOpen(false)
                          onOpenChange?.(false)
                        }
                      }}
                    >
                      {opt.icon && (
                        <span className="shrink-0">
                          {typeof opt.icon === 'function' ? opt.icon({ size: 14 }) : opt.icon}
                        </span>
                      )}
                      <span className="flex-1 truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                          {opt.description}
                        </span>
                      )}
                      {isSelected && (
                        <Check size={14} className="shrink-0" style={{ color: 'var(--color-accent)' }} />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

/**
 * Standalone ComboboxOption item — for use in render-prop patterns
 */
export function ComboboxOptionItem({ children, value, onSelect, ...props }: any) {
  return (
    <button
      type="button"
      className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-[var(--color-bg-base)] cursor-pointer transition-colors"
      style={{ color: 'var(--color-text-primary)' }}
      onClick={() => onSelect?.(value)}
      {...props}
    >
      {children}
    </button>
  )
}
