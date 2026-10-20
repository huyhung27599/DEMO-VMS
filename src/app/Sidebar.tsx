import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../shared/auth/authStore'
import { Button } from '../shared/ui/Button'
import { groupIdForRoute, NAV_GROUPS } from './navConfig'
import { notifyNavItemClick, type AppRoute } from './useActiveSection'

function itemClass(isActive: boolean): string {
  const base =
    'group/item relative mx-2 flex w-[calc(100%-1rem)] cursor-pointer items-center gap-3 rounded-lg border-none px-3 py-2.5 text-left font-sans text-[0.9rem] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
  return isActive
    ? `${base} bg-[linear-gradient(135deg,var(--color-primary)_0%,#1d82b8_100%)] font-semibold text-white shadow-glow-primary`
    : `${base} bg-transparent text-sidebar-text hover:bg-primary/8 hover:text-primary`
}

export function Sidebar({ active, onLogoutClick }: { active: AppRoute | 'login'; onLogoutClick: () => void }) {
  const navigate = useNavigate()
  const username = useAuthStore((s) => s.username)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    const activeGroup = groupIdForRoute(active)
    for (const g of NAV_GROUPS) {
      initial[g.id] = g.id === 'overview' || g.id === activeGroup
    }
    return initial
  })

  useEffect(() => {
    const gid = groupIdForRoute(active)
    if (!gid) return
    setOpenGroups((prev) => (prev[gid] ? prev : { ...prev, [gid]: true }))
  }, [active])

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside className="sidebar z-10 flex w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar text-sidebar-text shadow-[2px_0_5px_rgba(0,0,0,0.04)] max-[768px]:w-full max-[768px]:flex-row max-[768px]:items-center max-[768px]:overflow-x-auto max-[768px]:border-r-0 max-[768px]:border-b max-[768px]:shadow-[0_4px_6px_rgba(0,0,0,0.08)]">
      <div className="border-b border-border px-5 py-5 max-[768px]:border-r max-[768px]:border-b-0 max-[768px]:px-4 max-[768px]:py-3">
        <h2 className="m-0 text-xl font-bold tracking-[0.5px] text-primary max-[768px]:text-[1.1rem]">
          <img src="/images/logo-Gtel-GEIC.png" alt="Logo" width="180" height="63" className="max-w-none" />
        </h2>
      </div>

      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto py-3 max-[768px]:flex-row max-[768px]:overflow-x-auto max-[768px]:py-0"
        aria-label="Điều hướng chính"
      >
        {NAV_GROUPS.map((group) => {
          const open = openGroups[group.id] ?? false
          const panelId = `nav-group-${group.id}`
          return (
            <div key={group.id} className="px-1 max-[768px]:flex max-[768px]:shrink-0 max-[768px]:items-center">
              <button
                type="button"
                className="mx-2 flex w-[calc(100%-1rem)] cursor-pointer items-center justify-between rounded-md border-none bg-transparent px-3 py-2 text-left text-[0.7rem] font-bold tracking-[0.08em] text-[#94a3b8] uppercase hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-[768px]:w-auto"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggleGroup(group.id)}
              >
                <span>{group.label}</span>
                <i
                  className={`fa-solid fa-chevron-down text-[0.65rem] transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
                  aria-hidden="true"
                />
              </button>
              <div id={panelId} hidden={!open} className="max-[768px]:flex max-[768px]:flex-row">
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
                      <span
                        className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-primary/10 text-sidebar-text group-hover/item:bg-primary/20 group-hover/item:text-primary'
                        }`}
                        aria-hidden="true"
                      >
                        <i className={`fa-solid ${item.icon}`}></i>
                      </span>
                      <span className="nav-text whitespace-nowrap">{item.text}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 max-[768px]:border-t-0 max-[768px]:border-l max-[768px]:px-4 max-[768px]:py-3">
        <div id="user-info" className="truncate text-sm font-medium text-sidebar-text max-[768px]:hidden">
          {username}
        </div>
        <Button id="logout-btn" variant="danger" size="sm" onClick={onLogoutClick}>
          Đăng xuất
        </Button>
      </div>
    </aside>
  )
}
