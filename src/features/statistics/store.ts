import { create } from 'zustand'
import type { AnyRow } from './lib'

// Biến module của EventsModule (events.js:2-11) + ảnh chụp những gì các hàm render gốc đã ghi vào DOM
// (updateKPIs, updateLeaderboard, renderTable, #stat-last-update). Các ảnh chụp chỉ đổi khi hàm gốc
// tương ứng được gọi, giống innerHTML/textContent của bản gốc.

export type DateBtn = 1 | 7 | 30 | 'custom'

export type StatKpis = {
  total: number | string
  avgScore: string
  per100: string
  safetyRate: string
  safeDrivers: number | string
  topViolation: string
  topPct: string
}

export type TableSnapshot = {
  items: AnyRow[]
  page: number
  totalPages: number
  prevDisabled: boolean
  nextDisabled: boolean
}

export type LeaderboardSnapshot = { type: string; items: [string, number][] }

export type EventModalState = { event: AnyRow; dateStr: string } | null

type StatisticsState = {
  // events.js:2-11
  allEvents: AnyRow[]
  currentPage: number
  currentPeriod: number
  isCustomDate: boolean
  customStartDate: Date | null
  customEndDate: Date | null
  // Giá trị các control trong DOM gốc
  activeDateBtn: DateBtn
  customPickerVisible: boolean
  customStartInput: string
  customEndInput: string
  filterType: string // #stat-table-filter-type
  search: string // #stat-table-search (giá trị thô)
  leaderboardType: string // #stat-leaderboard-type (mặc định option đầu: 'best')
  // Ảnh chụp render
  lastUpdate: string
  kpis: StatKpis
  leaderboard: LeaderboardSnapshot | null
  table: TableSnapshot | null
  modal: EventModalState
}

const initialState = (): StatisticsState => ({
  allEvents: [],
  currentPage: 1,
  currentPeriod: 1,
  isCustomDate: false,
  customStartDate: null,
  customEndDate: null,
  activeDateBtn: 1,
  customPickerVisible: false,
  customStartInput: '',
  customEndInput: '',
  filterType: 'ALL',
  search: '',
  leaderboardType: 'best',
  lastUpdate: '--',
  kpis: {
    total: '--',
    avgScore: '--',
    per100: '--',
    safetyRate: '--%',
    safeDrivers: '--',
    topViolation: '--',
    topPct: '--',
  },
  leaderboard: null,
  table: null,
  modal: null,
})

export const useStatisticsStore = create<StatisticsState>(initialState)

/** Chỉ dùng trong test. */
export function resetStatisticsStore(): void {
  useStatisticsStore.setState(initialState())
}
