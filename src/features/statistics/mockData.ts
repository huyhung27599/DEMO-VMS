/** Loại báo cáo QCVN06 — UI; dữ liệu thật chỉ có sẵn cho Hành vi AI (events API). */

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

export type TripReportRow = {
  plate: string
  driver: string
  start: string
  end: string
  from: string
  to: string
  distance: string
}

/** Demo khi chưa có API hành trình — khớp mockup. */
export const DEMO_TRIP_ROWS: TripReportRow[] = [
  {
    plate: '30M-81775',
    driver: 'Long Nguyễn',
    start: '08/06 06:10',
    end: '08/06 09:42',
    from: 'Bến xe Miền Đông',
    to: 'Vũng Tàu',
    distance: '98 km',
  },
  {
    plate: '43C-11882',
    driver: 'Ng. Q. Vương',
    start: '08/06 07:00',
    end: '08/06 11:20',
    from: 'KCN Sóng Thần',
    to: 'Biên Hòa',
    distance: '64 km',
  },
]

export const DEMO_SPEED_ROWS = [
  { plate: '30M-81775', driver: 'Long Nguyễn', avg: '62 km/h', max: '88 km/h', over: '3' },
  { plate: '43C-11882', driver: 'Ng. Q. Vương', avg: '55 km/h', max: '79 km/h', over: '1' },
]

export const DEMO_DRIVING_ROWS = [
  { plate: '30M-81775', driver: 'Long Nguyễn', continuous: '3g 40p', dayTotal: '8g 10p', violate: 'Không' },
  { plate: '51F-22011', driver: 'Trần Minh', continuous: '4g 15p', dayTotal: '10g 05p', violate: 'Có' },
]

export const DEMO_STOP_ROWS = [
  { plate: '30M-81775', driver: 'Long Nguyễn', at: '08/06 09:50', place: 'Trạm dừng Vũng Tàu', duration: '25 phút' },
  { plate: '43C-11882', driver: 'Ng. Q. Vương', at: '08/06 11:30', place: 'KCN Biên Hòa', duration: '40 phút' },
]

export const DEMO_SUMMARY_ROWS = [
  { plate: '30M-81775', trips: '12', distance: '840 km', overSpeed: '5', aiAlerts: '3' },
  { plate: '43C-11882', trips: '9', distance: '610 km', overSpeed: '2', aiAlerts: '1' },
]
