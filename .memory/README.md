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
- Test suite: 20 test files / 117 tests hijau.
- `npm run lint` bersih (2 warnings for `<img>` yang disengaja).
- `npm run build` lolos: 15 routes (+2 new: `/[locale]/stickers`, `/[locale]/stickers/[id]`).
- Sidebar sudah ditambahkan item "Stiker" di antara LLM Logs dan Presets.

## Active Decisions
- Download via signed URL 60dtk (list) / 300dtk (detail); tidak ada retry otomatis (keputusan sadar — refresh halaman jika kedaluwarsa).
- Filter rating per-halaman (bukan DB-wide count) — documented di UI sebagai keterbatasan.
- Provider di filter bar hardcode 7 enum (sama seperti llm-logs) — OPEN-4.
- `<img>` dipakai alih-alih `next/image` untuk menghindari perluasan `remotePatterns` di next.config (plan explicitly out of scope).

## Open Items / Blockers
- OPEN-1 (blocker penegakan, BUKAN blocker admin): query Flutter/Showcase belum filter `is_flagged=false`.
- OPEN-2: migrasi `20260922000001_sticker_moderation_flag.sql` belum di-apply ke remote sebelum deploy.
- OPEN-3: count pagination saat filter rating aktif hanya per-halaman, bukan akurat global.
- OPEN-4: daftar provider di filter bar hardcode (bisa basi).

## Legacy Archive
- Tidak ada `PROJECT_MEMORY.md` — ini memori awal proyek.

## Recent Entries
- [2026-09-23 Sticker page UX polish](2026-09-23/114000-sticker-page-ux-polish.md)
- [2026-09-13 TailAdmin layout migration](2026-09-13/121300-tailadmin-layout-migration.md)
- [2026-09-13 Follow-up: mobile + EN verification fixes](2026-09-13/followup-mobile-en-verification.md)
- [2026-09-13 Review: implementation vs plan](2026-09-13/review-tailadmin-vs-plan.md)
- [2026-09-13 Test suite Vitest](2026-09-13/test-suite-vitest.md)
- [2026-09-23 Sticker generation management menu](2026-09-23/sticker-generation-management-menu.md)
