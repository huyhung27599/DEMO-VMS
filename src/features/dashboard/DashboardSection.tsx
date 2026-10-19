import { ContentSection, SectionHeader } from '../../shared/ui/Section'

// Placeholder — task của feature 'dashboard' sẽ thay bằng nội dung thật.
export function DashboardSection({ hidden }: { hidden: boolean }) {
  return (
    <ContentSection id="dashboard" hidden={hidden}>
      <SectionHeader title="Trung tâm điều khiển" subtitle="Đang tải dữ liệu..." />
    </ContentSection>
  )
}
