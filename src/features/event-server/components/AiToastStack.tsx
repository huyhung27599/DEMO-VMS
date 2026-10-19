import { useEffect, useState } from 'react'
import { useEventServerPolling } from '../queries'
import { removeAiToast, useAiToastStore, type AiToast } from '../store'

// event-server.js:43-139 injectStyles + 141-149 createToastContainer + 180-201 markup -> Tailwind.

function AiToastItem({ toast }: { toast: AiToast }) {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    // bản gốc: buộc reflow rồi thêm class `show` để chạy transition
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  const visible = entered && !toast.hiding
  return (
    <div
      data-testid="ai-toast"
      className={`pointer-events-auto flex w-[360px] items-start gap-3 rounded-lg border-l-[5px] border-[#ef4444] bg-[rgba(15,23,42,0.95)] p-4 font-[Inter,sans-serif] text-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)] backdrop-blur-[12px] transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 animate-pulse-heart items-center justify-center rounded-full bg-[rgba(239,68,68,0.15)] text-[1.6rem] text-[#ef4444]">
        <i className="fa-solid fa-triangle-exclamation" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 overflow-hidden text-[0.95rem] font-semibold text-ellipsis whitespace-nowrap text-[#fca5a5]">
          <i className="fa-solid fa-robot" /> {toast.typeName}
        </div>
        <div className="mb-[3px] text-[0.85rem] font-medium text-[#e2e8f0]">
          <i className="fa-solid fa-car-side" /> {toast.plate}
        </div>
        <div className="text-xs text-[#94a3b8]">
          <i className="fa-solid fa-clock-rotate-left" /> Xảy ra lúc: {toast.time}
        </div>
      </div>
      <button
        type="button"
        aria-label="Đóng"
        onClick={() => removeAiToast(toast.id)}
        className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-[1.2rem] leading-none text-[#94a3b8] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  )
}

export function AiToastStack() {
  useEventServerPolling()
  const toasts = useAiToastStore((s) => s.toasts)
  return (
    <div id="ai-toast-container" className="pointer-events-none fixed right-[25px] bottom-[25px] z-[99999] flex flex-col gap-3">
      {toasts.map((t) => (
        <AiToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
