'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Entity } from '@/types/domain'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20)
    .regex(/^[A-Z0-9-]+$/, 'Uppercase letters, numbers, and hyphens only'),
  parent_id: z.string().uuid().nullable().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  entity?: Entity | null
  entities: Entity[]
  onSuccess: () => void
}

export function EntityForm({ open, onOpenChange, entity, entities, onSuccess }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const isEdit = !!entity

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: {
      name: entity?.name ?? '',
      code: entity?.code ?? '',
      parent_id: entity?.parent_id ?? null,
    },
  })

  const { isSubmitting } = form.formState

  const parentOptions = entities.filter(
    (e) => e.active && e.id !== entity?.id
  )

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      const res = await fetch('/api/admin/entities', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: entity.id, ...values } : values),
      })
      const json = await res.json()
      if (!res.ok) {
        setServerError(
          json.error?.code === 'DUPLICATE_CODE'
            ? `The code "${values.code}" is already in use by another entity.`
            : (json.error?.message ?? 'Save failed')
        )
        return
      }
      form.reset()
      onSuccess()
      onOpenChange(false)
    } catch {
      setServerError('Network error — please try again')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit entity' : 'New entity'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity name</FormLabel>
                  <FormControl>
                    <Input placeholder="BPO Operations" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="BPO-OPS"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      disabled={isEdit}
                    />
                  </FormControl>
                  <FormDescription>
                    {isEdit
                      ? 'Entity code cannot be changed after creation'
                      : 'Unique identifier — uppercase letters, numbers, hyphens'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent entity (optional)</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                    value={field.value ?? '__none__'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="None (top-level entity)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None (top-level)</SelectItem>
                      {parentOptions.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} ({e.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Save changes' : 'Create entity'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
