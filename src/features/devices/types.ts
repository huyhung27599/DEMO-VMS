export type GpsQuality = 'good' | 'weak'
/** getDeviceStatus.net: 3G / WiFi / Có dây / 4G / 5G */
export type NetworkType = string

export type DeviceHistoryEvent = {
  id: string
  time: string
  event: string
  detail: string
}

export type Device = {
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
