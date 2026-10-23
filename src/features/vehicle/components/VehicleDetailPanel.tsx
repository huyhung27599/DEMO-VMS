import { extractDevId, getVehicleTypeLabel, type Vehicle } from '../lib'
import { EMPTY_META, STATUS_LABEL, type VehicleMeta } from '../meta'

const LEVEL: Record<string, string> = {
  high: 'bg-[#fce8eb] text-[#e11d48]',
  medium: 'bg-[#fef3c7] text-[#d97706]',
  low: 'bg-[#f1f5f9] text-[#64748b]',
}

const LEVEL_LABEL: Record<string, string> = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
}

type Props = {
  vehicle: Vehicle
  metaByPlate: Record<string, VehicleMeta>
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}

/** Chi tiết phương tiện — trạng thái/tốc độ/km/cảnh báo từ API thật (meta.ts). */
export function VehicleDetailPanel({ vehicle, metaByPlate, onBack, onEdit, onDelete }: Props) {
  const plate = String(vehicle.plate || vehicle.nm || vehicle.vehiIdno || '—')
  const typeLabel = getVehicleTypeLabel(vehicle.vehiType)
  const company = String(vehicle.companyName || vehicle.pnm || '—')
  const device = extractDevId(vehicle)
  const meta = metaByPlate[plate.trim()] ?? EMPTY_META
  const statusDot =
    meta.status === 'online' ? 'bg-[#22c55e]' : meta.status === 'alert' ? 'bg-[#e11d48]' : 'bg-[#94a3b8]'

  return (
    <div className="animate-section-in flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.65rem] font-bold tracking-tight text-[#0f172a]">Chi tiết phương tiện</h2>
          <p className="mt-1 mb-0 text-[0.85rem] text-[#94a3b8]">Thông tin xe, thiết bị và cảnh báo</p>
          <nav className="mt-2 text-[0.8rem] text-[#94a3b8]">
            <button
              type="button"
              className="cursor-pointer border-none bg-transparent p-0 font-medium text-[#64748b] hover:text-[#e11d48]"
              onClick={onBack}
            >
              Quản lý phương tiện
            </button>
            <span className="mx-1.5">/</span>
            <span className="font-semibold text-[#0f172a]">{plate}</span>
          </nav>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#334155] shadow-sm hover:border-[#e11d48]/30 hover:text-[#e11d48]"
          >
            <i className="fa-solid fa-pen" aria-hidden /> Sửa
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#fecaca] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#e11d48] shadow-sm hover:bg-[#e11d48] hover:text-white"
          >
            <i className="fa-solid fa-trash" aria-hidden /> Xóa
          </button>
        </div>
      </header>

      <div className="grid grid-cols-[260px_1fr] gap-4 max-[900px]:grid-cols-1">
        <div className="flex flex-col items-center rounded-2xl border border-[#eef2f6] bg-white p-6 text-center shadow-sm">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#1e293b] text-white">
            <i className="fa-solid fa-bus text-2xl" aria-hidden />
          </div>
          <div className="text-lg font-bold text-[#0f172a]">{plate}</div>
          <div className="mt-1 text-sm text-[#94a3b8]">{typeLabel}</div>
          <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#334155]">
            <span className={`size-2 rounded-full ${statusDot}`} />
            {STATUS_LABEL[meta.status]}
          </div>
          <div className="mt-5 w-full rounded-xl border border-[#eef2f6] bg-[#f8fafc] px-3 py-3 text-left">
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-video mt-0.5 text-[#64748b]" aria-hidden />
              <div>
                <div className="text-[0.7rem] font-semibold tracking-wide text-[#94a3b8] uppercase">Thiết bị</div>
                <div className="text-sm font-semibold text-[#0f172a]">{device}</div>
                <div className="mt-0.5 text-[0.72rem] text-[#94a3b8]">{meta.firmware}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#eef2f6] bg-white p-5 shadow-sm">
          <h3 className="mt-0 mb-4 text-[0.75rem] font-bold tracking-[0.08em] text-[#94a3b8] uppercase">Thông tin</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 max-[640px]:grid-cols-1">
            {[
              ['Doanh nghiệp', company],
              ['Tài xế phụ trách', meta.driver || 'Chưa gán'],
              ['Loại xe', typeLabel],
              ['Tốc độ hiện tại', meta.speed === null ? '—' : `${meta.speed} km/h`],
              ['Quãng đường hôm nay', meta.todayKm === null ? '—' : `${meta.todayKm} km`],
              ['Thiết bị', device],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[0.7rem] font-semibold tracking-wide text-[#94a3b8] uppercase">{k}</div>
                <div className="mt-0.5 text-[0.95rem] font-semibold text-[#0f172a]">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eef2f6] bg-white shadow-sm">
        <div className="border-b border-[#eef2f6] px-5 py-4">
          <h3 className="m-0 text-[0.95rem] font-bold text-[#0f172a]">Cảnh báo gần đây</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="[&>th]:border-b [&>th]:border-[#eef2f6] [&>th]:bg-[#f8fafc] [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-[0.68rem] [&>th]:font-bold [&>th]:tracking-[0.06em] [&>th]:text-[#94a3b8] [&>th]:uppercase">
                <th>Thời gian</th>
                <th>Loại</th>
                <th>Tài xế</th>
                <th>Mức độ</th>
              </tr>
            </thead>
            <tbody>
              {meta.alerts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-[0.85rem] text-[#94a3b8]">
                    Không có cảnh báo
                  </td>
                </tr>
              ) : null}
              {meta.alerts.map((a, i) => (
                <tr key={`${a.time}-${a.type}-${i}`} className="[&>td]:border-b [&>td]:border-[#f1f5f9] [&>td]:px-4 [&>td]:py-3 [&>td]:text-[0.85rem]">
                  <td className="tabular-nums text-[#64748b]">{a.time}</td>
                  <td className="font-semibold text-[#0f172a]">{a.type}</td>
                  <td>{a.driver}</td>
                  <td>
                    <span className={`inline-flex rounded-lg px-2 py-0.5 text-[0.72rem] font-bold ${LEVEL[a.level]}`}>
                      {LEVEL_LABEL[a.level]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
