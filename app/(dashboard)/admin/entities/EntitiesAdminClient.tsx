'use client'

import { useState, useCallback } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EntityForm } from '@/components/admin/EntityForm'
import { AdminNav } from '@/components/admin/AdminNav'
import type { Entity } from '@/types/domain'

interface Props {
  initialEntities: Entity[]
  callerRole: string
}

export function EntitiesAdminClient({ initialEntities, callerRole }: Props) {
  const [entities, setEntities] = useState<Entity[]>(initialEntities)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Entity | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Entity | null>(null)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/entities')
    if (res.ok) {
      const json = await res.json()
      setEntities(json.data ?? [])
    }
  }, [])

  async function handleToggleActive() {
    if (!toggleTarget) return
    await fetch('/api/admin/entities', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: toggleTarget.id, active: !toggleTarget.active }),
    })
    setToggleTarget(null)
    refresh()
  }

  return (
    <div className="p-8">
      <AdminNav callerRole={callerRole} />

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Entities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {entities.length} entit{entities.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <Button onClick={() => { setEditTarget(null); setFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          New entity
        </Button>
      </div>

      {entities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">No entities yet</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.map((entity) => (
              <TableRow key={entity.id} className={!entity.active ? 'opacity-60' : ''}>
                <TableCell className="font-medium">{entity.name}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{entity.code}</code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {entity.parent ? `${entity.parent.name} (${entity.parent.code})` : '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={entity.active ? 'default' : 'secondary'}
                    className={
                      entity.active
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : 'bg-slate-100 text-slate-600'
                    }
                  >
                    {entity.active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setEditTarget(entity); setFormOpen(true) }}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setToggleTarget(entity)}
                    >
                      {entity.active ? (
                        <ToggleLeft className="h-4 w-4 text-destructive" />
                      ) : (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      )}
                      <span className="sr-only">{entity.active ? 'Deactivate' : 'Activate'}</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <EntityForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditTarget(null) }}
        entity={editTarget}
        entities={entities}
        onSuccess={refresh}
      />

      {/* Toggle active confirmation */}
      <Dialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggleTarget?.active ? 'Deactivate' : 'Activate'} entity
            </DialogTitle>
            <DialogDescription>
              {toggleTarget?.active
                ? `Users in "${toggleTarget?.name}" will no longer be able to submit requests. Existing data is preserved.`
                : `"${toggleTarget?.name}" will be available again for new requests.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleTarget(null)}>Cancel</Button>
            <Button
              variant={toggleTarget?.active ? 'destructive' : 'default'}
              onClick={handleToggleActive}
            >
              {toggleTarget?.active ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
