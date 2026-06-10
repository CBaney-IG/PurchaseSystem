'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
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
import { BudgetIndicator } from '@/components/requests/BudgetIndicator'
import { ApprovalPathPreview, type ApprovalLevel } from '@/components/requests/ApprovalPathPreview'
import { ReceiptUpload, type ReceiptFile } from './ReceiptUpload'
import { formatCurrency } from '@/lib/utils'
import type { BudgetPosition } from '@/lib/data/spend-requests'

// ---- Form schema ----

const expenseFormSchema = z
  .object({
    vendor_name: z
      .string()
      .min(1, 'Vendor / merchant name is required')
      .max(200, 'Name must be 200 characters or less'),
    amount: z.coerce
      .number({ invalid_type_error: 'Enter a valid amount' })
      .positive('Amount must be greater than 0'),
    expense_date: z.string().min(1, 'Expense date is required'),
    category: z.string().min(1, 'Category is required'),
    cost_centre_id: z.string().uuid('Select a cost centre'),
    description: z
      .string()
      .min(20, 'Description must be at least 20 characters')
      .max(2000, 'Description is too long'),
    project_code: z.string().optional().nullable(),
    justification: z.string().optional().nullable(),
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

type ExpenseFormValues = z.infer<typeof expenseFormSchema>

// ---- Types ----

interface CostCentreOption {
  id: string
  code: string
  name: string
}

interface ExpenseFormProps {
  categories: string[]
  costCentres: CostCentreOption[]
}

// ---- Component ----

export function ExpenseForm({ categories, costCentres }: ExpenseFormProps) {
  const router = useRouter()
  const [receipt, setReceipt] = useState<ReceiptFile | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [budgetPosition, setBudgetPosition] = useState<BudgetPosition | null>(null)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [approvalPath, setApprovalPath] = useState<ApprovalLevel[]>([])
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [successRef, setSuccessRef] = useState<string | null>(null)

  // Default category to Employee Expense if available
  const defaultCategory = categories.includes('Employee Expense') ? 'Employee Expense' : ''

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      vendor_name: '',
      category: defaultCategory,
      cost_centre_id: '',
      description: '',
      project_code: null,
      justification: null,
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
        if (res.data) setBudgetPosition(res.data as BudgetPosition)
        else setBudgetPosition(null)
      })
      .catch(() => {})
      .finally(() => setBudgetLoading(false))
    return () => controller.abort()
  }, [watchedCostCentre, watchedCategory])

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
      setApprovalPath((json.data ?? []) as ApprovalLevel[])
    } catch {
      setApprovalPath([])
    } finally {
      setApprovalLoading(false)
    }
  }

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

    // Derive a title from vendor name + category
    const title = `Expense: ${values.vendor_name || values.category}`

    try {
      // Create draft
      const createRes = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense_claim',
          title,
          category: values.category,
          cost_centre_id: values.cost_centre_id,
          vendor_name: values.vendor_name,
          amount: values.amount,
          description: values.description,
          justification: values.justification ?? null,
          project_code: values.project_code ?? null,
          required_by: values.expense_date,
          priority: 'normal',
        }),
      })
      const createJson = await createRes.json()
      if (!createRes.ok) throw new Error(createJson.error?.message ?? 'Failed to create draft')
      const requestId = createJson.data.id as string

      // Upload receipt if provided and valid
      if (receipt && !receipt.error) {
        const fd = new FormData()
        fd.append('file', receipt.file)
        const uploadRes = await fetch(`/api/requests/${requestId}/attachments`, {
          method: 'POST',
          body: fd,
        })
        if (!uploadRes.ok) {
          const uploadJson = await uploadRes.json()
          throw new Error(uploadJson.error?.message ?? 'Failed to upload receipt')
        }
      }

      // Submit
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
    if (!values.vendor_name || !values.category || !values.cost_centre_id || !values.amount) {
      form.trigger(['vendor_name', 'category', 'cost_centre_id', 'amount'])
      return
    }
    const title = `Expense: ${values.vendor_name || values.category}`
    setSavingDraft(true)
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense_claim',
          title,
          category: values.category,
          cost_centre_id: values.cost_centre_id,
          vendor_name: values.vendor_name,
          amount: values.amount,
          description: values.description || 'Draft',
          justification: values.justification ?? null,
          project_code: values.project_code ?? null,
          required_by: values.expense_date || null,
          priority: 'normal',
        }),
      })
      router.push('/requests')
    } catch {
      // Silent fail — user can try again
    } finally {
      setSavingDraft(false)
    }
  }

  // Success state
  if (successRef) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <h2 className="text-xl font-semibold text-slate-900">Expense claim submitted</h2>
        <p className="text-slate-500">Your expense claim has been submitted for approval.</p>
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
              form.reset({ category: defaultCategory })
              setReceipt(null)
            }}
          >
            New expense claim
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit(handleReviewSubmit)()
        }}
        className="space-y-8"
      >
        {/* Receipt upload */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Receipt
            </h2>
            <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
              <Info className="h-3 w-3" />
              Full OCR extraction in Phase 2
            </span>
          </div>
          <ReceiptUpload value={receipt} onChange={setReceipt} />
          {!receipt && (
            <p className="mt-2 text-xs text-slate-400">
              Receipt is optional at this stage — you can still submit and attach it later.
            </p>
          )}
        </section>

        <Separator />

        {/* Expense details */}
        <section className="grid gap-6 sm:grid-cols-2">
          <h2 className="col-span-full text-sm font-semibold uppercase tracking-wide text-slate-500">
            Expense Details
          </h2>

          <FormField
            control={form.control}
            name="vendor_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor / Merchant *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Woolworths, Uber, Takealot" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expense_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expense Date *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (ZAR) *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      R
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      className="pl-7"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cost_centre_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Centre *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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

          <FormField
            control={form.control}
            name="project_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Optional"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {/* Budget indicator */}
        {(watchedCostCentre || budgetPosition) && (
          <BudgetIndicator
            position={budgetPosition}
            requestedAmount={watchedAmount}
            loading={budgetLoading}
          />
        )}

        <Separator />

        {/* Description & justification */}
        <section className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Supporting Information
          </h2>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What was this expense for? Include business purpose and context (min 20 characters)."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedAmount > 5000 && (
            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justification *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Amounts over R5,000 require a detailed justification (min 50 characters)."
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </section>

        {/* Budget over-limit warning */}
        {budgetPosition &&
          watchedAmount > 0 &&
          budgetPosition.committed + watchedAmount > budgetPosition.budget_amount && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                This expense will exceed the available budget for this cost centre and category. You
                can still submit — the approval team will be notified.
              </AlertDescription>
            </Alert>
          )}

        {/* Form actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void handleSaveAsDraft()}
            disabled={savingDraft || submitting}
          >
            {savingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save as draft
          </Button>
          <Button type="submit" disabled={submitting || savingDraft}>
            Review &amp; Submit
          </Button>
        </div>
      </form>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review expense claim</DialogTitle>
            <DialogDescription>
              Confirm the details below before submitting for approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <span className="text-slate-500">Vendor</span>
              <span className="font-medium">{form.getValues('vendor_name')}</span>

              <span className="text-slate-500">Amount</span>
              <span className="font-medium">{formatCurrency(form.getValues('amount'))}</span>

              <span className="text-slate-500">Expense date</span>
              <span className="font-medium">{form.getValues('expense_date')}</span>

              <span className="text-slate-500">Category</span>
              <span className="font-medium">{form.getValues('category')}</span>

              <span className="text-slate-500">Cost centre</span>
              <span className="font-medium">
                {costCentres.find((cc) => cc.id === form.getValues('cost_centre_id'))?.name ?? '—'}
              </span>

              {receipt && !receipt.error && (
                <>
                  <span className="text-slate-500">Receipt</span>
                  <span className="font-medium text-green-700">✓ {receipt.file.name}</span>
                </>
              )}
            </div>

            <Separator />

            <BudgetIndicator
              position={budgetPosition}
              requestedAmount={form.getValues('amount')}
              loading={budgetLoading}
            />

            <Separator />

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Approval path
              </p>
              <ApprovalPathPreview levels={approvalPath} loading={approvalLoading} />
            </div>

            {submitError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Go back
            </Button>
            <Button onClick={() => void handleConfirmSubmit()} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit expense claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  )
}
