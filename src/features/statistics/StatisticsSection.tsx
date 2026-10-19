import { ContentSection, SectionHeader } from '../../shared/ui/Section'

// Placeholder — task của feature 'statistics' sẽ thay bằng nội dung thật.
export function StatisticsSection({ hidden }: { hidden: boolean }) {
  return (
    <ContentSection id="statistics" hidden={hidden}>
      <SectionHeader title="Thống kê dữ liệu giám sát" subtitle="Cập nhật lúc: --" />
    </ContentSection>
  )
}
