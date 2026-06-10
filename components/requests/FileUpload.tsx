'use client'

import { useRef } from 'react'
import { X, Paperclip, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const ALLOWED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.docx,.xlsx'
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_FILES = 10

export interface SelectedFile {
  file: File
  error?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FileUploadProps {
  files: SelectedFile[]
  onChange: (files: SelectedFile[]) => void
  disabled?: boolean
  className?: string
}

export function FileUpload({ files, onChange, disabled, className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return

    const newEntries: SelectedFile[] = Array.from(incoming).map((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return { file, error: 'File type not allowed (PDF, PNG, JPG, DOCX, XLSX only)' }
      }
      if (file.size > MAX_SIZE) {
        return { file, error: 'File too large (max 10 MB)' }
      }
      return { file }
    })

    const combined = [...files, ...newEntries].slice(0, MAX_FILES)
    onChange(combined)
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50',
          disabled && 'cursor-not-allowed opacity-50',
          files.length >= MAX_FILES && 'cursor-not-allowed opacity-50'
        )}
        onClick={() => !disabled && files.length < MAX_FILES && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          if (!disabled) handleFiles(e.dataTransfer.files)
        }}
      >
        <Upload className="mb-2 h-5 w-5 text-slate-400" />
        <span>
          {files.length >= MAX_FILES
            ? `Maximum ${MAX_FILES} files reached`
            : 'Drop files here or click to browse'}
        </span>
        <span className="mt-1 text-xs text-slate-400">PDF, PNG, JPG, DOCX, XLSX — max 10 MB each</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((entry, i) => (
            <li
              key={i}
              className={cn(
                'flex items-center justify-between rounded-md border px-3 py-2 text-sm',
                entry.error ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate text-slate-700">{entry.file.name}</span>
                <span className="shrink-0 text-xs text-slate-400">{formatBytes(entry.file.size)}</span>
              </div>
              <div className="flex items-center gap-2">
                {entry.error && (
                  <span className="text-xs text-red-600">{entry.error}</span>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-slate-400 hover:text-slate-600"
                  disabled={disabled}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <p className="text-xs text-slate-400">
          {files.filter((f) => !f.error).length} of {MAX_FILES} files selected
        </p>
      )}
    </div>
  )
}

