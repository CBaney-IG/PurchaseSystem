import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Static analysis of the sidebar source to verify mobile responsiveness patterns
// are present — avoids needing jsdom/browser environment for structural checks.

describe('Sidebar mobile responsiveness', () => {
  const src = readFileSync(join(process.cwd(), 'components', 'sidebar.tsx'), 'utf-8')

  it('has a mobile top bar (md:hidden)', () => {
    expect(src).toContain('md:hidden')
  })

  it('desktop sidebar is hidden on mobile (hidden md:flex)', () => {
    expect(src).toContain('hidden md:flex')
  })

  it('mobile slide-over has translate-x transition', () => {
    expect(src).toContain('translate-x-0')
    expect(src).toContain('-translate-x-full')
  })

  it('has an accessible open navigation label', () => {
    expect(src).toContain('Open navigation')
  })

  it('has an accessible close navigation label', () => {
    expect(src).toContain('Close navigation')
  })

  it('nav links meet 44px touch target (min-h-[44px])', () => {
    expect(src).toContain('min-h-[44px]')
  })

  it('hamburger button meets 44px touch target', () => {
    // The button wrapping <Menu> icon should have 44px sizing
    expect(src).toContain('min-w-[44px]')
  })

  it('has a backdrop overlay for mobile slide-over', () => {
    expect(src).toContain('bg-black/50')
  })

  it('sign out button has aria-label', () => {
    expect(src).toContain('aria-label="Sign out"')
  })
})
