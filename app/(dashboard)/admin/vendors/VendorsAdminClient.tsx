'use client'

import { useState, useCallback } from 'react'
import { Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { VendorTable } from '@/components/admin/VendorTable'
import { VendorForm } from '@/components/admin/VendorForm'
import { VendorCSVImport } from '@/components/admin/VendorCSVImport'
import { AdminNav } from '@/components/admin/AdminNav'
import type { Vendor } from '@/types/domain'

interface Props {
  initialVendors: Vendor[]
  callerRole: string
}

export function VendorsAdminClient({ initialVendors, callerRole }: Props) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/vendors?includeInactive=true')
    const json = await res.json()
    if (json.data) setVendors(json.data)
  }, [])

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <AdminNav callerRole={callerRole} />

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Vendor catalogue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {vendors.filter((v) => v.status === 'active').length} active vendors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add vendor
          </Button>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="mb-4">
        <Input
          placeholder="Search by name or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <VendorTable vendors={filtered} onRefresh={refresh} />
      </div>

      <VendorForm
        open={showAdd}
        onOpenChange={setShowAdd}
        vendor={null}
        onSave={refresh}
      />

      <VendorCSVImport
        open={showImport}
        onOpenChange={setShowImport}
        onImported={refresh}
      />
    </div>
  )
}
