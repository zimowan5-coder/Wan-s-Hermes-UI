import type { HermesDataSource } from './HermesDataSource'
import { MockDataSource } from './mock/MockDataSource'

/**
 * 数据源注册表 —— UI 层唯一的 DataSource 入口。
 *
 * 当前返回 MockDataSource。真实集成时：
 * 1. 新增 `src/data/live/LiveDataSource.ts` 实现 HermesDataSource
 *    （经 Electron 能力桥 → requestGateway，不得绕过）；
 * 2. 在此处按环境/配置切换返回 LiveDataSource；
 * 3. UI 层零改动（只依赖 HermesDataSource 接口）。
 */

let instance: HermesDataSource | null = null

export function getDataSource(): HermesDataSource {
  if (!instance) instance = new MockDataSource()
  return instance
}

/** 测试用：重置单例 */
export function resetDataSource() {
  const old = instance
  instance = null
  if (old instanceof MockDataSource) old.dispose()
}
