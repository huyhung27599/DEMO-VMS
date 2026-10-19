import { removeToast, useToastStore, type Toast, type ToastType } from './toastStore'
import './toast.css'

const ICONS: Record<ToastType, string> = {
  success: 'fa-check-circle',
  error: 'fa-exclamation-circle',
  warning: 'fa-exclamation-triangle',
  info: 'fa-info-circle',
}

const COLORS: Record<ToastType, { icon: string; bar: string }> = {
  success: { icon: 'text-[#10b981] drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]', bar: 'bg-[#10b981]' },
  error: { icon: 'text-[#ef4444] drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]', bar: 'bg-[#ef4444]' },
  warning: { icon: 'text-[#f59e0b] drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]', bar: 'bg-[#f59e0b]' },
  info: { icon: 'text-[#3b82f6] drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]', bar: 'bg-[#3b82f6]' },
}

function ToastItem({ toast }: { toast: Toast }) {
  const colors = COLORS[toast.type] ?? COLORS.info
  return (
    <div
      className={`app-toast toast-${toast.type} pointer-events-auto relative flex max-w-[450px] min-w-[320px] items-center gap-4 overflow-hidden rounded-lg border border-black/5 bg-white/95 px-6 py-5 shadow-[0_15px_30px_rgba(0,0,0,0.12)] backdrop-blur-md ${
        toast.removing ? 'removing' : ''
      }`}
      role="status"
    >
      <i className={`fa-solid ${ICONS[toast.type] ?? ICONS.info} shrink-0 text-2xl ${colors.icon}`} aria-hidden="true"></i>
      <div className="grow text-[0.95rem] leading-[1.4] font-semibold text-[#1e293b]">{toast.message}</div>
      <button
        type="button"
        className="cursor-pointer border-none bg-transparent p-1 text-base text-[#94a3b8] transition-all hover:rotate-90 hover:text-danger focus-visible:outline-2 focus-visible:outline-primary"
        aria-label="Đóng thông báo"
        onClick={() => removeToast(toast.id)}
      >
        <i className="fa-solid fa-times" aria-hidden="true"></i>
      </button>
      <div
        className={`app-toast-progress absolute bottom-0 left-0 h-[3px] w-full ${colors.bar}`}
        style={{ animationDuration: `${toast.duration}ms` }}
      ></div>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  return (
    <div
      id="toast-container"
      className="pointer-events-none fixed right-8 bottom-8 z-10000 flex flex-col gap-3"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
