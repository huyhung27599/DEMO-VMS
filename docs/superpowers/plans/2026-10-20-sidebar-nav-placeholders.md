# Sidebar Nav + Placeholders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild always-wide grouped sidebar and wire stub placeholder pages for new SRS routes while keeping existing real sections.

**Architecture:** Extend flat `APP_ROUTES`, add `navConfig` + `PlaceholderSection`, rewrite `Sidebar`, update `AppShell`.

**Tech Stack:** React 19, TanStack Router, Tailwind 4, Font Awesome (existing).

## Global Constraints

- Flat route ids only (`reports-trips`, not nested paths).
- Hybrid content: real sections unchanged; stubs = title + description + “Đang phát triển”.
- No hover-expand rail; always ~256px wide.
- Omit `event-server` and `statistics` from primary nav.
- Working dir: `frontend-reactjs/`.

---

### Task 1: Routes + nav config + PlaceholderSection

**Files:**
- Modify: `src/app/useActiveSection.ts`
- Create: `src/app/navConfig.ts`
- Create: `src/app/PlaceholderSection.tsx`

- [ ] Add stub ids to `APP_ROUTES` / `VALID_ROUTES`
- [ ] Export `NAV_GROUPS`, `PLACEHOLDER_PAGES`, helpers
- [ ] Implement `PlaceholderSection({ routeId, hidden })`

---

### Task 2: Sidebar rewrite + AppShell

**Files:**
- Modify: `src/app/Sidebar.tsx`
- Modify: `src/app/AppShell.tsx`
- Test: light smoke in existing router/auth tests if needed

- [ ] Accordion groups, always-wide, logo + logout
- [ ] AppShell renders placeholders for stub routes

---

### Task 3: Tests + commit

- [ ] Add `src/app/Sidebar.test.tsx` (groups, navigate to stub, placeholder text)
- [ ] Run `npm test -- src/app`
- [ ] Commit
