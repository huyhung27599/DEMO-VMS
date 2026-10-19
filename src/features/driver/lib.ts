/* eslint-disable @typescript-eslint/no-explicit-any -- dữ liệu thô từ 808gps/backend có shape không cố định, giữ duck-typing như driver.js */
import { BASE_URL } from '../../shared/api/client'

/** Bản ghi sự kiện / xe / tài xế thô, truy cập field động như bản gốc. */
export type Loose = any

export const FLEET_MEDIA_BASE = 'https://fleetscontrol.com'

/** Loại cảnh báo nhận dạng / tài xế — plans/List_API_linkl.md + 808gps */
export const FACE_EVIDENCE_ALARM_TYPES = [636, 643]
export const EVIDENCE_MEDIA_TYPE = 1
export const MAX_DRIVER_PHOTOS = 5

export const AI_ALARM_TYPE_LABELS: Record<number, string> = {
  600: 'Va chạm phía trước',
  602: 'Lệch làn đường',
  604: 'Khoảng cách xe quá gần',
  606: 'Va chạm người đi bộ',
  608: 'Chuyển làn liên tục',
  610: 'Vượt biển báo',
  612: 'Chướng ngại vật',
  618: 'Lái xe mệt mỏi',
  620: 'Nghe điện thoại',
  622: 'Hút thuốc',
  624: 'Mất tập trung',
  626: 'Tài xế bất thường',
  190: 'Ngáp',
  630: 'Thay đổi tài xế',
  636: 'Nhận dạng tài xế',
  639: 'Kính râm che mắt',
  643: 'Sự kiện nhận dạng tài xế',
}

/** driver.js getStoredJwt: đọc thô sessionStorage rồi localStorage (không qua AuthModule). */
export const getStoredJwt = (): string =>
  sessionStorage.getItem('dashcam_auth_token') || localStorage.getItem('dashcam_auth_token') || ''

export const formatDateForInput = (date: Date): string => {
  const local = new Date(date)
  local.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return local.toISOString().slice(0, 16)
}

export const extractDevIdFromVehicle = (vehicle: Loose): string => {
  if (!vehicle) return ''
  if (typeof vehicle.dl === 'string' && vehicle.dl) return vehicle.dl
  if (Array.isArray(vehicle.dl) && vehicle.dl.length > 0) {
    const first = vehicle.dl[0]
    if (typeof first === 'string') return first
    if (first?.id) return first.id
    if (first?.devIdno) return first.devIdno
  }
  return vehicle.devIdno || vehicle.id || ''
}

export const extractDevIdFromAny = (record: Loose): string => {
  if (!record) return ''
  if (record.devIdno) return record.devIdno
  if (record.DevIDNO) return record.DevIDNO
  if (record.id) return record.id
  if (record.did) return record.did
  if (record.dl) {
    if (typeof record.dl === 'string') return record.dl
    if (Array.isArray(record.dl) && record.dl.length > 0) {
      const first = record.dl[0]
      if (typeof first === 'string') return first
      if (first?.id) return first.id
      if (first?.devIdno) return first.devIdno
    }
  }
  return ''
}

/** Chuẩn hóa epoch giây (một số API trả ms) */
export const normalizeUnixSeconds = (v: Loose): number | null => {
  if (v == null || v === '') return null
  let n = Number(v)
  if (Number.isNaN(n)) return null
  if (n > 1e12) n = Math.floor(n / 1000)
  if (n < 946684800 || n > 4102444800) return null
  return n
}

/**
 * Ảnh trên fleetscontrol cần cookie/jsession upstream — trình duyệt không gửi được qua <img>.
 * Dùng proxy backend + JWT trong query (requireAuth đọc query.jsession).
 */
export const toDisplayableImageUrl = (absUrl: Loose): string => {
  if (!absUrl || typeof absUrl !== 'string') return ''
  const t = absUrl.trim()
  if (!t) return ''
  if (t.startsWith('data:') || t.startsWith('blob:')) return t
  const lower = t.toLowerCase()
  if (lower.includes('/api/face/capture/') || lower.includes('face/capture/')) return t
  if (lower.includes('/api/driver/photo/')) return t

  const token = getStoredJwt()
  const baseUrl = BASE_URL
  if (!token || !baseUrl) return t

  let apiOrigin: string
  try {
    apiOrigin = new URL(
      baseUrl,
      typeof window !== 'undefined' && window.location ? window.location.href : 'http://127.0.0.1',
    ).origin
  } catch {
    apiOrigin = ''
  }

  if (t.startsWith('http://') || t.startsWith('https://')) {
    try {
      const u = new URL(t)
      if (apiOrigin && u.origin === apiOrigin) return t
      return `${baseUrl}fleet-media-proxy?u=${encodeURIComponent(t)}&jsession=${encodeURIComponent(token)}`
    } catch {
      return t
    }
  }

  if (lower.includes('fleetscontrol.com') || lower.includes('808gps')) {
    return `${baseUrl}fleet-media-proxy?u=${encodeURIComponent(t)}&jsession=${encodeURIComponent(token)}`
  }
  return t
}

export const escapeHtml = (s: Loose): string => {
  if (s == null) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const toAbsoluteFleetUrl = (u: Loose): string => {
  if (!u || typeof u !== 'string') return ''
  const t = u.trim()
  if (!t) return ''
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  if (t.startsWith('/')) return `${FLEET_MEDIA_BASE}${t}`
  return `${FLEET_MEDIA_BASE}/${t}`
}

/** Lấy URL đầu tiên nếu field là chuỗi nhiều path cách bởi ';' */
export const firstPathFromField = (val: Loose): string => {
  if (!val || typeof val !== 'string') return ''
  const part = val
    .split(';')
    .map((x) => x.trim())
    .find(Boolean)
  return part ? toAbsoluteFleetUrl(part) : ''
}

export const nestedMediaUrl = (v: Loose): string => {
  if (v == null) return ''
  if (typeof v === 'string') return firstPathFromField(v)
  if (typeof v === 'object') {
    const o = v
    const cand =
      o.url || o.URL || o.path || o.file || o.pic || o.picPath || o.imgUrl || o.imageUrl || o.mediaUrl || ''
    return typeof cand === 'string' ? firstPathFromField(cand) : ''
  }
  return ''
}

/** Một số bản 808gps nhét URL ảnh trong field chuỗi không chuẩn */
export const shallowScanImageField = (evt: Loose): string => {
  if (!evt || typeof evt !== 'object') return ''
  for (const k of Object.keys(evt)) {
    if (k.startsWith('_')) continue
    const v = evt[k]
    if (typeof v !== 'string' || v.length > 2048) continue
    if (!/\.(jpe?g|png|webp|gif|bmp)(\?|;|"|'|$)/i.test(v)) continue
    if (!/[\\/]/.test(v) && !/^https?:\/\//i.test(v)) continue
    const u = firstPathFromField(v)
    if (u) return u
  }
  return ''
}

export const apiResultOk = (res: Loose): boolean => !!(res && (res.result === 0 || res.result === '0'))

/** 808gps queryIdentifyAlarm thường trả `alarms`, không phải `infos` */
export const pickIdentifyAlarmRows = (res: Loose): Loose[] => {
  const raw =
    res.alarms ?? res.alarmsInfos ?? res.alarmInfos ?? res.infos ?? res.rows ?? res.list ?? res.data
  return Array.isArray(raw) ? raw : []
}

/** querySafetyEvidence / performanceReportPhotoListSafe */
export const pickEvidenceRows = (res: Loose): Loose[] => {
  if (!apiResultOk(res)) return []
  const raw = res.photos ?? res.medias ?? res.infos ?? res.media ?? res.alarmInfolist ?? res.rows ?? res.list
  return Array.isArray(raw) ? raw : []
}

export const parseEvidenceTimeToSt = (p: Loose): number => {
  const st = p.st ?? p.stm ?? p.startTime
  if (st != null && !Number.isNaN(Number(st))) {
    const n = Number(st)
    if (n > 1e12) return Math.floor(n / 1000)
    if (n > 1e9) return n
  }
  const s = p.time || p.fileTime || p.begintime || p.alarmTime || p.dt || ''
  if (!s) return 0
  const d = new Date(String(s).replace(' ', 'T'))
  const ms = d.getTime()
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000)
}

export const evidenceItemToFaceEvent = (
  item: Loose,
  alarmType: Loose,
  vehiIdno: Loose,
  devIdno: Loose,
): Loose => {
  const st = parseEvidenceTimeToSt(item)
  const file = item.file || item.url || item.imgUrl || item.path || item.mediaUrl || ''
  return {
    _source: 'safetyEvidence',
    guid: item.guid || item.id || '',
    vehiIdno: item.vehiIdno || vehiIdno || '',
    devIdno: String(item.devIdno || item.devId || devIdno || ''),
    st,
    ty: String(alarmType),
    dn: item.dn || item.driverName || '',
    driverName: item.driverName || item.dn || '',
    armUrl: file,
    captureFaceUrl: file,
    imageUrl: file,
    simil: item.simil ?? item.similarity ?? item.faceSimilar ?? item.compareSimilar,
    blat: item.blat,
    blng: item.blng,
    typeName: item.typeName,
  }
}

export const dedupeIdentifyRows = (rows: Loose[]): Loose[] => {
  const seen = new Set<string>()
  const out: Loose[] = []
  for (const evt of rows) {
    const t = evt.st || evt.stm || evt.startTime || 0
    const key = [
      evt.guid || '',
      evt.devIdno || evt.did || evt.DevIDNO || evt.devId || '',
      evt.ty || evt.armType || '',
      t,
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(evt)
  }
  return out
}

export const extractSimilarityPct = (evt: Loose): number | null => {
  const raw =
    evt.simil ??
    evt.similarity ??
    evt.faceSimilar ??
    evt.compareSimilar ??
    evt.fdSimilarity ??
    evt.score ??
    evt.faceScore
  if (raw === undefined || raw === null || raw === '') return null
  const n = Number(raw)
  if (Number.isNaN(n)) return null
  if (n > 0 && n <= 1) return Math.round(n * 100)
  if (n > 1 && n <= 100) return Math.round(n)
  return Math.round(Math.min(100, Math.max(0, n)))
}

export const pickRegisteredFaceUrl = (evt: Loose): string => {
  const keys = [
    'registerFaceUrl', 'regFaceUrl', 'facePhotoPath', 'facePhotoUrl', 'driverFaceUrl',
    'leftFace', 'lfUrl', 'srcFace', 'faceFilePath', 'registerUrl', 'leftImage', 'leftUrl',
    'compareLeft', 'driverPic', 'driverPhoto', 'standardPic', 'faceUrl1', 'srcPic',
    'standardFace', 'faceImage', 'driverImage', 'regPic', 'leftPic',
  ]
  for (const k of keys) {
    const u = firstPathFromField(evt[k])
    if (u) return u
  }
  for (const k of ['compareLeft', 'standardFace', 'leftFace', 'driverPic']) {
    const u = nestedMediaUrl(evt[k])
    if (u) return u
  }
  return ''
}

export const pickCaptureFaceUrl = (evt: Loose): string => {
  const keys = [
    'captureFaceUrl', 'snapPic', 'snapUrl', 'alarmFaceUrl', 'sceneFaceUrl', 'rightFace',
    'rfUrl', 'dstFace', 'imageUrl', 'imgPath', 'filePath', 'facePicPath', 'signPic',
    'pictureUrl', 'alarmPic', 'mediaUrl', 'img', 'imgUrl', 'path', 'armUrl', 'armUrl1',
    'rightImage', 'rightUrl', 'compareRight', 'snapImage', 'alarmSnapshot', 'evidencePic',
    'scenePic', 'capPic', 'photoUrl', 'picUrl', 'pic', 'image',
    'SnapPath', 'snap', 'mediaPath', 'dstPicUrl', 'srcPicUrl', 'alarmFacePath', 'captureImg',
  ]
  for (const k of keys) {
    const v = evt[k]
    const u = typeof v === 'string' ? firstPathFromField(v) : ''
    if (u) return u
  }
  const nestedKeys = [
    'compareRight', 'compareLeft', 'rightFace', 'leftFace', 'snapObj',
    'picInfo', 'mediaInfo', 'fileInfo', 'attach', 'attachment',
  ]
  for (const k of nestedKeys) {
    const u = nestedMediaUrl(evt[k])
    if (u) return u
  }
  return shallowScanImageField(evt)
}

export const extractJobNumFromEvent = (evt: Loose): string => {
  if (evt.jn != null && String(evt.jn).trim()) return String(evt.jn).trim()
  if (evt.driverJn != null && String(evt.driverJn).trim()) return String(evt.driverJn).trim()
  if (evt.jobNum != null && String(evt.jobNum).trim()) return String(evt.jobNum).trim()
  if (evt.licenseNum != null && String(evt.licenseNum).trim()) return String(evt.licenseNum).trim()
  const dn = evt.driverName || evt.dn || ''
  const m = String(dn).match(/\(([^)]+)\)\s*$/)
  return m ? m[1].trim() : ''
}

/**
 * Ảnh đăng ký cục bộ khi upstream không trả URL.
 * `driverMapping` (closure state ở bản gốc) giờ là tham số tường minh.
 */
export const localRegisteredPhotoFromMapping = (
  evt: Loose,
  baseUrl: string,
  driverMapping: Loose = {},
): string => {
  if (!baseUrl) return ''
  const job = extractJobNumFromEvent(evt)
  if (!job) return ''
  const mapped =
    driverMapping && driverMapping[job] != null
      ? String(driverMapping[job])
      : String(evt.dn || evt.driverName || '').trim()
  if (!mapped || mapped === '—') return ''
  const safe = mapped.replace(/ /g, '_').replace(/\//g, '_')
  const folder = `${job}_${safe}`
  return `${baseUrl}driver/photo/${encodeURIComponent(folder)}/face_1.jpg`
}

export const eventImageScore = (e: Loose): number => {
  const cap = pickCaptureFaceUrl(e) || firstPathFromField(e.armUrl)
  const reg = pickRegisteredFaceUrl(e)
  return (cap ? 2 : 0) + (reg ? 1 : 0)
}

/** Gộp bản ghi identify + evidence, ưu tiên bản có ảnh đầy đủ hơn */
export const dedupeFaceEventsMerged = (rows: Loose[]): Loose[] => {
  const map = new Map<string, Loose>()
  for (const evt of rows) {
    const t = evt.st || evt.stm || evt.startTime || 0
    const dev = evt.devIdno || evt.devId || evt.did || ''
    const plate = evt.vehiIdno || evt.vi || ''
    const ty = String(evt.ty ?? evt.armType ?? evt.alarmType ?? '')
    const mediaHint = String(evt.captureFaceUrl || evt.armUrl || evt.imageUrl || '').slice(-32)
    const key = evt.guid ? `g:${evt.guid}` : `t:${t}|${dev}|${plate}|${ty}|${mediaHint}`
    const prev = map.get(key)
    if (!prev) {
      map.set(key, evt)
      continue
    }
    const merged = { ...prev, ...evt }
    if (eventImageScore(evt) > eventImageScore(prev)) Object.assign(merged, evt)
    map.set(key, merged)
  }
  return [...map.values()]
}

export const formatIdentifyEventTime = (evt: Loose): string => {
  const sec = normalizeUnixSeconds(evt.st ?? evt.stm ?? evt.startTime)
  if (sec != null) {
    return new Date(sec * 1000).toLocaleString('vi-VN')
  }
  const s = evt.timeStr || evt.begintime || evt.alarmTime || evt.dt || evt.tt || evt.endtime
  return s || '--'
}

/** Bản ghi Prisma FaceRecognitionLog → cùng dạng card với sự kiện GPS */
export const mapLocalFaceLogToEvent = (row: Loose, baseUrl: string): Loose => {
  const cap = row.captureFile ? `${baseUrl}face/capture/${encodeURIComponent(row.captureFile)}` : ''
  const ms = row.eventTime
    ? new Date(row.eventTime).getTime()
    : row.createdAt
      ? new Date(row.createdAt).getTime()
      : 0
  const st = ms > 0 ? Math.floor(ms / 1000) : 0
  let dName = row.driverName || '—'
  if (row.faceCount === 0) {
    dName = 'Cabin không có khuôn mặt'
  } else if (row.faceCount > 0 && (!row.driverName || row.driverName === 'Unknown' || row.driverName === '0')) {
    dName = 'Người lạ (Unknown)'
  }
  return {
    _source: 'localDb',
    guid: row.id ? `local-${row.id}` : `local-${st}-${row.devIdno}`,
    vehiIdno: row.vehiIdno || '',
    devIdno: row.devIdno,
    st,
    ty: 'local_ai',
    typeName: 'Nhận diện cục bộ (~10s / LiveView)',
    dn: dName,
    driverName: dName,
    driverCode: row.driverCode || '',
    faceMatch: row.match,
    matchResult: row.match === true ? 1 : row.match === false ? 0 : undefined,
    simil: row.accuracy ?? row.score,
    faceScore: row.accuracy ?? row.score,
    faceCount: row.faceCount,
    blat: Number.isFinite(Number(row.latitude)) ? Number(row.latitude) * 1e6 : undefined,
    blng: Number.isFinite(Number(row.longitude)) ? Number(row.longitude) * 1e6 : undefined,
    position: row.locationText || '',
    captureFaceUrl: cap,
    imageUrl: cap,
  }
}

export const identifyAlarmTypeLabel = (ty: Loose): string => {
  if (ty === undefined || ty === null || ty === '') return ''
  const t = Number(ty)
  if (!Number.isNaN(t) && AI_ALARM_TYPE_LABELS[t]) return AI_ALARM_TYPE_LABELS[t]
  return `Mã cảnh báo ${ty}`
}

export const parseFacePhotoUrlToSlots = (facePhotoUrl: Loose): (string | null)[] => {
  const arr: (string | null)[] = Array(MAX_DRIVER_PHOTOS).fill(null)
  const raw = String(facePhotoUrl || '').trim()
  if (!raw) return arr
  const urls = raw
    .split(';')
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, MAX_DRIVER_PHOTOS)
  urls.forEach((u, i) => {
    arr[i] = u
  })
  return arr
}

export const formatDateMsToDateInput = (dateMs: Loose): string => {
  if (dateMs == null || dateMs === '' || Number.isNaN(Number(dateMs))) return ''
  const d = new Date(Number(dateMs))
  // Fix timezone offset so yyyy-mm-dd doesn't shift
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export const parseDateInputToUtcMs = (dateStr: Loose): number | null => {
  if (!dateStr || typeof dateStr !== 'string') return null
  const parts = dateStr.split('-')
  if (parts.length !== 3) return null
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  // Interpret input date as local midnight so the displayed yyyy-mm-dd stays stable.
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

// ─── Task 8: helper thuần tách từ renderDrivers / renderFaceEvents / renderPortraitGrid ───

/**
 * driver.js:970-1007 (renderDrivers): URL avatar của thẻ tài xế.
 * `finalFaceUrl`: facePhotoUrl upstream (qua proxy); `localFaceUrl`: ảnh known_faces cục bộ (face_1.jpg).
 */
export const driverAvatarUrls = (
  d: Loose,
  baseUrl: string,
  driverMapping: Loose,
): { finalFaceUrl: string; localFaceUrl: string } => {
  const name = d.dn || 'Chưa rõ tên'
  let finalFaceUrl = ''
  const rawFacePhotoUrl = d.facePhotoUrl || d.faceUrl || d.photoUrl || ''
  if (typeof rawFacePhotoUrl === 'string' && rawFacePhotoUrl.trim()) {
    try {
      const urls = rawFacePhotoUrl
        .split(';')
        .map((u) => u.trim())
        .filter((u) => u && u.length > 3)
      if (urls.length > 0) {
        let firstUrl = urls[0]
        if (firstUrl.startsWith('/')) {
          firstUrl = `https://fleetscontrol.com${firstUrl}`
        } else if (!firstUrl.startsWith('http')) {
          firstUrl = `https://fleetscontrol.com/${firstUrl}`
        }
        finalFaceUrl = toDisplayableImageUrl(firstUrl)
      }
    } catch (urlErr) {
      console.warn('[driver.js] Error parsing facePhotoUrl for', name, urlErr)
    }
  }

  let localFaceUrl = ''
  if (!finalFaceUrl && baseUrl) {
    const jobNum = String(d.jn || d.idno || d.id || '').trim()
    const dn = String(d.dn || '').trim()
    if (jobNum && dn) {
      const mappedName =
        driverMapping && driverMapping[jobNum] != null && String(driverMapping[jobNum]).trim()
          ? String(driverMapping[jobNum]).trim()
          : dn
      const safeName = mappedName.replace(/ /g, '_').replace(/\//g, '_')
      const folderName = `${jobNum}_${safeName}`
      localFaceUrl = `${baseUrl}driver/photo/${encodeURIComponent(folderName)}/face_1.jpg`
    }
  }
  return { finalFaceUrl, localFaceUrl }
}

/** driver.js:1015 onerror của ảnh cục bộ: face_1.jpg → face.jpg → face_2.jpg → '' (placeholder). */
export const nextLocalAvatarSrc = (s: string): string => {
  if (s.includes('/face_1.jpg')) return s.replace('/face_1.jpg', '/face.jpg')
  if (s.includes('/face.jpg')) return s.replace('/face.jpg', '/face_2.jpg')
  return ''
}

/** driver.js:1714-1717, 1755-1758: path ảnh chân dung server → URL hiển thị được. */
export const portraitServerDisplayUrl = (serverRaw: string): string => {
  let u = serverRaw
  if (u.startsWith('/')) u = `https://fleetscontrol.com${u}`
  else if (!u.startsWith('http')) u = `https://fleetscontrol.com/${u}`
  return toDisplayableImageUrl(u)
}

export type FaceEventClass = {
  kind: 'empty' | 'unknown' | 'match' | 'mismatch'
  /** statusHtml gốc = <span style="color:…;font-weight:600;">text</span> */
  statusText: string
  statusColor: string
  badge: string
  badgeClass: string
}

const C_MUTED = 'var(--color-text-muted)'
const C_UNKNOWN = '#d97706'
const C_MATCH = '#10b981'
const C_MISMATCH = '#ef4444'

/** driver.js:1290-1431 classifyFaceEvent (bên trong renderFaceEvents). badge/badgeClass không được render (như bản gốc). */
export const classifyFaceEvent = (evt: Loose): FaceEventClass => {
  const dn = String(evt.driverName || evt.dn || '').trim()
  const isEmptyName = !dn || dn === '—'
  const isUnknownName =
    isEmptyName ||
    /^unknown$/i.test(dn) ||
    dn === '0' ||
    dn.startsWith('Người lạ') ||
    dn === 'Cabin không có khuôn mặt'

  const score = extractSimilarityPct(evt)

  if (evt._source === 'localDb') {
    if (evt.faceCount === 0) {
      return {
        kind: 'empty',
        statusText: 'Không có khuôn mặt trong cabin',
        statusColor: C_MUTED,
        badge: '—',
        badgeClass: 'empty',
      }
    }
    if (evt.match === true && isUnknownName) {
      return {
        kind: 'unknown',
        statusText: '❓ Không xác định (có khuôn mặt, chưa gán tài xế)',
        statusColor: C_UNKNOWN,
        badge: score != null ? `${score}%` : '?',
        badgeClass: 'unknown',
      }
    }
    if (evt.match === true && !isUnknownName) {
      return {
        kind: 'match',
        statusText: '✅ Khớp tài xế (ảnh trong database)',
        statusColor: C_MATCH,
        badge: score != null ? `${score}%` : '✓',
        badgeClass: '',
      }
    }
    if (evt.match === false && isUnknownName) {
      return {
        kind: 'unknown',
        statusText: '❓ Không xác định — có mặt nhưng không khớp DB',
        statusColor: C_UNKNOWN,
        badge: score != null ? `${score}%` : '?',
        badgeClass: 'unknown',
      }
    }
    if (evt.match === false) {
      return {
        kind: 'mismatch',
        statusText: '⛔ Không khớp tài xế đăng ký',
        statusColor: C_MISMATCH,
        badge: score != null ? `${score}%` : '✗',
        badgeClass: 'low-match',
      }
    }
    if (isUnknownName) {
      return {
        kind: 'unknown',
        statusText: '❓ Không xác định',
        statusColor: C_UNKNOWN,
        badge: score != null ? `${score}%` : '?',
        badgeClass: 'unknown',
      }
    }
    return {
      kind: 'match',
      statusText: '✅ Khớp tài xế',
      statusColor: C_MATCH,
      badge: score != null ? `${score}%` : '✓',
      badgeClass: '',
    }
  }

  const explicitMatch =
    evt.isDriverMatch === true ||
    evt.faceMatch === true ||
    evt.matchDriver === true ||
    evt.matchResult === 1 ||
    evt.matchResult === true
  const explicitFail =
    evt.isDriverMatch === false ||
    evt.faceMatch === false ||
    evt.matchDriver === false ||
    evt.matchResult === 0 ||
    evt.matchResult === '0'

  if (explicitMatch && !isUnknownName) {
    return {
      kind: 'match',
      statusText: '✅ Khớp tài xế',
      statusColor: C_MATCH,
      badge: score != null ? `${score}%` : '✓',
      badgeClass: '',
    }
  }
  if (explicitFail && isUnknownName) {
    return {
      kind: 'unknown',
      statusText: '❓ Không xác định (không có trong danh sách tài xế)',
      statusColor: C_UNKNOWN,
      badge: score != null ? `${score}%` : '?',
      badgeClass: 'unknown',
    }
  }
  if (explicitFail) {
    return {
      kind: 'mismatch',
      statusText: '⛔ Không khớp tài xế đăng ký',
      statusColor: C_MISMATCH,
      badge: score != null ? `${score}%` : '✗',
      badgeClass: 'low-match',
    }
  }
  if (score != null && score >= 75 && !isUnknownName) {
    return {
      kind: 'match',
      statusText: '✅ Khớp tài xế (theo điểm số)',
      statusColor: C_MATCH,
      badge: `${score}%`,
      badgeClass: '',
    }
  }
  if (isUnknownName || score == null) {
    return {
      kind: 'unknown',
      statusText: '❓ Không xác định',
      statusColor: C_UNKNOWN,
      badge: score != null ? `${score}%` : '?',
      badgeClass: 'unknown',
    }
  }
  return {
    kind: 'mismatch',
    statusText: '⛔ Không khớp / độ tin cậy thấp',
    statusColor: C_MISMATCH,
    badge: `${score}%`,
    badgeClass: 'low-match',
  }
}

/** driver.js:1458-1467: các phần "GPS: …" / "Vị trí: …" ở footer thẻ sự kiện (bỏ tiền tố &nbsp;|&nbsp;). */
export const faceEventGeoParts = (evt: Loose): string[] => {
  const parts: string[] = []
  if (evt.blat != null && evt.blng != null) {
    const la = Number(evt.blat) / 1e6
    const ln = Number(evt.blng) / 1e6
    if (!Number.isNaN(la) && !Number.isNaN(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180) {
      parts.push(`GPS: ${la.toFixed(5)}, ${ln.toFixed(5)}`)
    }
  }
  if (evt.position) {
    parts.push(`Vị trí: ${String(evt.position)}`)
  }
  return parts
}

/** driver.js:1590-1597 (#driver-search-input). `(d.jn || '').toLowerCase()` ném lỗi nếu jn là số — giữ nguyên. */
export const filterDrivers = (driversData: Loose[], term: string): Loose[] =>
  driversData.filter(
    (d) =>
      (d.dn || '').toLowerCase().includes(term) ||
      (d.jn || '').toLowerCase().includes(term) ||
      (d.cn || '').toLowerCase().includes(term),
  )
