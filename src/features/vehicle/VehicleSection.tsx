import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { currentRoute } from '../../app/useActiveSection'
import { useModuleEnabled } from '../../app/useModuleEnabled'
import { Button } from '../../shared/ui/Button'
import { ContentSection } from '../../shared/ui/Section'
import { showToast } from '../../shared/ui/toastStore'
import { DeleteVehicleModal } from './components/DeleteVehicleModal'
import { VehicleDetailPanel } from './components/VehicleDetailPanel'
import { VehicleFormModal } from './components/VehicleFormModal'
import { VehicleTable } from './components/VehicleTable'
import {
  EMPTY_VEHICLE_FORM,
  extractDevId,
  filterVehicles,
  paginateVehicles,
  type Vehicle,
  type VehicleFormValues,
} from './lib'
import { PAGE_SIZE, getDemoVehicleMeta, type VehicleStatus } from './mockData'
import { useDeleteVehicleMutation, useSaveVehicleMutation } from './mutations'
import { companiesQueryOptions, refresh, vehiclesQueryOptions } from './queries'
import { useVehicleStore } from './store'

const SEARCH_DEBOUNCE_MS = 300 // vehicle.js:80-82
const TYPE_VALUES = ['1', '2', '3', '4']

type ModalState = {
  open: boolean
  openKey: number
  editing: boolean
  plateReadOnly: boolean
  initialValues: VehicleFormValues
  /** Sửa xe có coId không nằm trong danh sách đơn vị: <select> không chọn gì -> FormData bỏ companyId */
  companyUnmatched: boolean
}

export function VehicleSection({ hidden }: { hidden: boolean }) {
  const enabled = useModuleEnabled('vehicle')
  const client = useQueryClient()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const route = currentRoute(pathname)

  // Chỉ đọc cache: bản gốc không nạp lúc mount, chỉ nạp bằng refresh() (xem effect bên dưới và mutations.ts).
  const vehiclesQuery = useQuery({ ...vehiclesQueryOptions(), enabled: false })
  const companiesQuery = useQuery({ ...companiesQueryOptions(), enabled: false })
  const vehicles = vehiclesQuery.data
  const companies = useMemo(() => companiesQuery.data ?? [], [companiesQuery.data])
  const lastUpdate = useVehicleStore((s) => s.lastUpdate)

  // vehicle.js:29-31 (init, lần đầu hiển thị app khi hash là #vehicle) + 69-73 (hashchange sang #vehicle)
  useEffect(() => {
    if (enabled && route === 'vehicle') void refresh(client)
  }, [enabled, route, client])

  // ── Tìm kiếm (debounce 300 ms) ──
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [enterpriseId, setEnterpriseId] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | VehicleStatus>('')
  const [page, setPage] = useState(1)
  const [detailPlate, setDetailPlate] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(searchTimer.current), [])
  const onSearchInput = (value: string) => {
    setSearchInput(value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearchTerm(value)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
  }

  const filtered = useMemo(() => {
    if (!vehicles) return undefined
    const q = searchTerm.toLowerCase().trim()
    // Giữ hành vi gốc filterVehicles; mở rộng thêm tài xế (demo UI)
    const base = q ? filterVehicles(vehicles, searchTerm) : vehicles
    const baseIds = new Set(base.map((v) => v.vehiIdno || v.nm || ''))
    return vehicles.filter((v) => {
      const key = v.vehiIdno || v.nm || ''
      const plate = String(v.plate || v.nm || v.vehiIdno || '')
      const driver = (getDemoVehicleMeta(plate).driver || '').toLowerCase()
      const matchSearch = !q || baseIds.has(key) || driver.includes(q)
      if (!matchSearch) return false
      if (enterpriseId && (v.companyId || v.pid || '') !== enterpriseId) return false
      if (statusFilter && getDemoVehicleMeta(plate).status !== statusFilter) return false
      return true
    })
  }, [vehicles, searchTerm, enterpriseId, statusFilter])

  const paged = useMemo(
    () => (filtered ? paginateVehicles(filtered, page, PAGE_SIZE) : null),
    [filtered, page],
  )

  const detailVehicle: Vehicle | null = useMemo(() => {
    if (!detailPlate || !vehicles) return null
    return vehicles.find((x) => (x.vehiIdno || x.nm) === detailPlate) ?? null
  }, [detailPlate, vehicles])

  // ── Modal thêm/sửa (openModal / closeModal) ──
  const [modal, setModal] = useState<ModalState>({
    open: false,
    openKey: 0,
    editing: false,
    plateReadOnly: false,
    initialValues: EMPTY_VEHICLE_FORM,
    companyUnmatched: false,
  })
  const closeModal = () => setModal((m) => ({ ...m, open: false }))

  const openModal = (vehiclePlate: string | null = null) => {
    let initialValues = EMPTY_VEHICLE_FORM
    let plateReadOnly = false
    let companyUnmatched = false
    if (vehiclePlate) {
      const v = vehicles?.find((x) => (x.vehiIdno || x.nm) === vehiclePlate)
      if (v) {
        const type = String(v.vehiType || '1')
        const coId = v.companyId || v.pid || v.groupId || v.parentId || ''
        initialValues = {
          vehiIdno: v.vehiIdno || v.nm || '',
          devIdno: extractDevId(v),
          // <select>.value = giá trị không có trong danh sách -> không chọn gì ('')
          vehiType: TYPE_VALUES.includes(type) ? type : '',
          vehiColor: v.vehiColor || '',
          companyId: companies.some((c) => c.id === coId) ? coId : '',
        }
        companyUnmatched = coId !== '' && !companies.some((c) => c.id === coId)
        plateReadOnly = true // biển số là khóa chính
      }
    }
    setModal((m) => ({
      open: true,
      openKey: m.openKey + 1,
      editing: Boolean(vehiclePlate),
      plateReadOnly,
      initialValues,
      companyUnmatched,
    }))
  }

  const saveMutation = useSaveVehicleMutation({ onSaved: closeModal })
  const handleSave = (values: VehicleFormValues) =>
    saveMutation.mutate({ values, editing: modal.editing, companyUnmatched: modal.companyUnmatched })

  // ── Xóa (deleteVehicle / closeDeleteModal / confirmDelete) ──
  const [del, setDel] = useState({ open: false, plate: '' })
  const closeDeleteModal = () => setDel((d) => ({ ...d, open: false }))
  const deleteMutation = useDeleteVehicleMutation({
    onDeleted: () => {
      const plate = del.plate
      closeDeleteModal()
      setDetailPlate((p) => (p === plate ? null : p))
    },
  })
  const confirmDelete = () => {
    if (!del.plate) return
    deleteMutation.mutate(del.plate)
  }

  const totalCount = filtered?.length ?? 0

  const onExport = () => {
    if (totalCount === 0) showToast('Không có dữ liệu để xuất', 'error')
    else showToast('Đã chuẩn bị file xuất danh sách (demo UI)', 'success')
  }

  if (detailVehicle) {
    const plate = detailVehicle.vehiIdno || detailVehicle.nm || ''
    return (
      <ContentSection id="vehicle" hidden={hidden} className="gap-0 bg-[#f8fafc] p-0!">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-8 py-6 max-[768px]:px-4">
          <VehicleDetailPanel
            vehicle={detailVehicle}
            onBack={() => setDetailPlate(null)}
            onEdit={() => openModal(plate)}
            onDelete={() => setDel({ open: true, plate })}
          />
        </div>
        <VehicleFormModal
          open={modal.open}
          openKey={modal.openKey}
          initialValues={modal.initialValues}
          editing={modal.editing}
          plateReadOnly={modal.plateReadOnly}
          companies={companies}
          saving={saveMutation.isPending}
          onClose={closeModal}
          onSave={handleSave}
        />
        <DeleteVehicleModal
          open={del.open}
          plate={del.plate}
          deleting={deleteMutation.isPending}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
        />
      </ContentSection>
    )
  }

  return (
    <ContentSection id="vehicle" hidden={hidden} className="gap-0 bg-[#f8fafc] p-0!">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 px-8 pt-6 pb-4 max-[768px]:px-4">
        <div>
          <h2 className="m-0 text-[1.65rem] font-bold tracking-tight text-[#0f172a]">Quản lý phương tiện</h2>
          <p className="mt-1 mb-0 text-[0.85rem] text-[#94a3b8]">
            <span>{vehicles ? `${totalCount} phương tiện đang quản lý` : 'Đang tải…'}</span>
            <span className="mx-2 text-[#cbd5e1]">·</span>
            Cập nhật lúc: <span id="vehicle-last-update">{lastUpdate}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl!" onClick={onExport}>
            <i className="fa-solid fa-download" aria-hidden="true" /> Xuất danh sách
          </Button>
          <Button id="btn-add-vehicle" variant="primary" size="sm" className="rounded-xl!" onClick={() => openModal()}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Thêm phương tiện
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-8 pb-6 max-[768px]:px-4">
        <div className="overflow-hidden rounded-2xl border border-[#eef2f6] bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#eef2f6] p-3">
            <div className="relative min-w-[220px] flex-1">
              <i
                className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#94a3b8]"
                aria-hidden="true"
              />
              <input
                type="text"
                id="vehicle-search-input"
                aria-label="Tìm biển số, ID thiết bị"
                placeholder="Tìm theo biển số, thiết bị, tài xế..."
                value={searchInput}
                onChange={(e) => onSearchInput(e.target.value)}
                className="w-full rounded-xl border border-[#e2e8f0] bg-white py-2.5 pr-3 pl-9 font-sans text-sm text-[#0f172a] outline-none focus:border-[#e11d48]/40 focus:ring-[3px] focus:ring-[#e11d48]/12"
              />
            </div>
            <select
              className="rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#334155]"
              aria-label="Lọc doanh nghiệp"
              value={enterpriseId}
              onChange={(e) => {
                setEnterpriseId(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Tất cả doanh nghiệp</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#334155]"
              aria-label="Lọc trạng thái"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as '' | VehicleStatus)
                setPage(1)
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="online">Trực tuyến</option>
              <option value="offline">Offline</option>
              <option value="alert">Cảnh báo</option>
            </select>
          </div>

          <VehicleTable
            vehicles={paged?.rows}
            loading={vehiclesQuery.isFetching || !filtered}
            onDetail={setDetailPlate}
            onEdit={openModal}
            onDelete={(plate) => setDel({ open: true, plate })}
          />

          {paged && filtered && filtered.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef2f6] px-4 py-3 text-[0.8rem] text-[#94a3b8]">
              <span>
                Hiển thị {paged.from}–{paged.to} trong tổng {filtered.length} phương tiện
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={paged.page <= 1}
                  className="cursor-pointer rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 font-semibold text-[#64748b] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Trước
                </button>
                <span className="flex size-8 items-center justify-center rounded-full bg-[#e11d48] text-sm font-bold text-white">
                  {paged.page}
                </span>
                <button
                  type="button"
                  disabled={paged.page >= paged.totalPages}
                  className="cursor-pointer rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 font-semibold text-[#64748b] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setPage((p) => Math.min(paged.totalPages, p + 1))}
                >
                  Sau
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <VehicleFormModal
        open={modal.open}
        openKey={modal.openKey}
        initialValues={modal.initialValues}
        editing={modal.editing}
        plateReadOnly={modal.plateReadOnly}
        companies={companies}
        saving={saveMutation.isPending}
        onClose={closeModal}
        onSave={handleSave}
      />
      <DeleteVehicleModal
        open={del.open}
        plate={del.plate}
        deleting={deleteMutation.isPending}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </ContentSection>
  )
}
