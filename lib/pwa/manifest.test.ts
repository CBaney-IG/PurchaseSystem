import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('PWA manifest', () => {
  const raw = readFileSync(join(process.cwd(), 'public', 'manifest.json'), 'utf-8')
  const manifest = JSON.parse(raw)

  it('has a name', () => {
    expect(manifest.name).toBeTruthy()
  })

  it('has a short_name', () => {
    expect(manifest.short_name).toBeTruthy()
  })

  it('sets display to standalone', () => {
    expect(manifest.display).toBe('standalone')
  })

  it('has a start_url', () => {
    expect(manifest.start_url).toBeTruthy()
  })

  it('starts on /dashboard', () => {
    expect(manifest.start_url).toBe('/dashboard')
  })

  it('has a theme_color', () => {
    expect(manifest.theme_color).toBeTruthy()
  })

  it('has at least one icon', () => {
    expect(Array.isArray(manifest.icons)).toBe(true)
    expect(manifest.icons.length).toBeGreaterThan(0)
  })

  it('icon entries have required fields', () => {
    for (const icon of manifest.icons) {
      expect(icon.src).toBeTruthy()
      expect(icon.sizes).toBeTruthy()
      expect(icon.type).toBeTruthy()
    }
  })

  it('has a 192x192 icon', () => {
    const icon192 = manifest.icons.find((i: { sizes: string }) => i.sizes === '192x192')
    expect(icon192).toBeDefined()
  })

  it('has a 512x512 icon', () => {
    const icon512 = manifest.icons.find((i: { sizes: string }) => i.sizes === '512x512')
    expect(icon512).toBeDefined()
  })

  it('has shortcuts array', () => {
    expect(Array.isArray(manifest.shortcuts)).toBe(true)
  })

  it('shortcuts have url and name', () => {
    for (const shortcut of manifest.shortcuts) {
      expect(shortcut.url).toBeTruthy()
      expect(shortcut.name).toBeTruthy()
    }
  })
})
