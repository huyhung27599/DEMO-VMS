/** event-server.js:168-175 — âm báo mixkit (tắt được ở Cài đặt → Thông báo & Alert) */
export function playAiToastSound(): void {
  try {
    const soundOn = localStorage.getItem('dashcam_setting_aiToastSound')
    if (soundOn !== '0' && soundOn !== 'false') {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
      audio.volume = 0.6
      audio.play().catch(() => {})
    }
  } catch {
    // giữ như bản gốc: bỏ qua lỗi
  }
}
