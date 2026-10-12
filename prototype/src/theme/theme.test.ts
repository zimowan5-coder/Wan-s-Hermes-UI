import { afterEach, describe, expect, it } from 'vitest'
import { resolveTheme } from './theme'

describe('resolveTheme', () => {
  const g = globalThis as unknown as { window?: unknown }
  const origWindow = g.window

  afterEach(() => { g.window = origWindow })

  it('light / dark 直接返回', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('system 跟随 prefers-color-scheme（dark）', () => {
    g.window = { matchMedia: (q: string) => ({ matches: q.includes('dark') }) }
    expect(resolveTheme('system')).toBe('dark')
  })

  it('system 跟随 prefers-color-scheme（light）', () => {
    g.window = { matchMedia: () => ({ matches: false }) }
    expect(resolveTheme('system')).toBe('light')
  })
})
