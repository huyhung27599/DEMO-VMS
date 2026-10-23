import { MapContainer } from '../../map/MapContainer'
import { useQuery } from '@tanstack/react-query'
import { liveDeviceStatusQueryOptions, toDeviceStatusItems } from '../deviceStatus'
import { onRightTabClick } from '../actions'
import { useLiveviewStore } from '../store'
import { AiEventsPanel } from './AiEventsPanel'

const TONE_DOT = {
  ok: 'bg-[#22c55e]',
  warn: 'bg-[#f59e0b]',
  bad: 'bg-[#e11d48]',
} as const

export function DeviceStatusPanel() {
  const rightTab = useLiveviewStore((s) => s.rightTab)
  const deviceId = useLiveviewStore((s) => (s.grid.kind === 'player' ? s.grid.deviceId : ''))
  const status = useQuery(liveDeviceStatusQueryOptions(deviceId)).data
  const items = status?.items ?? toDeviceStatusItems(null, null)

  return (
    <aside className="flex h-full min-h-0 w-[280px] shrink-0 flex-col gap-3 overflow-hidden max-[1100px]:w-full max-[1100px]:flex-row max-[1100px]:overflow-x-auto">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#eef2f6] bg-white p-4 shadow-sm max-[1100px]:min-w-[260px]">
        <h3 className="m-0 mb-3 text-[0.85rem] font-bold text-[#0f172a]">Trạng thái thiết bị</h3>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-xl bg-[#f8fafc] px-3 py-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#64748b] shadow-sm">
                <i className={`fa-solid ${item.icon}`} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[0.7rem] font-semibold tracking-wide text-[#94a3b8] uppercase">{item.label}</div>
                <div className="truncate text-[0.82rem] font-semibold text-[#1e293b]">{item.value}</div>
              </div>
              <span className={`size-2.5 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-h-0 flex-[1.15] flex-col overflow-hidden rounded-2xl border border-[#eef2f6] bg-white shadow-sm max-[1100px]:min-w-[300px]">
        <div className="flex items-center gap-1 border-b border-[#eef2f6] px-2 pt-2">
          <button
            type="button"
            role="tab"
            aria-selected={rightTab === 'map-view'}
            data-rtab="map-view"
            className={`right-tab-btn flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[0.78rem] font-semibold transition-colors ${
              rightTab === 'map-view' ? 'bg-[#fce8eb] text-[#c92038]' : 'text-[#64748b] hover:bg-[#f8fafc]'
            }`}
            onClick={() => onRightTabClick('map-view')}
          >
            <i className="fa-solid fa-map-location-dot" aria-hidden /> Bản đồ giám sát
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={rightTab === 'ai-events'}
            data-rtab="ai-events"
            className={`right-tab-btn flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[0.78rem] font-semibold transition-colors ${
              rightTab === 'ai-events' ? 'bg-[#fce8eb] text-[#c92038]' : 'text-[#64748b] hover:bg-[#f8fafc]'
            }`}
            onClick={() => onRightTabClick('ai-events')}
          >
            Sự kiện AI
          </button>
        </div>

        <div
          className={`right-tab-content min-h-0 flex-1 flex-col overflow-hidden ${rightTab === 'map-view' ? 'active flex' : 'hidden'}`}
          id="rtab-map-view"
        >
          <div className="min-h-0 flex-1 px-3 pt-2">
            <MapContainer
              target="liveView"
              placeholder="Initializing Map..."
              className="h-full min-h-[160px] overflow-hidden rounded-xl border border-[#eef2f6]! shadow-none!"
            />
          </div>
          <p className="m-0 truncate px-4 py-3 text-[0.8rem] font-medium text-[#64748b]">
            <i className="fa-solid fa-location-dot mr-1.5 text-[#e11d48]" aria-hidden />
            {status?.address || '—'}
          </p>
        </div>

        <div
          className={`right-tab-content min-h-0 flex-1 flex-col overflow-hidden ${rightTab === 'ai-events' ? 'active flex' : 'hidden'}`}
          id="rtab-ai-events"
        >
          <AiEventsPanel />
        </div>
      </div>
    </aside>
  )
}
