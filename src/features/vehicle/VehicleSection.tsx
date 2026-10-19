import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { currentRoute } from '../../app/useActiveSection'
import { useModuleEnabled } from '../../app/useModuleEnabled'
import { ContentSection, SectionHeader } from '../../shared/ui/Section'
import { DeleteVehicleModal } from './components/DeleteVehicleModal'
import { VehicleFormModal } from './components/VehicleFormModal'
import { VehicleTable } from './components/VehicleTable'
import { EMPTY_VEHICLE_FORM, extractDevId, filterVehicles, type VehicleFormValues } from './lib'
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
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(searchTimer.current), [])
  const onSearchInput = (value: string) => {
    setSearchInput(value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearchTerm(value), SEARCH_DEBOUNCE_MS)
  }
  const filtered = useMemo(() => (vehicles ? filterVehicles(vehicles, searchTerm) : undefined), [vehicles, searchTerm])

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
  const handleSave = (values: VehicleFormValues) => saveMutation.mutate({ values, editing: modal.editing, companyUnmatched: modal.companyUnmatched })

  // ── Xóa (deleteVehicle / closeDeleteModal / confirmDelete) ──
  const [del, setDel] = useState({ open: false, plate: '' })
  const closeDeleteModal = () => setDel((d) => ({ ...d, open: false }))
  const deleteMutation = useDeleteVehicleMutation({ onDeleted: closeDeleteModal })
  const confirmDelete = () => {
    if (!del.plate) return
    deleteMutation.mutate(del.plate)
  }

  return (
    <ContentSection id="vehicle" hidden={hidden}>
      <SectionHeader
        title="Quản lý phương tiện"
        subtitle={
          <>
            Cập nhật lúc: <span id="vehicle-last-update">{lastUpdate}</span>
          </>
        }
      />
      <div className="flex flex-1 flex-col">
        <div className="mb-4 flex items-center justify-between rounded-xl max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-4">
          <div className="flex items-center gap-2 max-[768px]:flex-col max-[768px]:items-stretch">
            <input
              type="text"
              id="vehicle-search-input"
              aria-label="Tìm biển số, ID thiết bị"
              placeholder="Tìm biển số, ID thiết bị..."
              value={searchInput}
              onChange={(e) => onSearchInput(e.target.value)}
              className="w-62.5 rounded-md border border-border bg-white p-2 font-sans text-sm text-text-main focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15 max-[768px]:w-full"
            />
            <button
              type="button"
              id="btn-add-vehicle"
              className="cursor-pointer rounded-md border-none bg-danger px-4 py-2 text-sm font-semibold text-white transition-all duration-250 hover:bg-danger-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => openModal()}
            >
              <i className="fa-solid fa-plus" aria-hidden="true"></i> Thêm xe mới
            </button>
          </div>
        </div>
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
          <VehicleTable
            vehicles={filtered}
            loading={vehiclesQuery.isFetching}
            onEdit={openModal}
            onDelete={(plate) => setDel({ open: true, plate })}
          />
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
