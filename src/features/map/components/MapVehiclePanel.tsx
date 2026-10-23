import { startTransition, useDeferredValue, useMemo } from 'react'
import {
  countByStatus,
  resolveMapDriver,
  resolveMapPlate,
  resolveMapRowStatus,
  resolveMapSpeed,
  type MapRowStatus,
} from '../listHelpers'
import { statusUid } from '../lib'
import { MAP_COMPANY_OPTIONS, MAP_STATUS_OPTIONS } from '../mockData'
import { mapController } from '../mapController'
import { useMapStore } from '../store'

const DOT: Record<MapRowStatus, string> = {
  online: 'bg-[#22c55e]',
  alert: 'bg-[#e11d48]',
  offline: 'bg-[#94a3b8]',
}

const LABEL: Record<MapRowStatus, string> = {
  online: 'Trực tuyến',
  alert: 'Cảnh báo',
  offline: 'Offline',
}

const SELECT =
  'h-9 min-w-0 flex-1 cursor-pointer rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-2.5 text-[0.78rem] font-medium text-[#334155] outline-none focus:border-[#e11d48]/40'

export function MapVehiclePanel({ highlighted = false }: { highlighted?: boolean }) {
  const statuses = useMapStore((s) => s.statuses)
  const followTarget = useMapStore((s) => s.followTarget)
  const listQuery = useMapStore((s) => s.listQuery)
  const listCompany = useMapStore((s) => s.listCompany)
  const listStatus = useMapStore((s) => s.listStatus)
  const deferredQ = useDeferredValue(listQuery)

  const counts = useMemo(() => countByStatus(statuses), [statuses])

  const rows = useMemo(() => {
    const term = deferredQ.trim().toLowerCase()
    return statuses
      .map((s) => {
        const uid = statusUid(s) || ''
        return {
          uid,
          plate: resolveMapPlate(s),
          driver: resolveMapDriver(s),
          speed: resolveMapSpeed(s),
          status: resolveMapRowStatus(s),
          company: String(s.company || s.enterprise || ''),
        }
      })
      .filter((r) => {
        if (!r.uid) return false
        if (listStatus !== 'all' && r.status !== listStatus) return false
        if (listCompany && r.company && !r.company.toLowerCase().includes(listCompany)) return false
        if (term && !r.plate.toLowerCase().includes(term) && !r.driver.toLowerCase().includes(term)) return false
        return true
      })
  }, [statuses, deferredQ, listCompany, listStatus])

  return (
    <aside className="flex h-full min-h-0 w-[300px] shrink-0 flex-col overflow-hidden border-r border-[#eef2f6] bg-white max-[1100px]:w-full max-[1100px]:max-h-[320px] max-[1100px]:border-r-0 max-[1100px]:border-b">
      <div
        className={`flex shrink-0 flex-col gap-2.5 border-b border-[#eef2f6] p-3 transition-shadow ${
          highlighted ? 'bg-[#fff8f9] ring-2 ring-inset ring-[#e11d48]/20' : ''
        }`}
      >
        <label className="relative block">
          <i
            className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[0.8rem] text-[#94a3b8]"
            aria-hidden
          />
          <input
            type="search"
            value={listQuery}
            onChange={(e) => {
              const v = e.target.value
              startTransition(() => useMapStore.setState({ listQuery: v }))
            }}
            placeholder="Tìm theo biển số..."
            className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-2.5 pr-3 pl-9 text-sm text-[#1e293b] outline-none focus:border-[#e11d48]/40 focus:ring-2 focus:ring-[#e11d48]/10"
          />
        </label>
        <div className="flex gap-2">
          <select
            className={SELECT}
            value={listCompany}
            aria-label="Doanh nghiệp"
            onChange={(e) => useMapStore.setState({ listCompany: e.target.value })}
          >
            {MAP_COMPANY_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className={SELECT}
            value={listStatus}
            aria-label="Trạng thái"
            onChange={(e) =>
              useMapStore.setState({ listStatus: e.target.value as typeof listStatus })
            }
          >
            {MAP_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] font-semibold text-[#64748b]">
          <span className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${DOT.online}`} /> {counts.online} trực tuyến
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${DOT.alert}`} /> {counts.alert} cảnh báo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${DOT.offline}`} /> {counts.offline} offline
          </span>
        </div>
      </div>

      <ul className="m-0 flex list-none flex-1 flex-col gap-1 overflow-y-auto p-2 [content-visibility:auto]">
        {rows.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-[#94a3b8]">
            {statuses.length === 0 ? 'Đang chờ dữ liệu GPS...' : 'Không tìm thấy phương tiện'}
          </li>
        ) : null}
        {rows.map((r) => {
          const selected = followTarget === r.uid
          return (
            <li key={r.uid}>
              <button
                type="button"
                onClick={() => mapController.focusOnVehicle(r.uid)}
                className={`flex w-full cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  selected
                    ? 'border-[#f5c2c9] border-l-[3px] border-l-[#e11d48] bg-[#fce8eb]'
                    : 'border-transparent hover:bg-[#f8fafc]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`truncate text-[0.9rem] font-bold ${
                      r.status === 'alert' ? 'text-[#e11d48]' : 'text-[#0f172a]'
                    }`}
                  >
                    {r.plate}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[0.7rem] font-medium text-[#64748b]">
                    <span className={`size-2 rounded-full ${DOT[r.status]}`} />
                    {LABEL[r.status]}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[0.75rem] text-[#94a3b8]">
                  <span className="truncate">{r.driver}</span>
                  <span className="shrink-0 tabular-nums font-semibold text-[#64748b]">{r.speed}</span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
