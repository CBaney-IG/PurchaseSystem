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

interface POCreatedProps {
  poRef: string
  prRef: string
  prTitle: string
  vendorName: string | null
  amount: number
  currency: string
  procurementOfficerName: string
  platformUrl: string
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function POCreated({
  poRef,
  prRef,
  prTitle,
  vendorName,
  amount,
  currency,
  procurementOfficerName,
  platformUrl,
}: POCreatedProps) {
  return (
    <Html>
      <Head />
      <Preview>New PO draft ready: {poRef} — {prTitle}</Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, padding: '32px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', maxWidth: '600px', margin: '0 auto', padding: '40px 48px' }}>

          {/* Status badge */}
          <Section style={{ marginBottom: '24px' }}>
            <Text style={{ display: 'inline-block', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 10px', margin: '0' }}>
              New PO Draft
            </Text>
          </Section>

          <Heading style={{ color: '#0f172a', fontSize: '22px', fontWeight: '700', lineHeight: '1.3', margin: '0 0 8px' }}>
            Purchase Order ready for review
          </Heading>
          <Text style={{ color: '#475569', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px' }}>
            Hi {procurementOfficerName}, a draft PO has been automatically created following final approval of a purchase request.
          </Text>

          {/* PO details card */}
          <Section style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '20px 24px', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', paddingBottom: '10px', width: '40%' }}>PO Reference</td>
                  <td style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700', paddingBottom: '10px' }}>{poRef}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', paddingBottom: '10px' }}>From PR</td>
                  <td style={{ color: '#0f172a', fontSize: '14px', paddingBottom: '10px' }}>{prRef}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', paddingBottom: '10px' }}>Description</td>
                  <td style={{ color: '#0f172a', fontSize: '14px', paddingBottom: '10px' }}>{prTitle}</td>
                </tr>
                {vendorName && (
                  <tr>
                    <td style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', paddingBottom: '10px' }}>Vendor</td>
                    <td style={{ color: '#0f172a', fontSize: '14px', paddingBottom: '10px' }}>{vendorName}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Amount</td>
                  <td style={{ color: '#0f172a', fontSize: '15px', fontWeight: '700' }}>{formatCurrency(amount, currency)}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Text style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px' }}>
            The PO is currently in <strong>Draft</strong> status. Review the details, add any notes or expected delivery date, then issue it to the vendor when ready.
          </Text>

          <Button
            href={platformUrl}
            style={{ backgroundColor: '#1d4ed8', color: '#ffffff', fontSize: '14px', fontWeight: '600', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', display: 'inline-block' }}
          >
            Open PO in platform
          </Button>

          <Hr style={{ borderColor: '#e2e8f0', margin: '32px 0 24px' }} />
          <Text style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.6', margin: '0' }}>
            Spend Management Platform — this notification was sent because you have the Procurement Officer role.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
