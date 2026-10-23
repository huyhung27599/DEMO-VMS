import { extractDevId, getVehicleTypeLabel, type Vehicle } from '../lib'
import { STATUS_LABEL, getDemoVehicleMeta } from '../mockData'

const TH =
  'border-b border-[#eef2f6] bg-[#f8fafc] px-4 py-3 text-left text-[0.68rem] font-bold tracking-[0.06em] text-[#94a3b8] uppercase'
const TD = 'border-b border-[#f1f5f9] px-4 py-3.5 text-[0.85rem] text-[#334155]'
const ICON_BTN =
  'flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] transition hover:border-[#e11d48]/30 hover:text-[#e11d48] focus-visible:outline-2 focus-visible:outline-primary'

type VehicleTableProps = {
  vehicles: Vehicle[] | undefined
  loading: boolean
  onDetail: (plate: string) => void
  onEdit: (plate: string) => void
  onDelete: (plate: string) => void
}

export function VehicleTable({ vehicles, loading, onDetail, onEdit, onDelete }: VehicleTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={TH}>Biển số</th>
            <th className={TH}>Loại xe</th>
            <th className={TH}>Tài xế</th>
            <th className={TH}>Thiết bị</th>
            <th className={TH}>Trạng thái</th>
            <th className={TH}>Tốc độ</th>
            <th className={TH}>Hôm nay</th>
            <th className={TH}>Cảnh báo</th>
            <th className={TH}> </th>
          </tr>
        </thead>
        <tbody id="vehicle-tbody">
          {loading || !vehicles ? (
            <tr>
              <td colSpan={9} className="p-8 text-center text-[#64748b]">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden /> Đang tải dữ liệu...
              </td>
            </tr>
          ) : vehicles.length === 0 ? (
            <tr>
              <td colSpan={9} className="p-8 text-center text-[#64748b]">
                Không tìm thấy phương tiện nào
              </td>
            </tr>
          ) : (
            vehicles.map((v, i) => {
              const id = v.vehiIdno || v.nm || ''
              const plate = v.plate || v.nm || v.vehiIdno || '--'
              const device = extractDevId(v)
              const meta = getDemoVehicleMeta(String(plate))
              const statusDot =
                meta.status === 'online'
                  ? 'bg-[#22c55e]'
                  : meta.status === 'alert'
                    ? 'bg-[#e11d48]'
                    : 'bg-[#94a3b8]'
              const speedHot = meta.status === 'alert' && meta.speed > 55

              return (
                <tr key={`${id}-${i}`} className="transition-colors duration-200 hover:bg-[#fafbfc]">
                  <td className={`${TD}`}>
                    <button
                      type="button"
                      className="cursor-pointer border-none bg-transparent p-0 font-bold text-[#0f172a] hover:text-[#e11d48]"
                      onClick={() => onDetail(id)}
                    >
                      {plate}
                    </button>
                  </td>
                  <td className={TD}>{getVehicleTypeLabel(v.vehiType)}</td>
                  <td className={TD}>{meta.driver || 'Chưa gán'}</td>
                  <td className={`${TD} text-[#94a3b8]`}>
                    <code className="rounded bg-transparent p-0 font-sans text-[0.85rem] text-[#94a3b8]">{device}</code>
                  </td>
                  <td className={TD}>
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <span className={`size-2 rounded-full ${statusDot}`} />
                      {STATUS_LABEL[meta.status]}
                    </span>
                  </td>
                  <td className={`${TD} tabular-nums ${speedHot ? 'font-bold text-[#d97706]' : ''}`}>
                    {meta.speed} km/h
                  </td>
                  <td className={`${TD} tabular-nums`}>{meta.todayKm} km</td>
                  <td className={TD}>
                    {meta.alertCount > 0 ? (
                      <span className="inline-flex rounded-lg border border-[#fecaca] bg-[#fff1f2] px-2 py-0.5 text-[0.75rem] font-semibold text-[#e11d48]">
                        {meta.alertCount} cảnh báo
                      </span>
                    ) : (
                      <span className="text-[#cbd5e1]">—</span>
                    )}
                  </td>
                  <td className={TD}>
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        className={ICON_BTN}
                        title="Chi tiết"
                        aria-label={`Chi tiết ${id}`}
                        onClick={() => onDetail(id)}
                      >
                        <i className="fa-solid fa-eye" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        className={ICON_BTN}
                        title="Chỉnh sửa"
                        aria-label={`Chỉnh sửa ${id}`}
                        onClick={() => onEdit(id)}
                      >
                        <i className="fa-solid fa-pen" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        className={`${ICON_BTN} border-[#fecaca] text-[#e11d48] hover:bg-[#e11d48] hover:text-white`}
                        title="Xóa"
                        aria-label={`Xóa ${id}`}
                        onClick={() => onDelete(id)}
                      >
                        <i className="fa-solid fa-trash" aria-hidden="true"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
