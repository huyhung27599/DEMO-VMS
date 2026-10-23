import { useMemo, useState } from 'react'
import { onVehicleChange } from '../actions'
import type { Loose } from '../lib'
import { getDriverMapping } from '../queries'
import { useLiveviewStore, type VehicleOptionsView } from '../store'

type RowStatus = 'online' | 'offline' | 'alert'

function resolveDriver(vehicle: Loose): string {
  const mapping = getDriverMapping() as Record<string, string>
  const plate = String(vehicle?.nm || vehicle?.vehiIdno || '')
  const dev =
    typeof vehicle?.dl === 'string'
      ? vehicle.dl
      : Array.isArray(vehicle?.dl) && vehicle.dl[0]
        ? String(vehicle.dl[0].id || vehicle.dl[0].devIdno || '')
        : ''
  for (const key of [plate, dev]) {
    if (key && mapping[key]) return mapping[key]
  }
  return '—'
}

function resolveStatus(vehicle: Loose): RowStatus {
  const ol = vehicle?.ol === 1 || vehicle?.ol === '1' || vehicle?.status === 1 || vehicle?.status === '1'
  if (vehicle?.alarm || vehicle?.alert) return 'alert'
  return ol ? 'online' : 'offline'
}

function resolveSpeed(vehicle: Loose): string {
  const spd = Number(vehicle?.speed)
  if (Number.isFinite(spd) && spd > 0) return `${Math.round(spd)} km/h`
  return '—'
}

const STATUS_DOT: Record<RowStatus, string> = {
  online: 'bg-[#22c55e]',
  offline: 'bg-[#94a3b8]',
  alert: 'bg-[#e11d48]',
}

const STATUS_LABEL: Record<RowStatus, string> = {
  online: 'Trực tuyến',
  offline: 'Ngoại tuyến',
  alert: 'Cảnh báo',
}

function HiddenVehicleSelect({ view, value }: { view: VehicleOptionsView; value: string }) {
  return (
    <select
      id="liveview-vehicle-select"
      aria-label="Chọn phương tiện"
      className="sr-only"
      tabIndex={-1}
      value={value}
      onChange={(e) => onVehicleChange(e.target.value)}
    >
      {view.kind === 'error' ? <option value="">Lỗi tải danh sách</option> : null}
      {view.kind === 'initial' ? <option value="">Chọn phương tiện</option> : null}
      {view.kind === 'list' ? (
        <>
          <option value="">Chọn phương tiện...</option>
          {view.vehicles.map((vehicle: Loose, cacheIndex: number) => (
            <option key={cacheIndex} value={String(cacheIndex)}>
              {String(vehicle?.nm || 'Unknown Vehicle')}
            </option>
          ))}
        </>
      ) : null}
    </select>
  )
}

export function VehicleSidebar() {
  const view = useLiveviewStore((s) => s.vehicleOptions)
  const value = useLiveviewStore((s) => s.vehicleValue)
  const cache = useLiveviewStore((s) => s.vehiclesCache)
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    if (view.kind !== 'list') return []
    const term = q.trim().toLowerCase()
    return view.vehicles
      .map((vehicle, index) => {
        const plate = String(vehicle?.nm || vehicle?.vehiIdno || 'Unknown Vehicle')
        const driver = resolveDriver(vehicle)
        return {
          index,
          plate,
          driver,
          speed: resolveSpeed(cache[index] || vehicle),
          status: resolveStatus(cache[index] || vehicle),
        }
      })
      .filter((r) => !term || r.plate.toLowerCase().includes(term) || r.driver.toLowerCase().includes(term))
  }, [view, q, cache])

  return (
    <aside className="flex h-full min-h-0 w-[240px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#eef2f6] bg-white shadow-sm max-[1100px]:w-full max-[1100px]:max-h-[280px]">
      <HiddenVehicleSelect view={view} value={value} />
      <div className="border-b border-[#eef2f6] p-3">
        <label className="relative block">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[0.8rem] text-[#94a3b8]" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm xe..."
            className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-2.5 pr-3 pl-9 text-sm text-[#1e293b] outline-none focus:border-[#e11d48]/40 focus:ring-2 focus:ring-[#e11d48]/10"
          />
        </label>
      </div>
      <ul className="m-0 flex list-none flex-1 flex-col gap-1 overflow-y-auto p-2">
        {view.kind === 'error' ? (
          <li className="px-3 py-6 text-center text-sm text-[#e11d48]">Lỗi tải danh sách</li>
        ) : null}
        {view.kind === 'initial' || (view.kind === 'list' && rows.length === 0 && !q) ? (
          <li className="px-3 py-6 text-center text-sm text-[#94a3b8]">
            {view.kind === 'initial' ? 'Chọn nhóm quản lý để tải xe' : 'Không có phương tiện'}
          </li>
        ) : null}
        {rows.map((r) => {
          const selected = value === String(r.index)
          return (
            <li key={r.index}>
              <button
                type="button"
                onClick={() => onVehicleChange(String(r.index))}
                className={`flex w-full cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  selected
                    ? 'border-[#f5c2c9] bg-[#fce8eb]'
                    : 'border-transparent bg-transparent hover:bg-[#f8fafc]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate text-[0.9rem] font-bold ${r.status === 'alert' ? 'text-[#e11d48]' : 'text-[#0f172a]'}`}>
                    {r.plate}
                  </span>
                  <span className="flex items-center gap-1.5 text-[0.7rem] font-medium text-[#64748b]">
                    <span className={`size-2 rounded-full ${STATUS_DOT[r.status]}`} />
                    {STATUS_LABEL[r.status]}
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
        {view.kind === 'list' && rows.length === 0 && q ? (
          <li className="px-3 py-6 text-center text-sm text-[#94a3b8]">Không tìm thấy xe</li>
        ) : null}
      </ul>
    </aside>
  )
}
