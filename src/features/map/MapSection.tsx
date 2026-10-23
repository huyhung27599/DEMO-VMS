import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { onSectionShown } from '../../app/useActiveSection'
import { useModuleEnabled } from '../../app/useModuleEnabled'
import { ContentSection } from '../../shared/ui/Section'
import { MapVehiclePanel } from './components/MapVehiclePanel'
import { MapContainer } from './MapContainer'
import { mapController } from './mapController'
import { vehiclePositionsQueryOptions } from './queries'
import { useMapStore } from './store'

// #map-section (index.html:1333-1344)
export function MapSection({ hidden }: { hidden: boolean }) {
  const enabled = useModuleEnabled('map')
  const trackingActive = useMapStore((s) => s.trackingActive)
  const filtersOpen = useMapStore((s) => s.filtersOpen)

  // main.js:57-59 — MapModule.init() ở lần showApp đầu (init có guard isInitialized)
  useEffect(() => {
    if (enabled) mapController.init()
  }, [enabled])

  // main.js:160-163 switchSection('map' | 'liveview') -> handleResize;
  // Sidebar (main.js:84-97) gọi notifySectionShown('map') -> cũng là handleResize.
  useEffect(() => {
    const offMap = onSectionShown('map', mapController.handleResize)
    const offLive = onSectionShown('liveview', mapController.handleResize)
    return () => {
      offMap()
      offLive()
    }
  }, [])

  useQuery({ ...vehiclePositionsQueryOptions(), enabled: enabled && trackingActive })

  return (
    <ContentSection id="map" hidden={hidden} overflow="hidden" className="gap-0 bg-[#f8fafc] p-0!">
      <header className="flex shrink-0 items-start justify-between gap-4 px-8 pt-6 pb-4 max-[768px]:flex-col max-[768px]:px-4">
        <div>
          <h2 className="m-0 text-[1.65rem] font-bold tracking-tight text-[#0f172a]">Bản đồ trực tuyến</h2>
          <p className="mt-1 mb-0 text-[0.85rem] text-[#94a3b8]">Vị trí phương tiện theo thời gian thực</p>
        </div>
        <button
          type="button"
          aria-expanded={filtersOpen}
          onClick={() => useMapStore.setState({ filtersOpen: !filtersOpen })}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#334155] shadow-sm transition hover:border-[#c92038]/30 hover:text-[#c92038]"
        >
          <i className="fa-solid fa-filter" aria-hidden /> Bộ lọc
        </button>
      </header>

      <div className="min-h-0 flex-1 px-8 pb-6 max-[768px]:px-4">
        <div className="flex h-full min-h-[520px] overflow-hidden rounded-2xl border border-[#eef2f6] bg-white shadow-sm max-[1100px]:min-h-0 max-[1100px]:flex-col">
          <MapVehiclePanel highlighted={filtersOpen} />

          <div className="relative min-h-[420px] min-w-0 flex-1 max-[1100px]:min-h-[360px]">
            <MapContainer target="main" placeholder="Đang phát triển..." className="!rounded-none !border-0 !shadow-none" />

            <div className="pointer-events-none absolute right-3 bottom-3 z-[1000] flex flex-col gap-2">
              <button
                type="button"
                id="map-center-btn"
                title="Tập trung bản đồ"
                aria-label="Tập trung bản đồ"
                onClick={() => mapController.centerMapOnAllMarkers()}
                className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#334155] shadow-md transition hover:border-[#c92038]/40 hover:text-[#c92038]"
              >
                <i className="fa-solid fa-location-crosshairs" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </ContentSection>
  )
}
