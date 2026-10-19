import { useEffect, useState } from 'react'
import { useModuleEnabled } from '../../app/useModuleEnabled'
import { Button } from '../../shared/ui/Button'
import { ContentSection, SectionHeader } from '../../shared/ui/Section'
import { DeleteDriverModal } from './components/DeleteDriverModal'
import { DriverFormModal } from './components/DriverFormModal'
import { DriverGrid } from './components/DriverGrid'
import { FaceEventsTab } from './components/FaceEventsTab'
import { FaceImageLightbox } from './components/FaceImageLightbox'
import { FaceServiceBanner } from './components/FaceServiceBanner'
import { initDriver } from './init'
import { filterDrivers } from './lib'
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
function onSearchInput(value: string) {
  const term = value.toLowerCase()
  renderDrivers(filterDrivers(useDriverStore.getState().driversData, term))
}

export function DriverSection({ hidden }: { hidden: boolean }) {
  // driver.js chạy từ DOMContentLoaded -> luôn bật (không có query polling nào)
  const enabled = useModuleEnabled('driver')
  const lastUpdate = useDriverStore((s) => s.lastUpdate)
  const activeTab = useDriverStore((s) => s.activeTab)
  const gridView = useDriverStore((s) => s.gridView)
  const deletingIds = useDriverStore((s) => s.deletingIds)
  const [search, setSearch] = useState('')
  const deleteMutation = useDeleteDriverMutation()

  useEffect(() => {
    if (enabled) initDriver()
  }, [enabled])

  // nút .btn-driver-delete: xác nhận -> xóa (driver.js:1075-1148)
  const onDelete = async (args: DeleteDriverInput) => {
    const confirmed = await showDeleteDriverConfirm(args.name)
    if (!confirmed) return
    deleteMutation.mutate(args)
  }

  return (
    <ContentSection id="driver" hidden={hidden}>
      <SectionHeader
        title="Quản lý tài xế"
        subtitle={
          <>
            Cập nhật lúc: <span id="driver-last-update">{lastUpdate}</span>
          </>
        }
      />

      <FaceServiceBanner />

      <div className="driver-tabs flex border-b border-border px-6" role="tablist">
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
              className={`dtab-btn flex cursor-pointer items-center gap-2 border-x-0 border-t-0 border-b-[3px] border-solid bg-transparent px-6 py-4 text-[0.95rem] font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary ${
                isActive ? 'active border-b-primary text-primary' : 'border-b-transparent text-text-muted'
              }`}
              onClick={() => onTabClick(t.id)}
            >
              <i className={`fa-solid ${t.icon}`} aria-hidden="true"></i> {t.text}
            </button>
          )
        })}
      </div>

      <div className="driver-container flex-1 overflow-y-auto px-6 py-4">
        {/* Tab 1: Driver List */}
        <div
          className={`dtab-content animate-section-in ${activeTab === 'driver-list' ? 'active block' : 'hidden'}`}
          id="dtab-driver-list"
          role="tabpanel"
        >
          <div className="driver-toolbar mb-4 flex justify-between">
            <div className="driver-search flex items-center gap-2">
              <input
                type="text"
                id="driver-search-input"
                className="driver-filter-input w-62.5"
                placeholder="Tìm tài xế..."
                aria-label="Tìm tài xế"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  onSearchInput(e.target.value)
                }}
              />
              <Button id="btn-add-driver" variant="primary" className="px-4! py-2!" onClick={() => openDriverModal()}>
                <i className="fa-solid fa-plus" aria-hidden="true"></i> Thêm Tài xế
              </Button>
            </div>
          </div>
          <DriverGrid
            view={gridView}
            deletingIds={deletingIds}
            onEdit={appOpenDriverModal}
            onDelete={(args) => void onDelete(args)}
          />
        </div>

        {/* Tab 2: AI Identify Alarms */}
        <FaceEventsTab active={activeTab === 'ai-faces'} />
      </div>

      <DeleteDriverModal />
      <DriverFormModal />
      <FaceImageLightbox />
    </ContentSection>
  )
}
