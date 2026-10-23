import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../shared/ui/Button'
import { ContentSection } from '../../shared/ui/Section'
import { showToast } from '../../shared/ui/toastStore'
import { ConfirmDeleteDeviceModal } from './components/DeviceConfirmModals'
import { DeviceDetailView } from './components/DeviceDetailView'
import { DeviceFormView } from './components/DeviceFormView'
import {
  EMPTY_DEVICE_FORM,
  filterDevices,
  gpsLabel,
  gpsTextClass,
  paginate,
  storageBarClass,
  type DeviceFilters,
  type DeviceFormValues,
} from './lib'
import { devicesQueryOptions, useDeleteDeviceMutation, useSaveDeviceMutation } from './queries'

type View =
  | { mode: 'list' }
  | { mode: 'form'; formMode: 'create' | 'edit'; deviceId?: string }
  | { mode: 'detail'; deviceId: string }

export function DevicesSection({ hidden }: { hidden: boolean }) {
  const devicesQuery = useQuery({ ...devicesQueryOptions(), enabled: !hidden })
  const devices = useMemo(() => devicesQuery.data?.devices ?? [], [devicesQuery.data])
  const companies = useMemo(() => devicesQuery.data?.companies ?? [], [devicesQuery.data])
  const vehicleOptions = useMemo(() => devicesQuery.data?.vehicles ?? [], [devicesQuery.data])
  const [view, setView] = useState<View>({ mode: 'list' })
  const [draftFilters, setDraftFilters] = useState<DeviceFilters>({
    search: '',
    enterpriseId: '',
  })
  const [filters, setFilters] = useState<DeviceFilters>(draftFilters)
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => filterDevices(devices, filters), [devices, filters])
  const { rows, totalPages, page: safePage, from, to } = useMemo(
    () => paginate(filtered, page),
    [filtered, page],
  )

  const deleteDevice = deleteId ? (devices.find((d) => d.id === deleteId) ?? null) : null
  const detailDevice =
    view.mode === 'detail' ? (devices.find((d) => d.id === view.deviceId) ?? null) : null

  const formInitial: DeviceFormValues = useMemo(() => {
    if (view.mode !== 'form') return EMPTY_DEVICE_FORM
    if (view.formMode === 'edit' && view.deviceId) {
      const d = devices.find((x) => x.id === view.deviceId)
      if (!d) return EMPTY_DEVICE_FORM
      return {
        serial: d.serial,
        sim: d.sim,
        enterpriseId: d.enterpriseId,
        vehicleId: d.vehicleId ?? '',
      }
    }
    return EMPTY_DEVICE_FORM
  }, [view, devices])

  const backToList = () => setView({ mode: 'list' })

  const applyFilters = () => {
    setFilters({ ...draftFilters })
    setPage(1)
  }

  const saveMutation = useSaveDeviceMutation({ onSaved: backToList })
  const deleteMutation = useDeleteDeviceMutation({
    onDeleted: () => {
      if (view.mode === 'detail' && view.deviceId === deleteId) backToList()
      setDeleteId(null)
    },
  })

  const onSaveDevice = (values: DeviceFormValues) => {
    if (view.mode !== 'form' || saveMutation.isPending) return
    const editing = view.formMode === 'edit' ? (devices.find((d) => d.id === view.deviceId) ?? null) : null
    const companyName = companies.find((c) => c.id === values.enterpriseId)?.name ?? ''
    saveMutation.mutate({ values, editing, companyName })
  }

  return (
    <ContentSection id="devices" hidden={hidden} className="bg-[#f8fafc]">
      {view.mode === 'form' ? (
        <DeviceFormView
          mode={view.formMode}
          devices={devices}
          companies={companies}
          vehicles={vehicleOptions}
          initial={formInitial}
          editId={view.deviceId}
          onCancel={backToList}
          onSubmit={onSaveDevice}
        />
      ) : view.mode === 'detail' && detailDevice ? (
        <DeviceDetailView
          device={detailDevice}
          onBack={backToList}
          onEdit={() =>
            setView({ mode: 'form', formMode: 'edit', deviceId: detailDevice.id })
          }
        />
      ) : view.mode === 'detail' ? (
        <div>
          <p className="text-text-muted">Không tìm thấy thiết bị.</p>
          <Button variant="outline" size="sm" onClick={backToList}>
            Quay lại
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="m-0 text-2xl font-bold text-text-main">Quản lý thiết bị</h2>
              <p className="mt-1 mb-0 text-sm text-text-muted">
                Quản lý thiết bị dashcam (Box AI + Camera) lắp trên xe
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (filtered.length === 0) showToast('Không có dữ liệu để xuất', 'error')
                  else showToast('Đã chuẩn bị file xuất danh sách (demo UI)', 'success')
                }}
              >
                <i className="fa-solid fa-download mr-1.5" aria-hidden="true" />
                Xuất danh sách
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setView({ mode: 'form', formMode: 'create' })}
              >
                <i className="fa-solid fa-plus mr-1.5" aria-hidden="true" />
                Thêm thiết bị
              </Button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-3 shadow-sm">
            <div className="relative min-w-[220px] flex-1">
              <i
                className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#94a3b8]"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Tìm theo ID thiết bị, biển số..."
                className="w-full rounded-lg border border-border bg-white py-2 pr-3 pl-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                value={draftFilters.search}
                onChange={(e) => setDraftFilters((f) => ({ ...f, search: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters()
                }}
              />
            </div>
            <select
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
              value={draftFilters.enterpriseId}
              onChange={(e) => {
                setDraftFilters((f) => ({ ...f, enterpriseId: e.target.value }))
                setFilters((f) => ({ ...f, enterpriseId: e.target.value }))
                setPage(1)
              }}
            >
              <option value="">Tất cả doanh nghiệp</option>
              {companies.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={applyFilters}>
              <i className="fa-solid fa-filter mr-1.5" aria-hidden="true" />
              Lọc
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[0.7rem] tracking-[0.06em] text-[#94a3b8] uppercase">
                  <th className="px-4 py-3 font-semibold">ID thiết bị</th>
                  <th className="px-4 py-3 font-semibold">Phương tiện</th>
                  <th className="px-4 py-3 font-semibold">Doanh nghiệp</th>
                  <th className="px-4 py-3 font-semibold">GPS</th>
                  <th className="px-4 py-3 font-semibold">Mạng</th>
                  <th className="px-4 py-3 font-semibold">Bộ nhớ</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {devicesQuery.isPending || devicesQuery.isError || rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                      {devicesQuery.isPending
                        ? 'Đang tải dữ liệu...'
                        : devicesQuery.isError
                          ? devicesQuery.error.message
                          : 'Không có thiết bị phù hợp bộ lọc'}
                    </td>
                  </tr>
                ) : (
                  rows.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-border/70 last:border-0 hover:bg-[#fafbfc]"
                    >
                      <td className="px-4 py-3.5 font-semibold text-text-main">{d.serial}</td>
                      <td className="px-4 py-3.5 text-text-muted">
                        {d.vehiclePlate ?? (
                          <span className="italic text-[#94a3b8]">Chưa gắn</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-text-muted">{d.enterpriseName || '—'}</td>
                      <td className={`px-4 py-3.5 ${gpsTextClass(d.gps)}`}>{gpsLabel(d.gps)}</td>
                      <td className="px-4 py-3.5 text-text-muted">{d.network ?? '—'}</td>
                      <td className="px-4 py-3.5">
                        {d.storagePercent == null ? (
                          <span className="text-text-muted">—</span>
                        ) : (
                          <div className="flex min-w-[110px] items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${storageBarClass(d.storagePercent)}`}
                                style={{ width: `${d.storagePercent}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-xs font-medium text-text-muted">
                              {d.storagePercent}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-0.5">
                          <IconBtn
                            label="Chi tiết"
                            icon="fa-eye"
                            onClick={() => setView({ mode: 'detail', deviceId: d.id })}
                          />
                          <IconBtn
                            label="Sửa"
                            icon="fa-pen"
                            onClick={() =>
                              setView({ mode: 'form', formMode: 'edit', deviceId: d.id })
                            }
                          />
                          <IconBtn
                            label="Xóa"
                            icon="fa-trash"
                            danger
                            onClick={() => setDeleteId(d.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
            <span>
              Hiển thị {from}-{to} trong tổng {filtered.length} thiết bị
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Trước
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-none text-sm font-semibold ${
                    n === safePage
                      ? 'bg-danger text-white'
                      : 'bg-transparent text-text-muted hover:bg-slate-100'
                  }`}
                >
                  {n}
                </button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDeleteDeviceModal
        open={deleteId != null}
        device={deleteDevice}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteDevice || deleteMutation.isPending) return
          deleteMutation.mutate(deleteDevice)
        }}
      />
    </ContentSection>
  )
}

function IconBtn({
  label,
  icon,
  onClick,
  danger,
}: {
  label: string
  icon: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-sm ${
        danger
          ? 'text-[#94a3b8] hover:bg-danger/10 hover:text-danger'
          : 'text-[#94a3b8] hover:bg-slate-100 hover:text-text-main'
      }`}
    >
      <i className={`fa-solid ${icon}`} aria-hidden="true" />
    </button>
  )
}
