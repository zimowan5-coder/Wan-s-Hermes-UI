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

/**
 * 跨实例同步：同一页面内多次调用 useTheme()（如顶栏 + 设置页）时，
 * 任意一处 setMode 都会广播，其他实例重新读取并更新，保证两处 UI 同步。
 */
const syncListeners = new Set<() => void>()
function broadcastThemeChange() {
  syncListeners.forEach(fn => fn())
}

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

  // 跨实例同步：监听其他 useTheme 实例的 setMode
  useEffect(() => {
    const sync = () => setModeState(readStored())
    syncListeners.add(sync)
    return () => { syncListeners.delete(sync) }
  }, [])

  // 应用到 <html data-theme>；system 模式跟随媒体查询变化
  useEffect(() => {
    const apply = () => {
      const r = resolveTheme(mode)
      setResolved(r)
      document.documentElement.dataset.theme = r
    }
    // QA 钩子：?notransition=1 禁用主题过渡，避免截图抓到中间帧（见 DESIGN-SYSTEM.md）
    try {
      if (new URLSearchParams(window.location.search).get('notransition') === '1') {
        document.body.style.transition = 'none'
      }
    } catch { /* ignore */ }
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
    broadcastThemeChange()
  }, [])

  return { mode, resolved, setMode }
}
