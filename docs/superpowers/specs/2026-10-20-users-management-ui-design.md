# Quản lý người dùng (SRS 3.2) — UI Design Spec

**Date:** 2026-10-20  
**Scope:** UI/UX only — list + in-app modals; mock data; no API  
**Status:** Approved for implementation

## Goal

Build the **Quản lý người dùng** page at `/users` matching SRS §3.2.1–3.2.3 flows: list with search/filters/actions, create/edit forms, and confirm dialogs for deactivate, delete, and reset password.

## Decisions

| Topic | Choice |
| --- | --- |
| Scope | List + all in-app modals (not activation email page) |
| Persona | Demo toggle Super Admin ↔ Quản trị DN |
| Approach | New `features/users` module + local mock store |
| Visual | Align with Gtel sidebar (danger/red accents on primary CTAs where appropriate); reuse `Modal` / `Button` / `ContentSection` |

## Out of scope

- Real API / auth / permission enforcement
- First-time activation page (`/activate`)
- Real Excel generation (stub download or toast is enough)
- Role/permission matrix editor (3.4)

## Architecture

```
features/users/
  UsersSection.tsx          # page shell
  mockData.ts               # seed users, roles, enterprises
  store.ts                  # zustand or useState lift — filter + CRUD mock
  lib.ts                    # filter, page, status labels
  components/
    UsersToolbar.tsx
    UsersTable.tsx
    UserFormModal.tsx       # create + edit
    ConfirmDeactivateModal.tsx
    ConfirmDeleteModal.tsx
    ResetPasswordModal.tsx
AppShell: UsersSection for active==='users'; remove users from stub Placeholder list
```

## List screen

- Header: title, persona toggle, Xuất danh sách, Thêm người dùng
- Toolbar: search, role, status; enterprise filter if Super Admin
- Table 10/page: user (avatar+name), username, email, enterprise (SA), roles, status badge, last login, actions
- Status badges: Đang hoạt động / Vô hiệu hóa / Bị khóa / Chờ kích hoạt
- Client-side filter + pagination on mock array

## Modals (SRS-aligned)

| Modal | Fields / content | Primary action |
| --- | --- | --- |
| Thêm người dùng | Họ tên*, Username*, Email*, SĐT, Doanh nghiệp*, Vai trò* (multi) | Tạo người dùng → toast, add to mock as “Chờ kích hoạt” |
| Sửa | Same; username read-only | Lưu thay đổi |
| Vô hiệu hóa | Confirm copy | Vô hiệu hóa |
| Xóa | Confirm copy | Xóa (remove from mock) |
| Đặt lại MK | Avatar, name, email | Gửi liên kết → toast |

Disable reset when status is Vô hiệu hóa (SRS). Persona toggle hides Super Admin role option for DN admin.

## Success criteria

1. `/users` shows full list UI with working client filters/pagination on mock data.
2. All five modal flows open/close and update mock state.
3. Persona toggle shows/hides enterprise column and filter.
4. No backend calls.
