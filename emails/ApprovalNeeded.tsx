import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface ApprovalNeededProps {
  requestRef: string
  requestTitle: string
  requestType: string
  category: string
  amount: number
  currency: string
  requesterName: string
  costCentreCode: string
  justification: string | null
  priority: string
  budgetFlag: boolean
  approverName: string
  approveUrl: string
  rejectUrl: string
  platformUrl: string
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function ApprovalNeeded({
  requestRef,
  requestTitle,
  requestType,
  category,
  amount,
  currency,
  requesterName,
  costCentreCode,
  justification,
  priority,
  budgetFlag,
  approverName,
  approveUrl,
  rejectUrl,
  platformUrl,
}: ApprovalNeededProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {requestType} {requestRef}: {requestTitle} — action required
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={headerLabel}>Spend Management Platform</Text>
          </Section>

          {/* Title */}
          <Section style={content}>
            <Heading style={h1}>Approval required</Heading>
            <Text style={subtext}>Hi {approverName},</Text>
            <Text style={subtext}>
              A {requestType.toLowerCase()} has been submitted and is awaiting your approval.
            </Text>

            {/* Request details card */}
            <Section style={card}>
              <Text style={cardMeta}>
                {requestRef} · {requestType}
                {priority === 'urgent' && (
                  <span style={urgentBadge}> · URGENT</span>
                )}
              </Text>
              <Text style={cardTitle}>{requestTitle}</Text>
              <Hr style={divider} />
              <table style={detailTable} cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td style={detailLabel}>Requested by</td>
                    <td style={detailValue}>{requesterName}</td>
                  </tr>
                  <tr>
                    <td style={detailLabel}>Category</td>
                    <td style={detailValue}>{category}</td>
                  </tr>
                  <tr>
                    <td style={detailLabel}>Amount</td>
                    <td style={{ ...detailValue, fontWeight: 700, fontSize: '18px' }}>
                      {formatCurrency(amount, currency)}
                    </td>
                  </tr>
                  <tr>
                    <td style={detailLabel}>Cost centre</td>
                    <td style={detailValue}>{costCentreCode}</td>
                  </tr>
                </tbody>
              </table>

              {budgetFlag && (
                <Section style={budgetWarning}>
                  <Text style={budgetWarningText}>
                    ⚠ This request exceeds the available budget for this cost centre and category.
                  </Text>
                </Section>
              )}

              {justification && (
                <>
                  <Hr style={divider} />
                  <Text style={detailLabel}>Business justification</Text>
                  <Text style={justificationText}>{justification}</Text>
                </>
              )}
            </Section>

            {/* Action buttons */}
            <Section style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
              <Button href={approveUrl} style={approveButton}>
                Approve
              </Button>
              <span style={{ display: 'inline-block', width: '16px' }} />
              <Button href={rejectUrl} style={rejectButton}>
                Reject
              </Button>
            </Section>

            <Text style={helpText}>
              These links are valid for 48 hours and can only be used once. To view full details or
              take action on the platform,{' '}
              <a href={platformUrl} style={link}>
                open the approvals inbox
              </a>
              .
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Unified Spend Management Platform · BPO Group · This is an automated message.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ---- Styles ----

const body: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: 0,
  padding: '32px 0',
}

const container: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
  border: '1px solid #e2e8f0',
}

const header: React.CSSProperties = {
  backgroundColor: '#0f172a',
  padding: '16px 32px',
}

const headerLabel: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  margin: 0,
}

const content: React.CSSProperties = {
  padding: '32px',
}

const h1: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#0f172a',
  marginBottom: '8px',
  marginTop: 0,
}

const subtext: React.CSSProperties = {
  fontSize: '15px',
  color: '#475569',
  marginBottom: '8px',
  lineHeight: '1.6',
}

const card: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '20px 24px',
  marginBottom: '24px',
}

const cardMeta: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  fontFamily: 'monospace',
  margin: '0 0 4px',
}

const urgentBadge: React.CSSProperties = {
  color: '#b45309',
  fontWeight: 700,
}

const cardTitle: React.CSSProperties = {
  fontSize: '17px',
  fontWeight: 600,
  color: '#0f172a',
  margin: '0 0 12px',
}

const divider: React.CSSProperties = {
  borderColor: '#e2e8f0',
  margin: '12px 0',
}

const detailTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
}

const detailLabel: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  paddingBottom: '8px',
  paddingRight: '16px',
  verticalAlign: 'top',
  width: '140px',
}

const detailValue: React.CSSProperties = {
  fontSize: '14px',
  color: '#0f172a',
  paddingBottom: '8px',
}

const budgetWarning: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '4px',
  padding: '10px 14px',
  marginTop: '12px',
}

const budgetWarningText: React.CSSProperties = {
  fontSize: '13px',
  color: '#b91c1c',
  margin: 0,
}

const justificationText: React.CSSProperties = {
  fontSize: '13px',
  color: '#475569',
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '4px',
  padding: '10px 14px',
  margin: '6px 0 0',
  lineHeight: '1.5',
}

const approveButton: React.CSSProperties = {
  backgroundColor: '#16a34a',
  color: '#ffffff',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  padding: '12px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}

const rejectButton: React.CSSProperties = {
  backgroundColor: '#dc2626',
  color: '#ffffff',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  padding: '12px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}

const helpText: React.CSSProperties = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: '1.6',
}

const link: React.CSSProperties = {
  color: '#2563eb',
  textDecoration: 'underline',
}

const footer: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  borderTop: '1px solid #e2e8f0',
  padding: '16px 32px',
}

const footerText: React.CSSProperties = {
  fontSize: '11px',
  color: '#94a3b8',
  margin: 0,
  textAlign: 'center',
}
