import { ContentSection, SectionHeader } from '../../shared/ui/Section'
import { MapContainer } from '../map/MapContainer'

// Placeholder — task của feature 'liveview' sẽ thay bằng nội dung thật.
// Task 9: #liveview-map phải có trong DOM lúc MapModule.init() (map.js:103) nên container
// tối thiểu đặt sẵn ở đây; task liveview chuyển nó vào #rtab-map-view.
export function LiveviewSection({ hidden }: { hidden: boolean }) {
  return (
    <ContentSection id="liveview" hidden={hidden} overflow="hidden">
      <SectionHeader title="Giám sát phương tiện" />
      <div className="right-tab-content active flex flex-1" id="rtab-map-view">
        {/* .liveview-right-panel .map-container (styles2.css:1205-1211) */}
        <MapContainer
          target="liveView"
          placeholder="Initializing Map..."
          className="h-full rounded-none! border-0! shadow-none!"
        />
      </div>
    </ContentSection>
  )
}
