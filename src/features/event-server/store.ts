import { create } from 'zustand'
import { SAFETY_ALARM_TYPES, formatTime } from './lib'
import { playAiToastSound } from './sound'

// event-server.js:157-205 — showToast/removeToast (đổi tên: useToastStore thuộc toast chung AppHelpers).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = Record<string, any>

export type AiToast = {
  id: number
  typeName: string
  plate: string
  time: string
  /** removeToast đã chạy: class show -> hide, 500 ms sau mới gỡ khỏi DOM */
  hiding: boolean
}

export const useAiToastStore = create<{ toasts: AiToast[] }>(() => ({ toasts: [] }))

let nextId = 1

export function removeAiToast(id: number): void {
  // bản gốc: classList.replace('show','hide'); gọi lại (nút đóng + hẹn 10 s) vẫn hẹn gỡ lần nữa
  useAiToastStore.setState((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, hiding: true } : t)) }))
  setTimeout(() => {
    useAiToastStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  }, 500)
}

export function showAiToast(alarm: Loose): void {
  try {
    const enabled = localStorage.getItem('dashcam_setting_aiToasts')
    if (enabled === '0' || enabled === 'false') return
  } catch {
    // bỏ qua
  }

  playAiToastSound()

  const typeName = SAFETY_ALARM_TYPES[alarm.armType || alarm.ty] || 'Cảnh báo AI: ' + (alarm.armType || alarm.ty)
  // bản gốc sanitizeHTML rồi innerHTML; JSX tự escape (R13)
  const plate = String(alarm.vehicleName || alarm.vehiIdno || alarm.devId || alarm.devIdno || 'Biển số chưa xác định')
  const id = nextId++
  useAiToastStore.setState((s) => ({
    toasts: [...s.toasts, { id, typeName, plate, time: formatTime(alarm.stm || alarm.st), hiding: false }],
  }))

  // Auto remove after 10s
  setTimeout(() => removeAiToast(id), 10000)
}

export function resetAiToastStore(): void {
  useAiToastStore.setState({ toasts: [] })
}
