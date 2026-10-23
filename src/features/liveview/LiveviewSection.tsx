import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useModuleEnabled } from '../../app/useModuleEnabled'
import { ContentSection } from '../../shared/ui/Section'
import { aiAlertsQueryOptions, useAiEventsStore } from './aiQueries'
import { initLiveview, onLeftTabClick } from './actions'
import { DeviceStatusPanel } from './components/DeviceStatusPanel'
import { FilterBar } from './components/FilterBar'
import { StreamWall } from './components/StreamWall'
import { VehicleSidebar } from './components/VehicleSidebar'
import { useLiveviewStore, type LeftTab } from './store'
import './liveview.css'

const LEFT_TABS: { id: LeftTab; label: string }[] = [
  { id: 'camera', label: 'Camera' },
  { id: 'map', label: 'Bản đồ' },
]

export function LiveviewSection({ hidden }: { hidden: boolean }) {
  const enabled = useModuleEnabled('liveview')
  const leftTab = useLiveviewStore((s) => s.leftTab)
  const alertPollingStarted = useAiEventsStore((s) => s.alertPollingStarted)
  useQuery({ ...aiAlertsQueryOptions(), enabled: alertPollingStarted })

  useEffect(() => {
    if (enabled) void initLiveview()
  }, [enabled])

  const activeLeftBtn = leftTab ?? 'camera'

  return (
    <ContentSection id="liveview" hidden={hidden} overflow="hidden" className="bg-[#f8fafc]">
      <header className="mb-4 flex items-start justify-between gap-4 max-[640px]:flex-col">
        <div>
          <h2 className="m-0 text-[1.65rem] font-bold tracking-tight text-[#0f172a]">Giám sát trực tuyến</h2>
          <p className="mt-1 mb-0 text-[0.85rem] text-[#94a3b8]">Video và GPS thời gian thực</p>
        </div>
        <FilterBar />
      </header>

      {/* Tabs mobile — giữ logic leftTab */}
      <div className="liveview-tabs mb-3 hidden border-b-2 border-solid border-border max-[1100px]:flex" role="tablist">
        {LEFT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeLeftBtn === t.id}
            data-tab={t.id}
            className={`tab-btn -mb-[2px] cursor-pointer border-0 border-b-[3px] border-solid bg-transparent px-5 py-2.5 font-sans text-sm transition-colors duration-250 ${
              activeLeftBtn === t.id
                ? 'active border-[#c92038] font-semibold text-[#c92038]'
                : 'border-transparent font-medium text-text-muted'
            }`}
            onClick={() => onLeftTabClick(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="liveview-container flex min-h-0 flex-1 gap-4 overflow-hidden max-[1100px]:flex-col max-[1100px]:overflow-auto">
        <VehicleSidebar />

        <div
          className={`liveview-left-panel min-w-0 flex-1 overflow-hidden ${
            leftTab === 'camera' ? 'active max-[1100px]:flex max-[1100px]:min-h-[420px] max-[1100px]:flex-col' : 'max-[1100px]:hidden'
          }`}
          id="liveview-camera-panel"
        >
          <StreamWall />
        </div>

        <div
          className={`liveview-right-panel min-h-0 ${
            leftTab === 'map' ? 'active max-[1100px]:flex max-[1100px]:min-h-[480px]' : 'max-[1100px]:hidden'
          }`}
          id="liveview-map-panel"
        >
          <DeviceStatusPanel />
        </div>
      </div>
    </ContentSection>
  )
}
