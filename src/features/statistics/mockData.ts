/** Loại báo cáo QCVN06 — dữ liệu: Hành vi AI ở loaders.ts, các loại còn lại ở reports.ts. */

export type ReportTypeId = 'trips' | 'speed' | 'driving' | 'stops' | 'summary' | 'ai'

export type ReportTypeDef = {
  id: ReportTypeId
  title: string
  desc: string
  icon: string
}

export const REPORT_TYPES: ReportTypeDef[] = [
  {
    id: 'trips',
    title: 'Hành trình xe chạy',
    desc: 'Lộ trình, quãng đường, điểm đầu/cuối theo từng chuyến',
    icon: 'fa-route',
  },
  {
    id: 'speed',
    title: 'Tốc độ vận hành',
    desc: 'Tốc độ TB/max, số lần vượt tốc theo hành trình',
    icon: 'fa-gauge-high',
  },
  {
    id: 'driving',
    title: 'Thời gian lái xe liên tục',
    desc: 'Thời gian lái liên tục, vi phạm 4h/ngày · 10h',
    icon: 'fa-clock',
  },
  {
    id: 'stops',
    title: 'Dừng, đỗ',
    desc: 'Thời điểm, vị trí và thời lượng dừng đỗ',
    icon: 'fa-parking',
  },
  {
    id: 'summary',
    title: 'Tổng hợp',
    desc: 'Tổng hợp hành trình, tốc độ, vi phạm theo xe',
    icon: 'fa-chart-pie',
  },
  {
    id: 'ai',
    title: 'Hành vi AI',
    desc: 'Cảnh báo mệt mỏi, điện thoại, hút thuốc, hành khách…',
    icon: 'fa-brain',
  },
]
