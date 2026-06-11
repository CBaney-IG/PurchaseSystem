import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface BudgetWarningProps {
  costCentreName: string
  costCentreCode: string
  category: string
  budgetAmount: number
  committed: number
  available: number
  utilisationPct: number
  currency: string
  year: number
  recipientName: string
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function BudgetWarning({
  costCentreName,
  costCentreCode,
  category,
  budgetAmount,
  committed,
  available,
  utilisationPct,
  currency,
  year,
  recipientName,
}: BudgetWarningProps) {
  const pct = Math.round(utilisationPct)
  const isOverBudget = available <= 0
  const previewText = `Budget alert: ${costCentreCode} — ${category} is at ${pct}% committed`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body
        style={{
          backgroundColor: '#f8fafc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          margin: 0,
          padding: '32px 0',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            maxWidth: '600px',
            margin: '0 auto',
            padding: '40px 48px',
          }}
        >
          {/* Status badge */}
          <Section style={{ marginBottom: '24px' }}>
            <Text
              style={{
                display: 'inline-block',
                backgroundColor: '#fffbeb',
                color: '#b45309',
                border: '1px solid #fde68a',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '4px 10px',
                margin: '0',
              }}
            >
              Budget Warning
            </Text>
          </Section>

          <Heading
            style={{
              color: '#0f172a',
              fontSize: '22px',
              fontWeight: '700',
              lineHeight: '1.3',
              margin: '0 0 8px',
            }}
          >
            {pct}% of budget committed
          </Heading>
          <Text
            style={{ color: '#475569', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px' }}
          >
            Hi {recipientName}, the {year} budget for{' '}
            <strong>
              {costCentreName} ({costCentreCode})
            </strong>{' '}
            — category <strong>{category}</strong> — has reached {pct}% committed. New requests will
            continue to be accepted but will be flagged for approvers.
          </Text>

          {/* Budget card */}
          <Section
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '6px',
              padding: '20px 24px',
              marginBottom: '24px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td
                    style={{
                      color: '#92400e',
                      fontSize: '13px',
                      fontWeight: '600',
                      paddingBottom: '10px',
                      width: '40%',
                    }}
                  >
                    Annual Budget
                  </td>
                  <td
                    style={{
                      color: '#0f172a',
                      fontSize: '14px',
                      fontWeight: '700',
                      paddingBottom: '10px',
                    }}
                  >
                    {formatCurrency(budgetAmount, currency)}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      color: '#92400e',
                      fontSize: '13px',
                      fontWeight: '600',
                      paddingBottom: '10px',
                    }}
                  >
                    Committed
                  </td>
                  <td
                    style={{
                      color: '#b45309',
                      fontSize: '14px',
                      fontWeight: '700',
                      paddingBottom: '10px',
                    }}
                  >
                    {formatCurrency(committed, currency)} ({pct}%)
                  </td>
                </tr>
                <tr>
                  <td
                    style={{ color: '#92400e', fontSize: '13px', fontWeight: '600' }}
                  >
                    Remaining
                  </td>
                  <td
                    style={{
                      color: isOverBudget ? '#dc2626' : '#0f172a',
                      fontSize: '14px',
                      fontWeight: '700',
                    }}
                  >
                    {formatCurrency(Math.max(0, available), currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={{ borderColor: '#e2e8f0', margin: '32px 0 24px' }} />
          <Text style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.6', margin: '0' }}>
            Spend Management Platform — this alert was sent because you are the budget owner or have
            the Finance role for this entity.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
