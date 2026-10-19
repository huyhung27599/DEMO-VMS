import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../shared/ui/Button'
import { DatePickerController } from '../datePickerController'
import { loadFaceEvents } from '../queries'
import { useDriverStore, type FaceGridView, type FaceSummaryView } from '../store'
import { FaceEventCard } from './FaceEventCard'

// index.html:1383-1399 (#dtab-ai-faces) + driver.js:1177-1277 (loadFaceEvents/renderFaceEvents, phần DOM)

const emptyStateClass = 'pb-empty-state col-span-full flex h-full flex-col items-center justify-center gap-2 text-[0.85rem] text-text-muted'

function FaceSummary({ view }: { view: FaceSummaryView }) {
  if (view.kind === 'loading') {
    return (
      <span className="text-[0.85rem] text-text-muted">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Đang tải sự kiện nhận diện...
      </span>
    )
  }
  if (view.kind === 'done') {
    const statusText =
      view.total > 0 ? 'Lấy dữ liệu thành công' : 'Không tìm thấy sự kiện trong khoảng thời gian đã chọn'
    return (
      <div className="text-[0.85rem] text-text-muted">
        {statusText}. Tổng cộng: <strong>{view.total}</strong> sự kiện
      </div>
    )
  }
  if (view.kind === 'error') {
    return <span className="text-[0.85rem] text-danger">{view.message}</span>
  }
  return null
}

function FaceGrid({ view }: { view: FaceGridView }) {
  if (view.kind === 'initial') {
    return (
      <div className={emptyStateClass}>
        <i className="fa-solid fa-face-meh fa-3x mb-4 opacity-30" aria-hidden="true"></i>
        <p>
          Nhấn <strong>Tìm kiếm</strong> để tải sự kiện từ API (không còn dữ liệu mẫu).
        </p>
      </div>
    )
  }
  if (view.kind === 'loading') {
    return (
      <div className="col-span-full p-8 text-center">
        <i className="fa-solid fa-spinner fa-spin fa-2x" aria-hidden="true"></i>
        <p>Đang tìm kiếm sự kiện...</p>
      </div>
    )
  }
  if (view.kind === 'error') {
    return <div className="col-span-full text-center text-danger">{view.message}</div>
  }
  if (!view.events || view.events.length === 0) {
    return (
      <div className={emptyStateClass}>
        <i className="fa-solid fa-face-smile fa-3x mb-4 opacity-30" aria-hidden="true"></i>
        <p>Không tìm thấy sự kiện nhận diện nào trong khoảng thời gian này.</p>
      </div>
    )
  }
  return (
    <>
      {view.events.map((evt, i) => (
        <FaceEventCard key={`${evt.guid ?? ''}|${i}`} evt={evt} />
      ))}
    </>
  )
}

export function FaceEventsTab({ active }: { active: boolean }) {
  const summary = useDriverStore((s) => s.faceSummary)
  const grid = useDriverStore((s) => s.faceGrid)
  const startRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<DatePickerController | null>(null)
  const [plate, setPlate] = useState('')

  // driver.js:1531-1542: Flatpickr khởi tạo lúc tải trang (section luôn mount)
  useEffect(() => {
    const picker = new DatePickerController(startRef.current, endRef.current)
    pickerRef.current = picker
    return () => {
      picker.destroy()
      pickerRef.current = null
    }
  }, [])

  return (
    <div className={`dtab-content animate-section-in ${active ? 'active block' : 'hidden'}`} id="dtab-ai-faces">
      <div className="driver-toolbar mb-3 flex flex-wrap items-center gap-4">
        <input
          type="text"
          id="face-start-time"
          ref={startRef}
          className="driver-filter-input"
          placeholder="Từ ngày..."
          aria-label="Từ ngày"
        />
        <span>-</span>
        <input
          type="text"
          id="face-end-time"
          ref={endRef}
          className="driver-filter-input"
          placeholder="Đến ngày..."
          aria-label="Đến ngày"
        />
        <input
          type="text"
          id="face-plate-search"
          className="driver-filter-input min-w-[160px]"
          placeholder="Lọc theo biển số..."
          aria-label="Lọc theo biển số"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
        />
        <Button id="face-search-btn" variant="primary" onClick={() => void loadFaceEvents(pickerRef.current, plate)}>
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Tìm kiếm
        </Button>
      </div>
      <div
        id="face-events-summary"
        className="face-events-summary mb-4 rounded-md border border-border px-4 py-[0.65rem] leading-[1.4]"
        aria-live="polite"
      >
        <FaceSummary view={summary} />
      </div>
      <div className="face-events-grid grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6" id="face-events-grid">
        <FaceGrid view={grid} />
      </div>
    </div>
  )
}
