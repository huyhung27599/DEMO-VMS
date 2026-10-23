export type GpsQuality = 'good' | 'weak'
export type NetworkType = '5G' | '4G'

export type DeviceHistoryEvent = {
  id: string
  time: string
  event: string
  detail: string
}

export type MockDevice = {
  id: string
  serial: string
  sim: string
  enterpriseId: string
  enterpriseName: string
  vehicleId: string | null
  vehiclePlate: string | null
  gps: GpsQuality | null
  gpsSatellites: number | null
  network: NetworkType | null
  signalDbm: number | null
  serverConnected: boolean | null
  storagePercent: number | null
  storageDays: number | null
  cameras: string[]
  lastOnline: string | null
  installedAt: string | null
  model: string
  history: DeviceHistoryEvent[]
}

export const DEVICE_ENTERPRISES = [
  { id: 'ent-pd', name: 'VT Phương Đông' },
  { id: 'ent-hd', name: 'Cty Hoàng Dũng' },
  { id: 'ent-tc', name: 'HTX Thành Công' },
] as const

export const DEVICE_VEHICLES = [
  { id: 'v-30m', plate: '30M-81775', enterpriseId: 'ent-pd' },
  { id: 'v-51f', plate: '51F-39201', enterpriseId: 'ent-hd' },
  { id: 'v-29a', plate: '29A-44512', enterpriseId: 'ent-tc' },
  { id: 'v-43b', plate: '43B-11208', enterpriseId: 'ent-pd' },
  { id: 'v-15c', plate: '15C-77890', enterpriseId: 'ent-hd' },
  { id: 'v-88x', plate: '88X-10001', enterpriseId: 'ent-pd' },
] as const

export const MOCK_DEVICES: MockDevice[] = [
  {
    id: 'd1',
    serial: '052040001165',
    sim: '0356 123 456',
    enterpriseId: 'ent-pd',
    enterpriseName: 'VT Phương Đông',
    vehicleId: 'v-30m',
    vehiclePlate: '30M-81775',
    gps: 'good',
    gpsSatellites: 12,
    network: '5G',
    signalDbm: -68,
    serverConnected: true,
    storagePercent: 31,
    storageDays: 24,
    cameras: ['Lái xe', 'Khoang khách', 'Cửa'],
    lastOnline: 'Vừa xong',
    installedAt: '12/03/2024',
    model: 'Box AI Dashcam',
    history: [
      {
        id: 'h1',
        time: '08/06 06:12',
        event: 'Khởi động',
        detail: 'Tự kiểm tra OK — 3 camera',
      },
      {
        id: 'h2',
        time: '01/06 08:30',
        event: 'Mất tín hiệu',
        detail: 'Khôi phục sau 4 phút',
      },
    ],
  },
  {
    id: 'd2',
    serial: '052040001172',
    sim: '0356 222 333',
    enterpriseId: 'ent-hd',
    enterpriseName: 'Cty Hoàng Dũng',
    vehicleId: 'v-51f',
    vehiclePlate: '51F-39201',
    gps: 'good',
    gpsSatellites: 10,
    network: '5G',
    signalDbm: -72,
    serverConnected: true,
    storagePercent: 43,
    storageDays: 18,
    cameras: ['Lái xe', 'Khoang khách'],
    lastOnline: '2 phút trước',
    installedAt: '05/01/2025',
    model: 'Box AI Dashcam',
    history: [
      { id: 'h3', time: '07/06 14:20', event: 'Khởi động', detail: 'Tự kiểm tra OK — 2 camera' },
    ],
  },
  {
    id: 'd3',
    serial: '052040001189',
    sim: '0356 444 555',
    enterpriseId: 'ent-tc',
    enterpriseName: 'HTX Thành Công',
    vehicleId: 'v-29a',
    vehiclePlate: '29A-44512',
    gps: 'weak',
    gpsSatellites: 4,
    network: '4G',
    signalDbm: -95,
    serverConnected: true,
    storagePercent: 78,
    storageDays: 8,
    cameras: ['Lái xe', 'Cửa'],
    lastOnline: '15 phút trước',
    installedAt: '20/08/2024',
    model: 'Box AI Dashcam',
    history: [
      { id: 'h4', time: '06/06 11:05', event: 'GPS yếu', detail: 'Chỉ bắt được 4 vệ tinh' },
    ],
  },
  {
    id: 'd4',
    serial: '052040001190',
    sim: '0356 666 777',
    enterpriseId: 'ent-pd',
    enterpriseName: 'VT Phương Đông',
    vehicleId: 'v-43b',
    vehiclePlate: '43B-11208',
    gps: 'good',
    gpsSatellites: 11,
    network: '5G',
    signalDbm: -70,
    serverConnected: true,
    storagePercent: 56,
    storageDays: 14,
    cameras: ['Lái xe', 'Khoang khách', 'Cửa'],
    lastOnline: 'Vừa xong',
    installedAt: '03/11/2024',
    model: 'Box AI Dashcam',
    history: [],
  },
  {
    id: 'd5',
    serial: '052040001201',
    sim: '0356 888 999',
    enterpriseId: 'ent-hd',
    enterpriseName: 'Cty Hoàng Dũng',
    vehicleId: 'v-15c',
    vehiclePlate: '15C-77890',
    gps: 'good',
    gpsSatellites: 9,
    network: '4G',
    signalDbm: -80,
    serverConnected: true,
    storagePercent: 92,
    storageDays: 3,
    cameras: ['Lái xe'],
    lastOnline: '1 giờ trước',
    installedAt: '15/02/2025',
    model: 'Box AI Dashcam',
    history: [
      { id: 'h5', time: '05/06 09:00', event: 'Bộ nhớ cao', detail: 'Đã dùng 92% dung lượng' },
    ],
  },
  {
    id: 'd6',
    serial: '052040001215',
    sim: '',
    enterpriseId: '',
    enterpriseName: '',
    vehicleId: null,
    vehiclePlate: null,
    gps: null,
    gpsSatellites: null,
    network: null,
    signalDbm: null,
    serverConnected: null,
    storagePercent: null,
    storageDays: null,
    cameras: [],
    lastOnline: null,
    installedAt: null,
    model: 'Box AI Dashcam',
    history: [],
  },
]
