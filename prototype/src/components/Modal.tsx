import { useEffect, useRef, type ReactNode } from 'react'

/** Native dialog owns inert background, keyboard focus containment and Escape. */
export function Modal({ open, onClose, label, className = '', children }: {
  open: boolean; onClose: () => void; label: string; className?: string; children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger?.isConnected && !trigger.closest('[hidden]')) trigger.focus({ preventScroll: true })
    }
  }, [open])
  return <dialog ref={ref} aria-label={label} className={`modal ${className}`}
    onCancel={e => { e.preventDefault(); onClose() }}
    onKeyDown={e => {
      if (e.key !== 'Tab') return
      const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]')).filter(el => el.tabIndex >= 0 && !el.hasAttribute('disabled') && el.getClientRects().length > 0)
      const first = items[0], last = items[items.length - 1]
      if (!first) { e.preventDefault(); return }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }}
    onClick={e => {
      if (e.target !== e.currentTarget) return
      const r = e.currentTarget.getBoundingClientRect()
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose()
    }}>{open && children}</dialog>
}
