// Port các hàm thuần của frontend/js/events.js (EventsModule). Giữ nguyên tên/thứ tự/hành vi gốc.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRow = Record<string, any>

// Mã ADAS/DSM đầy đủ theo tài liệu fleetscontrol API (explain.html) — events.js:14-33
export const ALARM_TYPES: Record<number, string> = {
  // ADAS
  600: 'Va chạm phía trước L1', 601: 'Va chạm phía trước L2',
  602: 'Lệch làn đường L1', 603: 'Lệch làn đường L2',
  604: 'Xe quá gần L1', 605: 'Xe quá gần L2',
  606: 'Va chạm người đi bộ L1', 607: 'Va chạm người đi bộ L2',
  608: 'Chuyển làn liên tục L1', 609: 'Chuyển làn liên tục L2',
  610: 'Vượt biển báo L1', 611: 'Vượt biển báo L2',
  612: 'Chướng ngại vật L1', 613: 'Chướng ngại vật L2',
  // DSM
  618: 'Lái xe mệt mỏi L1', 619: 'Lái xe mệt mỏi L2',
  620: 'Nghe điện thoại L1', 621: 'Nghe điện thoại L2',
  622: 'Hút thuốc L1', 623: 'Hút thuốc L2',
  624: 'Mất tập trung L1', 625: 'Mất tập trung L2',
  626: 'Tài xế bất thường L1', 627: 'Tài xế bất thường L2',
  630: 'Thay đổi tài xế L1', 631: 'Thay đổi tài xế L2',
  636: 'Nhận dạng tài xế', 643: 'Sự kiện nhận dạng tài xế',
  639: 'Kính râm che mắt L1', 640: 'Kính râm che mắt L2',
  190: 'Ngáp',
}
export const ALARM_IDS = Object.keys(ALARM_TYPES).join(',')

/** Mã L1 trong dropdown → gồm cả L2 (mã lẻ) tương ứng */
export const FILTER_TYPE_GROUPS: Record<string, number[]> = {
  '618': [618, 619],
  '620': [620, 621],
  '622': [622, 623],
  '624': [624, 625],
  '190': [190],
}

export const FILTER_TYPE_NAME_HINTS: Record<string, string[]> = {
  '618': ['mệt mỏi', 'met moi', 'fatigue'],
  '620': ['điện thoại', 'dien thoai', 'phone'],
  '622': ['hút thuốc', 'hut thuoc', 'smok'],
  '624': ['mất tập trung', 'mat tap trung', 'distract'],
  '190': ['ngáp', 'ngap', 'yawn'],
}

/** Tên hiển thị ngắn gọn (không L1/L2) cho bảng & modal */
export const VIOLATION_DISPLAY_NAMES: Record<number, string> = {
  190: 'Ngáp',
  600: 'Va chạm phía trước', 601: 'Va chạm phía trước',
  602: 'Lệch làn đường', 603: 'Lệch làn đường',
  604: 'Xe quá gần', 605: 'Xe quá gần',
  606: 'Va chạm người đi bộ', 607: 'Va chạm người đi bộ',
  608: 'Chuyển làn liên tục', 609: 'Chuyển làn liên tục',
  610: 'Vượt biển báo', 611: 'Vượt biển báo',
  612: 'Chướng ngại vật', 613: 'Chướng ngại vật',
  618: 'Lái xe mệt mỏi', 619: 'Lái xe mệt mỏi',
  620: 'Nghe điện thoại', 621: 'Nghe điện thoại',
  622: 'Hút thuốc', 623: 'Hút thuốc',
  624: 'Mất tập trung', 625: 'Mất tập trung',
  626: 'Tài xế bất thường', 627: 'Tài xế bất thường',
  630: 'Thay đổi tài xế', 631: 'Thay đổi tài xế',
  636: 'Nhận dạng tài xế', 643: 'Nhận dạng tài xế',
  639: 'Kính râm che mắt', 640: 'Kính râm che mắt',
}

export const ITEMS_PER_PAGE = 15

export function formatDt(dt: Date): string {
  return dt.toISOString().split('T')[0] + ' ' + dt.toTimeString().split(' ')[0]
}

export function toNum(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function normalizeCoord(v: unknown): number | null {
  const n = toNum(v)
  if (n === null) return null
  return Math.abs(n) > 1000 ? n / 1000000 : n
}

export function normalizeSpeed(v: unknown): number | null {
  const n = toNum(v)
  if (n === null) return null
  // 808gps often returns 0.1 km/h in some payloads
  if (n > 10000) return n / 10000
  return n > 250 ? n / 10 : n
}

export function parseGpsStatusSpeed(gpsstatus: unknown): number | null {
  if (!gpsstatus || typeof gpsstatus !== 'string') return null
  const parts = gpsstatus.split('|')
  for (const idx of [9, 8, 10, parts.length - 1]) {
    const v = toNum(parts[idx])
    if (v === null || v <= 0) continue
    if (v > 10000) return v / 10000
    if (v > 250) return v / 10
    if (v <= 200) return v
  }
  return null
}

export function parsePositionString(pos: unknown): { lat: number | null; lng: number | null } {
  if (!pos || typeof pos !== 'string') return { lat: null, lng: null }
  const m = pos.match(/(-?\d+\.?\d*)\s*[,;]\s*(-?\d+\.?\d*)/)
  if (!m) return { lat: null, lng: null }
  let a = parseFloat(m[1])
  let b = parseFloat(m[2])
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { lat: null, lng: null }
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
    const t = a
    a = b
    b = t
  }
  return { lat: a, lng: b }
}

export function getViolationDisplayName(e: unknown): string {
  if (!e || typeof e !== 'object') return 'Vi phạm an toàn'
  const ev = e as AnyRow
  const code = parseAlarmCodeValue(getAlarmCode(ev))
  if (code !== null && VIOLATION_DISPLAY_NAMES[code]) return VIOLATION_DISPLAY_NAMES[code]
  let tn = String(ev.typeName || ev.alarmName || ev.typeNameStr || '').trim()
  if (tn && !isBlobTypeString(tn)) {
    tn = tn
      .replace(/\s*L[12]\s*$/i, '')
      .replace(/\s*\(\d+\)\s*$/, '')
      .trim()
    if (tn && !/^cảnh báo\s*ai$/i.test(tn)) return tn
  }
  const inferred = inferAlarmCodeFromName(ev)
  if (inferred !== null && VIOLATION_DISPLAY_NAMES[inferred]) return VIOLATION_DISPLAY_NAMES[inferred]
  if (code !== null && ALARM_TYPES[code]) {
    return String(ALARM_TYPES[code])
      .replace(/\s*L[12]\s*$/i, '')
      .trim()
  }
  if (code !== null) return `Vi phạm mã ${code}`
  return 'Vi phạm an toàn'
}

export function getEventSpeed(e: AnyRow | null | undefined): number | null {
  if (!e) return null
  let sp = normalizeSpeed(pickRowField(e, 'sp', 'ssp', 'esp', 'su', 'speed', 'gpsSpeed', 'alarmSpeed'))
  if (sp === null) sp = parseGpsStatusSpeed(e.gpsstatus)
  return sp
}

export function formatSpeedDisplay(e: AnyRow): string {
  const sp = getEventSpeed(e)
  return sp !== null ? `${sp.toFixed(1)} km/h` : '--'
}

export function mergeRowIntoEvent(target: AnyRow, row: unknown): AnyRow {
  if (!row || typeof row !== 'object') return target
  const r = row as AnyRow
  const out: AnyRow = { ...target, ...r }
  const code = getAlarmCode(r)
  if (code && !isBlobTypeString(code)) out.armType = code
  const sp = getEventSpeed(r)
  if (sp !== null) out.sp = sp
  let lat = normalizeCoord(pickRowField(r, 'lat', 'slat', 'elat', 'wd', 'weiDu', 'blat', 'smlat', 'emlat'))
  let lng = normalizeCoord(pickRowField(r, 'lng', 'slng', 'elng', 'jd', 'jingDu', 'blng', 'smlng', 'emlng'))
  if (lat === null || lng === null) {
    const pos = parsePositionString(r.position)
    if (lat === null) lat = pos.lat
    if (lng === null) lng = pos.lng
  }
  if (lat !== null) out.lat = lat
  if (lng !== null) out.lng = lng
  const stm = getEventTimeSec(r)
  if (stm > 0) out.stm = stm
  out.level = r.level ?? r.alarmLevel ?? r.severity ?? out.level
  out.typeName = r.typeName || r.alarmName || out.typeName
  return out
}

export function findClosestAlarmRow(rows: unknown, targetSec: number): AnyRow | null {
  if (!Array.isArray(rows) || !rows.length) return null
  if (!targetSec) return rows[0]
  let best = rows[0]
  let bestDiff = Infinity
  rows.forEach((r: AnyRow) => {
    const t = getEventTimeSec(r)
    if (!t) return
    const d = Math.abs(t - targetSec)
    if (d < bestDiff) {
      bestDiff = d
      best = r
    }
  })
  return best
}

export function isSbacString(s: unknown): boolean {
  return typeof s === 'string' && /^SBAC=/i.test(s.trim())
}

export function isBlobTypeString(s: unknown): boolean {
  if (!s || typeof s !== 'string') return false
  const t = s.trim()
  if (isSbacString(t)) return true
  if (t.length > 24 && /^[0-9A-Za-z=]+$/.test(t) && !/\s/.test(t)) return true
  return false
}

export function pickRowField(row: unknown, ...names: string[]): unknown {
  if (!row || typeof row !== 'object') return undefined
  const r = row as AnyRow
  for (const name of names) {
    if (r[name] !== undefined && r[name] !== null && r[name] !== '') return r[name]
    const key = Object.keys(r).find((k) => k.toLowerCase() === String(name).toLowerCase())
    if (key && r[key] !== undefined && r[key] !== null && r[key] !== '') return r[key]
  }
  return undefined
}

/** Bản gốc trả về chuỗi tên (truthy) hoặc undefined; mọi nơi gọi chỉ dùng như boolean. */
export function isPlausibleAlarmCode(n: number | null): boolean {
  return n !== null && Number.isFinite(n) && (n === 190 || (n >= 600 && n <= 643) || !!VIOLATION_DISPLAY_NAMES[n])
}

/** 808gps: desc=SBAC=... — mã lỗi thật thường ở atp/alarmType, không phải chuỗi SBAC */
export function parseAlarmCodeFromSbacString(s: unknown): number | null {
  if (!s || typeof s !== 'string' || !isSbacString(s)) return null
  const digits = s.replace(/^SBAC=/i, '').replace(/\D/g, '')
  if (digits.length < 12) return null
  const tail12 = digits.slice(-12)
  const tail6 = parseInt(digits.slice(-6), 10)
  const tail3 = parseInt(digits.slice(-3), 10)
  const candidates = [tail6, tail3]
  for (const code of [190, 618, 619, 620, 621, 622, 623, 624, 625, 636, 643]) {
    const p3 = String(code).padStart(3, '0')
    const p6 = String(code).padStart(6, '0')
    if (tail12.endsWith(p3) || tail12.endsWith(p6)) candidates.unshift(code)
  }
  for (const c of candidates) {
    if (isPlausibleAlarmCode(c)) return c
  }
  return null
}

export function parseAlarmCodeValue(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null
  const s = String(v).trim()
  if (isBlobTypeString(s)) return parseAlarmCodeFromSbacString(s)
  if (/[A-Za-z]/.test(s) && !/^L?[12]?$/i.test(s)) return null
  const n = parseInt(s, 10)
  if (!Number.isFinite(n) || n <= 0) return null
  if (isPlausibleAlarmCode(n)) return n
  if (n < 1000 && String(n).length <= 3) return n
  return null
}

export function inferAlarmCodeFromName(e: AnyRow): number | null {
  const tn = String(e.typeName || e.alarmName || '').toLowerCase()
  if (!tn || isBlobTypeString(tn)) return null
  for (const [filterKey, hints] of Object.entries(FILTER_TYPE_NAME_HINTS)) {
    if (hints.some((h) => tn.includes(h))) return parseInt(filterKey, 10)
  }
  return null
}

export function getAlarmCode(e: unknown): string {
  if (!e || typeof e !== 'object') return ''
  const ev = e as AnyRow
  const numericFields = [
    pickRowField(ev, 'atp', 'ATP'),
    pickRowField(ev, 'alarmType', 'AlarmType'),
    pickRowField(ev, 'armType', 'ArmType'),
    pickRowField(ev, 'ty', 'Ty'),
    pickRowField(ev, 'atype', 'alarmCode', 'type'),
  ]
  for (const f of numericFields) {
    const n = parseAlarmCodeValue(f)
    if (n !== null) return String(n)
  }
  const sbacSrc = pickRowField(ev, 'desc', 'description', 'label') || ''
  const fromSbac = parseAlarmCodeFromSbacString(String(sbacSrc))
  if (fromSbac !== null) return String(fromSbac)
  const inferred = inferAlarmCodeFromName(ev)
  return inferred !== null ? String(inferred) : ''
}

export function getEventTimeSec(e: AnyRow): number {
  const rawNum = toNum(e.stm ?? e.st ?? e.time ?? e.gpsTime)
  if (rawNum !== null) {
    // Upstream may return seconds OR milliseconds
    if (rawNum > 1e12) return Math.floor(rawNum / 1000)
    return Math.floor(rawNum)
  }

  const dt =
    e.begintime || e.startTime || e.alarmTime || e.updateTime || e.updateTimeStr || e.fileTime || e.fileTimeStr || e.createtime
  if (!dt) return 0
  if (dt instanceof Date && !Number.isNaN(dt.getTime())) return Math.floor(dt.getTime() / 1000)

  if (typeof dt === 'string') {
    // Handle common formats: "YYYY-MM-DD HH:MM:SS" or "DD/MM/YYYY HH:MM:SS"
    const s = dt.trim()
    const mVn = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (mVn) {
      const d = parseInt(mVn[1], 10)
      const mo = parseInt(mVn[2], 10) - 1
      const y = parseInt(mVn[3], 10)
      const hh = parseInt(mVn[4], 10)
      const mm = parseInt(mVn[5], 10)
      const ss = parseInt(mVn[6] || '0', 10)
      return Math.floor(new Date(y, mo, d, hh, mm, ss).getTime() / 1000)
    }
    const normalized = s.replace(' ', 'T')
    const t = new Date(normalized).getTime()
    if (Number.isFinite(t)) return Math.floor(t / 1000)
  }
  return 0
}

export type Severity = { text: string; color: string }

export function getApiSeverity(e: AnyRow): Severity | null {
  // Ưu tiên giá trị mức độ gốc từ API (nếu có)
  const raw = e.level ?? e.alarmLevel ?? e.severity ?? e.warnLevel ?? e.priority
  if (raw !== undefined && raw !== null && raw !== '') {
    const asNum = Number(raw)
    if (Number.isFinite(asNum)) {
      // Chuẩn hóa hiển thị phổ biến 1/2/3 -> Nhẹ/Trung bình/Trầm trọng
      if (asNum >= 3) return { text: 'Trầm trọng', color: '#ef4444' }
      if (asNum === 2) return { text: 'Trung bình', color: '#f59e0b' }
      if (asNum <= 1) return { text: 'Nhẹ', color: '#3b82f6' }
    }
    const s = String(raw)
    return { text: s, color: '#334155' }
  }

  // Fallback: suy luận từ mã alarm type (ADAS/DSM convention)
  // Mã chẵn = L1 (nhẹ), mã lẻ = L2 (trầm trọng)
  const code = Number(getAlarmCode(e))
  if (Number.isFinite(code) && code >= 600 && code <= 643) {
    if (code % 2 === 1) return { text: 'Trầm trọng (L2)', color: '#ef4444' }
    return { text: 'Nhẹ (L1)', color: '#3b82f6' }
  }
  if (code === 190) return { text: 'Nhẹ', color: '#3b82f6' }
  return null
}

export function normalizeAlarmEvent(raw: AnyRow, vehicleMap: Record<string, string>): AnyRow {
  const merged = mergeRowIntoEvent({ ...raw }, raw)
  const code = getAlarmCode(merged)
  const devId = (pickRowField(merged, 'devIdno', 'did', 'devId', 'id', 'DevIDNO') || '') as string
  const vehiIdno = (pickRowField(merged, 'vehiIdno', 'vi', 'vehicleId', 'nm') || '') as string
  const vehicleName = merged.vehicleName || vehicleMap[devId] || vehicleMap[vehiIdno] || vehiIdno || devId || 'N/A'
  const level = merged.level ?? raw.alarmLevel ?? raw.severity ?? raw.warnLevel ?? raw.priority ?? raw.alarmLev ?? raw.lev
  const displayName = getViolationDisplayName({ ...merged, armType: code })

  return {
    ...merged,
    armType: code || '',
    vehicleName,
    vehiIdno,
    did: String(devId),
    level,
    displayName,
    typeName: displayName,
  }
}

export function extractSafetyAlarmRows(res: AnyRow | null | undefined): AnyRow[] {
  if (!res || res.result !== 0) return []
  return res.alarms || res.alarmsInfos || res.alarmInfos || res.alarmInfoList || []
}

export function evidenceInfoToAlarmRow(item: AnyRow | null | undefined): AnyRow | null {
  if (!item || item.alarmType == null) return null
  const code = parseAlarmCodeValue(item.alarmType)
  if (code === null) return null
  return {
    ...item,
    atp: code,
    alarmType: code,
    armType: code,
    ty: code,
    stm: item.fileTime ?? item.updateTime,
    st: item.fileTime ?? item.updateTime,
    typeName: VIOLATION_DISPLAY_NAMES[code] || ALARM_TYPES[code],
    sp: item.speed ?? item.sp,
    lat: item.weiDu ?? item.blat,
    lng: item.jingDu ?? item.blng,
    armUrl: item.fileUrl || item.downloadUrl,
  }
}

export function extractEvidenceAlarmRows(res: AnyRow | null | undefined): AnyRow[] {
  if (!res || (res.result !== 0 && res.result !== '0')) return []
  const raw = res.infos || res.photos || res.medias || []
  if (!Array.isArray(raw)) return []
  return raw.map(evidenceInfoToAlarmRow).filter(Boolean) as AnyRow[]
}

export function dedupeAlarmRows(rows: AnyRow[]): AnyRow[] {
  const seen = new Set<string>()
  const out: AnyRow[] = []
  rows.forEach((r) => {
    const code = getAlarmCode(r)
    const t = getEventTimeSec(r)
    const dev = pickRowField(r, 'devIdno', 'did', 'vehiIdno') || ''
    const key = `${dev}|${t}|${code}|${pickRowField(r, 'guid', 'id') || ''}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(r)
  })
  return out
}

export function needsEvidenceSupplement(rows: AnyRow[]): boolean {
  if (!rows.length) return true
  const valid = rows.filter((r) => isPlausibleAlarmCode(parseAlarmCodeValue(getAlarmCode(r))))
  return valid.length < rows.length * 0.5
}

/** Dropdown mã L1 (620, 622, …) — khớp cả L2 (621, 623) và tên loại từ API. */
export function alarmTypeMatchesFilter(armType: unknown, filterVal: string): boolean {
  if (!filterVal || filterVal === 'ALL') return true
  const code = parseAlarmCodeValue(armType)
  if (code === null) return false
  const group = FILTER_TYPE_GROUPS[filterVal]
  if (group) return group.includes(code)
  const want = parseInt(filterVal, 10)
  return Number.isFinite(want) && code === want
}

/**
 * events.js:getFilteredEvents — bản gốc đọc `#stat-table-filter-type` / `#stat-table-search` từ DOM
 * (readTableFilterValue/readTableSearchValue); ở đây nhận giá trị đã đọc (term đã lowercase + trim).
 */
export function getFilteredEvents(allEvents: AnyRow[], filterVal: string, term: string): AnyRow[] {
  return allEvents.filter((e) => {
    const typeMatch = alarmTypeMatchesFilter(getAlarmCode(e), filterVal)
    const typeLabel = getViolationDisplayName(e)
    const hay = `${e.vehicleName || ''} ${e.vehiIdno || ''} ${e.did || e.devIdno || ''} ${typeLabel}`.toLowerCase()
    const searchMatch = !term || hay.includes(term)
    return typeMatch && searchMatch
  })
}

/** readTableSearchValue: inp.value.toLowerCase().trim() */
export function readTableSearchValue(raw: string): string {
  return raw.toLowerCase().trim()
}

/** Chuỗi ngày giờ hiển thị trên bảng / modal (renderTable, openEventModal). */
export function eventDateStr(e: AnyRow): string {
  return e.stm > 0 ? new Date(e.stm * 1000).toLocaleString('vi-VN') : '--'
}

/** Phần dựng chuỗi CSV của events.js:exportCSV (không gồm BOM; BOM được thêm khi tải file). */
export function exportCSV(filtered: AnyRow[]): string {
  let csv = 'Thời gian,Xe,Mã lỗi,Loại vi phạm,Mức độ,Tọa độ Lat,Tọa độ Lng,Tốc độ (km/h)\n'
  filtered.forEach((e) => {
    const dateStr = e.stm > 0 ? new Date(e.stm * 1000).toLocaleString('vi-VN') : ''
    const typeName = getViolationDisplayName(e)
    const sev = getApiSeverity(e)
    const lat = Number.isFinite(e.lat) ? Number(e.lat).toFixed(5) : ''
    const lng = Number.isFinite(e.lng) ? Number(e.lng).toFixed(5) : ''
    const sp = getEventSpeed(e)
    const spd = sp !== null ? sp.toFixed(1) : ''

    csv += `"${dateStr}","${e.vehicleName}","${getAlarmCode(e)}","${typeName}","${sev ? sev.text : ''}","${lat}","${lng}","${spd}"\n`
  })
  return csv
}

/** Đếm vi phạm theo vehicleName, sắp giảm dần (dùng ở updateCharts, updateLeaderboard, generateInsights). */
export function countByVehicle(allEvents: AnyRow[]): [string, number][] {
  const vehMap: Record<string, number> = {}
  allEvents.forEach((e) => {
    vehMap[e.vehicleName] = (vehMap[e.vehicleName] || 0) + 1
  })
  return Object.entries(vehMap).sort((a, b) => b[1] - a[1])
}
