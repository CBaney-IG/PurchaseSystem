'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

const schema = z.object({
  delegate_id: z.string().uuid('Please select a delegate'),
  valid_from: z.string().min(1, 'Start date is required'),
  valid_until: z.string().min(1, 'End date is required'),
  reason: z.string().max(500).optional(),
}).refine(
  (d) => new Date(d.valid_until) > new Date(d.valid_from),
  { message: 'End date must be after start date', path: ['valid_until'] }
)

type FormValues = z.infer<typeof schema>

interface Approver {
  id: string
  full_name: string
  email: string
}

interface DelegationFormProps {
  potentialDelegates: Approver[]
  onSuccess?: () => void
}

export function DelegationForm({ potentialDelegates, onSuccess }: DelegationFormProps) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  })

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    setLoading(true)

    const body = {
      delegate_id: values.delegate_id,
      valid_from: new Date(values.valid_from).toISOString(),
      valid_until: new Date(values.valid_until + 'T23:59:59').toISOString(),
      reason: values.reason || null,
    }

    const res = await fetch('/api/admin/delegations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setSubmitError(json.error ?? 'Something went wrong')
      return
    }

    router.refresh()
    onSuccess?.()
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="delegation-form">
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="delegate_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delegate to</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a colleague" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {potentialDelegates.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name} ({d.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="valid_from"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="valid_until"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Until</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g. Annual leave, 15–22 June 2026"
                  className="resize-none"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating…' : 'Create delegation'}
        </Button>
      </form>
    </Form>
  )
}
