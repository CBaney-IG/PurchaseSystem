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
import { CostCentreForm } from './CostCentreForm'
import type { Profile } from '@/types/domain'
import type { CostCentreWithOwner } from '@/lib/data/cost-centres'

interface Props {
  costCentres: CostCentreWithOwner[]
  profiles: Pick<Profile, 'id' | 'full_name'>[]
  onRefresh: () => void
}

export function CostCentreTable({ costCentres, profiles, onRefresh }: Props) {
  const [, startTransition] = useTransition()
  const [editTarget, setEditTarget] = useState<CostCentreWithOwner | null>(null)

  async function toggleActive(cc: CostCentreWithOwner) {
    await fetch('/api/admin/cost-centres', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cc.id, active: !cc.active }),
    })
    startTransition(() => onRefresh())
  }

  if (costCentres.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No cost centres found</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Budget owner</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {costCentres.map((cc) => (
            <TableRow key={cc.id} className={!cc.active ? 'opacity-60' : ''}>
              <TableCell className="font-mono text-sm font-medium">{cc.code}</TableCell>
              <TableCell>{cc.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {cc.budget_owner?.full_name ?? '—'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {cc.parent ? `${cc.parent.code} — ${cc.parent.name}` : '—'}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={
                    cc.active
                      ? 'bg-green-100 text-green-800 hover:bg-green-100'
                      : 'bg-slate-100 text-slate-600'
                  }
                >
                  {cc.active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Cost centre actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditTarget(cc)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => toggleActive(cc)}>
                      {cc.active ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CostCentreForm
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        costCentre={editTarget}
        costCentres={costCentres}
        profiles={profiles}
        onSave={() => startTransition(() => onRefresh())}
      />
    </>
  )
}
