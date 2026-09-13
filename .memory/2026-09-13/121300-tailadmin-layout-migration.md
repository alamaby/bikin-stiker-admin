# Migrasi Layout & Komponen ke TailAdmin

Date: 2026-09-13 12:13:00 (WIB)

## Task / Problem
Rombak layout dan komponen aplikasi agar menggunakan TailAdmin (free-nextjs-admin-dashboard v2.3.0),
sesuai 4 keputusan user: (1) shell lengkap, (2) ikut penuh Outfit + ThemeContext,
(3) search redirect ke filter + lonceng notifikasi, (4) semua tabel sekaligus.
Plan: `plans/2026-09-13-tailadmin-layout-migration-plan.md`.

## Key Files Changed
- Baru (port TailAdmin, atribusi MIT di header): `src/context/ThemeContext.tsx`,
  `src/context/SidebarContext.tsx`, `src/layout/AdminShell.tsx`, `src/layout/AppSidebar.tsx`,
  `src/layout/AppHeader.tsx`, `src/layout/Backdrop.tsx`,
  `src/components/header/UserDropdown.tsx`, `src/components/header/NotificationDropdown.tsx`,
  `src/components/common/ThemeToggleButton.tsx`, `src/components/common/PageBreadCrumb.tsx`,
  `src/components/common/ComponentCard.tsx`, `src/components/ui/dropdown/*`,
  `src/components/ui/table/index.tsx`, `src/components/ui/badge/TailBadge.tsx`,
  `src/components/ui/alert/Alert.tsx`, `src/components/ui/modal/index.tsx`,
  `src/components/tables/Pagination.tsx`, `src/components/tables/table-styles.ts`,
  `src/components/form/controls.tsx`.
- Baru (adaptasi lokal): `src/lib/locale-href.ts` (stripLocale/buildLocaleHref/isActivePath),
  `src/lib/header-notifications.ts` (gagal 24 jam + 5 gagal terbaru dari Supabase).
- Tulis ulang gaya TailAdmin (logic data tetap): dashboard `page.tsx`, users/llm-config/llm-logs/presets
  `page.tsx`, 4 filter-bar, prompt-cell, 2 detail-form, suspend-button, delete-button (modal),
  users/[id], llm-config/[id], presets/[id], presets/new, login, unauthorized.
- Hapus: `admin-sidebar.tsx`, `theme-provider.tsx`, `theme-toggle.tsx`, `locale-switcher.tsx`,
  `ui/button.tsx`, `ui/card.tsx`, `ui/input.tsx`, `ui/label.tsx`; uninstall next-themes,
  class-variance-authority; install @tailwindcss/forms.
- Config: `src/app/layout.tsx` (Outfit + ThemeProvider + SidebarProvider),
  `src/app/globals.css` (token TailAdmin + @plugin forms + menu-item utilities),
  `messages/id.json` + `en.json` (nav.menu/manage, common.home).

## Technical / Business Decisions
- Port selektif, bukan clone repo — middleware Supabase + `[locale]` routing + env Zod tetap utuh.
- next-themes diganti ThemeContext penuh (keputusan user #2); ikon tetap lucide-react.
- Search header redirect ke `/llm-logs?q=`; lonceng baca Supabase real (bukan dummy).
- Demo TailAdmin yang tidak dipakai (calendar, charts, maps, ecommerce, dsb.) sengaja tidak dibawa.
- `ui/badge.tsx` dipertahankan sebagai wrapper API lama di atas TailBadge agar detail pages tidak jebol.

## Assumptions / Risks
- Asumsi: TailAdmin free v2.3.0 (MIT) boleh di-port dengan atribusi — sudah dicantumkan di header file.
- Risiko locale-prefix vs `isActive` TailAdmin — ditangani helper locale-href, terverifikasi di browser.
- Risiko flicker tema saat migrasi next-themes → ThemeContext — tidak terlihat saat verifikasi (default light + sync localStorage).
- Sisa yang belum diuji: mobile 360px + locale EN di browser.

## Blockers / Unresolved
- Tidak ada blocker teknis. Perubahan belum di-commit (menunggu instruksi user).

## Verification
- `npm run lint` — bersih (0 error).
- `npm run build` — lolos, 13 routes (5 statis, 8 dinamis + middleware).
- Dev server + browser: dashboard (15 users, 286 generasi, 95%, 141 kredit — live),
  users (20 users + paginasi), llm-config (33 configs), llm-logs (439 logs),
  presets (51 presets), login + unauthorized (200).
- Interaksi: collapse sidebar OK, lonceng 5 notifikasi real OK, dark mode OK (gray-900 + Outfit).

## Commit Proposal
- `feat(ui): migrate layout and components to TailAdmin`

## Related
- Plan: `plans/2026-09-13-tailadmin-layout-migration-plan.md`
- Referensi: TailAdmin/free-nextjs-admin-dashboard main v2.3.0 (MIT License)
