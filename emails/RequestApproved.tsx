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

interface RequestApprovedProps {
  requestRef: string
  requestTitle: string
  requestType: string
  amount: number
  currency: string
  requesterName: string
  platformUrl: string
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function RequestApproved({
  requestRef,
  requestTitle,
  requestType,
  amount,
  currency,
  requesterName,
  platformUrl,
}: RequestApprovedProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Approved: {requestRef} — {requestTitle}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerLabel}>Spend Management Platform</Text>
          </Section>

          <Section style={content}>
            <Section style={statusBanner}>
              <Text style={statusText}>✓ Approved</Text>
            </Section>

            <Heading style={h1}>Your request has been approved</Heading>
            <Text style={subtext}>Hi {requesterName},</Text>
            <Text style={subtext}>
              Your {requestType.toLowerCase()} has been approved. The Procurement team has been
              notified to process your request.
            </Text>

            <Section style={card}>
              <Text style={cardMeta}>{requestRef}</Text>
              <Text style={cardTitle}>{requestTitle}</Text>
              <Hr style={divider} />
              <Text style={amountText}>{formatCurrency(amount, currency)}</Text>
            </Section>

            <Button href={platformUrl} style={ctaButton}>
              View request
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

const statusBanner: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '6px',
  padding: '12px 16px',
  marginBottom: '20px',
}

const statusText: React.CSSProperties = {
  color: '#15803d',
  fontSize: '14px',
  fontWeight: 700,
  margin: 0,
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

const amountText: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#0f172a',
  margin: 0,
}

const ctaButton: React.CSSProperties = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  padding: '12px 28px',
  textDecoration: 'none',
  display: 'inline-block',
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
