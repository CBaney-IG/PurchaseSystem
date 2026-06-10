'use client'

import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CostCentreTable } from '@/components/admin/CostCentreTable'
import { CostCentreForm } from '@/components/admin/CostCentreForm'
import { AdminNav } from '@/components/admin/AdminNav'
import type { Profile } from '@/types/domain'
import type { CostCentreWithOwner } from '@/lib/data/cost-centres'

interface Props {
  initialCostCentres: CostCentreWithOwner[]
  profiles: Pick<Profile, 'id' | 'full_name'>[]
  callerRole: string
}

export function CostCentresAdminClient({ initialCostCentres, profiles, callerRole }: Props) {
  const [costCentres, setCostCentres] = useState<CostCentreWithOwner[]>(initialCostCentres)
  const [showAdd, setShowAdd] = useState(false)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/cost-centres?includeInactive=true')
    const json = await res.json()
    if (json.data) setCostCentres(json.data)
  }, [])

  const active = costCentres.filter((cc) => cc.active).length

  return (
    <div className="p-8">
      <AdminNav callerRole={callerRole} />

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cost centres</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{active} active cost centres</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add cost centre
        </Button>
      </div>

      <Separator className="my-5" />

      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <CostCentreTable
          costCentres={costCentres}
          profiles={profiles}
          onRefresh={refresh}
        />
      </div>

      <CostCentreForm
        open={showAdd}
        onOpenChange={setShowAdd}
        costCentre={null}
        costCentres={costCentres}
        profiles={profiles}
        onSave={refresh}
      />
    </div>
  )
}
