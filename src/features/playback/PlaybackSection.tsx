import { ContentSection, SectionHeader } from '../../shared/ui/Section'

// Placeholder — task của feature 'playback' sẽ thay bằng nội dung thật.
export function PlaybackSection({ hidden }: { hidden: boolean }) {
  return (
    <ContentSection id="playback" hidden={hidden}>
      <SectionHeader title="Phát lại video &amp; hành trình" subtitle="Xem lại lịch sử di chuyển và video hành trình" />
    </ContentSection>
  )
}
