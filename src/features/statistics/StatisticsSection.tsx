import { useEffect, useRef } from 'react'
import { onSectionShown } from '../../app/useActiveSection'
import { useModuleEnabled } from '../../app/useModuleEnabled'
import { ContentSection, SectionHeader } from '../../shared/ui/Section'
import { statisticsCharts } from './chartsController'
import { ChartsGrid } from './components/ChartsGrid'
import { DateFilter } from './components/DateFilter'
import { EventModal } from './components/EventModal'
import { EventsTable } from './components/EventsTable'
import { KpiGrid } from './components/KpiGrid'
import { initStatistics, loadStatistics } from './loaders'
import { useStatisticsStore } from './store'
import './statistics.css'

// #statistics-section (index.html:1090-1292). EventsModule.init() chạy ở lần showApp đầu
// (main.js:54-56) -> useModuleEnabled('events').
export function StatisticsSection({ hidden }: { hidden: boolean }) {
  const enabled = useModuleEnabled('events')
  const lastUpdate = useStatisticsStore((s) => s.lastUpdate)

  const trendRef = useRef<HTMLDivElement>(null)
  const pieRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  // init(): initCharts() + listener resize, rồi loadStatistics() (một lần, guard cấp module)
  useEffect(() => {
    if (!enabled) return
    statisticsCharts.initCharts({ trend: trendRef.current, pie: pieRef.current, bar: barRef.current })
    initStatistics()
    return () => statisticsCharts.dispose()
  }, [enabled])

  // switchSection('statistics') -> setTimeout 150 ms -> EventsModule.resizeCharts() (main.js:168-170)
  useEffect(() => onSectionShown('statistics', () => statisticsCharts.resizeCharts()), [])

  return (
    <ContentSection id="statistics" hidden={hidden}>
      <SectionHeader
        title="Thống kê dữ liệu giám sát"
        subtitle={
          <span className="text-[0.85rem] text-text-muted">
            Cập nhật lúc: <span id="stat-last-update">{lastUpdate}</span>
          </span>
        }
      >
        <div className="flex items-center gap-4">
          <DateFilter />
          <button
            type="button"
            id="stat-refresh-btn"
            title="Làm mới dữ liệu"
            aria-label="Làm mới dữ liệu"
            onClick={() => void loadStatistics()}
            className="flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-base p-0 text-text-muted transition-all duration-250 hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
          </button>
        </div>
      </SectionHeader>

      <div className="flex flex-1 gap-6 overflow-y-hidden">
        <div className="flex flex-3 flex-col gap-6 overflow-y-auto pr-2">
          <KpiGrid />
          <ChartsGrid trendRef={trendRef} pieRef={pieRef} barRef={barRef} />
          <EventsTable />
        </div>
      </div>

      <EventModal />
    </ContentSection>
  )
}
