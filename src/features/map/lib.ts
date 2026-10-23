// Hàm thuần của map.js (giữ tên gốc, bỏ tiền tố `_`).

export const ICONS_STORAGE_KEY = 'geic_vehicle_icons'

// ── Smooth lerp animation (map.js:237-239) ──
export const ANIM_DURATION = 1500
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
export function ease(t: number): number {
  return t // Linear interpolation cho chuyển động trượt liên tục
}

// ── Custom Icons Settings (map.js:273-286) ──
export type CustomIcon = { type: string; color: string }

export function getCustomIcon(uid: string): CustomIcon | null {
  try {
    const stored = JSON.parse(localStorage.getItem(ICONS_STORAGE_KEY) || '{}')
    return stored[uid] || null
  } catch {
    return null
  }
}

export function setCustomIcon(uid: string, type: string, color: string): void {
  try {
    const stored = JSON.parse(localStorage.getItem(ICONS_STORAGE_KEY) || '{}')
    stored[uid] = { type, color }
    localStorage.setItem(ICONS_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    /* bỏ qua như bản gốc */
  }
}

// ── Helper: làm tối / sáng màu (map.js:381-402) ──
const hex2 = (n: number) => n.toString(16).padStart(2, '0')

export function darkenColor(hex: string, percent: number): string {
  try {
    let r = parseInt(hex.slice(1, 3), 16)
    let g = parseInt(hex.slice(3, 5), 16)
    let b = parseInt(hex.slice(5, 7), 16)
    r = Math.max(0, Math.floor(r * (1 - percent / 100)))
    g = Math.max(0, Math.floor(g * (1 - percent / 100)))
    b = Math.max(0, Math.floor(b * (1 - percent / 100)))
    return `#${hex2(r)}${hex2(g)}${hex2(b)}`
  } catch {
    return hex
  }
}

export function lightenColor(hex: string, percent: number): string {
  try {
    let r = parseInt(hex.slice(1, 3), 16)
    let g = parseInt(hex.slice(3, 5), 16)
    let b = parseInt(hex.slice(5, 7), 16)
    r = Math.min(255, Math.floor(r + ((255 - r) * percent) / 100))
    g = Math.min(255, Math.floor(g + ((255 - g) * percent) / 100))
    b = Math.min(255, Math.floor(b + ((255 - b) * percent) / 100))
    return `#${hex2(r)}${hex2(g)}${hex2(b)}`
  } catch {
    return hex
  }
}

// ── map.js:288-378 ──
export function getTrackingIconSvg(type: string, color: string, isOnline: boolean): string {
  const shadow = `filter:drop-shadow(0 2px 5px rgba(0,0,0,0.4));z-index:2;position:relative;`
  const filter = isOnline ? '' : 'grayscale(1) opacity(0.8)'

  // Sử dụng ảnh PNG chất lượng cao từ thư mục img/markers làm mặc định
  const pngMap: Record<string, string> = {
    car: 'car.png',
    truck: 'truck.png',
    navigation: 'navigation.png',
  }

  if (pngMap[type]) {
    const size = type === 'navigation' ? 20 : 38
    return `<img src="img/markers/${pngMap[type]}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;${shadow} ${filter}; object-fit: contain;" />`
  }

  // Fallback SVG (cho trường hợp không tìm thấy PNG hoặc type lạ)
  const c = isOnline ? color : '#94a3b8'
  const cDark = isOnline ? darkenColor(color, 25) : '#64748b'
  const cLight = isOnline ? lightenColor(color, 30) : '#cbd5e1'
  const shadowSvg = `filter:drop-shadow(0 2px 6px rgba(0,0,0,0.45));z-index:2;position:relative;`

  // Nhánh 'car'/'truck' của SVG không bao giờ chạy (đã trả PNG ở trên) — giữ như bản gốc.
  if (type === 'car') {
    // ── Sedan top-down chuyên nghiệp ──
    return `<svg width="36" height="36" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" style="${shadowSvg}">
            <!-- Thân xe -->
            <rect x="10" y="4" width="20" height="32" rx="6" ry="6" fill="${c}" stroke="${cDark}" stroke-width="1.2"/>
            <!-- Kính chắn gió trước -->
            <path d="M13 10 Q14 7, 20 7 Q26 7, 27 10 L27 13 Q20 14, 13 13 Z" fill="#b8d4f0" stroke="${cDark}" stroke-width="0.5" opacity="0.85"/>
            <!-- Kính chắn gió sau -->
            <path d="M14 29 Q14 32, 20 33 Q26 32, 26 29 L26 27 Q20 26.5, 14 27 Z" fill="#b8d4f0" stroke="${cDark}" stroke-width="0.5" opacity="0.75"/>
            <!-- Nóc xe / cabin -->
            <rect x="13" y="13" width="14" height="14" rx="2" ry="1" fill="${cLight}" opacity="0.35"/>
            <!-- Đèn trước -->
            <rect x="12" y="5" width="4" height="2" rx="1" fill="#fffbe6" opacity="0.9"/>
            <rect x="24" y="5" width="4" height="2" rx="1" fill="#fffbe6" opacity="0.9"/>
            <!-- Đèn hậu -->
            <rect x="12" y="33" width="4" height="1.5" rx="0.7" fill="#ef4444" opacity="0.8"/>
            <rect x="24" y="33" width="4" height="1.5" rx="0.7" fill="#ef4444" opacity="0.8"/>
            <!-- Bánh xe trái -->
            <rect x="7" y="9" width="4" height="7" rx="2" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
            <rect x="7" y="24" width="4" height="7" rx="2" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
            <!-- Bánh xe phải -->
            <rect x="29" y="9" width="4" height="7" rx="2" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
            <rect x="29" y="24" width="4" height="7" rx="2" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
            <!-- Gương chiếu hậu -->
            <ellipse cx="9" cy="14" rx="1.5" ry="1" fill="${cDark}"/>
            <ellipse cx="31" cy="14" rx="1.5" ry="1" fill="${cDark}"/>
          </svg>`
  } else if (type === 'truck') {
    // ── Xe tải / Buýt top-down chuyên nghiệp ──
    return `<svg width="36" height="36" viewBox="0 0 40 44" xmlns="http://www.w3.org/2000/svg" style="${shadowSvg}">
            <!-- Thùng hàng -->
            <rect x="9" y="14" width="22" height="26" rx="2" ry="1" fill="${c}" stroke="${cDark}" stroke-width="1"/>
            <!-- Sọc thùng hàng -->
            <line x1="10" y1="22" x2="30" y2="22" stroke="${cDark}" stroke-width="0.5" opacity="0.3"/>
            <line x1="10" y1="30" x2="30" y2="30" stroke="${cDark}" stroke-width="0.5" opacity="0.3"/>
            <!-- Cabin -->
            <rect x="10" y="2" width="20" height="13" rx="3" ry="3" fill="${cLight}" stroke="${cDark}" stroke-width="1"/>
            <!-- Kính cabin -->
            <path d="M13 5 Q14 3.5, 20 3.5 Q26 3.5, 27 5 L27 9 Q20 10, 13 9 Z" fill="#a8c8e8" stroke="${cDark}" stroke-width="0.4" opacity="0.8"/>
            <!-- Đèn trước -->
            <rect x="11" y="3" width="3" height="2" rx="0.8" fill="#fef08a" opacity="0.9"/>
            <rect x="26" y="3" width="3" height="2" rx="0.8" fill="#fef08a" opacity="0.9"/>
            <!-- Đèn hậu -->
            <rect x="11" y="38" width="4" height="1.5" rx="0.5" fill="#dc2626" opacity="0.85"/>
            <rect x="25" y="38" width="4" height="1.5" rx="0.5" fill="#dc2626" opacity="0.85"/>
            <!-- Bánh xe -->
            <rect x="6" y="6" width="4" height="8" rx="2" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
            <rect x="30" y="6" width="4" height="8" rx="2" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
            <rect x="6" y="30" width="4" height="8" rx="2" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
            <rect x="30" y="30" width="4" height="8" rx="2" fill="#1e293b" stroke="#475569" stroke-width="0.6"/>
            <!-- Gương -->
            <rect x="7" y="10" width="3" height="2" rx="1" fill="${cDark}"/>
            <rect x="30" y="10" width="3" height="2" rx="1" fill="${cDark}"/>
          </svg>`
  } else {
    // ── Mũi tên điều hướng (Navigation Arrow) chuyên nghiệp ──
    return `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" style="${shadowSvg}">
            <defs>
              <linearGradient id="navGrad_${c.replace('#', '')}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${cLight}"/>
                <stop offset="100%" stop-color="${c}"/>
              </linearGradient>
            </defs>
            <path d="M18 2 L32 30 L18 24 L4 30 Z" fill="url(#navGrad_${c.replace('#', '')})" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
            <path d="M18 8 L26 26 L18 22 L10 26 Z" fill="${cDark}" opacity="0.2"/>
          </svg>`
  }
}

// ── Chuẩn hoá toạ độ / id (lặp lại nguyên văn ở nhiều chỗ của map.js) ──
/** Một phần tử `status` của getDeviceStatus (các trường map.js đọc). */
export type DeviceStatus = {
  [k: string]: unknown
  id?: string
  devIdno?: string
  DevIDNO?: string
  vehicleName?: string
  ol?: number
  status?: number
  jing?: number
  lng?: number
  mlng?: number
  wei?: number
  lat?: number
  mlat?: number
  hx?: number
  dir?: number
  hangXiang?: number
  course?: number
  dn?: string
  lc?: number
  yl?: number
  sn?: unknown
}

export function statusUid(s: DeviceStatus): string | undefined {
  return s.id || s.devIdno || s.DevIDNO
}

export function isStatusOnline(s: DeviceStatus): boolean {
  return s.ol === 1 || s.status === 1 || s.status === 2
}
