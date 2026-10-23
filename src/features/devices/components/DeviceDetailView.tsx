import { Button } from '../../../shared/ui/Button'
import type { Device } from '../types'

type DeviceDetailViewProps = {
  device: Device
  onBack: () => void
  onEdit: () => void
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'ok' | 'warn' | 'muted'
}) {
  const dot =
    tone === 'ok' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-orange-400' : 'bg-slate-300'
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[0.7rem] font-bold tracking-[0.06em] text-[#94a3b8] uppercase">
          {label}
        </span>
        <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      </div>
      <div className="text-sm font-semibold text-text-main">{value}</div>
    </div>
  )
}

export function DeviceDetailView({ device, onBack, onEdit }: DeviceDetailViewProps) {
  const assigned = Boolean(device.vehiclePlate)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-2xl font-bold text-text-main">Chi tiết thiết bị</h2>
          <p className="mt-1 mb-3 text-sm text-text-muted">
            Trạng thái phần cứng, kết nối và lịch sử
          </p>
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer border-none bg-transparent p-0 text-sm text-text-muted hover:text-danger"
          >
            <i className="fa-solid fa-arrow-left mr-1.5" aria-hidden="true" />
            Quản lý thiết bị <span className="text-[#cbd5e1]">/</span>{' '}
            <span className="text-text-main">{device.serial}</span>
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <i className="fa-solid fa-pen mr-1.5" aria-hidden="true" />
          Sửa
        </Button>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-[#1e293b] text-white">
            <i className="fa-solid fa-video text-xl" aria-hidden="true" />
          </div>
          <div className="text-xl font-bold text-text-main">{device.serial}</div>
          <div className="mt-1 text-sm text-text-muted">{device.model}</div>
          <div className="mt-4 space-y-2 text-sm text-text-main">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-van-shuttle w-4 text-[#94a3b8]" aria-hidden="true" />
              <span>Xe: {device.vehiclePlate ?? 'Chưa gắn'}</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-building w-4 text-[#94a3b8]" aria-hidden="true" />
              <span>{device.enterpriseName || '—'}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCard
            label="GPS"
            value={
              assigned && device.gpsSatellites != null
                ? `${device.gpsSatellites} vệ tinh`
                : '—'
            }
            tone={device.gps === 'good' ? 'ok' : device.gps === 'weak' ? 'warn' : 'muted'}
          />
          <StatusCard
            label="Tín hiệu"
            value={
              assigned && device.network
                ? `${device.network}${device.signalDbm != null ? ` · ${device.signalDbm} dBm` : ''}`
                : '—'
            }
            tone={device.gps === 'weak' ? 'warn' : assigned ? 'ok' : 'muted'}
          />
          <StatusCard
            label="Máy chủ"
            value={
              device.serverConnected == null
                ? '—'
                : device.serverConnected
                  ? 'Đã kết nối'
                  : 'Mất kết nối'
            }
            tone={device.serverConnected ? 'ok' : device.serverConnected === false ? 'warn' : 'muted'}
          />
          <StatusCard
            label="Bộ nhớ"
            value={
              device.storagePercent != null
                ? `${device.storagePercent}%${device.storageDays != null ? ` · ${device.storageDays} ngày` : ''}`
                : '—'
            }
            tone={
              device.storagePercent == null
                ? 'muted'
                : device.storagePercent >= 70
                  ? 'warn'
                  : 'ok'
            }
          />
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-[0.7rem] font-bold tracking-[0.08em] text-[#94a3b8] uppercase">
          Thông tin kỹ thuật
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="Serial" value={device.serial} />
          <InfoRow
            label="Camera kết nối"
            value={
              device.cameras.length
                ? `${device.cameras.length} (${device.cameras.join(', ')})`
                : '—'
            }
          />
          <InfoRow label="SIM" value={device.sim || '—'} />
          <InfoRow label="Lần online cuối" value={device.lastOnline ?? '—'} />
          <InfoRow label="Doanh nghiệp" value={device.enterpriseName || '—'} />
          <InfoRow label="Ngày lắp đặt" value={device.installedAt ?? '—'} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-text-main">Lịch sử thiết bị</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[0.7rem] tracking-[0.06em] text-[#94a3b8] uppercase">
                <th className="px-2 py-2 font-semibold">Thời gian</th>
                <th className="px-2 py-2 font-semibold">Sự kiện</th>
                <th className="px-2 py-2 font-semibold">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {device.history.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-8 text-center text-text-muted">
                    Chưa có sự kiện
                  </td>
                </tr>
              ) : (
                device.history.map((h) => (
                  <tr key={h.id} className="border-b border-border/70 last:border-0">
                    <td className="px-2 py-3 text-text-muted">{h.time}</td>
                    <td className="px-2 py-3 font-medium text-text-main">{h.event}</td>
                    <td className="px-2 py-3 text-text-muted">{h.detail}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[0.7rem] font-bold tracking-[0.06em] text-[#94a3b8] uppercase">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-text-main">{value}</div>
    </div>
  )
}
