# New Sidebar + Placeholder Pages — Design Spec

**Date:** 2026-10-20  
**Scope:** Rebuild VMS sidebar IA (SRS-grouped) + stub pages for new routes; keep existing real sections  
**Status:** Approved for planning

## Goal

Replace the hover-expand flat sidebar with an always-wide, accordion-grouped nav aligned to SRS VMS features. New menu items open simple placeholder pages (title + text). Existing feature screens keep working on their current routes.

## Decisions

| Topic | Choice |
| --- | --- |
| Menu IA | SRS-grouped: Tổng quan / Giám sát / Báo cáo / Quản lý / Cài đặt |
| Page content | Hybrid — real sections where they exist; stubs for new routes |
| Sidebar behavior | Always-wide (~256px), collapsible groups (no hover-expand rail) |
| Implementation | Rebuild `Sidebar` + extend route registry / AppShell wiring |

## Out of scope

- Implementing real UIs for reports, devices, users, roles, audit, static images, AI events
- Role-based menu filtering
- Full mobile nav redesign (desktop-first; existing max-width tweaks OK)
- Showing `event-server` in the primary nav (remains omitted; route may stay reachable)

## Architecture

```
AppShell
├── Sidebar (grouped accordion)
└── main
    ├── existing *Section (hidden unless active)
    └── PlaceholderSection(s) for stub routes
```

- Extend `APP_ROUTES` / `VALID_ROUTES` and TanStack router paths.
- Keep “all sections mounted + `hidden`” pattern for real features.
- Stubs: either one `PlaceholderSection` driven by active route metadata, or thin wrappers — prefer a single shared component + route→meta map.

## Nav map

| Group | Label | Route | Content |
| --- | --- | --- | --- |
| Tổng quan | Trung tâm điều khiển | `/dashboard` | Real |
| Giám sát | Giám sát trực tuyến | `/liveview` | Real |
| Giám sát | Bản đồ trực tuyến | `/map` | Real |
| Giám sát | Phát lại video | `/playback` | Real |
| Giám sát | Ảnh tĩnh | `/static-images` | Stub |
| Giám sát | Video sự kiện AI | `/ai-events` | Stub |
| Báo cáo | Báo cáo hành trình | `/reports-trips` | Stub |
| Báo cáo | Báo cáo tốc độ | `/reports-speed` | Stub |
| Báo cáo | Thời gian lái liên tục | `/reports-driving-time` | Stub |
| Báo cáo | Dừng, đỗ | `/reports-stops` | Stub |
| Báo cáo | Báo cáo tổng hợp | `/reports-summary` | Stub |
| Báo cáo | Hành vi AI | `/reports-ai-behavior` | Stub |
| Quản lý | Quản lý tài xế | `/driver` | Real |
| Quản lý | Quản lý phương tiện | `/vehicle` | Real |
| Quản lý | Quản lý thiết bị | `/devices` | Stub |
| Cài đặt | Ngưỡng cảnh báo / Cài đặt | `/settings` | Real |
| Cài đặt | Người dùng | `/users` | Stub |
| Cài đặt | Phân quyền | `/roles` | Stub |
| Cài đặt | Nhật ký Audit | `/audit` | Stub |

**Not in nav:** `statistics` (legacy “Dữ liệu giám sát”), `event-server`. Routes may remain registered if other code links them; primary IA uses Báo cáo stubs instead of promoting `statistics`.

## Sidebar UI

- Width fixed ~256px; light surface; primary accent for active item.
- Group header: title + chevron; toggles expand/collapse.
- Default: expand group containing the active route; others may start collapsed (or expand Tổng quan + active group on first load).
- Nav item: Font Awesome icon + label; `aria-current="page"` when active.
- Header: existing logo.
- Footer: username + Đăng xuất → existing `LogoutConfirmModal`.
- Remove hover-expand / icon-rail width animation.

## Placeholder page

Shared component props: `{ title: string; description: string }`.

Layout: main content padding, page title, short description (SRS-aligned one-liner), muted badge/text “Đang phát triển”.

No tables, charts, or API calls.

## Routing & AppShell

- Add stub route ids to `APP_ROUTES` as **flat ids** matching paths (`static-images`, `ai-events`, `reports-trips`, `reports-speed`, `reports-driving-time`, `reports-stops`, `reports-summary`, `reports-ai-behavior`, `devices`, `users`, `roles`, `audit`) so `currentRoute(pathname)` stays a single-segment lookup.
- `Sidebar` navigates with `navigate({ to: \`/${id}\` })` and calls existing `notifyNavItemClick` where applicable for real sections.
- Update `AppShell` to render placeholders for stub actives.

## Testing

- Sidebar renders five groups and lists expected items.
- Clicking a stub route shows placeholder title.
- Clicking `/dashboard`, `/liveview`, etc. still shows real sections (smoke).
- Active item / open group reflect current path.
- Logout control still opens confirm modal.

## Success criteria

1. New grouped sidebar is the primary app nav on desktop.
2. All mapped stub routes show placeholder text pages.
3. Existing real feature pages remain reachable and functional via the new nav.
4. Hover-expand rail behavior is gone.
