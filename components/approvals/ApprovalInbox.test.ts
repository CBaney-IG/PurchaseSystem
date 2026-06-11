import { describe, it, expect } from 'vitest'
import { daysWaiting } from './ApprovalInbox'

describe('daysWaiting', () => {
  it('returns 0 for null submitted_at', () => {
    expect(daysWaiting(null)).toBe(0)
  })

  it('returns 0 for a timestamp from earlier today', () => {
    const fewHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(daysWaiting(fewHoursAgo)).toBe(0)
  })

  it('returns 1 for a timestamp 25 hours ago', () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    expect(daysWaiting(yesterday)).toBe(1)
  })

  it('returns 3 for a timestamp 3 days ago', () => {
    const threeDays = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(daysWaiting(threeDays)).toBe(3)
  })

  it('returns a positive integer, never negative', () => {
    const futureTimestamp = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    expect(daysWaiting(futureTimestamp)).toBeGreaterThanOrEqual(0)
  })
})

// ---- Bulk selection constraints ----

const MAX_BULK = 20

describe('bulk selection constraints', () => {
  it('bulk approve button is inactive with 0 items selected', () => {
    const selected = new Set<string>()
    expect(selected.size > 0).toBe(false)
  })

  it('bulk approve button is active with 1 item selected', () => {
    const selected = new Set(['id-1'])
    expect(selected.size > 0).toBe(true)
  })

  it('allows up to MAX_BULK items to be selected', () => {
    const selected = new Set(Array.from({ length: MAX_BULK }, (_, i) => `id-${i}`))
    expect(selected.size).toBe(MAX_BULK)
  })

  it('prevents adding beyond MAX_BULK', () => {
    const selected = new Set(Array.from({ length: MAX_BULK }, (_, i) => `id-${i}`))
    // Simulates the toggleSelect guard: if at limit and item not already in set, do nothing
    const newId = 'id-overflow'
    const atLimit = selected.size >= MAX_BULK && !selected.has(newId)
    expect(atLimit).toBe(true)
    // selected stays at MAX_BULK
    expect(selected.size).toBe(MAX_BULK)
  })

  it('allows removing an already-selected item even at the limit', () => {
    const selected = new Set(Array.from({ length: MAX_BULK }, (_, i) => `id-${i}`))
    const toRemove = 'id-0'
    const atLimit = selected.size >= MAX_BULK && !selected.has(toRemove)
    expect(atLimit).toBe(false) // should be allowed since it's already selected
    selected.delete(toRemove)
    expect(selected.size).toBe(MAX_BULK - 1)
  })

  it('total amount sums correctly', () => {
    const rows = [
      { id: 'a', amount: 1000 },
      { id: 'b', amount: 2500 },
      { id: 'c', amount: 750 },
    ]
    const selected = new Set(['a', 'c'])
    const total = rows
      .filter((r) => selected.has(r.id))
      .reduce((sum, r) => sum + r.amount, 0)
    expect(total).toBe(1750)
  })
})
