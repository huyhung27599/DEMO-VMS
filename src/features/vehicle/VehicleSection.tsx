import { ContentSection, SectionHeader } from '../../shared/ui/Section'

// Placeholder — task của feature 'vehicle' sẽ thay bằng nội dung thật.
export function VehicleSection({ hidden }: { hidden: boolean }) {
  return (
    <ContentSection id="vehicle" hidden={hidden}>
      <SectionHeader title="Quản lý phương tiện" subtitle="Cập nhật lúc: --" />
    </ContentSection>
  )
}
