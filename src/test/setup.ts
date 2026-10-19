import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom không cài đặt window.scrollTo (router gọi khi điều hướng) — stub để output test sạch
window.scrollTo = (() => {}) as typeof window.scrollTo

// jsdom không có canvas: ECharts thật ném lỗi khi setOption. Mọi test dùng bản giả (dashboard, statistics...).
vi.mock('echarts', () => ({
  init: vi.fn(() => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() })),
  graphic: { LinearGradient: class {} },
}))
