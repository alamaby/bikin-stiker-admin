# Project Memory

Last updated: 2026-09-23 11:40:00 (WIB)
Format version: 1

## Current State
- Aplikasi bikin-stiker-admin sudah dimigrasi penuh ke layout/komponen TailAdmin.
- Menu admin `/stickers` (list + detail) untuk mengelola `sticker_generations` telah selesai diimplementasi sesuai plan `plans/2026-09-22-sticker-generation-management-plan.md`.
- UX polish halaman stickers selesai (plan `plans/2026-09-23-sticker-page-ux-polish-plan.md`):
  - Summary section di atas (5 cards + tren harian area chart + distribusi provider bar chart), ikut filter aktif.
  - Filter bar collapsible (default tertutup jika tanpa filter), chips aktif, tombol clear.
  - Model filter dropdown dinamis sesuai provider terpilih (union DB + configs).
  - Date picker kalender custom (bukan native `type="date"`).
  - Tabel kompaksi 9→8 kolom (Preview digabung ke Prompt), thumb 48px, tombol flag unflag pendek.
  - Dep `recharts@2.15.4` ditambahkan.
- Fitur: paginasi DB-side + sorting + filter 8 field (q/status/provider/model/rating/flagged/date), thumbnail via signed URL, download, copy final_prompt, badge status+flag, detail page 8 section (preview/prompt/performance/rating/moderation/raw), server action flag/unflag dengan modal confirm.
- Migrasi kolom moderasi dibuat: `supabase/migrations/20260922000001_sticker_moderation_flag.sql` (belum di-apply ke remote — lihat OPEN-2).
- Keamanan & otorisasi Server Actions (P0 Opsi A selesai):
  - Helper `requireAdmin()` di `src/lib/supabase/auth-guard.ts` dipasang ke seluruh Server Actions (`stickers`, `llm-config`, `presets`, `users/[id]`).
  - Bug inversi warna feedback jempol di `StickerSummary` diperbaiki (upPct -> success, downPct -> error), `<a>` diganti `<Link>`.
  - Kebocoran `NEXT_PUBLIC_ADMIN_EMAILS` di client component `login/page.tsx` dihapus; otorisasi ditegakkan server-side.
  - Test suite bertambah dari 117 menjadi 129 pengujian (23 test files), seluruhnya lulus hijau.
- Kualitas kode, UI/UX, i18n & performa (P1 & P2 Opsi B selesai):
  - Bug CSS class injection di `stickers/[id]/page.tsx` diperbaiki.
  - A11y aria-label di `sticker-filter-bar.tsx` diselaraskan ke `pickDate`.
  - Dead code query `image_generation_attempt_logs` di `stickers/page.tsx` dibersihkan.
  - Notifikasi header kini mengarahkan ke link riil log kegagalan via SPA `<Link>`.
  - Middleware dikonsolidasikan (menghapus double `getUser()`, short-circuit static assets & redirects).
  - Skrip pencegahan dark mode FOUC ditambahkan di `<head>`.
  - Konversi waktu WIB (+07:00) yang tepat dan locale-aware redirect pada `presets/actions.ts`.
  - Standardisasi i18n menyeluruh (`messages/id.json` & `messages/en.json`) di seluruh halaman form, detail, dan komponen Pagination.
  - Dependensi wildcard di `package.json` dikunci ke versi semver stabil.
  - Test suite bertambah menjadi 132 tests (23 test files), 100% PASS.
- Test suite: 23 test files / 132 tests hijau.
- `npm run lint` bersih (0 error, 2 warnings for `<img>` yang disengaja).
- `npm run build` lolos tanpa error (22 routes Turbopack).

## Recent Entries
- [2026-10-05 UI/UX, Accessibility, i18n & Performance Polish (Opsi B)](2026-10-05/ui-ux-i18n-performance-polish-option-b.md)
- [2026-10-05 Security hardening & critical bug fixes (Opsi A)](2026-10-05/security-and-bug-fixes-option-a.md)
- [2026-09-23 Sticker page UX polish](2026-09-23/114000-sticker-page-ux-polish.md)
- [2026-09-13 TailAdmin layout migration](2026-09-13/121300-tailadmin-layout-migration.md)
- [2026-09-13 Follow-up: mobile + EN verification fixes](2026-09-13/followup-mobile-en-verification.md)
- [2026-09-13 Review: implementation vs plan](2026-09-13/review-tailadmin-vs-plan.md)
- [2026-09-13 Test suite Vitest](2026-09-13/test-suite-vitest.md)
- [2026-09-23 Sticker generation management menu](2026-09-23/sticker-generation-management-menu.md)
