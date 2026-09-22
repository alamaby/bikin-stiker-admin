# Sticker Generation Management Menu

Date: 2026-09-23 00:00:00 WIB
Plan: `plans/2026-09-22-sticker-generation-management-plan.md`

## Task
Implement admin menu `/stickers` (list + detail) to manage `sticker_generations`: thumbnail + download image, copy final_prompt, provider/model info, user rating, performance metrics, "inappropriate" flag (`is_flagged`), with pagination + sorting + filter via URL.

## Key Files Changed/Created
- `supabase/migrations/20260922000001_sticker_moderation_flag.sql` — ADD COLUMN is_flagged, flagged_at, flag_reason + index
- `src/lib/stickers.ts` — pure helper (7 exported symbols)
- `tests/unit/stickers-lib.test.ts` — 10 unit tests
- `src/app/[locale]/(admin)/stickers/page.tsx` — RSC list page (DB-side range+count, batch enrich feedback/attempt)
- `src/app/[locale]/(admin)/stickers/_components/sticker-filter-bar.tsx` — 8-field client filter form
- `src/app/[locale]/(admin)/stickers/_components/sticker-thumb.tsx` — StickerThumb + DownloadStickerButton
- `src/app/[locale]/(admin)/stickers/_components/flag-button.tsx` — inline flag/unflag button
- `src/app/[locale]/(admin)/stickers/[id]/page.tsx` — detail page (8 sections)
- `src/app/[locale]/(admin)/stickers/actions.ts` — flagStickerWithState + unflagStickerWithState
- `src/app/[locale]/(admin)/stickers/[id]/flag-form.tsx` — FlagForm client component
- `src/layout/AppSidebar.tsx` — added "Stiker" nav item
- `messages/id.json`, `messages/en.json` — stickers namespace + filter extensions
- `tests/unit/stickers-actions.test.ts` — 6 unit tests (Supabase chain mock)
- `tests/component/sticker-filter-bar.test.tsx` — 3 component tests
- `tests/component/flag-button.test.tsx` — 3 component tests

## Technical Decisions
- Signed URL: 60s for list, 300s for detail. No retry on expiry — user refreshes page.
- Rating filter is per-page only (not DB-wide accurate count) — documented in UI.
- Provider enum hardcoded (7 values) matching llm-logs pattern.
- `<img>` used instead of `next/image` to avoid next.config changes (per plan).
- Service-role Supabase client throughout (no RLS policy changes).
- `flagReason` parameter removed from FlagForm after TypeScript error (not rendered in UI).

## Verification
- `npm run lint` — 0 errors, 2 warnings (expected <img>)
- `npm test` — 94 tests passed across 18 files
- `npm run build` — Compiled successfully, routes `/[locale]/stickers` and `/[locale]/stickers/[id]` present

## Blockers / Open Items
- OPEN-1: Flutter/Showcase app must filter `is_flagged=false` (out of scope)
- OPEN-2: Migration not yet applied to remote — must run before deploy
- OPEN-3: Rating filter count inaccuracy (documented tradeoff)
- OPEN-4: Provider hardcode may go stale (TODO: distinct query later)
