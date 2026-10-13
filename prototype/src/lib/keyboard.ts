import type { KeyboardEvent } from 'react'
/** Roving focus and selection for small tab/radio groups; no global key capture. */
export function onGroupKeyDown(event: KeyboardEvent<HTMLElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"], [role="radio"]')).filter(el => !el.disabled)
  const current = items.indexOf(document.activeElement as HTMLButtonElement)
  if (current < 0 || !items.length) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 :
    (current + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length
  items[next].focus(); items[next].click()
}
