import { ContentSection, SectionHeader } from '../../shared/ui/Section'

// Placeholder — task của feature 'liveview' sẽ thay bằng nội dung thật.
export function LiveviewSection({ hidden }: { hidden: boolean }) {
  return (
    <ContentSection id="liveview" hidden={hidden} overflow="hidden">
      <SectionHeader title="Giám sát phương tiện" />
    </ContentSection>
  )
}
