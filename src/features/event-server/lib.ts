// Hằng số + hàm thuần của event-server.js.

/** event-server.js:8 — Các lỗi ADAS/DSM gây cảnh báo */
export const CRITICAL_ALARM_TYPES = [618, 619, 620, 621, 622, 624, 625, 626, 627, 600, 601, 602, 604, 608, 190]

/** event-server.js:9-39 */
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
  630: 'Thay đổi tài xế',
  631: 'Thay đổi tài xế',
  190: 'Ngáp',
}

/** event-server.js:41 */
export const ALARM_IDS = Object.keys(SAFETY_ALARM_TYPES).join(',')

/** event-server.js:151-155 */
export function formatTime(epochSeconds: number | undefined | null): string {
  if (!epochSeconds) return '--:--:--'
  const date = new Date(epochSeconds * 1000)
  return date.toLocaleTimeString('vi-VN')
}

/** event-server.js:216-221 — tính cả lệch múi giờ để khớp đúng thứ server mong đợi */
export function formatDt(dt: Date): string {
  const offsetMs = dt.getTimezoneOffset() * 60 * 1000
  const localDt = new Date(dt.getTime() - offsetMs)
  return localDt.toISOString().split('T')[0] + ' ' + localDt.toISOString().split('T')[1].slice(0, 8)
}
