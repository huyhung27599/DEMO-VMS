import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

vi.mock('leaflet', () => import('../../../test/leafletMock'))
vi.mock('../../../shared/map/territorial', () => ({ addTerritorialOverlays: vi.fn() }))
vi.mock('hls.js', () => ({ default: class {} }))

import { created, resetLeafletMock } from '../../../test/leafletMock'
import type { JournalEntry } from '../lib'
import { resetPlaybackStore, usePlaybackStore } from '../store'
import { resetTrackMapController, setTrackPoints } from '../trackMapController'
import { RightPanel } from './RightPanel'

const entries: JournalEntry[] = [
  { type: 'start', idx: 0, p: { lat: 10, lng: 106, time: '2026-10-19 08:00:00', addr: '<b>Kho</b>' } },
  {
    type: 'park',
    idx: 5,
    p: {
      lat: 10.5,
      lng: 106.5,
      time: '2026-10-19 09:00:00',
      parkEnd: '2026-10-19 10:05:00',
      durationSec: 3900,
      addr: '',
      speed: 0,
    },
  },
  { type: 'end', idx: 9, p: { lat: 11, lng: 107, time: '2026-10-19 11:00:00', addr: '' } },
]

beforeEach(() => {
  vi.useFakeTimers()
  resetLeafletMock()
  resetTrackMapController()
  resetPlaybackStore()
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')))
})
afterEach(() => {
  resetTrackMapController()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('RightPanel — bản đồ / nhật ký / thống kê', () => {
  it('nhật ký: tiêu đề, thời gian, chi tiết, link Google Maps, địa điểm; click → active-point', () => {
    usePlaybackStore.setState({
      timeline: { kind: 'entries', entries, places: { 2: 'Địa điểm: Hà Nội' }, active: null },
      timelineCount: '3 sự kiện · 1 đỗ xe',
    })
    render(<RightPanel />)
    expect(document.getElementById('pb-timeline-count')).toHaveTextContent('3 sự kiện · 1 đỗ xe')
    const items = document.querySelectorAll<HTMLElement>('.pb-timeline-item')
    expect(items).toHaveLength(3)
    expect(items[1].dataset).toMatchObject({ entryI: '1', type: 'park', idx: '5', parkI: '0' })
    expect(items[0].dataset.parkI).toBeUndefined()
    expect(items[1]).toHaveTextContent('Đỗ xe · 1 giờ 05 phút')
    expect(items[1]).toHaveTextContent('19/10/2026 09:00:00 → 19/10/2026 10:05:00')
    expect(items[1].querySelector('.pb-tl-details')?.innerHTML).toContain(
      'Xe dừng tại địa điểm ≥ <strong>30 phút</strong> (tốc độ ≤ 3 km/h). Tọa độ 10.50000°, 106.50000° · <a',
    )
    expect(items[0].querySelector('a')?.getAttribute('href')).toBe('https://www.google.com/maps?q=10%2C106')
    // addr escape (R13)
    expect(items[0].querySelector('.pb-tl-place')?.textContent).toBe('Địa điểm: <b>Kho</b>')
    expect(items[1].querySelector('.pb-tl-place')?.textContent).toBe('Địa điểm: đang tra cứu…')
    expect(items[2].querySelector('.pb-tl-place')?.textContent).toBe('Địa điểm: Hà Nội')

    fireEvent.click(items[0].querySelector('a') as HTMLElement)
    expect(items[0]).not.toHaveClass('active-point')
    fireEvent.click(items[2])
    expect(document.querySelectorAll('.pb-timeline-item')[2]).toHaveClass('active-point')
  })

  it('timeline rỗng sau tìm kiếm / thống kê', () => {
    usePlaybackStore.setState({
      timeline: { kind: 'empty' },
      stats: { distance: '1.00 km', maxspeed: '50 km/h', duration: '--', points: '7' },
    })
    render(<RightPanel />)
    expect(screen.getByText('Không có dữ liệu GPS')).toBeInTheDocument()
    expect(document.getElementById('pb-stat-distance')).toHaveTextContent('1.00 km')
    expect(document.getElementById('pb-stat-points')).toHaveTextContent('7')
  })

  it('nút bản đồ chỉ hoạt động sau init; play đổi icon stop; fullscreen overlay đổi title/icon + class card', async () => {
    render(<RightPanel />)
    const play = document.getElementById('pb-track-play-btn') as HTMLButtonElement
    const fs = document.getElementById('pb-map-fullscreen-btn') as HTMLButtonElement
    setTrackPoints([{ lat: 10, lng: 106, speed: 0, time: '2026-10-19 08:00:00', addr: '' }])
    fireEvent.click(fs)
    expect(fs.title).toBe('Mở rộng toàn màn hình')

    act(() => usePlaybackStore.setState({ initialized: true }))
    // chưa có bản đồ (initMap chỉ chạy khi render track) → không phát
    fireEvent.click(play)
    expect(play.querySelector('i')).toHaveClass('fa-play')

    fireEvent.click(fs)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fs.title).toBe('Thoát toàn màn hình')
    expect(fs.querySelector('i')).toHaveClass('fa-compress')
    expect(document.getElementById('pb-track-card')).toHaveClass('pb-track-fs-mode')
    fireEvent.click(fs)
    expect(fs.title).toBe('Mở rộng toàn màn hình')
    expect(document.getElementById('pb-track-card')).not.toHaveClass('pb-track-fs-mode')
  })

  it('placeholder ẩn và legend hiện sau khi bản đồ có track', () => {
    render(<RightPanel />)
    const placeholder = screen.getByText('Bản đồ hành trình sau khi tìm kiếm').parentElement as HTMLElement
    expect(placeholder).toBeVisible()
    act(() => usePlaybackStore.setState({ trackMapInitialized: true, trackLegend: 2 }))
    expect(placeholder.style.display).toBe('none')
    const legend = document.getElementById('pb-track-legend') as HTMLElement
    expect(legend.parentElement?.id).toBe('pb-track-map')
    expect(legend).toHaveTextContent('Đỗ xe ≥30 phút (2)')
    expect(created.maps).toHaveLength(0)
  })
})
