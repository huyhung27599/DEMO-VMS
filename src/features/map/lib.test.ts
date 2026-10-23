import { beforeEach, describe, expect, it } from 'vitest'
import {
  darkenColor,
  ease,
  getCustomIcon,
  getTrackingIconSvg,
  lerp,
  lightenColor,
  setCustomIcon,
} from './lib'

describe('lerp / ease', () => {
  it.each([
    [0, 10, 0, 0],
    [0, 10, 0.5, 5],
    [0, 10, 1, 10],
    [10, 20, 0.25, 12.5],
    [-5, 5, 0.5, 0],
  ])('lerp(%d, %d, %d) = %d', (a, b, t, out) => {
    expect(lerp(a, b, t)).toBe(out)
  })

  it.each([0, 0.3, 0.5, 1])('ease(%d) tuyến tính', (t) => {
    expect(ease(t)).toBe(t)
  })
})

describe('darkenColor / lightenColor', () => {
  it.each([
    ['#10b981', 25, '#0c8a60'],
    ['#ffffff', 50, '#7f7f7f'],
    ['#000000', 30, '#000000'],
    ['#2a9dd8', 0, '#2a9dd8'],
  ])('darkenColor(%s, %d) = %s', (hex, p, out) => {
    expect(darkenColor(hex, p)).toBe(out)
  })

  it.each([
    ['#10b981', 30, '#57cea6'],
    ['#000000', 50, '#7f7f7f'],
    ['#ffffff', 30, '#ffffff'],
  ])('lightenColor(%s, %d) = %s', (hex, p, out) => {
    expect(lightenColor(hex, p)).toBe(out)
  })

  it('chuỗi không phải hex -> NaN như bản gốc (không ném lỗi)', () => {
    // 'red'.slice(1,3) = 'ed' (237), phần còn lại rỗng -> NaN
    expect(darkenColor('red', 10)).toBe('#d5NaNNaN')
  })
})

describe('getTrackingIconSvg', () => {
  it.each([
    ['car', 'car.png', 38],
    ['truck', 'truck.png', 38],
    ['navigation', 'navigation.png', 20],
  ])('type %s online -> ảnh PNG img/markers/%s không filter', (type, png, size) => {
    const html = getTrackingIconSvg(type, '#10b981', true)
    expect(html).toBe(
      `<img src="img/markers/${png}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.4));z-index:2;position:relative; ; object-fit: contain;" />`,
    )
  })

  it('offline -> grayscale', () => {
    expect(getTrackingIconSvg('car', '#10b981', false)).toContain(
      'position:relative; grayscale(1) opacity(0.8); object-fit: contain;',
    )
  })

  it('type lạ -> SVG mũi tên dùng màu (online) hoặc xám (offline)', () => {
    const on = getTrackingIconSvg('other', '#10b981', true)
    expect(on.startsWith('<svg width="36" height="36" viewBox="0 0 36 36"')).toBe(true)
    expect(on).toContain('id="navGrad_10b981"')
    expect(on).toContain('stop-color="#57cea6"')
    expect(on).toContain('fill="#0c8a60" opacity="0.2"')
    const off = getTrackingIconSvg('other', '#10b981', false)
    expect(off).toContain('id="navGrad_94a3b8"')
    expect(off).toContain('stop-color="#cbd5e1"')
    expect(off).toContain('fill="#64748b" opacity="0.2"')
  })
})

describe('getCustomIcon / setCustomIcon (geic_vehicle_icons)', () => {
  beforeEach(() => localStorage.clear())

  it('chưa có -> null', () => {
    expect(getCustomIcon('dev1')).toBeNull()
  })

  it('ghi đúng định dạng {uid: {type, color}} và giữ các xe khác', () => {
    localStorage.setItem('geic_vehicle_icons', JSON.stringify({ other: { type: 'car', color: '#000000' } }))
    setCustomIcon('dev1', 'truck', '#ff0000')
    expect(localStorage.getItem('geic_vehicle_icons')).toBe(
      '{"other":{"type":"car","color":"#000000"},"dev1":{"type":"truck","color":"#ff0000"}}',
    )
    expect(getCustomIcon('dev1')).toEqual({ type: 'truck', color: '#ff0000' })
  })

  it('JSON hỏng -> getCustomIcon null, setCustomIcon bỏ qua', () => {
    localStorage.setItem('geic_vehicle_icons', '{bad')
    expect(getCustomIcon('dev1')).toBeNull()
    setCustomIcon('dev1', 'car', '#111111')
    expect(localStorage.getItem('geic_vehicle_icons')).toBe('{bad')
  })
})
