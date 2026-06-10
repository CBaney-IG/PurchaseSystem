'use client'

import { useState, useCallback } from 'react'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ApprovalMatrixGrid } from '@/components/admin/ApprovalMatrixGrid'
import { SimulatePathTool } from '@/components/admin/SimulatePathTool'
import { AdminNav } from '@/components/admin/AdminNav'
import type { ApprovalMatrix } from '@/types/domain'

interface Props {
  initialMatrix: ApprovalMatrix[]
  categories: string[]
  callerRole: string
}

export function ApprovalMatrixAdminClient({ initialMatrix, categories, callerRole }: Props) {
  const [matrix, setMatrix] = useState<ApprovalMatrix[]>(initialMatrix)
  const [showSimulate, setShowSimulate] = useState(false)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/approval-matrix')
    const json = await res.json()
    if (json.data) setMatrix(json.data)
  }, [])

  return (
    <div className="p-8">
      <AdminNav callerRole={callerRole} />

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Approval matrix</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            DOA configuration — click any cell to edit thresholds. Changes take effect immediately for new requests.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSimulate(true)}>
          <Play className="mr-1.5 h-4 w-4" />
          Simulate approval path
        </Button>
      </div>

      <Separator className="my-5" />

      <Alert className="mb-5">
        <AlertDescription className="text-sm">
          <strong>How the matrix works:</strong> A request routes through all levels whose threshold it exceeds.
          For example, a R6,000 IT Hardware request requires L1 approval (threshold R5,000), then automatically escalates to L2.
          Click a cell to edit; click <strong>+</strong> in an empty cell to add a new level.
        </AlertDescription>
      </Alert>

      <div className="rounded-md border border-slate-200 bg-white p-4 overflow-hidden">
        <ApprovalMatrixGrid matrix={matrix} onRefresh={refresh} />
      </div>

      <SimulatePathTool
        open={showSimulate}
        onOpenChange={setShowSimulate}
        categories={categories}
      />
    </div>
  )
}
