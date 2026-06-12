import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface ApprovalEscalatedProps {
  requestRef: string
  requestTitle: string
  requestType: string
  amount: number
  currency: string
  requesterName: string
  hoursOverdue: number
  originalApproverName: string
  recipientName: string
  /** true when sent to the manager receiving authority; false when notifying the requester */
  isManager: boolean
  platformUrl: string
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function ApprovalEscalated({
  requestRef,
  requestTitle,
  requestType,
  amount,
  currency,
  requesterName,
  hoursOverdue,
  originalApproverName,
  recipientName,
  isManager,
  platformUrl,
}: ApprovalEscalatedProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {isManager
          ? `Approval escalated to you — ${requestRef}: ${requestTitle}`
          : `Your request ${requestRef} has been escalated`}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerLabel}>Spend Management Platform</Text>
          </Section>

          <Section style={content}>
            <Section style={escalationBanner}>
              <Text style={escalationText}>
                ⚡ Escalated after {hoursOverdue} hours without action
              </Text>
            </Section>

            <Heading style={h1}>
              {isManager ? 'Approval escalated to you' : 'Your request has been escalated'}
            </Heading>

            <Text style={subtext}>Hi {recipientName},</Text>

            {isManager ? (
              <Text style={subtext}>
                The following {requestType.toLowerCase()} was assigned to{' '}
                <strong>{originalApproverName}</strong> and has been waiting{' '}
                <strong>{hoursOverdue} hours</strong> without action. Approval authority has been
                escalated to you.
              </Text>
            ) : (
              <Text style={subtext}>
                Your {requestType.toLowerCase()} has been waiting{' '}
                <strong>{hoursOverdue} hours</strong> for approval by{' '}
                <strong>{originalApproverName}</strong>. The request has been escalated to their
                manager.
              </Text>
            )}

            <Section style={card}>
              <Text style={cardRef}>{requestRef}</Text>
              <Text style={cardTitle}>{requestTitle}</Text>
              <Text style={cardDetail}>
                Requested by {requesterName} · {formatCurrency(amount, currency)}
              </Text>
            </Section>

            <Button href={platformUrl} style={ctaButton}>
              {isManager ? 'Review in approvals inbox' : 'View request status'}
            </Button>
          </Section>

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

const body: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: 0, padding: '32px 0',
}
const container: React.CSSProperties = {
  maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff',
  borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0',
}
const header: React.CSSProperties = { backgroundColor: '#0f172a', padding: '16px 32px' }
const headerLabel: React.CSSProperties = {
  color: '#94a3b8', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0,
}
const escalationBanner: React.CSSProperties = {
  backgroundColor: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: '6px', padding: '10px 16px', marginBottom: '20px',
}
const escalationText: React.CSSProperties = { color: '#991b1b', fontSize: '13px', fontWeight: 600, margin: 0 }
const content: React.CSSProperties = { padding: '32px' }
const h1: React.CSSProperties = {
  fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', marginTop: 0,
}
const subtext: React.CSSProperties = { fontSize: '15px', color: '#475569', marginBottom: '12px', lineHeight: '1.6' }
const card: React.CSSProperties = {
  backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
  borderRadius: '6px', padding: '16px 20px', marginBottom: '24px',
}
const cardRef: React.CSSProperties = { fontSize: '11px', color: '#64748b', fontFamily: 'monospace', margin: '0 0 4px' }
const cardTitle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 6px' }
const cardDetail: React.CSSProperties = { fontSize: '13px', color: '#64748b', margin: 0 }
const ctaButton: React.CSSProperties = {
  backgroundColor: '#0f172a', color: '#ffffff', borderRadius: '6px',
  fontSize: '14px', fontWeight: 600, padding: '12px 24px', textDecoration: 'none', display: 'inline-block',
}
const footer: React.CSSProperties = { backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 32px' }
const footerText: React.CSSProperties = { fontSize: '11px', color: '#94a3b8', margin: 0, textAlign: 'center' }
