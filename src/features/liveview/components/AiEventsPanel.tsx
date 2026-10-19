import { Button } from '../../../shared/ui/Button'

// index.html:934-953 — nội dung tab "Sự kiện AI" (#rtab-ai-events). Markup tĩnh; Task 11 gắn
// tìm kiếm (#ai-event-search), nút làm mới (#refresh-ai-events) và danh sách (#ai-events-list).
export function AiEventsPanel() {
  return (
    <div className="ai-events-panel flex h-full flex-1 flex-col overflow-hidden bg-base">
      <div className="ai-events-filter flex gap-2 border-b border-solid border-border p-3">
        <input
          type="text"
          id="ai-event-search"
          aria-label="Tìm sự kiện, xe..."
          className="liveview-filter-select flex-1 cursor-text"
          placeholder="Tìm sự kiện, xe..."
        />
        <Button size="sm" id="refresh-ai-events" title="Làm mới" aria-label="Làm mới">
          <i className="fa-solid fa-rotate-right" aria-hidden="true"></i>
        </Button>
      </div>
      <ul className="ai-events-list m-0 flex flex-1 list-none flex-col gap-3 overflow-y-auto bg-[#f1f5f9] p-3" id="ai-events-list">
        <li className="ai-event-empty p-4 text-center text-sm text-text-muted">Chưa có sự kiện AI nào được ghi nhận.</li>
      </ul>
    </div>
  )
}
