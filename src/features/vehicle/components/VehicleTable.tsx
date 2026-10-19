import { extractDevId, getVehicleTypeClass, getVehicleTypeLabel, type Vehicle } from '../lib'

// .vehicle-type-badge + .badge-* (vehicle.css:93-119)
const BADGE_CLASS: Record<string, string> = {
  'badge-car': 'bg-[#dbeafe] text-[#1e40af]',
  'badge-truck': 'bg-[#fef3c7] text-[#92400e]',
  'badge-bus': 'bg-[#dcfce7] text-[#166534]',
  'badge-container': 'bg-[#f3e8ff] text-[#6b21a8]',
}

const TH =
  'border-b border-border bg-[#f8fafc] px-4 py-3 text-left text-[0.78rem] font-semibold tracking-[0.04em] text-text-muted uppercase'
const TD = 'border-b border-[#f1f5f9] px-4 py-3 text-text-main'
// .btn-icon (vehicle.css:44-73)
const ICON_BTN =
  'flex size-8 cursor-pointer items-center justify-center rounded-md border border-border bg-white text-text-main transition-all duration-200 hover:bg-[#f1f5f9] focus-visible:outline-2 focus-visible:outline-primary'

type VehicleTableProps = {
  vehicles: Vehicle[] | undefined
  loading: boolean
  onEdit: (plate: string) => void
  onDelete: (plate: string) => void
}

export function VehicleTable({ vehicles, loading, onEdit, onDelete }: VehicleTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={TH}>Biển số xe</th>
            <th className={TH}>ID Thiết bị</th>
            <th className={TH}>Loại xe</th>
            <th className={TH}>Màu sắc</th>
            <th className={TH}>Nhóm quản lý</th>
            <th className={TH}>Thao tác</th>
          </tr>
        </thead>
        <tbody id="vehicle-tbody">
          {loading || !vehicles ? (
            <tr>
              <td colSpan={6} className="p-8 text-center">
                <i className="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu...
              </td>
            </tr>
          ) : vehicles.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-[#64748b]">
                Không tìm thấy phương tiện nào
              </td>
            </tr>
          ) : (
            vehicles.map((v, i) => {
              const id = v.vehiIdno || v.nm || ''
              return (
                <tr key={`${id}-${i}`} className="transition-colors duration-200 hover:bg-[#f8fafc]">
                  <td className={`${TD} font-semibold text-[#1e293b]`}>{v.plate || v.nm || v.vehiIdno || '--'}</td>
                  <td className={TD}>
                    <code className="rounded-[4px] bg-[#f1f5f9] px-[6px] py-[2px] text-[0.9em]">{extractDevId(v)}</code>
                  </td>
                  <td className={TD}>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE_CLASS[getVehicleTypeClass(v.vehiType)] ?? ''}`}
                    >
                      {getVehicleTypeLabel(v.vehiType)}
                    </span>
                  </td>
                  <td className={TD}>{v.vehiColor || '--'}</td>
                  <td className={TD}>{v.companyName || v.pnm || '--'}</td>
                  <td className={TD}>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`${ICON_BTN} hover:border-primary! hover:bg-primary/5! hover:text-primary`}
                        title="Chỉnh sửa"
                        aria-label={`Chỉnh sửa ${id}`}
                        onClick={() => onEdit(id)}
                      >
                        <i className="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        className={`${ICON_BTN} hover:border-[#ef4444]! hover:bg-[#ef4444]/5! hover:text-[#ef4444]`}
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
