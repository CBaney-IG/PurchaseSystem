import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { RequestForPDF } from '@/lib/data/reports'

const ACTION_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  delegated: 'Delegated',
  info_requested: 'More information requested',
  info_provided: 'Information provided',
  escalated: 'Escalated',
  cancelled: 'Cancelled',
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b', padding: 40 },
  header: { borderBottom: 2, borderBottomColor: '#0f172a', paddingBottom: 12, marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  platformName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  headerSub: { fontSize: 8, color: '#64748b', marginTop: 2 },
  refBadge: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a', textAlign: 'right' },
  refSub: { fontSize: 8, color: '#64748b', textAlign: 'right', marginTop: 2 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  field: { width: '33%', marginBottom: 10, paddingRight: 10 },
  fieldFull: { width: '100%', marginBottom: 10 },
  fieldHalf: { width: '50%', marginBottom: 10, paddingRight: 10 },
  label: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  value: { fontSize: 9, color: '#1e293b' },
  budgetRow: { flexDirection: 'row', backgroundColor: '#f8fafc', border: 1, borderColor: '#e2e8f0', borderRadius: 3, padding: 10, marginTop: 4 },
  budgetCell: { flex: 1 },
  timelineItem: { flexDirection: 'row', marginBottom: 8, paddingBottom: 8, borderBottom: 1, borderBottomColor: '#f1f5f9' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#334155', marginTop: 1, marginRight: 10, flexShrink: 0 },
  timelineBody: { flex: 1 },
  timelineAction: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  timelineMeta: { fontSize: 7.5, color: '#64748b', marginTop: 2 },
  timelineComment: {
    fontSize: 8,
    color: '#475569',
    marginTop: 4,
    backgroundColor: '#f8fafc',
    padding: 5,
    borderLeft: 2,
    borderLeftColor: '#cbd5e1',
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: '#94a3b8' },
  overBudget: { color: '#dc2626' },
})

function fmt(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtTs(ts: string) {
  return new Date(ts).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

interface Props {
  request: RequestForPDF
  generatedAt: string
}

export function AuditReportDocument({ request, generatedAt }: Props) {
  const utilisationPct =
    request.budget_amount && request.budget_amount > 0
      ? Math.round(((request.budget_committed ?? 0) / request.budget_amount) * 100)
      : null

  return (
    <Document title={`${request.reference_no} Audit Report`} author="BPO Group Purchase System">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.platformName}>Purchase System</Text>
              <Text style={s.headerSub}>BPO Group — Unified Spend Management Platform</Text>
              <Text style={s.headerSub}>Audit Report — Generated {fmtTs(generatedAt)}</Text>
            </View>
            <View>
              <Text style={s.refBadge}>{request.reference_no}</Text>
              <Text style={s.refSub}>{cap(request.status)}</Text>
              <Text style={s.refSub}>
                {request.type === 'purchase_request' ? 'Purchase Request' : 'Expense Claim'}
              </Text>
            </View>
          </View>
        </View>

        {/* Document Details */}
        <Text style={s.sectionTitle}>Document Details</Text>
        <View style={s.grid}>
          <View style={s.fieldFull}>
            <Text style={s.label}>Title</Text>
            <Text style={s.value}>{request.title}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Amount</Text>
            <Text style={s.value}>{fmt(request.amount, request.currency)}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Category</Text>
            <Text style={s.value}>{request.category}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Priority</Text>
            <Text style={s.value}>{cap(request.priority)}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Requester</Text>
            <Text style={s.value}>{request.requester_name}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Cost Centre</Text>
            <Text style={s.value}>{request.cost_centre_code} — {request.cost_centre_name}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Status</Text>
            <Text style={s.value}>{cap(request.status)}</Text>
          </View>
          {request.vendor_name ? (
            <View style={s.field}>
              <Text style={s.label}>Vendor</Text>
              <Text style={s.value}>{request.vendor_name}</Text>
            </View>
          ) : null}
          {request.project_code ? (
            <View style={s.field}>
              <Text style={s.label}>Project Code</Text>
              <Text style={s.value}>{request.project_code}</Text>
            </View>
          ) : null}
          {request.required_by ? (
            <View style={s.field}>
              <Text style={s.label}>Required By</Text>
              <Text style={s.value}>{request.required_by}</Text>
            </View>
          ) : null}
          <View style={s.field}>
            <Text style={s.label}>Submitted</Text>
            <Text style={s.value}>{request.submitted_at ? fmtTs(request.submitted_at) : '—'}</Text>
          </View>
          {request.approved_at ? (
            <View style={s.field}>
              <Text style={s.label}>Approved</Text>
              <Text style={s.value}>{fmtTs(request.approved_at)}</Text>
            </View>
          ) : null}
        </View>

        {request.description ? (
          <View style={s.fieldFull}>
            <Text style={s.label}>Description</Text>
            <Text style={s.value}>{request.description}</Text>
          </View>
        ) : null}

        {request.justification ? (
          <View style={[s.fieldFull, { marginTop: 4 }]}>
            <Text style={s.label}>Business Justification</Text>
            <Text style={s.value}>{request.justification}</Text>
          </View>
        ) : null}

        {/* Budget Impact */}
        {request.budget_amount !== null ? (
          <>
            <Text style={s.sectionTitle}>Budget Impact</Text>
            <View style={s.budgetRow}>
              <View style={s.budgetCell}>
                <Text style={s.label}>Annual Budget</Text>
                <Text style={s.value}>{fmt(request.budget_amount, request.currency)}</Text>
              </View>
              <View style={s.budgetCell}>
                <Text style={s.label}>Committed</Text>
                <Text style={s.value}>{fmt(request.budget_committed ?? 0, request.currency)}</Text>
              </View>
              <View style={s.budgetCell}>
                <Text style={s.label}>This Request</Text>
                <Text style={s.value}>{fmt(request.amount, request.currency)}</Text>
              </View>
              <View style={s.budgetCell}>
                <Text style={s.label}>Utilisation</Text>
                <Text style={[s.value, utilisationPct !== null && utilisationPct >= 90 ? s.overBudget : {}]}>
                  {utilisationPct !== null ? `${utilisationPct}%` : '—'}
                  {request.budget_flag ? '  ⚠ Over budget' : ''}
                </Text>
              </View>
            </View>
          </>
        ) : null}

        {/* Approval Timeline */}
        <Text style={s.sectionTitle}>Approval Event Timeline</Text>
        {request.events.length === 0 ? (
          <Text style={[s.value, { color: '#94a3b8' }]}>No approval events recorded.</Text>
        ) : (
          request.events.map(event => (
            <View key={event.id} style={s.timelineItem}>
              <View style={s.dot} />
              <View style={s.timelineBody}>
                <Text style={s.timelineAction}>
                  {ACTION_LABELS[event.action] ?? cap(event.action)}
                </Text>
                <Text style={s.timelineMeta}>
                  {event.actor_name}
                  {'  ·  '}
                  {fmtTs(event.created_at)}
                  {event.previous_status && event.new_status
                    ? `  ·  ${cap(event.previous_status)} → ${cap(event.new_status)}`
                    : ''}
                </Text>
                {event.comment ? (
                  <Text style={s.timelineComment}>{event.comment}</Text>
                ) : null}
              </View>
            </View>
          ))
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {request.reference_no} — BPO Group Purchase System — Confidential
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
