'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ParsedRow {
  name: string
  category: string
  contact_name: string | null
  contact_email: string | null
  preferred: boolean
}

interface RowError {
  row: number
  message: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

const OPTIONAL_COLS = ['contact_name', 'contact_email', 'preferred']

export function VendorCSVImport({ open, onOpenChange, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [validRows, setValidRows] = useState<ParsedRow[]>([])
  const [rowErrors, setRowErrors] = useState<RowError[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  function reset() {
    setValidRows([])
    setRowErrors([])
    setFileName(null)
    setServerError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setServerError(null)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const errors: RowError[] = []
        const rows: ParsedRow[] = []

        results.data.forEach((raw, idx) => {
          const rowNum = idx + 2 // +2 = header row + 1-indexed
          const name = raw.name?.trim()
          const category = raw.category?.trim()

          if (!name) {
            errors.push({ row: rowNum, message: 'name is required' })
            return
          }
          if (!category) {
            errors.push({ row: rowNum, message: 'category is required' })
            return
          }

          const email = raw.contact_email?.trim() || null
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push({ row: rowNum, message: `invalid contact_email: ${email}` })
            return
          }

          rows.push({
            name,
            category,
            contact_name: raw.contact_name?.trim() || null,
            contact_email: email,
            preferred: raw.preferred?.toLowerCase() === 'true',
          })
        })

        setValidRows(rows)
        setRowErrors(errors)
      },
    })
  }

  async function handleImport() {
    if (validRows.length === 0) return
    setImporting(true)
    setServerError(null)

    const res = await fetch('/api/admin/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: validRows }),
    })
    const json = await res.json()

    if (!res.ok) {
      setServerError(json.error?.message ?? 'Import failed')
      setImporting(false)
      return
    }

    setImporting(false)
    onOpenChange(false)
    reset()
    onImported()
  }

  function handleOpenChange(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Import vendors from CSV</DialogTitle>
          <DialogDescription>
            Required columns: <code className="text-xs bg-slate-100 px-1 rounded">name</code>,{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">category</code>.
            Optional:{' '}
            {OPTIONAL_COLS.map((c) => (
              <code key={c} className="text-xs bg-slate-100 px-1 rounded mr-1">{c}</code>
            ))}
            . The <code className="text-xs bg-slate-100 px-1 rounded">preferred</code> column accepts <em>true</em> or <em>false</em>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-slate-400 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm text-slate-600">
              {fileName ? fileName : 'Click to select a CSV file'}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {(validRows.length > 0 || rowErrors.length > 0) && (
            <div className="space-y-2">
              {validRows.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>{validRows.length} row{validRows.length !== 1 ? 's' : ''} ready to import</span>
                </div>
              )}
              {rowErrors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{rowErrors.length} row{rowErrors.length !== 1 ? 's' : ''} with errors (will be skipped)</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {rowErrors.map((e) => (
                      <p key={e.row} className="text-xs text-red-600 pl-6">
                        Row {e.row}: {e.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {fileName && (
            <Button variant="ghost" size="sm" onClick={reset} className="mr-auto">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          <Button
            onClick={handleImport}
            disabled={validRows.length === 0 || importing}
          >
            {importing ? 'Importing…' : `Import ${validRows.length} vendor${validRows.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
