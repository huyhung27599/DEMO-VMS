import { act } from '@testing-library/react'
import { expect, vi, type Mock } from 'vitest'

function setVisibilityState(value: DocumentVisibilityState | null): void {
  if (value === null) {
    // Gỡ override, trả về getter gốc của jsdom (trên prototype)
    delete (document as unknown as Record<string, unknown>).visibilityState
  } else {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value })
  }
  document.dispatchEvent(new Event('visibilitychange'))
}

/**
 * Tiến fake timer `ms` ba lần; mỗi lần số lần gọi `queryFnMock` phải tăng đúng 1,
 * kể cả khi `document.visibilityState === 'hidden'` (tab bị ẩn).
 * Yêu cầu: test đã gọi `vi.useFakeTimers()` trước khi render.
 */
export async function expectPolling(queryFnMock: Mock, ms: number): Promise<void> {
  setVisibilityState('hidden')
  try {
    for (let i = 0; i < 3; i++) {
      const before = queryFnMock.mock.calls.length
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms)
      })
      expect(queryFnMock.mock.calls.length).toBe(before + 1)
    }
  } finally {
    setVisibilityState(null)
  }
}
