import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface DelegationActiveProps {
  recipientName: string
  /** true = sent to the delegator confirming they set up a delegation */
  isDelegator: boolean
  delegatorName: string
  delegateName: string
  validFrom: string   // formatted date string
  validUntil: string  // formatted date string
  reason: string | null
  platformUrl: string
}

export default function DelegationActive({
  recipientName,
  isDelegator,
  delegatorName,
  delegateName,
  validFrom,
  validUntil,
  reason,
  platformUrl: _platformUrl,
}: DelegationActiveProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {isDelegator
          ? `Delegation confirmed — ${delegateName} will cover approvals from ${validFrom}`
          : `You are now acting as approval delegate for ${delegatorName} from ${validFrom}`}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerLabel}>Spend Management Platform</Text>
          </Section>

          <Section style={content}>
            <Section style={delegationBanner}>
              <Text style={delegationText}>
                {isDelegator ? '✓ Delegation active' : '🔔 You have been assigned as a delegate'}
              </Text>
            </Section>

            <Heading style={h1}>
              {isDelegator ? 'Approval delegation confirmed' : 'Approval delegation assigned to you'}
            </Heading>

            <Text style={subtext}>Hi {recipientName},</Text>

            {isDelegator ? (
              <Text style={subtext}>
                Your approval authority has been delegated to{' '}
                <strong>{delegateName}</strong>. While this delegation is active, all approval
                requests will be routed to them on your behalf.
              </Text>
            ) : (
              <Text style={subtext}>
                <strong>{delegatorName}</strong> has delegated their approval authority to you for
                the period below. You will receive approval requests on their behalf during this
                time.
              </Text>
            )}

            <Section style={card}>
              <table style={detailTable} cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td style={detailLabel}>Delegator</td>
                    <td style={detailValue}>{delegatorName}</td>
                  </tr>
                  <tr>
                    <td style={detailLabel}>Delegate</td>
                    <td style={detailValue}>{delegateName}</td>
                  </tr>
                  <tr>
                    <td style={detailLabel}>From</td>
                    <td style={detailValue}>{validFrom}</td>
                  </tr>
                  <tr>
                    <td style={detailLabel}>Until</td>
                    <td style={detailValue}>{validUntil}</td>
                  </tr>
                  {reason && (
                    <tr>
                      <td style={detailLabel}>Reason</td>
                      <td style={detailValue}>{reason}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>

            <Text style={helpText}>
              Approvals actioned during this period will be recorded as delegated actions in the
              audit trail.
            </Text>
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
  maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff',
  borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0',
}
const header: React.CSSProperties = { backgroundColor: '#0f172a', padding: '16px 32px' }
const headerLabel: React.CSSProperties = {
  color: '#94a3b8', fontSize: '12px', letterSpacing: '0.08em',
  textTransform: 'uppercase', margin: 0,
}
const delegationBanner: React.CSSProperties = {
  backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
  borderRadius: '6px', padding: '10px 16px', marginBottom: '20px',
}
const delegationText: React.CSSProperties = {
  color: '#15803d', fontSize: '13px', fontWeight: 600, margin: 0,
}
const content: React.CSSProperties = { padding: '32px' }
const h1: React.CSSProperties = {
  fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', marginTop: 0,
}
const subtext: React.CSSProperties = {
  fontSize: '15px', color: '#475569', marginBottom: '12px', lineHeight: '1.6',
}
const card: React.CSSProperties = {
  backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
  borderRadius: '6px', padding: '16px 20px', marginBottom: '20px',
}
const detailTable: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' }
const detailLabel: React.CSSProperties = {
  fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
  letterSpacing: '0.05em', paddingBottom: '10px', paddingRight: '16px',
  verticalAlign: 'top', width: '120px',
}
const detailValue: React.CSSProperties = { fontSize: '14px', color: '#0f172a', paddingBottom: '10px' }
const helpText: React.CSSProperties = { fontSize: '13px', color: '#64748b', lineHeight: '1.6' }
const footer: React.CSSProperties = {
  backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 32px',
}
const footerText: React.CSSProperties = {
  fontSize: '11px', color: '#94a3b8', margin: 0, textAlign: 'center',
}
