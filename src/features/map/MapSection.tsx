import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { onSectionShown } from '../../app/useActiveSection'
import { useModuleEnabled } from '../../app/useModuleEnabled'
import { Button } from '../../shared/ui/Button'
import { ContentSection, SectionHeader } from '../../shared/ui/Section'
import { MapContainer } from './MapContainer'
import { mapController } from './mapController'
import { vehiclePositionsQueryOptions } from './queries'
import { useMapStore } from './store'

// #map-section (index.html:1333-1344)
export function MapSection({ hidden }: { hidden: boolean }) {
  const enabled = useModuleEnabled('map')
  const trackingActive = useMapStore((s) => s.trackingActive)

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
    <ContentSection id="map" hidden={hidden}>
      <SectionHeader title="Bản đồ trực tuyến">
        <div className="map-controls flex gap-2">
          <Button id="map-center-btn" onClick={() => mapController.centerMapOnAllMarkers()}>
            Tập trung bản đồ
          </Button>
        </div>
      </SectionHeader>
      <MapContainer target="main" placeholder="Đang phát triển..." />
    </ContentSection>
  )
}
