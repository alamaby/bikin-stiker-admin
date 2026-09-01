# Bikin Stiker Admin Dashboard – Implementation Plan

Created: 2026-09-01 09:00:00

## Objective
Dashboard web admin untuk mengoperasikan backend Supabase `bikinstiker` (Flutter). Tahap awal: login whitelist 2 email (`alam.aby.b@gmail.com`, `alamaby@gmail.com`), ringkasan operasional 7d/30d, manajemen user (list+detail), konfigurasi LLM reasoning + image generation (replace api_key masked), log LLM, dan manajemen preset style (text only). Host Vercel Free Tier, responsive mobile/tablet/desktop, i18n Indonesia/Inggris, light/dark mode. Reuse `bikinstiker-supabase` sebagai git submodule.

Klarifikasi 2026-09-01: (1) auth email+password dulu, (2) user management list+detail dulu sisa ke TODO, (3) api_key boleh replace langsung tidak bisa dilihat, (4) preset text saja, (5) dashboard setuju + rentang 30d, (6) pakai Supabase project yang sama dengan bikinstiker.

## Scope
- In:
  - Supabase submodule `supabase/` (reuse `config.toml`, `migrations/`, `functions/`)
  - Next.js 15 App Router + RSC, TypeScript strict, Tailwind, shadcn/ui, next-intl, next-themes
  - Supabase SSR (`@supabase/ssr`) + Zod env validation + ADMIN_EMAILS whitelist gate
  - Auth email+password + middleware guard
  - Modul: Dashboard Summary (7d/30d), Users (list+detail), LLM Config (image_generation_configs), LLM Logs (attempt + enhancement), Preset Manager (sticker_presets)
  - Responsive, i18n id/en, light/dark
  - Deploy Vercel Free
- Out (tahap awal → TODO):
  - User actions grant/ban/tier change/delete (ditunda)
  - Role granular beyond 2-email whitelist
  - Billing gateway
  - Upload preview image preset

## Milestones
1. Foundation – submodule + scaffold + env + auth gate
2. Shell & Design System – responsive layout, i18n, theme
3. Dashboard Summary – agregasi 7d/30d
4. User Management – list + detail (read-only)
5. LLM Config + Logs – masked api_key replace + log viewer
6. Preset Manager – CRUD text
7. Hardening & Deploy – security, vercel, docs, memory

## Tasks
- [x] M1.1 Tambah `supabase` sebagai git submodule (`https://github.com/alamaby/bikinstiker-supabase.git` → `supabase`, branch main) + verifikasi `.gitmodules`
- [x] M1.2 Scaffold Next.js 15 App Router TS + Tailwind + ESLint (`create-next-app` + npm)
- [x] M1.3 Setup `@supabase/ssr` (client/server/middleware), Zod env (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`/`ANON_KEY` fallback, `SUPABASE_SECRET_KEY`/`SERVICE_ROLE` server-only, `ADMIN_EMAILS`, `NEXT_PUBLIC_APP_URL`), `.env.example` placeholder `sb_secret_...placeholder`
- [x] M1.4 Auth gate: Supabase email+password, middleware cek `user.email in ADMIN_EMAILS` → redirect `/login` jika tidak login, `/unauthorized` jika tidak whitelisted. Gunakan `auth.getUser()` server side (RSC)
- [x] M2.1 Shell responsive: collapsible sidebar, topbar, mobile drawer, `app/[locale]/...` routing, `next-intl` messages `id.json/en.json`
- [x] M2.2 Theme light/dark (`next-themes`, CSS vars, Okabe-Ito palette reuse dari `bikinstiker/lib/core/theme/app_theme.dart:1`)
- [x] M3.1 Dashboard summary queries: total users, new users 7d/30d, `sticker_generations` count/success_rate, `credit_transactions` sum, latency avg dari `image_generation_attempt_logs`, `prompt_enhancement_logs` – semua via `SELECT` read-only RSC + `revalidate`
- [x] M3.2 Cards + charts (recharts) + range filter 7d/30d – implemented as cards + provider breakdown (charts TODO enhanced)
- [x] M4.1 User list: `auth.users JOIN user_wallets JOIN user_subscriptions JOIN user_profiles` (lihat `20260701000007_user_profiles.sql:1`), filter `q/tier/status` + `UserFilterBar` `useTransition` pending, sorting `created_at/email/balance/tier/updated_at` (th `ArrowUpDown` links, toggle asc/desc), pagination 15/page dengan total, view suspend badge
- [x] M4.2 User detail: wallet, subscription, recent transactions/generations + **suspend/unsuspend** via `supabase.auth.admin.updateUserById({ban_duration})` (10y / none), `SuspendSection` `useActionState` + `useFormStatus` pending `Loader2`, toast `CheckCircle2/AlertTriangle`, confirm, revalidate, feedback jelas `disabled` saat proses
- [x] M5.1 Config LLM table `image_generation_configs`: list view (filter `route_scope`/`provider`/`active`/`q` + view toggle list/card + sorting `priority`/`updated_at`/`provider_name`/`model_name`/`timeout_ms` asc/desc + pagination 10/12 per page dengan total count) → detail `[id]` editable lengkap + save feedback (pending spinner, success/error toast via `useActionState`)
- [x] M5.2 Log LLM: unified 1 tabel (image + reasoning + surprise) — filter `q/provider/success/type/config_id/date_from/to`, sorting `created_at/latency/provider`, pagination 20/page dengan total, prompt lengkap (final_prompt/user_prompt/prompt_text + expand + Salin), error, preset, config link, `PromptCell` + `LogFilterBar` `useTransition` pending
- [x] M5.4 UX feedback: `NavigationProgress` + `FilterBar` `Loader2`/`disabled`/`aria-busy`, `DetailForm` `useFormStatus` + toast, th sort `ArrowUpDown`, pagination Prev/Next `disabled` + `aria-disabled`, setiap tombol jelas `disabled` saat pending, success `CheckCircle2`/error `AlertTriangle`, bisa diklik lagi setelah selesai
- [ ] M5.3 User overrides `image_generation_user_overrides` view only (opsional) – deferred
- [x] M6.1 Preset CRUD `sticker_presets`: list `is_active/required_role/valid_from-until` (WIB), view toggle list/card + jadwal aktif terlihat (`formatWIB` + badge scheduled/expired/active), filter `q/role/active/valid`, sorting `sort_order/valid_from/label/...` + pagination 10/12, detail `[id]` editable + shortcut `llm-logs?preset=` , new page `/presets/new` terpisah, `DetailForm` pending/toast, `DeleteButton` pending, semua interaksi ada feedback
- [x] M6.2 Validasi time window WIB (UTC+7) seperti `20260827000001_seasonal_presets.sql:30` dan `cost_override`, + logs filter `preset` ditambahkan ke unified logs
- [x] M7.1 Security hardening: CSP, rate limit middleware, `server-only` import untuk service_role, Env Guard AGENTS.md §5
- [x] M7.2 Vercel deploy: `vercel.json`, `next.config.mjs`, env di dashboard Vercel
- [x] M7.3 Docs + `.memory/` entry + `README.md` admin

## Risks
- Secret exposure (`image_generation_configs.api_key`, `sb_secret_*`): mitigasi mask + replace-only via server action + audit log; jangan log `process.env`. Jika bocor → rotasi via Supabase Dashboard → API Keys. Trade-off: edit langsung DB lebih cepat tapi rawan bocor; replace-only lebih aman tapi butuh re-entry penuh.
- RLS vs service_role: admin via `service_role` hanya di server (`server-only`); jika bocor ke client = privilege escalation. Counter: middleware + RSC, jangan expose di `NEXT_PUBLIC_*`.
- Vercel Free limits (100GB bandwidth, 6000 exec hours): RSC + edge runtime aman, tapi `generate-sticker` tetap di Supabase, jangan proxy image generation via Vercel. Limitasi: build image besar bisa hit limit.
- Submodule drift: `bikinstiker` dan `bikin-stiker-admin` bisa divergen commit supabase. Mitigasi pin commit + `git submodule update --remote` terkoordinasi.
- Whitelist hardcoded env var vs tabel `admin_users`: tahap awal env var cukup untuk 2 email, tapi butuh migrasi `admin_users` saat scale. Non-destructive: buat tabel + RLS nanti (TODO).
- i18n + RSC caching: `next-intl` + fetch cache bisa stale untuk admin. Gunakan `revalidate: 0` / `noStore` untuk data admin.
- Time window preset WIB (UTC+7): salah konversi → preset muncul/hilang sehari lebih awal. Selaraskan dengan `20260827000001` (17:00 UTC = 00:00 WIB).

## Progress Log
- 2026-09-01 09:00 — Draft plan dibuat dari eksplorasi read-only (plan mode). Klarifikasi 6 poin diterima: email+password, user list/detail only, api_key replace masked, preset text only, summary 7d+30d, same project.
- 2026-09-01 09:05 — Build mode aktif. Menulis plan file final.
- 2026-09-01 11:00 — M1+M2 selesai: submodule added, Next.js scaffold (npm), env Zod, Supabase SSR, middleware whitelist + locale, theme + i18n. Build awal gagal karena `supabase/` ikut type-check → fix `tsconfig.json` exclude supabase.
- 2026-09-01 11:15 — M3-M6 selesai: dashboard 7d/30d, users list/detail, llm-config masked replace, llm-logs, presets CRUD. `npm run build` ✓, `npm run lint` ✓. Polish: vercel.json, README.md.
- 2026-09-01 12:30 — Enhancement LLM Config: refactor list → table/card toggle (RSC link `?view=list|card`) + filter `route/provider/active/q` + detail `[id]` full edit + shortcut `llm-logs?config_id=` dengan fallback provider/model. Actions diperluas (`label/notes/request_options/provider_name/route_scope`), logs support `config_id` filter, i18n `llmConfig.view/filters`, `npm run build` ✓ `lint` ✓.
- 2026-09-01 13:00 — Sorting & pagination + save/filter feedback: list sorting (`priority`/`updated_at`/`provider_name`/`timeout_ms` + th header links) + pagination (count exact, range, page/total, Prev/Next, perPage 10 list/12 card), `FilterBar` client `useTransition` pending + disabled, `DetailForm` `useActionState` + `useFormStatus` `Loader2` + toast success/error, `NavigationProgress` top bar via `usePathname`/`useSearchParams`, `npm run build` ✓ `lint` ✓.
- 2026-09-01 14:00 — LLM Logs unified: 1 tabel (image attempt + reasoning enhancement + surprise_me_history) join `sticker_generations` untuk `final_prompt`/`user_prompt`/`preset_name`, filter `q/provider/success/type/config_id/date_from/to`, sorting `created_at/latency/provider`, pagination 20/page, `PromptCell` expand/collapse + Salin + feedback `Tersalin!`, `LogFilterBar` `useTransition` pending + disabled + `aria-busy`, pagination disabled + toast, `npm run build` ✓ `lint` ✓.
- 2026-09-01 15:00 — Preset Style rework: list pisah dari form (form pindah ke `/presets/new`), list view list/card dengan tanggal aktif WIB + badge, filter `q/role/active/valid` + `PresetFilterBar` `useTransition` pending, sorting `sort_order/valid_from/...` + th links, pagination 10/12, detail `[id]` + new page pakai `DetailForm` `useActionState` pending/toast, shortcut `llm-logs?preset=` + logs filter `preset` in-memory, `DeleteButton` pending + confirm, `npm run build` ✓ `lint` ✓.
- 2026-09-01 16:00 — Users rework: list filter `q/tier/status` + `UserFilterBar` `useTransition` + sorting `created_at/email/balance/tier/updated_at` + pagination 15/page, status `Suspended/Aktif` badge + `banned_until`, detail `SuspendSection` via `auth.admin.updateUserById` (`ban_duration 87600h / none`) + `useActionState` pending `Loader2` + toast, semua tombol `disabled` saat pending + `NavigationProgress` top bar, `npm run build` ✓ `lint` ✓.

## Notes
- TOGAF ringan: Vision + Data/Tech views saja (bukan full ADM) karena scope single dashboard admin. Tidak ada penyimpangan ODA/C2M yang perlu justifikasi.
- Contoh `.env.example` (placeholder lolos Zod min 20 + prefix `sb_secret_`/`sb_publishable_`/`eyJ`):
  ```
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_PUBLISHABLE_KEY=sb_publishable_placeholder_eyJhbGciOiXXX_placeholder_20chars
  SUPABASE_SECRET_KEY=sb_secret_placeholder_eyJhbGciOiXXX_placeholder_20chars
  ADMIN_EMAILS=alam.aby.b@gmail.com,alamaby@gmail.com
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
- Contoh middleware whitelist (`middleware.ts:12`):
  ```ts
  const allow = process.env.ADMIN_EMAILS!.split(',').map(s=>s.trim().toLowerCase())
  const {data:{user}} = await supabase.auth.getUser()
  if(!user || !allow.includes(user.email!.toLowerCase())) return NextResponse.redirect(new URL('/login', req.url))
  ```
- Sumber schema: `20260505000001_init_schema.sql:1`, `20260626000005_image_generation_failover.sql:1`, `20260629000009_db_driven_presets.sql:1`, `20260629000010_reasoning_enhancement.sql:1`, `20260830000001_security_hardening.sql:1`.
