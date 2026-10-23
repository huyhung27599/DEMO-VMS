import { useState } from 'react'
import { api } from '../../../shared/api/endpoints'
import { Button } from '../../../shared/ui/Button'
import { showToast } from '../../../shared/ui/toastStore'
import { FACE_HEALTH_CHECKING_TEXT } from '../faceEvents'
import type { Loose } from '../lib'
import { showFaceServiceHealth } from '../queries'
import { useDriverStore, type FaceHealthView } from '../store'

// index.html:1355-1361 (AI Service Status Banner) + driver.js:837-903, 1603-1618 (#face-sync-btn)

function FaceServiceStatus({ health }: { health: FaceHealthView }) {
  if (health.phase === 'initial') {
    return (
      <>
        <i className="fa-solid fa-circle-question" aria-hidden="true"></i> Đang kiểm tra AI Service...
      </>
    )
  }
  if (health.phase === 'checking') {
    return (
      <>
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> {FACE_HEALTH_CHECKING_TEXT}
      </>
    )
  }
  return health.ok ? (
    <span className="inline-flex items-center gap-1.5 font-semibold text-[#059669]">
      <span className="size-2 rounded-full bg-[#22c55e]" /> {health.statusText || 'Đang chạy'}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 font-semibold text-[#e11d48]">
      <span className="size-2 rounded-full bg-[#e11d48]" /> {health.statusText}
    </span>
  )
}

export function FaceServiceBanner() {
  const health = useDriverStore((s) => s.faceHealth)
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)

  const onSync = async () => {
    setSyncing(true)
    const res: Loose = await api.faceSyncDrivers()
    setSyncing(false)
    setSynced(true)
    if (res && res.result === 0) {
      showToast(
        `Đồng bộ hoàn tất! Nhận diện được: ${res.known_faces_now} tài xế. Đã tải: ${res.synced}. Bỏ qua (không có ảnh): ${res.skipped_no_photo}`,
        'success',
        6000,
      )
      void showFaceServiceHealth()
    } else {
      showToast(`Lỗi đồng bộ: ${res?.msg || JSON.stringify(res)}`, 'error')
    }
  }

  const ok = health.phase === 'done' && health.ok

  return (
    <div
      className={`flex flex-wrap items-center gap-4 rounded-2xl border px-4 py-3.5 text-[0.85rem] shadow-sm ${
        ok ? 'border-[#bbf7d0] bg-[#ecfdf5]' : 'border-[#eef2f6] bg-white'
      }`}
    >
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
          ok ? 'bg-[#d1fae5] text-[#059669]' : 'bg-[#f1f5f9] text-[#64748b]'
        }`}
        aria-hidden
      >
        <i className="fa-solid fa-face-viewfinder text-lg" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 font-bold text-[#0f172a]">
          AI Service nhận diện khuôn mặt
          <span id="face-service-status" className="font-semibold">
            <FaceServiceStatus health={health} />
          </span>
        </div>
        <p id="face-db-count" className="mt-1 mb-0 text-[0.8rem] text-[#64748b]">
          {health.dbText || 'Đang tải thông tin cơ sở dữ liệu…'}
        </p>
      </div>

      <Button
        id="face-reload-db-mini"
        size="sm"
        className="rounded-xl! px-2.5! py-2! text-[0.75rem]!"
        title="Tải lại database ngay lập tức"
        aria-label="Tải lại database ngay lập tức"
      >
        <i className="fa-solid fa-rotate" aria-hidden="true"></i>
      </Button>

      <Button
        id="face-sync-btn"
        variant="primary"
        size="sm"
        className="rounded-xl!"
        disabled={syncing}
        onClick={() => void onSync()}
      >
        {syncing ? (
          <>
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Đang đồng bộ...
          </>
        ) : synced ? (
          <>
            <i className="fa-solid fa-sync" aria-hidden="true"></i> Đồng bộ ảnh tài xế
          </>
        ) : (
          <>
            <i className="fa-solid fa-sync" aria-hidden="true"></i> Đồng bộ AI
          </>
        )}
      </Button>
    </div>
  )
}
