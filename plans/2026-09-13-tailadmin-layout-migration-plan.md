# TailAdmin Layout Migration Plan

Created: 2026-09-13 07:00:00

## Objective
Rombak layout dan komponen aplikasi bikin-stiker-admin agar menggunakan TailAdmin (free-nextjs-admin-dashboard v2.3.0): sidebar collapsible + header sticky lengkap dengan search redirect, lonceng notifikasi, user dropdown, font Outfit + ThemeContext penuh, dan semua tabel/filter dashboard ke gaya TailAdmin — tanpa mengubah logic Supabase, RSC, next-intl (id/en), dan middleware auth.

## Scope
- Shell: SidebarProvider + AppSidebar + AppHeader + Backdrop + AdminShell (locale-aware)
- Tema penuh TailAdmin: font Outfit, ThemeContext (localStorage), token brand/gray, utilitas menu-item
- Header: toggle sidebar, search ⌘K redirect ke filter, ThemeToggleButton, NotificationDropdown (lonceng), UserDropdown (email + Sign Out Supabase), LocaleSwitcher compact
- Tabel sekaligus: Users, LLM Config (list+card), LLM Logs, Presets (list+card) → ui/table TailAdmin
- Dashboard: 4 metric cards + 2 panel gaya TailAdmin + breadcrumb/page-header
- Form/auth: ui/modal, ui/dropdown, ui/alert untuk form preset/LLM-config; restyle login + unauthorized
- Yang TIDAK dibawa: fullcalendar, apexcharts, jvectormap, swiper, react-dnd, react-dropzone, halaman demo ecommerce/calendar/profile, SidebarWidget promo

## Milestones
1. Fase 0 — Fondasi (deps, font, context, globals.css)
2. Fase 1 — Shell lengkap (sidebar + header + notifikasi)
3. Fase 2 — Semua tabel + filter sekaligus
4. Fase 3 — Dashboard metric-cards + breadcrumb
5. Fase 4 — Form/modal/alert + login/unauthorized
6. Fase 5 — Bersih-bersih + verifikasi + memori

## Tasks
- [x] Fase 0: tambah @tailwindcss/forms, ganti Geist→Outfit, port ThemeContext + SidebarContext, merge globals.css (brand-*, menu-item, no-scrollbar). @svgr/webpack tidak jadi dipakai (tetap lucide-react)
- [x] Fase 1: buat AdminShell + AppSidebar (grup MENU/MANAJEMEN, strip locale di isActive) + AppHeader (search redirect, lonceng, user) + Backdrop; tipiskan AdminGroupLayout
- [x] Fase 1: NotificationDropdown baca ringkasan Supabase (generasi gagal 24 jam terakhir + 5 gagal terbaru) + UserDropdown (email + sign out Supabase)
- [x] Fase 2: port ui/table + TailBadge, terapkan ke Users, LLM Logs, LLM Config (list+card), Presets (list+card); restyle semua FilterBar ke input/select TailAdmin (tetap URL searchParams + RSC force-dynamic)
- [x] Fase 3: ubah kartu ringkasan + panel Recent/By Provider ke metric-card TailAdmin + PageBreadcrumb di semua halaman
- [x] Fase 4: port ui/modal + ui/dropdown + ui/alert; DeleteButton pakai modal konfirmasi; semua toast form diganti Alert; restyle login + unauthorized gaya auth TailAdmin
- [x] Fase 5: hapus admin-sidebar.tsx/theme-provider.tsx/theme-toggle.tsx/locale-switcher.tsx/ui lama (button/card/input/label), uninstall next-themes + class-variance-authority, update messages/id.json + en.json (nav.menu/manage, common.home), lint + build lolos, tulis entri .memory/
- [x] Verifikasi: desktop 1440px (sidebar expand/collapse, header lengkap, semua tabel + dashboard data real), dark mode (gray-900 + Outfit), lonceng (5 notifikasi real), login/unauthorized 200. Mobile 390px + locale EN terverifikasi 2026-09-13 sore (lihat Progress Log)

## Risks
- Locale prefix (/id, /en) memecahkan isActive TailAdmin (path === pathname selalu false) → helper stripLocale + buildLocaleHref
- Migrasi next-themes → ThemeContext berisiko flicker/FOUC → script blocking di layout + default light + sinkronisasi localStorage
- Token CSS lama (HSL) vs TailAdmin (brand-*/gray-*, dark:) bertabrakan → merge bertahap, petakan --primary ke brand-*, jangan hapus variabel lama sebelum cek dark mode
- AdminShell client + halaman RSC force-dynamic → jangan fetch Supabase di shell; oper userEmail sebagai prop
- Bundle membengkak jika semua demo TailAdmin ikut → hanya port file yang dipakai, catat atribusi MIT TailAdmin di header file

## Progress Log
- 2026-09-13 07:00:00 — Plan dibuat dari analisa kode + referensi TailAdmin v2.3.0; keputusan user: (1) shell lengkap, (2) ikut penuh Outfit+ThemeContext, (3) search redirect + lonceng perlu, (4) semua tabel sekaligus; mode berubah plan→build, eksekusi dimulai
- 2026-09-13 12:13:00 — SEMUA FASE SELESAI. Lint bersih, build lolos (13 routes). Verifikasi visual dev-server: dashboard (4 metrik live: 15 users, 286 generasi, 95%, 141 kredit), users (20 users, paginasi), llm-config (33 configs card view), llm-logs (439 logs), presets (51 presets), login + unauthorized. Interaksi: collapse sidebar OK, lonceng 5 notifikasi real OK, dark mode OK (gray-900 + Outfit). Perubahan: +17 file port TailAdmin (atribusi MIT), 4 filter-bar + 3 form di-restlye, file lama + next-themes/cva dihapus. Belum diuji: mobile 360px + locale EN di browser (disarankan sebelum merge). File belum di-commit (menunggu instruksi user).
- 2026-09-13 sore — VERIFIKASI LANJUTAN SELESAI (commit adc2611 sudah push). Mobile 390px: sidebar tersembunyi + konten 1 kolom OK; drawer terbuka penuh OK; navigasi dari drawer menutup otomatis OK (perbaikan: onClick closeMobile di AppSidebar, karena Link tidak menutup drawer). Locale EN: ditemukan bug pre-existing — LocaleLayout tidak memanggil setRequestLocale sehingga next-intl 4.14.1 selalu fallback ke id (login EN tampil Indonesia); diperbaiki 2 baris (setRequestLocale + locale prop di NextIntlClientProvider), terverifikasi: dashboard/menu/login EN benar, ID tidak rusak. Search header: ketik "pixazo" → redirect /id/llm-logs?q=pixazo (190 logs) OK. Semua temuan sudah diperbaiki; tinggal lint+build final, update memori, commit, push.
- 2026-09-13 malam — Perbaikan setRequestLocale mengungkap bug laten kedua: build gagal prerender /id/login ("useSearchParams() should be wrapped in a suspense boundary"). Sebelumnya tersembunyi karena halaman selalu dinamis (fallback locale). Diperbaiki sesuai solusi resmi Next.js: LoginCard (pakai useSearchParams) dibungkus React.Suspense dengan skeleton fallback. Build lolos lagi (login/unauthorized kini SSG per-locale: /id + /en), runtime /id/login + /en/login?next=/en/users 200 + EN benar. Commit lanjutan: fix + docs.

## Notes
- Referensi: TailAdmin/free-nextjs-admin-dashboard main v2.3.0 (Next 16.x, React 19, Tailwind v4) — AppSidebar w-[290px]/[90px], AppHeader sticky + ⌘K, SidebarContext, ThemeContext light|dark + localStorage, ui: alert/avatar/badge/button/dropdown/modal/table.
- Arsitektur: tidak clone repo TailAdmin; port selektif ke src/layout/, src/context/, src/components/{header,common,ui}/ agar middleware Supabase + locale routing + validasi env Zod tetap utuh.
- Keputusan tema penuh (Outfit + ThemeContext) membatalkan rekomendasi awal (pertahankan next-themes); konsekuensinya theme-provider.tsx + theme-toggle.tsx lama dihapus di Fase 5 setelah ThemeToggleButton baru stabil.
- Ikon: tetap lucide-react (tidak port src/icons + @svgr/webpack) kecuali dibutuhkan SVG spesifik TailAdmin.
