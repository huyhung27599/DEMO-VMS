import { useState } from 'react'
import { api } from '../../../shared/api/endpoints'
import { Button } from '../../../shared/ui/Button'
import { showToast } from '../../../shared/ui/toastStore'
import { FACE_HEALTH_CHECKING_TEXT } from '../faceEvents'
import type { Loose } from '../lib'
import { showFaceServiceHealth } from '../queries'
import { useDriverStore, type FaceHealthView } from '../store'

// index.html:1355-1361 (AI Service Status Banner) + driver.js:837-903 (phần ghi DOM), 1603-1618 (#face-sync-btn)

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
    <span style={{ color: '#10b981' }}>
      <i className="fa-solid fa-circle-check" aria-hidden="true"></i> {health.statusText}
    </span>
  ) : (
    <span style={{ color: '#ef4444' }}>
      <i className="fa-solid fa-circle-xmark" aria-hidden="true"></i> {health.statusText}
    </span>
  )
}

export function FaceServiceBanner() {
  const health = useDriverStore((s) => s.faceHealth)
  const [syncing, setSyncing] = useState(false)
  // Sau lần đồng bộ đầu, bản gốc đặt lại innerHTML thành "Đồng bộ ảnh tài xế" (khác chữ ban đầu trong index.html)
  const [synced, setSynced] = useState(false)

  const onSync = async () => {
    setSyncing(true)
    // Bản gốc không try/catch: nếu API reject thì nút giữ trạng thái "Đang đồng bộ..."
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

  return (
    <div className="flex items-center gap-6 border-b border-border px-6 py-[0.6rem] text-[0.85rem]">
      <span id="face-service-status">
        <FaceServiceStatus health={health} />
      </span>
      <span id="face-db-count" className="text-text-muted">
        {health.dbText}
      </span>
      {/* Bản gốc không gắn handler cho nút này */}
      <Button
        id="face-reload-db-mini"
        size="sm"
        className="px-[0.4rem]! py-[0.1rem]! text-[0.75rem]!"
        title="Tải lại database ngay lập tức"
        aria-label="Tải lại database ngay lập tức"
      >
        <i className="fa-solid fa-rotate" aria-hidden="true"></i>
      </Button>
      <Button id="face-sync-btn" variant="primary" size="sm" className="ml-auto" disabled={syncing} onClick={() => void onSync()}>
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
            <i className="fa-solid fa-sync" aria-hidden="true"></i> Đồng bộ &amp; Cập nhật AI
          </>
        )}
      </Button>
    </div>
  )
}
