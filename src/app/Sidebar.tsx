import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../shared/auth/authStore'
import { Button } from '../shared/ui/Button'
import { NAV_GROUPS } from './navConfig'
import { notifyNavItemClick, type AppRoute } from './useActiveSection'

function itemClass(isActive: boolean): string {
  const base =
    'group/item relative mx-3 flex w-[calc(100%-1.5rem)] cursor-pointer items-center gap-3 rounded-xl border-none px-3.5 py-2.5 text-left font-sans text-[0.9rem] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger'
  return isActive
    ? `${base} bg-[#fce8eb] font-semibold text-danger`
    : `${base} bg-transparent font-medium text-[#64748b] hover:bg-[#f8fafc] hover:text-[#334155]`
}

/**
 * Sidebar khớp mock Gtel DASHCAM VMS: 3 nhóm tĩnh, active pill đỏ nhạt.
 */
export function Sidebar({ active, onLogoutClick }: { active: AppRoute | 'login'; onLogoutClick: () => void }) {
  const navigate = useNavigate()
  const username = useAuthStore((s) => s.username)

  return (
    <aside className="sidebar z-10 flex w-[260px] shrink-0 flex-col overflow-hidden border-r border-[#eef2f6] bg-white text-sidebar-text max-[768px]:w-full max-[768px]:flex-row max-[768px]:items-center max-[768px]:overflow-x-auto max-[768px]:border-r-0 max-[768px]:border-b">
      <div className="border-b border-[#eef2f6] px-5 pt-5 pb-4 max-[768px]:border-r max-[768px]:border-b-0 max-[768px]:px-4 max-[768px]:py-3">
        <div className="flex flex-col gap-1">
          <img
            src="/images/logo-Gtel-GEIC.png"
            alt="Gtel GEIC"
            width="160"
            height="56"
            className="max-w-[160px]"
          />
          <p className="m-0 text-[0.65rem] font-semibold tracking-[0.14em] text-[#94a3b8] uppercase">
            Dashcam VMS
          </p>
        </div>
      </div>

      <nav
        className="flex flex-1 flex-col overflow-y-auto px-0 py-4 max-[768px]:flex-row max-[768px]:overflow-x-auto max-[768px]:py-0"
        aria-label="Điều hướng chính"
      >
        {NAV_GROUPS.map((group, groupIndex) => (
          <div
            key={group.id}
            className={`max-[768px]:flex max-[768px]:shrink-0 max-[768px]:items-center ${groupIndex > 0 ? 'mt-5 max-[768px]:mt-0 max-[768px]:ml-4' : ''}`}
          >
            <div className="mx-5 mb-2 text-[0.68rem] font-semibold tracking-[0.12em] text-[#94a3b8] uppercase max-[768px]:mr-2 max-[768px]:mb-0">
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5 max-[768px]:flex-row">
              {group.items.map((item) => {
                const isActive = item.target === active
                return (
                  <button
                    key={item.target}
                    type="button"
                    className={itemClass(isActive)}
                    data-target={item.target}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      void navigate({ to: `/${item.target}` })
                      notifyNavItemClick(item.target)
                    }}
                  >
                    <i
                      className={`${item.icon} w-5 shrink-0 text-center text-[0.95rem] ${isActive ? 'text-danger' : 'text-[#94a3b8] group-hover/item:text-[#64748b]'}`}
                      aria-hidden="true"
                    />
                    <span className="nav-text whitespace-nowrap">{item.text}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-3 border-t border-[#eef2f6] px-5 py-4 max-[768px]:border-t-0 max-[768px]:border-l max-[768px]:px-4 max-[768px]:py-3">
        <div id="user-info" className="truncate text-sm font-medium text-[#64748b] max-[768px]:hidden">
          {username}
        </div>
        <Button id="logout-btn" variant="outline" size="sm" onClick={onLogoutClick}>
          Đăng xuất
        </Button>
      </div>
    </aside>
  )
}
