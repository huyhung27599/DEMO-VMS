import { useMemo, useState } from 'react'
import { Button } from '../../shared/ui/Button'
import { ContentSection } from '../../shared/ui/Section'
import { showToast } from '../../shared/ui/toastStore'
import { ToggleSwitch } from './components/ToggleSwitch'
import { alertLevelBadgeClass, alertLevelLabel, filterLogs, paginateLogs } from './lib'
import {
  DEFAULT_AI,
  DEFAULT_GENERAL,
  DEFAULT_STORAGE,
  LOG_ACTION_OPTIONS,
  LOG_TOTAL_COUNT,
  MOCK_SYSTEM_LOGS,
  SETTINGS_TABS,
  type AiSettings,
  type GeneralSettings,
  type SettingsTab,
  type StorageSettings,
  type SystemLog,
} from './mockData'

const labelClass = 'mb-1.5 block text-[0.8rem] font-semibold text-[#334155]'
const selectClass =
  'w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15'
const sectionTitle = 'mb-4 text-[0.7rem] font-bold tracking-[0.08em] text-[#94a3b8] uppercase'
const cardClass = 'rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6'

export function SettingsSection({ hidden }: { hidden: boolean }) {
  const [tab, setTab] = useState<SettingsTab>('general')
  const [general, setGeneral] = useState<GeneralSettings>(() => ({ ...DEFAULT_GENERAL }))
  const [ai, setAi] = useState<AiSettings>(() => ({
    ...DEFAULT_AI,
    alerts: DEFAULT_AI.alerts.map((a) => ({ ...a })),
  }))
  const [storage, setStorage] = useState<StorageSettings>(() => ({ ...DEFAULT_STORAGE }))
  const [logs] = useState<SystemLog[]>(() => [...MOCK_SYSTEM_LOGS])
  const [logSearch, setLogSearch] = useState('')
  const [logAction, setLogAction] = useState('')
  const [logDate, setLogDate] = useState('')
  const [appliedLogFilters, setAppliedLogFilters] = useState({
    search: '',
    action: '',
    date: '',
  })
  const [logPage, setLogPage] = useState(1)

  const filteredLogs = useMemo(
    () => filterLogs(logs, appliedLogFilters),
    [logs, appliedLogFilters],
  )
  const { rows: logRows, totalPages, page: safeLogPage, from, to } = useMemo(
    () => paginateLogs(filteredLogs, logPage),
    [filteredLogs, logPage],
  )

  const showSave = tab !== 'logs'

  const onSave = () => {
    showToast('Đã lưu cấu hình thành công', 'success')
  }

  const applyLogFilters = () => {
    setAppliedLogFilters({ search: logSearch, action: logAction, date: logDate })
    setLogPage(1)
  }

  return (
    <ContentSection id="settings" hidden={hidden} className="bg-[#f8fafc]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-2xl font-bold text-text-main">Cài đặt hệ thống</h2>
          <p className="mt-1 mb-0 text-sm text-text-muted">
            Cấu hình chung, cảnh báo AI, lưu trữ video và nhật ký hệ thống
          </p>
        </div>
        {showSave ? (
          <Button variant="primary" size="sm" onClick={onSave}>
            <i className="fa-solid fa-check mr-1.5" aria-hidden="true" />
            Lưu cấu hình
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <nav
          aria-label="Mục cài đặt"
          className="w-full shrink-0 rounded-xl border border-border bg-white p-2 shadow-sm lg:w-56"
        >
          {SETTINGS_TABS.map((item) => {
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none px-3 py-2.5 text-left text-sm font-medium last:mb-0 ${
                  active
                    ? 'bg-[#fce8eb] text-danger'
                    : 'bg-transparent text-text-muted hover:bg-slate-50 hover:text-text-main'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <i className={`fa-solid ${item.icon} w-4 text-center`} aria-hidden="true" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {tab === 'general' ? (
            <div className={cardClass}>
              <h3 className={sectionTitle}>Cấu hình chung</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="set-lang" className={labelClass}>
                    Ngôn ngữ mặc định
                  </label>
                  <select
                    id="set-lang"
                    className={selectClass}
                    value={general.language}
                    onChange={(e) => setGeneral((g) => ({ ...g, language: e.target.value }))}
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="set-dt" className={labelClass}>
                    Định dạng ngày giờ
                  </label>
                  <select
                    id="set-dt"
                    className={selectClass}
                    value={general.datetimeFormat}
                    onChange={(e) => setGeneral((g) => ({ ...g, datetimeFormat: e.target.value }))}
                  >
                    <option value="DD/MM/YYYY HH:mm">DD/MM/YYYY HH:mm</option>
                    <option value="MM/DD/YYYY hh:mm A">MM/DD/YYYY hh:mm A</option>
                    <option value="YYYY-MM-DD HH:mm">YYYY-MM-DD HH:mm</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="set-speed" className={labelClass}>
                    Đơn vị tốc độ
                  </label>
                  <select
                    id="set-speed"
                    className={selectClass}
                    value={general.speedUnit}
                    onChange={(e) => setGeneral((g) => ({ ...g, speedUnit: e.target.value }))}
                  >
                    <option value="km/h">km/h</option>
                    <option value="mph">mph</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="set-signal" className={labelClass}>
                    Ngưỡng mất tín hiệu cảnh báo
                  </label>
                  <select
                    id="set-signal"
                    className={selectClass}
                    value={general.signalLossMinutes}
                    onChange={(e) =>
                      setGeneral((g) => ({ ...g, signalLossMinutes: e.target.value }))
                    }
                  >
                    <option value="15">15 phút</option>
                    <option value="30">30 phút</option>
                    <option value="60">60 phút</option>
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'ai' ? (
            <div className="flex flex-col gap-4">
              <div className={cardClass}>
                <h3 className={sectionTitle}>Độ nhạy AI</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ai-sens" className={labelClass}>
                      Mức độ nhạy phát hiện
                    </label>
                    <select
                      id="ai-sens"
                      className={selectClass}
                      value={ai.sensitivity}
                      onChange={(e) => setAi((s) => ({ ...s, sensitivity: e.target.value }))}
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ai-count" className={labelClass}>
                      Số lần cảnh báo trước khi ghi nhận
                    </label>
                    <select
                      id="ai-count"
                      className={selectClass}
                      value={ai.alertBeforeRecord}
                      onChange={(e) => setAi((s) => ({ ...s, alertBeforeRecord: e.target.value }))}
                    >
                      <option value="1">1 lần</option>
                      <option value="2">2 lần</option>
                      <option value="3">3 lần</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={`${cardClass} overflow-x-auto p-0! sm:p-0!`}>
                <div className="px-5 pt-5 sm:px-6 sm:pt-6">
                  <h3 className={sectionTitle}>Loại cảnh báo AI</h3>
                </div>
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-y border-border text-[0.7rem] tracking-[0.06em] text-[#94a3b8] uppercase">
                      <th className="px-5 py-3 font-semibold sm:px-6">Loại cảnh báo</th>
                      <th className="px-3 py-3 font-semibold">Mức độ mặc định</th>
                      <th className="px-3 py-3 text-center font-semibold">Loa cảnh báo</th>
                      <th className="px-5 py-3 text-center font-semibold sm:px-6">Bật/Tắt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ai.alerts.map((alert) => (
                      <tr key={alert.id} className="border-b border-border/70 last:border-0">
                        <td className="px-5 py-3.5 font-medium text-text-main sm:px-6">
                          {alert.name}
                        </td>
                        <td className="px-3 py-3.5">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[0.7rem] font-semibold ring-1 ring-inset ${alertLevelBadgeClass(alert.level)}`}
                          >
                            {alertLevelLabel(alert.level)}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <div className="flex justify-center">
                            <ToggleSwitch
                              label={`Loa — ${alert.name}`}
                              checked={alert.speaker}
                              onChange={(next) =>
                                setAi((s) => ({
                                  ...s,
                                  alerts: s.alerts.map((a) =>
                                    a.id === alert.id ? { ...a, speaker: next } : a,
                                  ),
                                }))
                              }
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center sm:px-6">
                          <div className="flex justify-center">
                            <ToggleSwitch
                              label={`Bật — ${alert.name}`}
                              checked={alert.enabled}
                              onChange={(next) =>
                                setAi((s) => ({
                                  ...s,
                                  alerts: s.alerts.map((a) =>
                                    a.id === alert.id ? { ...a, enabled: next } : a,
                                  ),
                                }))
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {tab === 'storage' ? (
            <div className={cardClass}>
              <h3 className={sectionTitle}>Chính sách lưu trữ</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="st-normal" className={labelClass}>
                    Thời gian lưu video thường
                  </label>
                  <select
                    id="st-normal"
                    className={selectClass}
                    value={storage.normalRetentionDays}
                    onChange={(e) =>
                      setStorage((s) => ({ ...s, normalRetentionDays: e.target.value }))
                    }
                  >
                    <option value="7">7 ngày</option>
                    <option value="15">15 ngày</option>
                    <option value="30">30 ngày</option>
                    <option value="60">60 ngày</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="st-alert" className={labelClass}>
                    Thời gian lưu video cảnh báo
                  </label>
                  <select
                    id="st-alert"
                    className={selectClass}
                    value={storage.alertRetentionDays}
                    onChange={(e) =>
                      setStorage((s) => ({ ...s, alertRetentionDays: e.target.value }))
                    }
                  >
                    <option value="30">30 ngày</option>
                    <option value="60">60 ngày</option>
                    <option value="90">90 ngày</option>
                    <option value="180">180 ngày</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="st-res" className={labelClass}>
                    Độ phân giải lưu trữ
                  </label>
                  <select
                    id="st-res"
                    className={selectClass}
                    value={storage.resolution}
                    onChange={(e) => setStorage((s) => ({ ...s, resolution: e.target.value }))}
                  >
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                    <option value="1440p">1440p</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="st-auto" className={labelClass}>
                    Tự động xóa dữ liệu cũ
                  </label>
                  <select
                    id="st-auto"
                    className={selectClass}
                    value={storage.autoDelete}
                    onChange={(e) => setStorage((s) => ({ ...s, autoDelete: e.target.value }))}
                  >
                    <option value="on">Bật</option>
                    <option value="off">Tắt</option>
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'logs' ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-3 shadow-sm">
                <div className="relative min-w-[200px] flex-1">
                  <i
                    className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#94a3b8]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    placeholder="Tìm theo người dùng, hành động"
                    className="w-full rounded-lg border border-border bg-white py-2 pr-3 pl-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyLogFilters()
                    }}
                  />
                </div>
                <select
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  value={logAction}
                  onChange={(e) => {
                    setLogAction(e.target.value)
                    setAppliedLogFilters((f) => ({ ...f, action: e.target.value }))
                    setLogPage(1)
                  }}
                >
                  {LOG_ACTION_OPTIONS.map((o) => (
                    <option key={o.value || 'all'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  value={logDate}
                  onChange={(e) => {
                    setLogDate(e.target.value)
                    setAppliedLogFilters((f) => ({ ...f, date: e.target.value }))
                    setLogPage(1)
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (filteredLogs.length === 0) showToast('Không có dữ liệu để xuất', 'error')
                    else showToast('Đã chuẩn bị file xuất nhật ký (demo UI)', 'success')
                  }}
                >
                  <i className="fa-solid fa-download mr-1.5" aria-hidden="true" />
                  Xuất nhật ký
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[0.7rem] tracking-[0.06em] text-[#94a3b8] uppercase">
                      <th className="px-4 py-3 font-semibold">Thời gian</th>
                      <th className="px-4 py-3 font-semibold">Người thực hiện</th>
                      <th className="px-4 py-3 font-semibold">Hành động</th>
                      <th className="px-4 py-3 font-semibold">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-text-muted">
                          Không có bản ghi phù hợp
                        </td>
                      </tr>
                    ) : (
                      logRows.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b border-border/70 last:border-0 hover:bg-[#fafbfc]"
                        >
                          <td className="px-4 py-3.5 text-text-muted">{log.time}</td>
                          <td className="px-4 py-3.5 font-medium text-text-main">{log.actor}</td>
                          <td className="px-4 py-3.5 text-text-main">{log.action}</td>
                          <td className="px-4 py-3.5 text-text-muted">{log.detail}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
                <span>
                  Hiển thị {from}-{to} trong tổng {LOG_TOTAL_COUNT.toLocaleString('vi-VN')} bản ghi
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeLogPage <= 1}
                    onClick={() => setLogPage((p) => p - 1)}
                  >
                    Trước
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLogPage(n)}
                      className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-none text-sm font-semibold ${
                        n === safeLogPage
                          ? 'bg-danger text-white'
                          : 'bg-transparent text-text-muted hover:bg-slate-100'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeLogPage >= totalPages}
                    onClick={() => setLogPage((p) => p + 1)}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ContentSection>
  )
}
