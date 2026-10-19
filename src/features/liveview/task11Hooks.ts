// Điểm nối cho Task 11 (cảnh báo AI, sự kiện AI, thông tin tài xế). Task 10 gọi các hàm này đúng chỗ
// bản gốc gọi; Task 11 thay thân hàm (giữ tên, chữ ký) — không cần sửa nơi gọi.

/** liveview.js:380-385 — init() gọi một lần (setInterval 15 s + gọi ngay). */
export function startAiAlertPolling(): void {
  // Task 11
}

/** liveview.js:387 — loadVehicleDropdown gọi sau khi tải danh sách xe thành công (liveview.js:1061). */
export function pollAiAlerts(): void {
  // Task 11
}

/** liveview.js:500 — click tab phải 'ai-events' (liveview.js:275-277). */
export function loadApiAiEvents(): void {
  // Task 11
}

/**
 * liveview.js:1498 — renderUnifiedPlayer gọi ngay sau khi gắn video wall (liveview.js:1153).
 * `playerToken` định danh video wall đang hiển thị (`grid.token` trong useLiveviewStore).
 */
export function loadDriverInfoForWall(deviceId: string, playerToken: number, vehiIdno: string): void {
  void deviceId
  void playerToken
  void vehiIdno
  // Task 11
}

/**
 * Phần cuối của stopKeepalive (liveview.js:111-125): xóa _presencePolls, _faceCheckPolls,
 * _drivingDurationTimers và _drivingSessions. Task 11 sở hữu các timer đó.
 */
export function stopDriverInfoTimers(): void {
  // Task 11
}
