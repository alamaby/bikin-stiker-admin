# Project Memory

Last updated: 2026-09-13 malam (WIB)
Format version: 1

## Current State
- Aplikasi bikin-stiker-admin sudah dimigrasi penuh ke layout/komponen TailAdmin (free-nextjs-admin-dashboard v2.3.0, MIT).
- Shell: AppSidebar (MENU/MANAJEMEN, collapsible 290/90px, auto-close drawer di mobile) + AppHeader sticky (search ⌘K redirect, locale ID/EN, theme, lonceng, user) + Backdrop + AdminShell.
- Tema penuh: font Outfit, ThemeContext (light|dark + localStorage), token brand/gray/success/error/warning, utilitas menu-item.
- 4 halaman tabel (Users, LLM Config, LLM Logs, Presets) + dashboard + login/unauthorized sudah gaya TailAdmin; logic Supabase/RSC/middleware tidak berubah; bug locale next-intl pre-existing diperbaiki (setRequestLocale).
- Migrasi utama ter-commit + push (`adc2611`, `e5d99f7`). Review-vs-plan selesai;
  perbaikan review (switchLocale, dead context/files, i18n header/filter/tabel)
  menunggu commit lanjutan ini.
- `npm run lint` bersih; `npm run build` lolos (13 routes, login/unauthorized SSG
  per-locale); verifikasi browser ID+EN+mobile selesai.

## Active Decisions
- Port selektif TailAdmin (tidak clone repo): file di `src/layout/`, `src/context/`, `src/components/{header,common,ui}/` dengan atribusi MIT di header file — agar middleware Supabase + locale routing + validasi env Zod tetap utuh. Lihat `.memory/2026-09-13/121300-tailadmin-layout-migration.md`.
- next-themes + class-variance-authority dihapus; ikon tetap lucide-react (tanpa @svgr/webpack); SidebarWidget promo TailAdmin tidak dibawa.
- Locale prefix ditangani helper `stripLocale`/`buildLocaleHref`/`isActivePath` (`src/lib/locale-href.ts`).
- Badge lama (`default/secondary/outline/destructive`) dipertahankan sebagai wrapper kompatibel di atas TailBadge.

## Open Items / Blockers
- Tidak ada blocker. Setelah commit lanjutan ini, migrasi TailAdmin selesai penuh dan siap merge.

## Legacy Archive
- Tidak ada `PROJECT_MEMORY.md` — ini memori awal proyek.

## Recent Entries
- [2026-09-13 TailAdmin layout migration](2026-09-13/121300-tailadmin-layout-migration.md)
- [2026-09-13 Follow-up: mobile + EN verification fixes](2026-09-13/followup-mobile-en-verification.md)
- [2026-09-13 Review: implementation vs plan](2026-09-13/review-tailadmin-vs-plan.md)
