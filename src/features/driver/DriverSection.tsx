import { ContentSection, SectionHeader } from '../../shared/ui/Section'

// Placeholder — task của feature 'driver' sẽ thay bằng nội dung thật.
export function DriverSection({ hidden }: { hidden: boolean }) {
  return (
    <ContentSection id="driver" hidden={hidden}>
      <SectionHeader title="Quản lý tài xế" subtitle="Cập nhật lúc: --" />
    </ContentSection>
  )
}
