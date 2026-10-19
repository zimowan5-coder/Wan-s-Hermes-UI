import { useCallback, useEffect, useState } from 'react'

/**
 * 本地界面偏好（localStorage）+ 同页多实例同步。
 * 存储不可用（隐私模式、被拦截）时只在本次页面生效。
 */
const listeners = new Map<string, Set<(v: string) => void>>()

function read<T extends string>(key: string, fallback: T, valid: readonly T[]): T {
  try {
    const v = window.localStorage.getItem(key)
    return valid.includes(v as T) ? v as T : fallback
  } catch {
    return fallback
  }
}

export function usePref<T extends string>(key: string, fallback: T, valid: readonly T[]) {
  const [value, setValue] = useState<T>(() => read(key, fallback, valid))
  useEffect(() => {
    const set = listeners.get(key) ?? new Set()
    listeners.set(key, set)
    const fn = (v: string) => setValue(v as T)
    set.add(fn)
    return () => { set.delete(fn) }
  }, [key])
  const update = useCallback((v: T) => {
    try { window.localStorage.setItem(key, v) } catch { /* 仅本次生效 */ }
    listeners.get(key)?.forEach(fn => fn(v))
  }, [key])
  return [value, update] as const
}

/** 界面模式：简洁（只有对话）/ 高级（显示文件、终端等开发者面板），与官方 interfaceMode 一致 */
export type InterfaceMode = 'simple' | 'advanced'
export const useInterfaceMode = () => usePref<InterfaceMode>('hermes-ui-mode', 'simple', ['simple', 'advanced'])
