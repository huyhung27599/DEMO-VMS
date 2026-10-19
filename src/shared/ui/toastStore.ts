import { create } from 'zustand'

// Chuyển từ window.AppHelpers.showToast (main.js:279-316).

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export type Toast = {
  id: number
  message: string
  type: ToastType
  duration: number
  removing: boolean
}

export const useToastStore = create<{ toasts: Toast[] }>(() => ({ toasts: [] }))

let nextId = 1

export function removeToast(id: number): void {
  const toast = useToastStore.getState().toasts.find((t) => t.id === id)
  if (!toast || toast.removing) return
  useToastStore.setState((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, removing: true } : t)) }))
  setTimeout(() => {
    useToastStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  }, 300)
}

export function showToast(message: string, type: ToastType = 'info', duration: number = 4000): void {
  const id = nextId++
  useToastStore.setState((s) => ({ toasts: [...s.toasts, { id, message, type, duration, removing: false }] }))
  setTimeout(() => removeToast(id), duration)
}
