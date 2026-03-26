'use client'

import { useCallback, useState } from 'react'
import { UploadSimple, File, Trash, X } from '@phosphor-icons/react'
import type { SubBlockInputProps } from './shared'

interface UploadedFile {
  name: string
  size: number
  type: string
  path?: string
}

export function FileUploadInput({ config, value, onChange }: SubBlockInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const files: UploadedFile[] = Array.isArray(value) ? value : value ? [value] : []

  const maxSize = (config as any).maxSize ?? 10 // MB
  const acceptedTypes = (config as any).acceptedTypes ?? ''
  const multiple = (config as any).multiple ?? false

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const validated = newFiles.filter((f) => {
        if (f.size > maxSize * 1024 * 1024) return false
        if (acceptedTypes) {
          const allowed = acceptedTypes.split(',').map((t: string) => t.trim())
          if (!allowed.some((t: string) => f.type.match(t))) return false
        }
        return true
      })

      const uploaded: UploadedFile[] = validated.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      }))

      if (multiple) {
        onChange([...files, ...uploaded])
      } else {
        onChange(uploaded[0] ?? null)
      }
    },
    [files, onChange, maxSize, acceptedTypes, multiple]
  )

  const removeFile = useCallback(
    (idx: number) => {
      if (multiple) {
        onChange(files.filter((_, i) => i !== idx))
      } else {
        onChange(null)
      }
    },
    [files, onChange, multiple]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      addFiles(Array.from(e.dataTransfer.files))
    },
    [addFiles]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(Array.from(e.target.files))
      }
    },
    [addFiles]
  )

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        className="flex flex-col items-center gap-1.5 px-4 py-4 rounded-lg cursor-pointer transition-colors"
        style={{
          border: `1px dashed ${isDragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
          background: isDragging ? 'var(--color-accent-light)' : 'var(--color-bg-base)',
        }}
        onClick={() =>
          document.getElementById('file-upload-input')?.click()
        }
      >
        <UploadSimple
          size={16}
          style={{
            color: isDragging
              ? 'var(--color-accent)'
              : 'var(--color-text-tertiary)',
          }}
        />
        <p
          className="text-[10px] text-center"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Drop files here or click to upload
          {maxSize && (
            <>
              <br />
              Max {maxSize}MB
            </>
          )}
        </p>
        <input
          id="file-upload-input"
          type="file"
          accept={acceptedTypes}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-2 py-1 rounded-lg"
              style={{
                background: 'var(--color-bg-base)',
                border: '1px solid var(--color-border)',
              }}
            >
              <File
                size={12}
                style={{ color: 'var(--color-text-secondary)' }}
              />
              <span
                className="text-xs flex-1 truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {file.name}
              </span>
              <span
                className="text-[10px]"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {(file.size / 1024).toFixed(0)}KB
              </span>
              <button
                onClick={() => removeFile(idx)}
                className="p-0.5 rounded hover:bg-zinc-100 transition-colors"
              >
                <X
                  size={10}
                  style={{ color: 'var(--color-text-tertiary)' }}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
