import { useEffect, useMemo, useState } from 'react'
import { useModuleEnabled } from '../../app/useModuleEnabled'
import { useAuthStore } from '../../shared/auth/authStore'
import { Button } from '../../shared/ui/Button'
import { ContentSection } from '../../shared/ui/Section'
import { showToast } from '../../shared/ui/toastStore'
import { DeleteDriverModal } from './components/DeleteDriverModal'
import { DriverDetailPanel } from './components/DriverDetailPanel'
import { DriverFormModal } from './components/DriverFormModal'
import { DriverGrid } from './components/DriverGrid'
import { FaceEventsTab } from './components/FaceEventsTab'
import { FaceImageLightbox } from './components/FaceImageLightbox'
import { FaceServiceBanner } from './components/FaceServiceBanner'
import { initDriver, onDriverSectionVisibility } from './init'
import { driverCompanyNames, filterDrivers, type Loose } from './lib'
import { useDeleteDriverMutation, type DeleteDriverInput } from './mutations'
import { loadDrivers } from './queries'
import {
  appOpenDriverModal,
  openDriverModal,
  renderDrivers,
  setActiveTab,
  showDeleteDriverConfirm,
  useDriverStore,
  type DriverTab,
} from './store'
import './driver.css'

// index.html:1347-1403 (#driver-section) + driver.js (DOMContentLoaded closure) + css/driver.css

const TABS: ReadonlyArray<{ id: DriverTab; icon: string; text: string }> = [
  { id: 'driver-list', icon: 'fa-users', text: 'Danh sách Tài xế' },
  { id: 'ai-faces', icon: 'fa-face-viewfinder', text: 'Xác minh khuôn mặt tài xế' },
]

/** Tab Switching (driver.js:1545-1554) */
function onTabClick(tab: DriverTab) {
  setActiveTab(tab)
  if (tab === 'driver-list' && useDriverStore.getState().driversData.length === 0) void loadDrivers()
}

/** #driver-search-input (driver.js:1589-1599): lọc driversData rồi renderDrivers */
function applyDriverFilters(search: string, enterprise: string) {
  const term = search.toLowerCase()
  let list = filterDrivers(useDriverStore.getState().driversData, term)
  // enterprise = tên doanh nghiệp (giá trị option), so khớp companyName của tài xế
  if (enterprise) {
    list = list.filter((d) => {
      const name = String(d.companyName || d.coName || '')
      if (!name) return true
      return name === enterprise
    })
  }
  renderDrivers(list)
}

export function DriverSection({ hidden }: { hidden: boolean }) {
  // driver.js chạy từ DOMContentLoaded -> luôn bật (không có query polling nào)
  const enabled = useModuleEnabled('driver')
  const lastUpdate = useDriverStore((s) => s.lastUpdate)
  const activeTab = useDriverStore((s) => s.activeTab)
  // Doanh nghiệp lấy từ companyName của danh sách tài xế thật (không thêm lời gọi API)
  const gridView = useDriverStore((s) => s.gridView)
  const deletingIds = useDriverStore((s) => s.deletingIds)
  const driversData = useDriverStore((s) => s.driversData)
  const companies = useMemo(() => driverCompanyNames(driversData), [driversData])
  const [search, setSearch] = useState('')
  const [enterprise, setEnterprise] = useState('')
  const [detailDriver, setDetailDriver] = useState<Loose | null>(null)
  const deleteMutation = useDeleteDriverMutation()

  const driverCount = useMemo(() => {
    if (gridView.kind === 'list') return gridView.drivers.length
    return driversData.length
  }, [gridView, driversData.length])

  useEffect(() => {
    if (enabled) initDriver()
  }, [enabled])

  // MutationObserver của bản gốc: #driver-section hiển thị = app đang hiện và route là driver
  const view = useAuthStore((s) => s.view)
  const visible = enabled && !hidden && view === 'app'
  useEffect(() => {
    onDriverSectionVisibility(visible)
    return () => onDriverSectionVisibility(false)
  }, [visible])

  // nút .btn-driver-delete: xác nhận -> xóa (driver.js:1075-1148)
  const onDelete = async (args: DeleteDriverInput) => {
    const confirmed = await showDeleteDriverConfirm(args.name)
    if (!confirmed) return
    deleteMutation.mutate(args)
    setDetailDriver((cur) => (cur && `${cur.id}` === args.id ? null : cur))
  }

  const onExport = () => {
    if (driverCount === 0) showToast('Không có dữ liệu để xuất', 'error')
    else showToast('Đã chuẩn bị file xuất danh sách (demo UI)', 'success')
  }

  if (detailDriver) {
    return (
      <ContentSection id="driver" hidden={hidden} className="gap-0 bg-[#f8fafc] p-0!">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-8 py-6 max-[768px]:px-4">
          <DriverDetailPanel
            driver={detailDriver}
            onBack={() => setDetailDriver(null)}
            onEdit={() => {
              appOpenDriverModal(`${detailDriver.id}`)
            }}
            onDelete={() =>
              void onDelete({
                id: `${detailDriver.id}`,
                jobNum: `${detailDriver.jn || ''}`,
                name: String(detailDriver.dn || 'Chưa rõ tên'),
              })
            }
          />
        </div>
        <DeleteDriverModal />
        <DriverFormModal />
        <FaceImageLightbox />
      </ContentSection>
    )
  }

  return (
    <ContentSection id="driver" hidden={hidden} className="gap-0 bg-[#f8fafc] p-0!">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 px-8 pt-6 pb-4 max-[768px]:px-4">
        <div>
          <h2 className="m-0 text-[1.65rem] font-bold tracking-tight text-[#0f172a]">Quản lý tài xế</h2>
          <p className="mt-1 mb-0 text-[0.85rem] text-[#94a3b8]">
            <span>{driverCount} tài xế</span>
            <span className="mx-2 text-[#cbd5e1]">·</span>
            <span>Đồng bộ AI nhận diện khuôn mặt</span>
            <span className="mx-2 text-[#cbd5e1]">·</span>
            Cập nhật lúc: <span id="driver-last-update">{lastUpdate}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl!" onClick={onExport}>
            <i className="fa-solid fa-download" aria-hidden="true" /> Xuất danh sách
          </Button>
          <Button id="btn-add-driver" variant="primary" size="sm" className="rounded-xl!" onClick={() => openDriverModal()}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Thêm tài xế
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-8 pb-6 max-[768px]:px-4">
        <FaceServiceBanner />

        <div className="driver-tabs flex border-b border-[#e2e8f0]" role="tablist">
          {TABS.map((t) => {
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`dtab-${t.id}`}
                data-dtab={t.id}
                className={`dtab-btn flex cursor-pointer items-center gap-2 border-x-0 border-t-0 border-b-[3px] border-solid bg-transparent px-5 py-3 text-[0.9rem] font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary ${
                  isActive ? 'active border-b-[#e11d48] text-[#e11d48]' : 'border-b-transparent text-[#94a3b8] hover:text-[#64748b]'
                }`}
                onClick={() => onTabClick(t.id)}
              >
                <i className={`fa-solid ${t.icon}`} aria-hidden="true"></i> {t.text}
              </button>
            )
          })}
        </div>

        <div
          className={`dtab-content animate-section-in ${activeTab === 'driver-list' ? 'active block' : 'hidden'}`}
          id="dtab-driver-list"
          role="tabpanel"
        >
          <div className="driver-toolbar mb-4 flex flex-wrap items-center gap-2">
            <div className="driver-search relative min-w-[220px] flex-1">
              <i
                className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#94a3b8]"
                aria-hidden="true"
              />
              <input
                type="text"
                id="driver-search-input"
                className="driver-filter-input w-full! rounded-xl! py-2.5! pr-3! pl-9!"
                placeholder="Tìm theo tên, mã, SĐT, biển số..."
                aria-label="Tìm tài xế"
                value={search}
                onChange={(e) => {
                  const v = e.target.value
                  setSearch(v)
                  applyDriverFilters(v, enterprise)
                }}
              />
            </div>
            <select
              className="driver-filter-input min-w-[180px] rounded-xl!"
              aria-label="Lọc doanh nghiệp"
              value={enterprise}
              onChange={(e) => {
                const v = e.target.value
                setEnterprise(v)
                applyDriverFilters(search, v)
              }}
            >
              <option value="">Tất cả doanh nghiệp</option>
              {companies.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl!"
              onClick={() => showToast('Bộ lọc nâng cao sẽ kết nối API sau.', 'info')}
            >
              <i className="fa-solid fa-filter" aria-hidden="true" /> Bộ lọc
            </Button>
          </div>
          <DriverGrid
            view={gridView}
            deletingIds={deletingIds}
            onEdit={appOpenDriverModal}
            onDelete={(args) => void onDelete(args)}
            onDetail={setDetailDriver}
          />
        </div>

        <FaceEventsTab active={activeTab === 'ai-faces'} />
      </div>

      <DeleteDriverModal />
      <DriverFormModal />
      <FaceImageLightbox />
    </ContentSection>
  )
}
