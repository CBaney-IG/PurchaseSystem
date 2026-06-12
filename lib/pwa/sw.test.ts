import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('service worker', () => {
  const sw = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf-8')

  it('exists and is non-empty', () => {
    expect(sw.length).toBeGreaterThan(0)
  })

  it('registers an install event listener', () => {
    expect(sw).toContain("addEventListener('install'")
  })

  it('registers an activate event listener', () => {
    expect(sw).toContain("addEventListener('activate'")
  })

  it('registers a fetch event listener', () => {
    expect(sw).toContain("addEventListener('fetch'")
  })

  it('never caches /api/ routes', () => {
    expect(sw).toContain("pathname.startsWith('/api/')")
  })

  it('never caches /auth/ routes', () => {
    expect(sw).toContain("pathname.startsWith('/auth/')")
  })

  it('caches /_next/static/ assets', () => {
    expect(sw).toContain("/_next/static/")
  })

  it('defines a cache name constant', () => {
    expect(sw).toContain('CACHE_NAME')
  })

  it('cleans up old cache versions on activate', () => {
    expect(sw).toContain('caches.keys()')
    expect(sw).toContain('caches.delete(')
  })

  it('calls skipWaiting on install', () => {
    expect(sw).toContain('self.skipWaiting()')
  })

  it('calls clients.claim on activate', () => {
    expect(sw).toContain('self.clients.claim()')
  })
})
