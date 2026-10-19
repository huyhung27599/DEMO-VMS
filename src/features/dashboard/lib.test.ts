import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatTime, getSeverity, getStatusBadge, normalizeId, today, todayDatetime } from './lib'

describe('today / todayDatetime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 13, 7, 9)) // 5/1/2026 giờ local
  })
  afterEach(() => vi.useRealTimers())

  it('today() là YYYY-MM-DD có đệm 0', () => {
    expect(today()).toBe('2026-01-05')
  })
  it('todayDatetime() mặc định là 00:00:00', () => {
    expect(todayDatetime()).toBe('2026-01-05 00:00:00')
    expect(todayDatetime(false)).toBe('2026-01-05 00:00:00')
  })
  it('todayDatetime(true) là 23:59:59', () => {
    expect(todayDatetime(true)).toBe('2026-01-05 23:59:59')
  })
})

describe('normalizeId', () => {
  it('chuỗi hóa và cắt khoảng trắng', () => {
    expect(normalizeId('  abc ')).toBe('abc')
    expect(normalizeId(123)).toBe('123')
  })
  it('giá trị falsy -> chuỗi rỗng (kể cả 0)', () => {
    expect(normalizeId(undefined)).toBe('')
    expect(normalizeId(null)).toBe('')
    expect(normalizeId(0)).toBe('')
  })
})

describe('formatTime', () => {
  const NOW = new Date(2026, 5, 15, 12, 0, 0)
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('dưới 1 phút -> "Ns trước"', () => {
    expect(formatTime(new Date(NOW.getTime() - 30_000).toISOString())).toBe('30s trước')
  })
  it('dưới 1 giờ -> "Np trước"; dưới 1 ngày -> "Nh trước"', () => {
    expect(formatTime(new Date(NOW.getTime() - 5 * 60_000).toISOString())).toBe('5p trước')
    expect(formatTime(new Date(NOW.getTime() - 3 * 3600_000).toISOString())).toBe('3h trước')
  })
  it('số được hiểu là timestamp giây', () => {
    expect(formatTime(Math.floor(NOW.getTime() / 1000) - 10)).toBe('10s trước')
  })
  it('từ 1 ngày trở đi -> d/M HH:mm', () => {
    expect(formatTime(new Date(2026, 5, 2, 9, 5, 0).toISOString())).toBe('2/6 09:05')
  })
})

describe('getStatusBadge', () => {
  it('không có xe -> Ngoại tuyến', () => {
    expect(getStatusBadge(null)).toEqual({ kind: 'offline', label: 'Ngoại tuyến' })
    expect(getStatusBadge(undefined)).toEqual({ kind: 'offline', label: 'Ngoại tuyến' })
  })
  it('ol/status = 1 hoặc "1" là online; còn lại offline', () => {
    expect(getStatusBadge({ ol: 0 }).kind).toBe('offline')
    expect(getStatusBadge({ ol: '1', speed: 0 }).kind).toBe('parked')
    expect(getStatusBadge({ status: 1, speed: 0 }).kind).toBe('parked')
  })
  it('online + tốc độ > 3 -> Di chuyển; <= 3 hoặc không có tốc độ -> Đỗ xe', () => {
    expect(getStatusBadge({ ol: 1, speed: 3.1 })).toEqual({ kind: 'moving', label: 'Di chuyển' })
    expect(getStatusBadge({ ol: 1, speed: 3 })).toEqual({ kind: 'parked', label: 'Đỗ xe' })
    expect(getStatusBadge({ ol: 1 })).toEqual({ kind: 'parked', label: 'Đỗ xe' })
  })
})

describe('getSeverity', () => {
  it('33 -> critical; DSM -> warning; còn lại info', () => {
    expect(getSeverity(33)).toBe('critical')
    expect(getSeverity('618')).toBe('warning')
    expect(getSeverity(2)).toBe('info')
    expect(getSeverity(undefined)).toBe('info')
  })
})
