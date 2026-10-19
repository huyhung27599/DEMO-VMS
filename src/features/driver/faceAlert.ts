import { faceState } from './faceEvents'
import type { Loose } from './lib'

export type FaceAlert = {
  type: 'face'
  time: string
  plate: string
  message: string
  raw: Loose
}

/**
 * driver.js:114-159 pushFaceAlert. Bản gốc KHÔNG gọi hàm này ở đâu (code chết); giữ để đối chiếu.
 * Phần phát event `ai-face-alert` giữ nguyên. Phần chèn trực tiếp <li> vào #ai-alert-list / tăng #ai-badge
 * của liveview không port ở đây: liveview (Task sau) nếu cần thì lắng nghe event `ai-face-alert`.
 */
export const pushFaceAlert = (result: Loose): FaceAlert => {
  const name = result.name || 'Unknown'
  const score = Math.round((result.score || 0) * 100)
  const devId = result.devIdno || ''
  const plate = faceState.vehicleMap[devId] || devId || 'Xe không rõ'
  const isMatch = result.match === true

  const alert: FaceAlert = {
    type: 'face',
    time: new Date().toLocaleTimeString('vi-VN'),
    plate,
    message: isMatch ? `✅ Nhận diện: ${name} (${score}%)` : `⚠️ Không nhận ra tài xế (${score}%) — ${name}`,
    raw: result,
  }

  // Dispatch to existing EventServerModule (AI alert panel in liveview)
  window.dispatchEvent(new CustomEvent('ai-face-alert', { detail: alert }))
  return alert
}
