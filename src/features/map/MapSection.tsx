import { ContentSection, SectionHeader } from '../../shared/ui/Section'

// Placeholder — task của feature 'map' sẽ thay bằng nội dung thật.
export function MapSection({ hidden }: { hidden: boolean }) {
  return (
    <ContentSection id="map" hidden={hidden}>
      <SectionHeader title="Bản đồ trực tuyến" />
    </ContentSection>
  )
}
