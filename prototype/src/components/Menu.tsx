import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface MenuItem {
  id: string
  label: string
  icon?: ReactNode
  hint?: string
  danger?: boolean
  checked?: boolean
  disabled?: boolean
  onSelect?: () => void
}
export type MenuEntry = MenuItem | { separator: true; id: string } | { heading: string; id: string }

/**
 * 弹出菜单：渲染到 body（或触发按钮所在的对话框）以免被滚动容器裁切。
 * 键盘：↑↓ 移动、Enter 选择、Esc 关闭并把焦点还给触发按钮。
 */
export function Menu({ label, trigger, items, align = 'start', placement = 'bottom', className = '', width = 220, children }: {
  label: string
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu'; ref: (el: HTMLButtonElement | null) => void }) => ReactNode
  items?: MenuEntry[]
  align?: 'start' | 'end'
  placement?: 'bottom' | 'top'
  className?: string
  width?: number
  /** 自定义内容（替代 items），例如模型选择器 */
  children?: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const close = (refocus = true) => { setOpen(false); if (refocus) btnRef.current?.focus() }

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, align === 'end' ? r.right - width : r.left))
    setPos(placement === 'top' ? { left, bottom: window.innerHeight - r.top + 6 } : { left, top: r.bottom + 6 })
  }, [open, align, placement, width])

  // 下方空间不够时向上弹出（反之亦然），避免菜单被窗口裁掉
  useLayoutEffect(() => {
    const el = menuRef.current, b = btnRef.current
    if (!open || !pos || !el || !b) return
    const m = el.getBoundingClientRect(), r = b.getBoundingClientRect()
    if (pos.top !== undefined && m.bottom > window.innerHeight - 8 && r.top - m.height - 6 > 8) setPos({ left: pos.left, bottom: window.innerHeight - r.top + 6 })
    else if (pos.bottom !== undefined && m.top < 8 && r.bottom + m.height + 6 < window.innerHeight - 8) setPos({ left: pos.left, top: r.bottom + 6 })
  }, [open, pos])

  useEffect(() => {
    if (!open) return
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled]), button, input')
    first?.focus()
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onResize)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('resize', onResize) }
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return }
    if (e.key === 'Tab') { setOpen(false); return }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const els = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled]), [role="menuitemradio"]') ?? [])
    if (!els.length) return
    e.preventDefault()
    const i = els.indexOf(document.activeElement as HTMLElement)
    els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length].focus()
  }

  const container = btnRef.current?.closest('dialog') ?? document.body
  return <>
    {trigger({ onClick: () => setOpen(o => !o), 'aria-expanded': open, 'aria-haspopup': 'menu', ref: el => { btnRef.current = el } })}
    {open && pos && createPortal(
      <div ref={menuRef} role="menu" aria-label={label} className={`menu-popover ${className}`} style={{ ...pos, width }} onKeyDown={onKeyDown}>
        {children ? children(() => close()) : items?.map(entry => {
          if ('separator' in entry) return <div key={entry.id} className="menu-sep" role="separator" />
          if ('heading' in entry) return <div key={entry.id} className="menu-heading">{entry.heading}</div>
          return <button key={entry.id} role="menuitem" disabled={entry.disabled} className={`menu-item ${entry.danger ? 'is-danger' : ''}`}
            onClick={() => { close(false); entry.onSelect?.() }}>
            <span className="menu-icon" aria-hidden>{entry.icon}</span>
            <span className="flex-1 truncate">{entry.label}</span>
            {entry.checked && <span className="menu-check" aria-label="当前">✓</span>}
            {entry.hint && <kbd className="menu-hint">{entry.hint}</kbd>}
          </button>
        })}
      </div>, container)}
  </>
}
