import { useEffect, useRef } from 'react'
import { onSectionShown } from '../../app/useActiveSection'
import { useModuleEnabled } from '../../app/useModuleEnabled'
import { ContentSection } from '../../shared/ui/Section'
import { showToast } from '../../shared/ui/toastStore'
import { statisticsCharts } from './chartsController'
import { ChartsGrid } from './components/ChartsGrid'
import { EventModal } from './components/EventModal'
import { EventsTable } from './components/EventsTable'
import { KpiGrid } from './components/KpiGrid'
import { ReportTable } from './components/ReportTable'
import { ReportFilterBar } from './components/ReportFilterBar'
import { ReportTypeCards } from './components/ReportTypeCards'
import { initStatistics, onExportClick } from './loaders'
import { useStatisticsStore } from './store'
import './statistics.css'

// #statistics-section (index.html:1090-1292). EventsModule.init() chạy ở lần showApp đầu
// (main.js:54-56) -> useModuleEnabled('events').
export function StatisticsSection({ hidden }: { hidden: boolean }) {
  const enabled = useModuleEnabled('events')
  const lastUpdate = useStatisticsStore((s) => s.lastUpdate)
  const reportType = useStatisticsStore((s) => s.reportType)
  const showAi = reportType === 'ai'

  const trendRef = useRef<HTMLDivElement>(null)
  const pieRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    statisticsCharts.initCharts({ trend: trendRef.current, pie: pieRef.current, bar: barRef.current })
    initStatistics()
    return () => statisticsCharts.dispose()
  }, [enabled])

  useEffect(() => onSectionShown('statistics', () => statisticsCharts.resizeCharts()), [])

  useEffect(() => {
    if (showAi) statisticsCharts.resizeCharts()
  }, [showAi])

  function onExcelClick() {
    if (showAi) {
      onExportClick()
      return
    }
    showToast('Xuất Excel cho loại báo cáo này sẽ kết nối API sau.', 'info')
  }

  return (
    <ContentSection id="statistics" hidden={hidden} className="gap-0 bg-[#f8fafc] p-0!">
      <header className="flex shrink-0 items-start justify-between gap-4 px-8 pt-6 pb-4 max-[768px]:flex-col max-[768px]:px-4">
        <div>
          <h2 className="m-0 text-[1.65rem] font-bold tracking-tight text-[#0f172a]">Báo cáo</h2>
          <p className="mt-1 mb-0 text-[0.85rem] text-[#94a3b8]">
            Báo cáo vận hành đội xe
            <span className="mx-2 text-[#cbd5e1]">·</span>
            Cập nhật lúc: <span id="stat-last-update">{lastUpdate}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onExcelClick}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#e11d48] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#be123c]"
        >
          <i className="fa-solid fa-file-excel" aria-hidden /> Xuất Excel
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-8 pb-6 max-[768px]:px-4">
        <ReportTypeCards />
        <ReportFilterBar />

        {showAi ? null : <ReportTable type={reportType} />}

        {/* KPI / charts / events luôn mount — logic + test; ẩn khi xem loại báo cáo khác */}
        <div className={showAi ? 'flex flex-col gap-4' : 'sr-only'}>
          <KpiGrid />
          <ChartsGrid trendRef={trendRef} pieRef={pieRef} barRef={barRef} />
          <EventsTable />
        </div>
      </div>

      <EventModal />
    </ContentSection>
  )
}
