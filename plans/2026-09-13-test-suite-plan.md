# Test Suite Plan (Vitest)

Created: 2026-09-13 malam

## Objective
Menambahkan test suite Vitest ke bikin-stiker-admin untuk menjaga regresi pada helper, server action, middleware, dan komponen — tanpa mengubah logic produksi. Keputusan user: (1) framework Vitest, (2) cakupan Fase 1–3, (3) E2E Playwright masuk TODO, (4) `npm test` ditambahkan ke verification gate.

## Scope
- Fase 1: setup Vitest (2 project: unit/node + component/jsdom), stub `server-only`, alias `@`, scripts test; unit test pure helpers (locale-href, env, header-notifications)
- Fase 2: server action tests (presets, llm-config) — validasi, pemetaan payload, security (api_key kosong tidak ikut update)
- Fase 3: middleware test (locale redirect, auth gate, whitelist) + component tests (Badge, Pagination, Alert, PromptCell, UserFilterBar, UserDropdown, NotificationDropdown, SidebarContext) dengan next-intl messages/id.json asli
- Gates: `npm run lint`, `npm test`, `npm run build`
- Yang TIDAK dites: fungsi data inline di halaman (tidak diekspor), class CSS TailAdmin, key messages per-item

## Milestones
1. Setup + unit pure (Fase 1)
2. Server actions (Fase 2)
3. Middleware + komponen (Fase 3)
4. Gates + dokumen + commit

## Tasks
- [x] Fase 1: install deps (vitest 3.2.4, jsdom, @testing-library/* — @vitejs/plugin-react dilepas karena vite-nya bentrok tipe dengan vite bawaan vitest; esbuild + jsx react-jsx sudah cukup), vitest.config.ts (2 project unit/component, alias @ + stub server-only), tests/setup.ts, stub server-only, scripts npm test + test:watch
- [x] Fase 1: locale-href.test.ts (stripLocale/buildLocaleHref/isActivePath), env.test.ts (isAdminEmail + fix trim input di src/env.ts), header-notifications.test.ts (env kosong, error → [], summary, slice, time bucket)
- [x] Fase 2: presets-actions.test.ts (field wajib, payload mapping, WithState success/fail), llm-config-actions.test.ts (whitelist route_scope/fallback_policy, JSON invalid, api_key kosong tidak masuk payload, is_active "true")
- [x] Fase 3: middleware.test.ts (locale redirect, accept-language, no user → login?next, non-admin → unauthorized, skip login/unauthorized/aset)
- [x] Fase 3: component tests — badge, pagination, alert, prompt-cell, user-filter-bar, user-dropdown, notification-dropdown, sidebar-context (+ helper renderWithIntl dengan messages/id.json asli; smoke diagnostik dihapus)
- [x] README: verifikasi wajib = lint + test + build; TODO E2E Playwright smoke (login, locale-switch, search redirect, mobile drawer, dark mode)
- [x] Gates: npm run lint + npm test (14 files/72 tests) + npm run build lolos; memori + commit

## Risks
- Vitest + Next 16/React 19: perlu cek versi plugin/RTL saat instalasi; fallback Jest mudah karena API mirip
- next/cache + next/navigation + @supabase/* wajib di-mock; kalau lupa, test gagal dengan error Next bukan bug kode
- env.ts mengeksekusi getEnv() saat import → test pakai vi.resetModules + dynamic import
- startTransition di test: callback dieksekusi sinkron oleh React, router.push tetap terpanggil
- Tanpa CI runner, test hanya manual — manfaat penuh setelah `npm test` jadi gate

## Progress Log
- 2026-09-13 malam — Plan dibuat dari proposal + keputusan user (Vitest, Fase 1–3, Playwright → TODO, npm test jadi gate); eksekusi dimulai
- 2026-09-13 malam — SELESAI. 14 files/72 tests hijau. Temuan saat implementasi: (1) vitest 5 butuh @types/node ≥22 vs repo ^20 → pakai vitest 3.2.4; (2) setupFiles + globals root tidak diwarisi projects → setupFiles per-project + cleanup eksplisit; (3) vi.resetModules bukan Promise; (4) next-intl/server menolak node env → mock translator; (5) mock Supabase butuh .select() di chain; (6) isAdminEmail tidak trim input → fix 1 baris src/env.ts; (7) type-check Next (via build) menangkap 3 error TS yang lolos esbuild — termasuk @vitejs/plugin-react v6 (vite rolldown) bentrok tipe dengan vite vitest 3 → plugin dilepas. Playwright tetap TODO.

## Notes
- Referensi struktur: tests/unit (node env) + tests/component (jsdom env), stub di tests/stubs.
- Component tests membungkus NextIntlClientProvider dengan messages/id.json asli — sekaligus menjaga validitas key i18n yang dipakai komponen.
- Middleware test mem-mock next/server + @supabase/ssr + @/lib/supabase/middleware dan memakai fakeNextUrl (URL instance + clone()).
