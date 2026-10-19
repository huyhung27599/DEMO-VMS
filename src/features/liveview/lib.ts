// Hàm thuần của liveview.js (giữ tên gốc).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = any

/** liveview.js:16 */
export const KEEPALIVE_INTERVAL_MS = 60 * 1000

/** liveview.js:1199-1208 */
export function pickFirst(obj: Loose, keys: string[]): string {
  if (!obj) return ''
  for (const k of keys) {
    const v = obj[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim()
    }
  }
  return ''
}

export type NormalizedDriverInfo = { name: string; license: string; phone: string; company: string; avatar: string }

/** liveview.js:1210-1236 (bản gốc không gọi ở đâu — code chết, giữ nguyên). */
export function normalizeDriverInfo(apiRes: Loose): NormalizedDriverInfo | null {
  if (!apiRes || apiRes.result !== 0) return null
  let source = apiRes.driver || apiRes.info || apiRes.data || apiRes.driverInfo || apiRes
  if (Array.isArray(source)) source = source[0]
  if (!source || typeof source !== 'object') return null

  const name = pickFirst(source, ['name', 'dName', 'driverName', 'realName', 'driver'])
  const license = pickFirst(source, ['driverJn', 'licenseNum', 'driverLicense', 'cardNumber', 'jobNum'])
  const phone = pickFirst(source, ['phone', 'mobile', 'tel', 'contact'])
  const company = pickFirst(source, ['companyName', 'company', 'groupName'])

  // Extract avatar from facePhotoUrl (upstream often returns relative paths separated by ';')
  let avatar = ''
  const faceRaw = pickFirst(source, ['facePhotoUrl', 'facePhoto', 'photoUrl', 'avatar', 'driverPhoto'])
  if (faceRaw) {
    const parts = faceRaw
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length > 0) {
      let url = parts[0]
      if (url.startsWith('/')) url = `https://fleetscontrol.com${url}`
      else if (!url.startsWith('http')) url = `https://fleetscontrol.com/${url}`
      avatar = url
    }
  }

  if (!name && !license && !phone && !company) return null
  return { name, license, phone, company, avatar }
}

/**
 * liveview.js:1670-1708. Nhận chuỗi HTML/URL hoặc object phản hồi API (getLiveVideoHtml).
 * Trả URL player ngoài đầu tiên hợp lệ, ngược lại ''.
 */
export function extractUrlFromLiveHtmlResponse(res: Loose): string {
  if (!res) return ''

  const currentOrigin = window.location.origin

  const isValidExternalUrl = (url: unknown): boolean => {
    if (!url || typeof url !== 'string') return false
    const normalized = url.trim()
    // Skip current origin (dashboard) to prevent recursive iframe "portal" effect
    if (
      normalized.startsWith(currentOrigin) ||
      normalized.startsWith('/') ||
      normalized.includes('localhost') ||
      normalized.includes('127.0.0.1')
    ) {
      return false
    }
    // Prefer fleetscontrol or known video player domains
    return (
      normalized.includes('fleetscontrol.com') || normalized.includes('808gps') || normalized.includes('RealPlayVideo.html')
    )
  }

  if (typeof res === 'string') {
    const trimmed = res.trim()
    if (isValidExternalUrl(trimmed)) return trimmed

    const matches = trimmed.match(/https?:\/\/[^\s"'<>]+/g)
    if (matches) {
      // Find the first one that belongs to Fleetscontrol
      const external = matches.find((m) => isValidExternalUrl(m))
      if (external) return external
    }
  }

  // Chuỗi: res.url... đều undefined (như bản gốc truy cập thuộc tính của string)
  const candidates = [res.url, res.file, res.address, res.playUrl, res.liveUrl, res.html]
  for (const c of candidates) {
    // Bản gốc trả `c` chưa trim
    if (isValidExternalUrl(c)) return c
    if (typeof c === 'string') {
      const matches = c.match(/https?:\/\/[^\s"'<>]+/g)
      const external = matches ? matches.find((m) => isValidExternalUrl(m)) : null
      if (external) return external
    }
  }
  return ''
}

// ── Task 11: cảnh báo AI / sự kiện AI / thông tin tài xế ──

/** liveview.js:32-71 — AI Alert: chỉ cảnh báo các loại “nghiêm trọng” (có thể tuỳ chỉnh theo nghiệp vụ) */
export const SAFETY_ALARM_TYPES: Record<string, string> = {
  // ADAS
  600: 'Va chạm phía trước',
  601: 'Va chạm phía trước',
  602: 'Lệch làn đường',
  603: 'Lệch làn đường',
  604: 'Khoảng cách xe quá gần',
  605: 'Khoảng cách xe quá gần',
  606: 'Va chạm người đi bộ',
  607: 'Va chạm người đi bộ',
  608: 'Chuyển làn liên tục',
  609: 'Chuyển làn liên tục',
  610: 'Vượt biển báo',
  611: 'Vượt biển báo',
  612: 'Chướng ngại vật',
  613: 'Chướng ngại vật',
  // DSM
  618: 'Lái xe mệt mỏi',
  619: 'Lái xe mệt mỏi',
  620: 'Nghe điện thoại',
  621: 'Nghe điện thoại',
  622: 'Hút thuốc',
  623: 'Hút thuốc',
  624: 'Mất tập trung',
  625: 'Mất tập trung',
  626: 'Tài xế bất thường',
  627: 'Tài xế bất thường',
  // Basic DSM
  190: 'Ngáp',
  // Driver change / identify
  630: 'Thay đổi tài xế',
  631: 'Thay đổi tài xế',
  639: 'Kính râm che mắt',
  640: 'Kính râm che mắt',
  636: 'Nhận dạng tài xế',
  643: 'Sự kiện nhận dạng tài xế',
}
export const AI_ALERT_CRITICAL_ARM_TYPES = [618, 619, 620, 621, 624, 625, 626, 627]
export const AI_ALERT_CRITICAL_ALARM_IDS = AI_ALERT_CRITICAL_ARM_TYPES.join(',')

/** liveview.js:301-303 — ngày theo UTC (toISOString) + giờ địa phương (giữ nguyên lệch múi giờ của bản gốc) */
export function formatDt(dt: Date): string {
  return dt.toISOString().split('T')[0] + ' ' + dt.toTimeString().split(' ')[0]
}

/** liveview.js:1383-1393 */
export function formatDriverName(rawName: string | null | undefined): string {
  if (!rawName) return 'Chưa nhận dạng'
  // Xóa dấu gạch dưới và định dạng: 8899_Nguyễn_Văn_Trường -> Nguyễn Văn Trường (8899)
  const match = rawName.match(/^(\d+)_+(.*)$/)
  if (match) {
    const id = match[1]
    const namePart = match[2].replace(/_/g, ' ').trim()
    return `${namePart} (${id})`
  }
  return rawName.replace(/_/g, ' ').trim()
}

/** liveview.js:1395-1404 */
export function extractDriverCode(rawName: unknown): string {
  const name = String(rawName || '').trim()
  if (!name) return ''
  const bracket = name.match(/\(([^)]+)\)\s*$/)
  if (bracket && bracket[1]) return bracket[1].trim()
  const prefix = name.match(/^(\d+)_/)
  if (prefix && prefix[1]) return prefix[1].trim()
  if (/^\d+$/.test(name)) return name
  return ''
}

/** liveview.js:1406-1413 — HH:MM:SS kể từ startTime */
export function getDurationString(startTime: number): string {
  const diff = Math.max(0, Date.now() - startTime)
  const s = Math.floor(diff / 1000) % 60
  const m = Math.floor(diff / 60000) % 60
  const h = Math.floor(diff / 3600000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export type DriverListRowInfo = { name: string; license: string; phone: string; avatar: string }

/** liveview.js:1477-1496 — Build a driver info object from a queryDriverList row. */
export function buildDriverInfoFromListRow(d: Loose): DriverListRowInfo | null {
  if (!d) return null
  const name = d.dn || d.name || d.driverName || ''
  const license = d.jn || d.driverJn || d.licenseNum || d.id || ''
  const phone = d.dt || d.phone || d.mobile || ''

  let avatar = ''
  const faceRaw = d.facePhotoUrl || d.facePhoto || d.photoUrl || ''
  if (faceRaw) {
    const parts: string[] = faceRaw
      .split(';')
      .map((s: string) => s.trim())
      .filter(Boolean)
    if (parts.length > 0) {
      let url = parts[0]
      if (url.startsWith('/')) url = `https://fleetscontrol.com${url}`
      else if (!url.startsWith('http')) url = `https://fleetscontrol.com/${url}`
      avatar = url
    }
  }
  return { name, license, phone, avatar }
}
