import { ContentSection } from '../../shared/ui/Section'

// Placeholder — Task 15. Bản gốc không có #event-server-section: route '#event-server'
// hợp lệ nhưng switchSection ẩn mọi section (vùng nội dung trống).
export function EventServerSection({ hidden }: { hidden: boolean }) {
  return <ContentSection id="event-server" hidden={hidden}>{null}</ContentSection>
}
