import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useModuleEnabled } from '../../app/useModuleEnabled'
import { Button } from '../../shared/ui/Button'
import { ContentSection, SectionHeader } from '../../shared/ui/Section'
import { MapContainer } from '../map/MapContainer'
import { aiAlertsQueryOptions, useAiEventsStore } from './aiQueries'
import { initLiveview, onLeftTabClick, onRefreshClick, onRightTabClick } from './actions'
import { AiEventsPanel } from './components/AiEventsPanel'
import { CompanyDropdown } from './components/CompanyDropdown'
import { SosDropdown } from './components/SosDropdown'
import { StreamWall } from './components/StreamWall'
import { VehicleList } from './components/VehicleList'
import { useLiveviewStore, type LeftTab } from './store'
import './liveview.css'

// #liveview-section (index.html:844-957) + styles2.css:693-695, 836-1211, 1941-1968, responsive-desktop.css:141-148.

const LEFT_TABS: { id: LeftTab; label: string }[] = [
  { id: 'camera', label: 'Camera' },
  { id: 'map', label: 'Bản đồ' },
]

const RIGHT_TAB_BTN =
  'right-tab-btn flex flex-1 cursor-pointer items-center justify-center gap-2 border-0 border-b-2 border-solid px-4 py-[0.875rem] text-[0.9rem] transition-all duration-250 hover:bg-[rgba(42,157,216,0.05)] hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary'

function rightTabClass(active: boolean): string {
  return `${RIGHT_TAB_BTN} ${active ? 'active border-primary bg-base font-semibold text-primary' : 'border-transparent bg-transparent font-medium text-text-muted'}`
}

function AiEventTabIcon() {
  return (
    <svg className="ai-event-tab-icon h-[1.05rem] w-[1.05rem] shrink-0" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="6" y="10" width="42" height="46" rx="10" fill="none" stroke="currentColor" strokeWidth="4"></rect>
      <path
        d="M20 42V24h6.4l4.8 18h-4.2l-0.9-3.2h-5.2l-0.9 3.2H20zm5.7-6.6-1.6-5.7-1.6 5.7h3.2zm7.6 6.6V24h4.1v18h-4.1z"
        fill="currentColor"
      ></path>
      <path d="M52 8l2.1 4.9L59 15l-4.9 2.1L52 22l-2.1-4.9L45 15l4.9-2.1L52 8z" fill="currentColor"></path>
    </svg>
  )
}

export function LiveviewSection({ hidden }: { hidden: boolean }) {
  const enabled = useModuleEnabled('liveview')
  const leftTab = useLiveviewStore((s) => s.leftTab)
  const rightTab = useLiveviewStore((s) => s.rightTab)
  // startAiAlertPolling (init): pollAiAlerts ngay + mỗi 15 s
  const alertPollingStarted = useAiEventsStore((s) => s.alertPollingStarted)
  useQuery({ ...aiAlertsQueryOptions(), enabled: alertPollingStarted })

  // main.js:51-53 — LiveViewModule.init() ở lần showApp đầu (guard isInitialized)
  useEffect(() => {
    if (enabled) void initLiveview()
  }, [enabled])

  // nút tab trái: index.html đặt sẵn `active` cho Camera; sau initTabs theo leftTab
  const activeLeftBtn = leftTab ?? 'camera'

  return (
    <ContentSection id="liveview" hidden={hidden} overflow="hidden">
      <SectionHeader title="Giám sát phương tiện">
        <div className="header-actions flex items-center gap-4 max-[768px]:w-full max-[768px]:flex-wrap max-[768px]:gap-2">
          {/* Chọn nhóm quản lý (Company) */}
          <CompanyDropdown />
          {/* Chọn phương tiện (Car) */}
          <VehicleList />
          {/* Icon: Cảnh báo SOS (Bell) */}
          <SosDropdown />
          <Button
            variant="primary"
            id="refresh-liveview"
            className="max-[768px]:min-w-[120px] max-[768px]:flex-1"
            onClick={onRefreshClick}
          >
            <i className="fa-solid fa-rotate-right" aria-hidden="true"></i> Làm mới
          </Button>
        </div>
      </SectionHeader>

      {/* Tabs for mobile/tablet */}
      <div className="liveview-tabs mb-4 hidden border-b-2 border-solid border-border max-[1024px]:flex" role="tablist">
        {LEFT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeLeftBtn === t.id}
            data-tab={t.id}
            className={`tab-btn -mb-[2px] cursor-pointer border-0 border-b-[3px] border-solid bg-transparent px-6 py-3 font-sans text-base transition-colors duration-250 hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
              activeLeftBtn === t.id
                ? 'active border-primary font-semibold text-primary'
                : 'border-transparent font-medium text-text-muted'
            }`}
            onClick={() => onLeftTabClick(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="liveview-container flex h-[calc(100%-60px)] min-h-[500px] flex-1 gap-6 overflow-hidden max-[1024px]:flex-col max-[1024px]:overflow-visible min-[1025px]:max-[1919px]:min-h-[460px] min-[1025px]:max-[1919px]:gap-5">
        <div
          className={`liveview-left-panel flex-[6] overflow-y-auto pr-2 max-[1024px]:flex-[7] ${
            leftTab === 'camera' ? 'active max-[1024px]:flex max-[1024px]:flex-col' : ''
          }`}
          id="liveview-camera-panel"
        >
          <StreamWall />
        </div>

        <div
          className={`liveview-right-panel flex min-w-0 flex-[4] flex-col overflow-hidden rounded-md border border-solid border-border bg-base max-[1024px]:h-[600px] max-[1024px]:w-full max-[1024px]:flex-[3] ${
            leftTab === 'map' ? 'active' : ''
          }`}
          id="liveview-map-panel"
        >
          {/* Right Panel Tabs */}
          <div className="right-panel-tabs flex border-b border-solid border-border bg-[#f8fafc]" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={rightTab === 'map-view'}
              data-rtab="map-view"
              className={rightTabClass(rightTab === 'map-view')}
              onClick={() => onRightTabClick('map-view')}
            >
              <i className="fa-solid fa-map-location-dot" aria-hidden="true"></i> Bản đồ giám sát
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rightTab === 'ai-events'}
              data-rtab="ai-events"
              className={rightTabClass(rightTab === 'ai-events')}
              onClick={() => onRightTabClick('ai-events')}
            >
              <AiEventTabIcon />
              Sự kiện AI
            </button>
          </div>

          {/* Tab: Bản đồ giám sát — #liveview-map luôn mount (Leaflet gắn một lần), tab ẩn bằng CSS */}
          <div
            className={`right-tab-content flex-1 flex-col overflow-hidden ${rightTab === 'map-view' ? 'active flex' : 'hidden'}`}
            id="rtab-map-view"
          >
            {/* .liveview-right-panel .map-container (styles2.css:1205-1211) */}
            <MapContainer
              target="liveView"
              placeholder="Initializing Map..."
              className="h-full rounded-none! border-0! shadow-none!"
            />
          </div>

          {/* Tab: Sự kiện AI */}
          <div
            className={`right-tab-content flex-1 flex-col overflow-hidden ${rightTab === 'ai-events' ? 'active flex' : 'hidden'}`}
            id="rtab-ai-events"
          >
            <AiEventsPanel />
          </div>
        </div>
      </div>
    </ContentSection>
  )
}
