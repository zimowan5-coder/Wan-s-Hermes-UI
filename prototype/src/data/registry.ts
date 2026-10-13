import type { HermesDataSource } from './HermesDataSource'
import { LiveDataSource } from './live/LiveDataSource'
import { MockDataSource } from './mock/MockDataSource'

/**
 * 数据源注册表 —— UI 层唯一的 DataSource 入口。
 *
 * 切换方式（prototype/.env.local，见 .env.example）：
 *   VITE_DATA=mock          原型演示（默认）
 *   VITE_DATA=live          真实后端（需同时设置 VITE_GATEWAY_URL）
 *   VITE_GATEWAY_URL=ws://127.0.0.1:PORT/...
 *                           `hermes serve` 启动输出的 ws URL，原样粘贴
 *
 * 约束：LiveDataSource 当前仅 listSessions() 真实可用，
 * 其余方法抛 not implemented（见 LiveDataSource 注释）。
 */

export type DataSourceKind = 'mock' | 'live'

/** 纯函数：便于测试，不直接读 import.meta.env */
export function resolveDataSourceKind(env: Record<string, string | undefined>): DataSourceKind {
  return env.VITE_DATA === 'live' ? 'live' : 'mock'
}

let instance: HermesDataSource | null = null

export function getDataSource(): HermesDataSource {
  if (!instance) {
    const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env
    if (resolveDataSourceKind(env) === 'live') {
      instance = new LiveDataSource(env.VITE_GATEWAY_URL ?? '')
    } else {
      instance = new MockDataSource()
    }
  }
  return instance
}

/** 测试用：重置单例 */
export function resetDataSource() {
  const old = instance
  instance = null
  if (old instanceof MockDataSource) old.dispose()
}
