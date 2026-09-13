# Project Memory

Last updated: 2026-09-13 12:13:00
Format version: 1

## Current State
- Aplikasi bikin-stiker-admin sudah dimigrasi penuh ke layout/komponen TailAdmin (free-nextjs-admin-dashboard v2.3.0, MIT).
- Shell: AppSidebar (MENU/MANAJEMEN, collapsible 290/90px) + AppHeader sticky (search ⌘K redirect, locale ID/EN, theme, lonceng, user) + Backdrop + AdminShell.
- Tema penuh: font Outfit, ThemeContext (light|dark + localStorage), token brand/gray/success/error/warning, utilitas menu-item.
- 4 halaman tabel (Users, LLM Config, LLM Logs, Presets) + dashboard + login/unauthorized sudah gaya TailAdmin; logic Supabase/RSC/next-intl/middleware tidak berubah.
- `npm run lint` bersih, `npm run build` lolos (13 routes). Verifikasi visual dev-server dengan data real selesai.
- Perubahan belum di-commit (menunggu instruksi user).

## Active Decisions
- Port selektif TailAdmin (tidak clone repo): file di `src/layout/`, `src/context/`, `src/components/{header,common,ui}/` dengan atribusi MIT di header file — agar middleware Supabase + locale routing + validasi env Zod tetap utuh. Lihat `.memory/2026-09-13/121300-tailadmin-layout-migration.md`.
- next-themes + class-variance-authority dihapus; ikon tetap lucide-react (tanpa @svgr/webpack); SidebarWidget promo TailAdmin tidak dibawa.
- Locale prefix ditangani helper `stripLocale`/`buildLocaleHref`/`isActivePath` (`src/lib/locale-href.ts`).
- Badge lama (`default/secondary/outline/destructive`) dipertahankan sebagai wrapper kompatibel di atas TailBadge.

## Open Items / Blockers
- Uji mobile 360px (sidebar overlay + backdrop) di browser sebelum merge — belum sempat diverifikasi.
- Uji locale EN di browser sebelum merge — verifikasi visual baru memakai locale ID.
- Commit perubahan menunggu instruksi eksplisit user.

## Legacy Archive
- Tidak ada `PROJECT_MEMORY.md` — ini memori awal proyek.

## Recent Entries
- [2026-09-13 TailAdmin layout migration](2026-09-13/121300-tailadmin-layout-migration.md)
