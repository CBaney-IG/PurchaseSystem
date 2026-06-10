'use client'

import { useState, useTransition } from 'react'
import { Pencil, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { VendorForm } from './VendorForm'
import type { Vendor } from '@/types/domain'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 hover:bg-green-100',
  inactive: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
}

interface Props {
  vendors: Vendor[]
  onRefresh: () => void
}

export function VendorTable({ vendors, onRefresh }: Props) {
  const [, startTransition] = useTransition()
  const [editTarget, setEditTarget] = useState<Vendor | null>(null)

  async function togglePreferred(vendor: Vendor) {
    await fetch('/api/admin/vendors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: vendor.id, preferred: !vendor.preferred }),
    })
    startTransition(() => onRefresh())
  }

  async function toggleStatus(vendor: Vendor) {
    const newStatus = vendor.status === 'active' ? 'inactive' : 'active'
    await fetch('/api/admin/vendors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: vendor.id, status: newStatus }),
    })
    startTransition(() => onRefresh())
  }

  if (vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No vendors found</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Preferred</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((vendor) => (
            <TableRow key={vendor.id} className={vendor.status === 'inactive' ? 'opacity-60' : ''}>
              <TableCell className="font-medium">{vendor.name}</TableCell>
              <TableCell className="text-muted-foreground">{vendor.category}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {vendor.contact_name && <span className="block">{vendor.contact_name}</span>}
                {vendor.contact_email && (
                  <span className="block text-xs">{vendor.contact_email}</span>
                )}
                {!vendor.contact_name && !vendor.contact_email && '—'}
              </TableCell>
              <TableCell>
                {vendor.preferred ? (
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Preferred</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={STATUS_STYLES[vendor.status] ?? STATUS_STYLES.inactive}
                >
                  {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Vendor actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditTarget(vendor)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => togglePreferred(vendor)}>
                      {vendor.preferred ? 'Remove preferred' : 'Mark as preferred'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => toggleStatus(vendor)}>
                      {vendor.status === 'active' ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <VendorForm
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        vendor={editTarget}
        onSave={() => startTransition(() => onRefresh())}
      />
    </>
  )
}
