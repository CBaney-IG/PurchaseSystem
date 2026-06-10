'use client'

import { useRef, useState } from 'react'
import { ImageIcon, FileText, Upload, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export interface ReceiptFile {
  file: File
  previewUrl: string | null // data URL for images; null for PDFs
  error?: string
}

interface ReceiptUploadProps {
  value: ReceiptFile | null
  onChange: (receipt: ReceiptFile | null) => void
}

export function ReceiptUpload({ value, onChange }: ReceiptUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function processFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      onChange({ file, previewUrl: null, error: 'File type not supported. Use JPG, PNG, or PDF.' })
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      onChange({ file, previewUrl: null, error: 'File exceeds 10 MB limit.' })
      return
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        onChange({ file, previewUrl: e.target?.result as string })
      }
      reader.readAsDataURL(file)
    } else {
      onChange({ file, previewUrl: null })
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset input so the same file can be re-selected after removal
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  if (value) {
    return (
      <div className="relative rounded-lg border border-slate-200 bg-slate-50 p-4">
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          aria-label="Remove receipt"
        >
          <X className="h-4 w-4" />
        </button>

        {value.error ? (
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-8 w-8 shrink-0" />
            <div>
              <p className="text-sm font-medium">{value.file.name}</p>
              <p className="text-xs">{value.error}</p>
            </div>
          </div>
        ) : value.previewUrl ? (
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.previewUrl}
              alt="Receipt preview"
              className="max-h-48 rounded object-contain"
            />
            <p className="text-xs text-slate-500">{value.file.name}</p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-700">{value.file.name}</p>
              <p className="text-xs text-slate-500">
                {(value.file.size / 1024).toFixed(0)} KB · PDF
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
        dragging
          ? 'border-slate-400 bg-slate-100'
          : 'border-slate-300 bg-slate-50 hover:border-slate-400'
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <ImageIcon className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-2 text-sm text-slate-600">
        Drag and drop your receipt here, or{' '}
        <button
          type="button"
          className="font-medium text-slate-800 underline underline-offset-2"
          onClick={() => inputRef.current?.click()}
        >
          browse
        </button>
      </p>
      <p className="mt-1 text-xs text-slate-400">JPG, PNG, or PDF · max 10 MB</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        Upload receipt
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
        onChange={handleFileChange}
        capture="environment"
      />
    </div>
  )
}
