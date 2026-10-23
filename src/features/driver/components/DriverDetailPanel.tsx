import { DEMO_ALERTS, DEMO_DRIVER_STATS } from '../mockData'
import type { Loose } from '../lib'

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

function initialLetter(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  const parts = t.split(/\s+/)
  return (parts[parts.length - 1][0] || t[0]).toUpperCase()
}

type Props = {
  driver: Loose
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}

/** Chi tiết tài xế — UI mockup; thống kê / lịch sử cảnh báo demo khi chưa có API. */
export function DriverDetailPanel({ driver, onBack, onEdit, onDelete }: Props) {
  const name = String(driver.dn || 'Chưa rõ tên')
  const idno = String(driver.jn || driver.id || '—')
  const phone = String(driver.dt || '—')
  const licenseType = driver.licenseType || driver.driverType || 'B2'
  const licenseNum = String(driver.ln || driver.drivelNum || '—')
  const vehicle = String(driver.vehiIdno || driver.nm || driver.plate || '—')
  const expiry = String(driver.licenseExpire || driver.le || '—')
  const company = String(driver.companyName || driver.coName || '—')
  const letter = initialLetter(name)

  return (
    <div className="animate-section-in flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.65rem] font-bold tracking-tight text-[#0f172a]">Chi tiết tài xế</h2>
          <p className="mt-1 mb-0 text-[0.85rem] text-[#94a3b8]">Hồ sơ và lịch sử cảnh báo</p>
          <nav className="mt-2 text-[0.8rem] text-[#94a3b8]">
            <button type="button" className="cursor-pointer border-none bg-transparent p-0 font-medium text-[#64748b] hover:text-[#e11d48]" onClick={onBack}>
              Quản lý tài xế
            </button>
            <span className="mx-1.5">/</span>
            <span className="font-semibold text-[#0f172a]">{name}</span>
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

      <div className="grid grid-cols-[240px_1fr] gap-4 max-[900px]:grid-cols-1">
        <div className="flex flex-col items-center rounded-2xl border border-[#eef2f6] bg-white p-6 text-center shadow-sm">
          <div className="mb-3 flex size-20 items-center justify-center rounded-full bg-[#1e293b] text-2xl font-bold text-white">
            {letter}
          </div>
          <div className="text-lg font-bold text-[#0f172a]">{name}</div>
          <div className="mt-1 text-sm text-[#94a3b8]">Mã: {idno}</div>
          <div className="mt-4 rounded-xl bg-[#ecfdf5] px-3 py-2 text-[0.75rem] font-semibold text-[#059669]">
            AI nhận diện: Đã đăng ký
          </div>
          <p className="mt-2 mb-0 text-[0.72rem] text-[#94a3b8]">Ảnh tham chiếu đã đồng bộ · khớp gần nhất: —</p>
        </div>

        <div className="rounded-2xl border border-[#eef2f6] bg-white p-5 shadow-sm">
          <h3 className="mt-0 mb-4 text-[0.75rem] font-bold tracking-[0.08em] text-[#94a3b8] uppercase">
            Thông tin hồ sơ
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 max-[640px]:grid-cols-1">
            {[
              ['Số điện thoại', phone],
              ['Doanh nghiệp', company],
              ['Hạng GPLX', `Hạng ${licenseType}`],
              ['Số GPLX', licenseNum],
              ['Hết hạn GPLX', expiry],
              ['Phương tiện', vehicle],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[0.7rem] font-semibold tracking-wide text-[#94a3b8] uppercase">{k}</div>
                <div className="mt-0.5 text-[0.95rem] font-semibold text-[#0f172a]">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 max-[768px]:grid-cols-1">
        {[
          { label: 'Tổng hành trình', value: `${DEMO_DRIVER_STATS.trips} chuyến`, color: 'text-[#0f172a]' },
          { label: 'Cảnh báo (30 ngày)', value: `${DEMO_DRIVER_STATS.alerts30d} sự kiện`, color: 'text-[#e11d48]' },
          { label: 'Giờ lái (tháng)', value: `${DEMO_DRIVER_STATS.hoursMonth} giờ`, color: 'text-[#d97706]' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[#eef2f6] bg-white px-4 py-3.5 shadow-sm">
            <div className="text-[0.68rem] font-bold tracking-[0.08em] text-[#94a3b8] uppercase">{s.label}</div>
            <div className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#eef2f6] bg-white shadow-sm">
        <div className="border-b border-[#eef2f6] px-5 py-4">
          <h3 className="m-0 text-[0.95rem] font-bold text-[#0f172a]">Lịch sử cảnh báo gần đây</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="[&>th]:border-b [&>th]:border-[#eef2f6] [&>th]:bg-[#f8fafc] [&>th]:px-4 [&>th]:py-2.5 [&>th]:text-[0.68rem] [&>th]:font-bold [&>th]:tracking-[0.06em] [&>th]:text-[#94a3b8] [&>th]:uppercase">
                <th>Thời gian</th>
                <th>Loại cảnh báo</th>
                <th>Phương tiện</th>
                <th>Mức độ</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_ALERTS.map((a) => (
                <tr key={a.time + a.type} className="[&>td]:border-b [&>td]:border-[#f1f5f9] [&>td]:px-4 [&>td]:py-3 [&>td]:text-[0.85rem]">
                  <td className="tabular-nums text-[#64748b]">{a.time}</td>
                  <td className="font-semibold text-[#0f172a]">{a.type}</td>
                  <td>{a.vehicle}</td>
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
