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
