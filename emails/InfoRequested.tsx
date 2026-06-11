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

interface InfoRequestedProps {
  requestRef: string
  requestTitle: string
  requesterName: string
  approverName: string
  question: string
  platformUrl: string
}

export default function InfoRequested({
  requestRef,
  requestTitle,
  requesterName,
  approverName,
  question,
  platformUrl,
}: InfoRequestedProps) {
  return (
    <Html>
      <Head />
      <Preview>
        More information needed on {requestRef}: {requestTitle}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerLabel}>Spend Management Platform</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Additional information needed</Heading>
            <Text style={subtext}>Hi {requesterName},</Text>
            <Text style={subtext}>
              {approverName} has reviewed your request and needs additional information before
              making a decision.
            </Text>

            <Section style={requestInfo}>
              <Text style={requestInfoMeta}>{requestRef}</Text>
              <Text style={requestInfoTitle}>{requestTitle}</Text>
            </Section>

            <Section style={questionBox}>
              <Text style={questionLabel}>Question from {approverName}</Text>
              <Text style={questionText}>{question}</Text>
            </Section>

            <Text style={subtext}>
              Please log in to respond. Your request will remain on hold until you provide the
              information.
            </Text>

            <Button href={platformUrl} style={ctaButton}>
              Respond now
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

const requestInfo: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '16px 20px',
  marginBottom: '16px',
}

const requestInfoMeta: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  fontFamily: 'monospace',
  margin: '0 0 4px',
}

const requestInfoTitle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#0f172a',
  margin: 0,
}

const questionBox: React.CSSProperties = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '6px',
  padding: '16px 20px',
  marginBottom: '24px',
}

const questionLabel: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#1d4ed8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 8px',
}

const questionText: React.CSSProperties = {
  fontSize: '14px',
  color: '#0f172a',
  lineHeight: '1.6',
  margin: 0,
}

const ctaButton: React.CSSProperties = {
  backgroundColor: '#1d4ed8',
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
