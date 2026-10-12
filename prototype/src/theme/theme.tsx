import { useCallback, useEffect, useState } from 'react'

/**
 * 主题管理：light / dark / system（跟随 Windows 系统主题）。
 * - 用户手动选择后写入 localStorage 持久化
 * - system 模式下监听 prefers-color-scheme 实时跟随
 * - URL 参数 ?theme=light|dark|system 为 QA/截图调试钩子（docs/DESIGN-SYSTEM.md）
 */

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'hermes-ui-theme'
const MEDIA_QUERY = '(prefers-color-scheme: dark)'

function readQueryOverride(): ThemeMode | null {
  try {
    const v = new URLSearchParams(window.location.search).get('theme')
    return v === 'light' || v === 'dark' || v === 'system' ? v : null
  } catch {
    return null
  }
}

function readStored(): ThemeMode {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}

function resolveSystem(): ResolvedTheme {
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light'
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? resolveSystem() : mode
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => readQueryOverride() ?? readStored())
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readQueryOverride() ?? readStored()))

  // 应用到 <html data-theme>；system 模式跟随媒体查询变化
  useEffect(() => {
    const apply = () => {
      const r = resolveTheme(mode)
      setResolved(r)
      document.documentElement.dataset.theme = r
    }
    apply()
    if (mode === 'system') {
      const mq = window.matchMedia(MEDIA_QUERY)
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [mode])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    try {
      window.localStorage.setItem(STORAGE_KEY, m)
    } catch {
      /* 隐私模式等写入失败时仅本次生效 */
    }
  }, [])

  return { mode, resolved, setMode }
}
