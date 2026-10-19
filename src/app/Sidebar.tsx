import { useState, type FocusEvent, type TransitionEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../shared/auth/authStore'
import { Button } from '../shared/ui/Button'
import { notifySectionShown, type AppRoute } from './useActiveSection'

// <aside class="sidebar"> (index.html:560-627). Không có mục event-server, giống bản gốc.
const NAV_ITEMS: ReadonlyArray<{ target: AppRoute; icon: string; text: string }> = [
  { target: 'dashboard', icon: 'fa-table-columns', text: 'Trung tâm điều khiển' },
  { target: 'liveview', icon: 'fa-video', text: 'Giám sát trực tuyến' },
  { target: 'playback', icon: 'fa-circle-play', text: 'Phát lại video' },
  { target: 'statistics', icon: 'fa-chart-pie', text: 'Dữ liệu giám sát' },
  { target: 'map', icon: 'fa-map-location-dot', text: 'Bản đồ trực tuyến' },
  { target: 'driver', icon: 'fa-id-card', text: 'Quản lý tài xế' },
  { target: 'vehicle', icon: 'fa-truck-front', text: 'Quản lý phương tiện' },
  { target: 'settings', icon: 'fa-gear', text: 'Cài đặt' },
]

// main.js:84-97 — sidebar co/giãn làm đổi kích thước map (Leaflet cần invalidateSize)
function triggerMapResize() {
  notifySectionShown('map')
}

function navItemClass(isActive: boolean, expanded: boolean): string {
  const base =
    'group/item relative mx-3 my-1 flex cursor-pointer items-center gap-3 overflow-hidden rounded-md border-none px-5 py-[0.85rem] text-left font-sans text-[0.95rem] transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-[768px]:border-b-4 max-[768px]:border-solid max-[768px]:p-4 max-[768px]:text-[0.9rem]'
  const state = isActive
    ? 'active bg-[linear-gradient(135deg,var(--color-primary)_0%,#1d82b8_100%)] font-semibold text-white shadow-glow-primary max-[768px]:border-b-primary'
    : 'bg-transparent text-sidebar-text hover:bg-primary/8 hover:text-primary max-[768px]:border-transparent'
  // .sidebar:not(:hover) .nav-item (styles2.css:1677-1690)
  const collapsed = expanded
    ? isActive
      ? ''
      : 'hover:translate-x-1'
    : 'min-[769px]:mx-auto min-[769px]:size-[50px] min-[769px]:justify-center min-[769px]:p-0'
  return `${base} ${state} ${collapsed}`
}

export function Sidebar({ active, onLogoutClick }: { active: AppRoute | 'login'; onLogoutClick: () => void }) {
  const navigate = useNavigate()
  const username = useAuthStore((s) => s.username)
  const [hovered, setHovered] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  // :hover (và :focus-within để bàn phím dùng được) -> giãn rộng trên desktop
  const expanded = hovered || focusWithin

  const onMouseEnter = () => {
    setHovered(true)
    setTimeout(triggerMapResize, 220)
  }
  const onMouseLeave = () => {
    setHovered(false)
    setTimeout(triggerMapResize, 220)
  }
  const onTransitionEnd = (e: TransitionEvent<HTMLElement>) => {
    if (e.propertyName === 'width') triggerMapResize()
  }
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false)
  }

  const fadeWhenCollapsed = expanded
    ? 'opacity-100'
    : 'min-[769px]:pointer-events-none min-[769px]:opacity-0'

  return (
    <aside
      className={`sidebar z-10 flex shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-text shadow-[2px_0_5px_rgba(0,0,0,0.05)] transition-[width] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] max-[768px]:w-full max-[768px]:flex-row max-[768px]:items-center max-[768px]:justify-between max-[768px]:overflow-x-auto max-[768px]:shadow-[0_4px_6px_rgba(0,0,0,0.1)] ${
        expanded ? 'w-[250px]' : 'w-[250px] min-[769px]:w-[76px]'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTransitionEnd={onTransitionEnd}
      onFocus={() => setFocusWithin(true)}
      onBlur={onBlur}
    >
      <div className="border-b border-border p-6 max-[768px]:border-r max-[768px]:border-b-0 max-[768px]:px-4 max-[768px]:py-3">
        <h2
          className={`text-xl font-bold tracking-[0.5px] text-primary transition-opacity duration-250 max-[768px]:text-[1.1rem] ${fadeWhenCollapsed}`}
        >
          <img src="/images/logo-Gtel-GEIC.png" alt="Logo" width="200" height="70" className="max-w-none" />
        </h2>
      </div>
      <nav
        className={`flex flex-1 flex-col py-4 max-[768px]:flex-row max-[768px]:overflow-x-auto max-[768px]:p-0 max-[768px]:whitespace-nowrap ${
          expanded ? '' : 'min-[769px]:items-center'
        }`}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = item.target === active
          return (
            <button
              key={item.target}
              type="button"
              className={navItemClass(isActive, expanded)}
              data-target={item.target}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => void navigate({ to: `/${item.target}` })}
            >
              <i
                className={`fa-solid ${item.icon} nav-short hidden size-8 shrink-0 items-center justify-center rounded-[10px] font-bold tracking-[0.5px] min-[769px]:inline-flex ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-primary/10 text-sidebar-text group-hover/item:bg-primary/20 group-hover/item:text-primary'
                }`}
                aria-hidden="true"
              ></i>
              <span className={`nav-text whitespace-nowrap ${expanded ? '' : 'min-[769px]:hidden'}`}>{item.text}</span>
            </button>
          )
        })}
      </nav>
      <div className="flex items-center justify-between border-t border-border p-6 max-[768px]:border-t-0 max-[768px]:border-l max-[768px]:px-4 max-[768px]:py-3">
        <div className="user-info-section">
          {/* main.js:49 textContent = username (chuỗi hiển thị nguyên văn) */}
          <div
            id="user-info"
            className={`text-sm font-medium text-sidebar-text transition-opacity duration-250 max-[768px]:hidden ${fadeWhenCollapsed}`}
          >
            {username}
          </div>
        </div>
        <Button
          id="logout-btn"
          variant="danger"
          size="sm"
          className={fadeWhenCollapsed}
          onClick={onLogoutClick}
        >
          Đăng xuất
        </Button>
      </div>
    </aside>
  )
}
