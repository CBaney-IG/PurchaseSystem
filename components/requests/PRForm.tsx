'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { BudgetIndicator } from './BudgetIndicator'
import { ApprovalPathPreview, type ApprovalLevel } from './ApprovalPathPreview'
import { FileUpload, type SelectedFile } from './FileUpload'
import { VendorCombobox } from './VendorCombobox'
import { formatCurrency } from '@/lib/utils'
import type { Vendor } from '@/types/domain'
import type { BudgetPosition } from '@/lib/data/spend-requests'

// ---- Form schema ----

const prFormSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(120, 'Title must be 120 characters or less'),
    category: z.string().min(1, 'Category is required'),
    cost_centre_id: z.string().uuid('Select a cost centre'),
    vendor_id: z.string().uuid().nullable().optional(),
    vendor_name: z.string().optional().nullable(),
    amount: z.coerce
      .number({ invalid_type_error: 'Enter a valid amount' })
      .positive('Amount must be greater than 0'),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    justification: z.string().optional().nullable(),
    project_code: z.string().optional().nullable(),
    required_by: z.string().optional().nullable(),
    priority: z.enum(['normal', 'urgent']),
  })
  .superRefine((data, ctx) => {
    if (data.amount > 5000 && (!data.justification || data.justification.length < 50)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Justification must be at least 50 characters for amounts over R5,000',
        path: ['justification'],
      })
    }
  })

type PRFormValues = z.infer<typeof prFormSchema>

// ---- Types ----

interface CostCentreOption {
  id: string
  code: string
  name: string
}

interface PRFormProps {
  categories: string[]
  costCentres: CostCentreOption[]
  vendors: Vendor[]
  draftId?: string
  defaultValues?: Partial<PRFormValues>
}

// ---- Component ----

export function PRForm({ categories, costCentres, vendors, draftId, defaultValues }: PRFormProps) {
  const router = useRouter()
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [budgetPosition, setBudgetPosition] = useState<BudgetPosition | null>(null)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [approvalPath, setApprovalPath] = useState<ApprovalLevel[]>([])
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [successRef, setSuccessRef] = useState<string | null>(null)

  const form = useForm<PRFormValues>({
    resolver: zodResolver(prFormSchema),
    defaultValues: {
      priority: 'normal',
      vendor_id: null,
      vendor_name: null,
      project_code: null,
      required_by: null,
      justification: null,
      ...defaultValues,
    },
  })

  const watchedCostCentre = form.watch('cost_centre_id')
  const watchedCategory = form.watch('category')
  const watchedAmount = form.watch('amount')

  // Fetch budget position when cost centre + category are both set
  useEffect(() => {
    if (!watchedCostCentre || !watchedCategory) {
      setBudgetPosition(null)
      return
    }
    const controller = new AbortController()
    setBudgetLoading(true)
    const year = new Date().getFullYear()
    fetch(
      `/api/requests/budget?cost_centre_id=${watchedCostCentre}&category=${encodeURIComponent(watchedCategory)}&year=${year}`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setBudgetPosition(res.data)
        else setBudgetPosition(null)
      })
      .catch(() => {})
      .finally(() => setBudgetLoading(false))
    return () => controller.abort()
  }, [watchedCostCentre, watchedCategory])

  // Fetch approval path for the confirmation dialog
  async function loadApprovalPath(category: string, amount: number) {
    if (!category || !amount || amount <= 0) {
      setApprovalPath([])
      return
    }
    setApprovalLoading(true)
    try {
      const res = await fetch(
        `/api/admin/approval-matrix/simulate?category=${encodeURIComponent(category)}&amount=${amount}`
      )
      const json = await res.json()
      setApprovalPath(json.data ?? [])
    } catch {
      setApprovalPath([])
    } finally {
      setApprovalLoading(false)
    }
  }

  // Opens the confirmation dialog and fetches the approval path
  function handleReviewSubmit() {
    const { category, amount } = form.getValues()
    void loadApprovalPath(category, amount)
    setSubmitError(null)
    setConfirmOpen(true)
  }

  async function handleConfirmSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    const values = form.getValues()

    try {
      let requestId = draftId

      if (!requestId) {
        // Create draft
        const createRes = await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...values, type: 'purchase_request' }),
        })
        const createJson = await createRes.json()
        if (!createRes.ok) throw new Error(createJson.error?.message ?? 'Failed to create draft')
        requestId = createJson.data.id as string
      } else {
        // Update existing draft
        const updateRes = await fetch(`/api/requests/${requestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        if (!updateRes.ok) {
          const updateJson = await updateRes.json()
          throw new Error(updateJson.error?.message ?? 'Failed to update draft')
        }
      }

      // Upload files
      const validFiles = files.filter((f) => !f.error)
      for (const { file } of validFiles) {
        const fd = new FormData()
        fd.append('file', file)
        const uploadRes = await fetch(`/api/requests/${requestId}/attachments`, {
          method: 'POST',
          body: fd,
        })
        if (!uploadRes.ok) {
          const uploadJson = await uploadRes.json()
          throw new Error(uploadJson.error?.message ?? `Failed to upload ${file.name}`)
        }
      }

      // Submit the request
      const submitRes = await fetch(`/api/requests/${requestId}/submit`, { method: 'POST' })
      const submitJson = await submitRes.json()
      if (!submitRes.ok) throw new Error(submitJson.error?.message ?? 'Submission failed')

      setSuccessRef(submitJson.data.reference_no as string)
      setConfirmOpen(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveAsDraft() {
    const values = form.getValues()
    // Validate just the required fields manually — drafts are less strict
    if (!values.title || !values.category || !values.cost_centre_id || !values.amount) {
      form.trigger(['title', 'category', 'cost_centre_id', 'amount'])
      return
    }

    setSavingDraft(true)
    try {
      if (draftId) {
        await fetch(`/api/requests/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
      } else {
        await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...values, type: 'purchase_request' }),
        })
      }
      router.push('/requests')
    } catch {
      // Silent fail for draft save — user can try again
    } finally {
      setSavingDraft(false)
    }
  }

  // Success state
  if (successRef) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <h2 className="text-xl font-semibold text-slate-900">Request submitted</h2>
        <p className="text-slate-500">
          Your purchase request has been submitted for approval.
        </p>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-6 py-3">
          <p className="text-xs text-slate-500">Reference number</p>
          <p className="font-mono text-lg font-semibold text-slate-800">{successRef}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/requests')}>
            View my requests
          </Button>
          <Button
            onClick={() => {
              setSuccessRef(null)
              form.reset()
              setFiles([])
            }}
          >
            New request
          </Button>
        </div>
      </div>
    )
  }

  const isOverBudget =
    budgetPosition !== null &&
    watchedAmount &&
    budgetPosition.available < watchedAmount

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleReviewSubmit)}
          className="space-y-8"
          noValidate
        >
          {/* Section: Request details */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Title */}
            <div className="lg:col-span-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Replacement laptop for operations team" maxLength={120} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spend category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cost centre */}
            <FormField
              control={form.control}
              name="cost_centre_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost centre *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cost centre" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {costCentres.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.code} — {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated amount (ZAR) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Budget indicator — shown when cost centre + category selected */}
          {(watchedCostCentre && watchedCategory) && (
            <BudgetIndicator
              position={budgetPosition}
              requestedAmount={watchedAmount}
              loading={budgetLoading}
            />
          )}

          {isOverBudget && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                This request would exceed the available budget. You can still submit — the
                over-budget flag will be visible to your approvers.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Section: Vendor */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FormField
              control={form.control}
              name="vendor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor (optional)</FormLabel>
                  <FormControl>
                    <VendorCombobox
                      vendors={vendors}
                      value={field.value ?? null}
                      onChange={(id) => field.onChange(id)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vendor_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor name (if not in catalogue)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter vendor name"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Section: Description & Justification */}
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you need and why (minimum 20 characters)"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Business justification{watchedAmount > 5000 ? ' *' : ' (optional)'}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        watchedAmount > 5000
                          ? 'Required for amounts over R5,000 — explain the business need (minimum 50 characters)'
                          : 'Optional — provide additional context for approvers'
                      }
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Section: Supporting documents */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Attachments (optional)
            </p>
            <p className="mb-3 text-xs text-slate-500">
              Attach quotes, invoices, or other supporting documents. PDF, PNG, JPG, DOCX, XLSX — max 10 MB each, up to 10 files.
            </p>
            <FileUpload files={files} onChange={setFiles} />
          </div>

          <Separator />

          {/* Section: Optional details */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FormField
              control={form.control}
              name="project_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project code (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. PROJ-2026-001"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="required_by"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required by (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      min={todayStr}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveAsDraft}
              disabled={savingDraft || submitting}
            >
              {savingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save as draft
            </Button>
            <Button type="submit" disabled={submitting || savingDraft}>
              Review & submit
            </Button>
          </div>
        </form>
      </Form>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm submission</DialogTitle>
            <DialogDescription>
              Review the approval path before submitting your request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Request summary */}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-800">{form.getValues('title')}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{form.getValues('category')}</span>
                <span className="font-semibold text-slate-700">
                  {formatCurrency(form.getValues('amount'))}
                </span>
              </div>
            </div>

            {/* Budget impact */}
            {budgetPosition && (
              <BudgetIndicator
                position={budgetPosition}
                requestedAmount={form.getValues('amount')}
              />
            )}

            {/* Approval path */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Approval path</p>
              <ApprovalPathPreview levels={approvalPath} loading={approvalLoading} />
            </div>

            {/* Error */}
            {submitError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{submitError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
