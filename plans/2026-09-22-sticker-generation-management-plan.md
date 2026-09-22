# Implementation Plan — Menu Manage List Stiker Hasil Generasi

Created: 2026-09-22 07:00:00

## Objective
Menambah menu admin `/stickers` (list + detail) untuk mengelola `sticker_generations`: thumbnail + download image, copy `final_prompt`, info provider/model, rating user, metrik performance, flag "tidak pantas" (`is_flagged`), dengan paginasi + sorting + filter via URL. Konsisten dengan pola halaman Users / LLM Logs / Presets (RSC + service-role, TailAdmin tokens, next-intl `id`/`en`).

## Scope
- IN: migrasi kolom moderasi; helper murni; list page + filter bar + thumbnail/download; detail page; server actions flag/unflag + form; sidebar + i18n; unit + component tests.
- OUT (jangan dikerjakan): perubahan query aplikasi Flutter / Showcase agar menghormati `is_flagged` (dicatat sebagai blocker OPEN-1); E2E Playwright; perubahan RLS/policy; perubahan provider registry; upload preset image.

## Requirement & Finding Traceability
| ID | Requirement / Finding | Ditangani oleh |
|---|---|---|
| REQ-1 | List stiker ada paginasi, sorting, filter via URL | S4 (query + URL), S5 (filter bar), S11 (verifikasi) |
| REQ-2 | Copy final prompt yang digunakan | S6 (reuse `PromptCell`), S7 (detail blok copy) |
| REQ-3 | Tampilkan provider dan model yang digunakan | S4 (kolom select), S7 (detail + link config) |
| REQ-4 | Tampilkan rate dari user | S4 (join feedback), S7 (detail rating) |
| REQ-5 | Tampilkan metric performance saat generate | S4 (durasi + latensi attempt terakhir), S7 (daftar attempts + enhancement) |
| REQ-6 | Download image stiker | S6 (signed URL + tombol download), S7 (detail preview) |
| REQ-7 | Flag tidak pantas agar tidak tampil lagi di aplikasi | S1 (kolom DB), S8 (actions), S7/S9 (UI); penegakan di app = OPEN-1 |
| FIND-1 | `sticker_generations.status` hanya `pending/success/failed`, tidak ada kolom moderasi (zweryfikowane via `information_schema`, 19 kolom, tanpa `is_flagged`) | S1 |
| FIND-2 | `image_url`/`image_png_path` adalah path bucket private `stickers` (sample: `<user>/<id>.png`), butuh signed URL; tidak ada pola download di repo | S6 |
| FIND-3 | Rating di `sticker_generation_feedback` (`rating -1/+1`, `reason_tags`, `note`, PK=`sticker_generation_id`) | S4, S7 |
| FIND-4 | Perf = `generation_duration_ms` + `attempt_logs.latency_ms` + `enhancement_logs.latency_ms/cached`; tidak ada tokens/biaya USD, `cost` = kredit | S4, S7 |
| FIND-5 | Pola halaman: RSC `force-dynamic` + `searchParams` + `buildUrl/preserve` + `FilterBar` client + `table-styles` + `Pagination` + `TailBadge` + service-role client | S4, S5, S10 |
| FIND-6 | Skala saat ini 339 generations / 133 feedback / 395 attempt logs — query list harus DB-side range+count, enrich batch `in(id)` | S4 |

## Milestones
1. M1 — Skema + helper murni selesai + test hijau (S1, S2, S3).
2. M2 — List berfungsi: filter/sort/pagination/thumbnail/copy/download/flag-badge (S4, S5, S6).
3. M3 — Detail + flag/unflag + sidebar/i18n selesai (S7, S8, S9, S10).
4. M4 — Gate hijau: `npm run lint`, `npm test`, `npm run build` (S11).

## Langkah Implementasi (urut dependency & risiko)

### S1 — Migrasi kolom moderasi (risiko tertinggi, blocker semua UI flag)
- Tujuan: menambah `is_flagged`, `flagged_at`, `flag_reason` secara non-destruktif.
- Menyelesaikan: FIND-1, REQ-7 (bagian DB).
- Dependency: tidak ada.
- File yang harus dibaca: `supabase/migrations/20260630000024_sticker_png_path.sql` (contoh ADD COLUMN + COMMENT), `supabase/migrations/20260705000001_generation_feedback_analytics.sql` (konvensi nama + trigger `updated_at` bila relevan).
- File yang harus diubah (1 file baru): `supabase/migrations/20260922000001_sticker_moderation_flag.sql`.
- Simbol terkait: `public.sticker_generations.is_flagged`, `.flagged_at`, `.flag_reason`.
- Kondisi saat ini: tabel punya 19 kolom (verifikasi `information_schema` 2026-09-22), tanpa kolom flag; `status` hanya lifecycle.
- Perubahan konkret (tulis file migrasi persis isi berikut, tanpa statement lain):
  ```sql
  ALTER TABLE public.sticker_generations
    ADD COLUMN is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN flagged_at TIMESTAMPTZ NULL,
    ADD COLUMN flag_reason TEXT NULL CHECK (flag_reason IS NULL OR char_length(flag_reason) <= 500);
  CREATE INDEX IF NOT EXISTS sticker_generations_flagged_created_idx
    ON public.sticker_generations (is_flagged, created_at DESC);
  COMMENT ON COLUMN public.sticker_generations.is_flagged IS 'Admin moderation flag; app/Showcase harus filter is_flagged=false (penegakan di app = OUT of scope plan ini).';
  COMMENT ON COLUMN public.sticker_generations.flagged_at IS 'Waktu admin mem-flag.';
  COMMENT ON COLUMN public.sticker_generations.flag_reason IS 'Alasan flag, maks 500 char.';
  ```
- Urutan di file: `ALTER` dulu, lalu `CREATE INDEX`, lalu 3 `COMMENT`.
- Behavior dipertahankan: tidak ada kolom diubah/dihapus; default `FALSE` sehingga semua 339 rows existing tetap clean; tidak ada backfill.
- Error handling / edge: migrasi idempotent (`IF NOT EXISTS` pada index); jika kolom sudah ada (re-run), Postgres error — itu acceptable, jangan tambah `IF NOT EXISTS` pada ADD COLUMN karena repo tidak memakai pola itu; CHECK mencegah reason > 500.
- Test: tidak ada test otomatis untuk migrasi; verifikasi manual via Supabase dashboard / `information_schema` setelah apply di environment yang berwenang (catat: eksekutor plan ini TIDAK menjalankan migrasi ke remote; cukup buat file).
- Verifikasi: `npx tsc --noEmit` tidak relevan; cukup pastikan file `.sql` valid (tidak ada `;` hilang). Expected: file ada, 3 kolom + 1 index + 3 comment.
- Completion criteria: file migrasi ada dengan isi persis di atas; tidak ada file migrasi lain diubah.
- Dilarang ubah: semua migrasi existing, RLS/policy, fungsi RPC, `supabase/config.toml`, `supabase/functions/*`.

### S2 — Helper murni sticker query/URL/image (fondasi testable, tanpa UI)
- Tujuan: satu sumber kebenaran untuk parsing filter/sort, bangun URL, resolve path image, mapping rating — agar list/detail/actions konsisten dan mudah di-test.
- Menyelesaikan: REQ-1 (bagian parsing/URL), FIND-2 (bagian resolve path), FIND-4 (format durasi).
- Dependency: tidak ada (pure, tanpa kolom baru).
- File yang harus dibaca: `src/lib/locale-href.ts` (`buildLocaleHref`), `src/app/[locale]/(admin)/presets/page.tsx` fungsi `buildUrl` (baris 109–116) dan `formatWIB` (38–46), `src/app/[locale]/(admin)/llm-logs/page.tsx` fungsi `buildUrl` (221–228).
- File yang harus diubah (1 file baru): `src/lib/stickers.ts`.
- Simbol yang harus dibuat (nama persis): `STICKER_SORT_FIELDS`, `StickerSortField`, `StickerFilters`, `parseStickerParams(sp)`, `buildStickersUrl(locale, params)`, `resolveStickerStoragePath(row)`, `formatDurationMs(ms)`, `ratingLabel(rating)`.
- Kondisi saat ini: file belum ada; pola `buildUrl` diduplikasi per halaman.
- Perubahan konkret:
  1. `export const STICKER_SORT_FIELDS = ["created_at", "generation_duration_ms", "cost"] as const;` + type `StickerSortField`.
  2. `export type StickerFilters = { q: string; status: string; provider: string; model: string; rating: string; flagged: string; date_from: string; date_to: string; sort: StickerSortField; order: "asc" | "desc"; page: number };` — default: `status/provider/model/rating/flagged = "all"`, `sort = "created_at"`, `order = "desc"`, `page = max(1, parseInt)`.
  3. `parseStickerParams(sp: Record<string, string | undefined>): StickerFilters` — whitelist sort via `STICKER_SORT_FIELDS.includes`, else fallback `created_at`; `order === "asc" ? "asc" : "desc"`.
  4. `buildStickersUrl(locale, params)` — tiru `presets/page.tsx:109-116` persis: skip `""` dan `"all"`, prefix `buildLocaleHref(locale, "/stickers")`.
  5. `resolveStickerStoragePath(row: { image_png_path: string | null; image_url: string | null }): { path: string | null; isAbsoluteUrl: boolean }` — prioritas `image_png_path` lalu `image_url`; jika `null/""` → `{ path: null }`; jika match `/^https?:\/\//` → `{ path: raw, isAbsoluteUrl: true }`; jika diawali `stickers/` strip prefix itu (bucket sudah diketahui); else path apa adanya. Jangan decode/encode di sini.
  6. `formatDurationMs(ms: number | null | undefined): string` — `null/undefined/<0` → `"—"`; `<1000` → `"<n> ms"`; else `"<x.x> s"`.
  7. `ratingLabel(rating: number | null | undefined)` → `1 → "up"`, `-1 → "down"`, else `"unrated"`.
- Urutan di file: konstanta → type → `parseStickerParams` → `buildStickersUrl` → `resolveStickerStoragePath` → `formatDurationMs` → `ratingLabel`.
- Behavior dipertahankan: tidak mengubah helper existing; tidak import `server-only` (harus bisa dipakai RSC + test node).
- Error handling / edge: `page=NaN/0/negatif` → 1; sort tak dikenal → `created_at`; `image_url` absolut (data lama) tidak boleh di-prefixed bucket; path dengan leading `/` di-trim satu slash.
- Test: lihat S3.
- Verifikasi: `npm test -- tests/unit/stickers-lib.test.ts` (setelah S3 ditulis). Expected hijau.
- Completion criteria: file ada, 7 simbol terekspor dengan nama persis, tanpa dependency ke supabase/next.
- Dilarang ubah: `src/lib/locale-href.ts`, `src/lib/utils.ts`, helper halaman lain.

### S3 — Test unit untuk helper (kunci determinisme sebelum UI)
- Tujuan: mengunci perilaku S2 agar executor kecil tidak perlu menebak.
- Menyelesaikan: verifikasi S2.
- Dependency: S2 harus selesai dulu.
- File yang harus dibaca: `tests/unit/presets-actions.test.ts` (pola mock + FormData), `tests/unit/locale-href.test.ts` (pola assert helper), `vitest.config.ts` (project `unit` = `tests/unit/**/*.test.ts`, env node).
- File yang harus diubah (1 file baru): `tests/unit/stickers-lib.test.ts`.
- Simbol terkait: semua 7 simbol dari S2.
- Kondisi saat ini: file belum ada.
- Perubahan konkret (kasus wajib, input → expected persis):
  1. `parseStickerParams({})` → `{ q:"", status:"all", provider:"all", model:"all", rating:"all", flagged:"all", date_from:"", date_to:"", sort:"created_at", order:"desc", page:1 }`.
  2. `parseStickerParams({ sort:"cost", order:"asc", page:"3" })` → sort `cost`, order `asc`, page `3`.
  3. `parseStickerParams({ sort:"hacked", page:"-2" })` → sort `created_at`, page `1`.
  4. `buildStickersUrl("id", { q:"cat", status:"all", page:"2" })` → `"/id/stickers?q=cat&page=2"` (kunci `status:"all"` hilang).
  5. `resolveStickerStoragePath({ image_png_path:"u1/a.png", image_url:"u1/a.webp" })` → `{ path:"u1/a.png", isAbsoluteUrl:false }`.
  6. `resolveStickerStoragePath({ image_png_path:null, image_url:"https://x/y.png" })` → `{ path:"https://x/y.png", isAbsoluteUrl:true }`.
  7. `resolveStickerStoragePath({ image_png_path:null, image_url:"stickers/u1/a.png" })` → `{ path:"u1/a.png", isAbsoluteUrl:false }`.
  8. `resolveStickerStoragePath({ image_png_path:null, image_url:null })` → `{ path:null, ... }`.
  9. `formatDurationMs(null)` → `"—"`; `formatDurationMs(500)` → `"500 ms"`; `formatDurationMs(16747)` → `"16.7 s"`.
  10. `ratingLabel(1)` → `"up"`; `ratingLabel(-1)` → `"down"`; `ratingLabel(null)` → `"unrated"`.
- Urutan di file: import dari `@/lib/stickers` → 3 `describe` (`parseStickerParams`, `buildStickersUrl+resolve`, `format+rating`) → 10 `it` sesuai urutan di atas.
- Behavior dipertahankan: tidak ada.
- Error handling: tidak ada mock supabase di file ini (pure).
- Verifikasi: `npm test -- tests/unit/stickers-lib.test.ts`. Expected: 10 passed.
- Completion criteria: 10 kasus di atas hijau; tidak ada test existing yang diubah.
- Dilarang ubah: semua test existing, `vitest.config.ts`, `tests/setup.ts`, `tests/stubs/*`.

### S4 — List page server (query DB-side + enrich batch + tabel)
- Tujuan: route `/stickers` dengan tabel 339+ rows yang scalable: filter/sort/pagination di DB, enrich feedback + latensi attempt terakhir secara batch.
- Menyelesaikan: REQ-1, REQ-3, REQ-4, REQ-5 (bagian list), FIND-3, FIND-4, FIND-6.
- Dependency: S1 (kolom `is_flagged` harus ada di file migrasi agar select tidak gagal setelah migrasi di-apply; jika migrasi belum di-apply di remote, query tetap jalan karena select kolom baru akan error — mitigasi: catat di OPEN-2), S2 (pakai `parseStickerParams`, `buildStickersUrl`, `formatDurationMs`, `ratingLabel`).
- File yang harus dibaca: `src/app/[locale]/(admin)/presets/page.tsx` (seluruh pola: `force-dynamic` baris 26, `getPresets` 59–107 dengan `.select("*", { count:"exact" })` + `.order` + `.range`, `buildUrl` 109–116, komponen page 118–313, `Pagination` 299–310), `src/app/[locale]/(admin)/llm-logs/page.tsx` (enrich `stickerMap` 113–121, toolbar sort 273–292, empty state 313–316), `src/components/tables/table-styles.ts` (token nama persis), `src/components/tables/Pagination.tsx` (props `page/totalPages/total/pageSize/summary/getHref`).
- File yang harus diubah (1 file baru): `src/app/[locale]/(admin)/stickers/page.tsx`.
- Simbol terkait: `export const dynamic = "force-dynamic"`, `async function getStickers(filters: StickerFilters)`, `function buildUrl(locale, params)`, `export default async function StickersPage({ params, searchParams })`, komponen `PromptCell`, `Pagination`, `TailBadge`, `PageBreadcrumb`.
- Kondisi saat ini: direktori `stickers/` belum ada.
- Perubahan konkret:
  1. Header: `"use server"` TIDAK dipakai (page adalah RSC, sama seperti presets); `export const dynamic = "force-dynamic";`.
  2. `getStickers(filters)`: buat service client persis pola `presets/page.tsx:60-64` (`SUPABASE_URL ?? NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY ?? SUPABASE_SERVICE_ROLE_KEY`, return `null` jika kosong). Select: `"id,user_id,preset_name,user_prompt,final_prompt,image_url,image_png_path,provider_name,model_name,provider_config_id,cost,status,is_flagged,flagged_at,flag_reason,created_at,completed_at,generation_duration_ms"` dengan `{ count: "exact" }`. Order: `filters.sort` ascending = `order==="asc"`, `nullsFirst: true`. Range: `from=(page-1)*15`, `to=from+14`, `perPage=15` konstan.
  3. Filter DB-side (urutan persis): `status != "all"` → `.eq("status", ...)`; `provider` → `.eq("provider_name", ...)`; `model` → `.eq("model_name", ...)`; `flagged==="flagged"` → `.eq("is_flagged", true)`; `flagged==="clean"` → `.eq("is_flagged", false)`; `date_from` → `.gte("created_at", new Date(...).toISOString())`; `date_to` → `.lt("created_at", end+1hari)` (tiru `llm-logs/page.tsx:104-109`); `q` → `.or("user_prompt.ilike.%q%,final_prompt.ilike.%q%,preset_name.ilike.%q%,provider_name.ilike.%q%,model_name.ilike.%q%")` (JANGAN sertakan `user_id` di `.or` karena UUID tidak support ilike — jika `q` match format UUID, tambah `.eq("user_id", q)` sebagai query terpisah? TIDAK — keep simple: q hanya 5 kolom teks di atas; user_id search didukung di detail via link user, bukan di list. Dokumentasikan limitasi ini di subtitle).
  4. Rating filter tidak bisa di DB (tabel terpisah) → fetch page dulu, lalu batch: `supabase.from("sticker_generation_feedback").select("sticker_generation_id,rating,reason_tags,note").in("id"→"sticker_generation_id", ids)`; lalu di memori: `rating==="up"` keep `rating===1`, `"down"` keep `-1`, `"unrated"` keep tanpa feedback. Total count untuk pagination pakai `count` DB tanpa koreksi rating (dokumentasikan di UI: "filter rating diterapkan per halaman" — lihat OPEN-3; jangan coba count akurat lintas tabel di langkah ini).
  5. Enrich latensi: `supabase.from("image_generation_attempt_logs").select("sticker_generation_id,latency_ms,attempt_index").in("sticker_generation_id", ids)` lalu ambil `max(attempt_index)` per generasi sebagai "last attempt latency". Jangan fetch `request_payload/response_payload` di list (hemat).
  6. Signed URL per row: `supabase.storage.from("stickers").createSignedUrl(path, 60)` hanya jika `resolveStickerStoragePath` return non-null dan bukan absolute; absolute URL dipakai langsung; `null` → thumbnail placeholder `"—"`. Lakukan `Promise.all` max 15 per halaman. Jika `createSignedUrl` error untuk satu row, thumbnail row itu `"—"` (jangan gagalkan seluruh page).
  7. Tabel kolom (urutan persis): Preview (img 64px / `"—"`) | Prompt (`PromptCell text={final_prompt || user_prompt}`, max 80) | Provider/Model (`provider_name` + mono `model_name`, link config jika ada) | Rating (badge `up=success`, `down=error`, `unrated=light` + `reason_tags.length` jika >0) | Perf (`formatDurationMs(generation_duration_ms)` + sub `lastLatency ms`) | Cost | Status/Flag (badge status + badge `flagged=warning solid` / tidak ada) | Created (locale string) | Aksi (Detail link, Download `<a href download>`, Flag/Unflag via komponen S9).
  8. Toolbar: count `total + " total · hal page/totalPages"`, 3 sort link (`created_at`, `generation_duration_ms`, `cost`) + toggle asc/desc, pola `toolbarBtn(active)` dari `llm-logs/page.tsx:273-292`. Sort link selalu `page:"1"`.
  9. Empty states: env null → box "Supabase env not configured." (tiru `llm-logs/page.tsx:313-316`); 0 rows → `t("noMatch")`.
- Urutan di file: imports → `dynamic` → type lokal → `getStickers` → `buildUrl` (delegasi ke `buildStickersUrl`) → `StickersPage` (parse → fetch → toolbar → table → Pagination).
- Behavior dipertahankan: middleware admin gate tidak berubah; tidak ada client-side fetch; RLS tetap (service-role).
- Error handling / edge: `getStickers` throw `new Error(error.message)` jika Supabase error (tiru presets:94) — page akan error boundary Next; `date_from` invalid → `new Date` NaN → jangan apply filter tanggal itu (guard `!isNaN`); `q` dengan `%`/`_`/`karakter OR` → escape dengan replace `[%_,()]` ? Supabase `.or` ilike rawan injeksi sintaks — mitigasi: strip koma dan tanda kurung dari `q` sebelum interpolasi (`q.replace(/[,()]/g, "")`), dokumentasikan; image signed URL gagal per-row → placeholder.
- Test: tidak ada test langsung untuk RSC; dicover S3 (helper) + S11 (build). Tambah component test untuk thumbnail? TIDAK di langkah ini (di S6).
- Verifikasi: `npm run build`. Expected: route `/[locale]/stickers` muncul di output build (14 routes → 15+), tanpa type error.
- Completion criteria: file ada; query DB-side dengan 8 filter sesuai urutan; enrich batch max 2 query tambahan; tabel 9 kolom sesuai urutan; Pagination terpasang.
- Dilarang ubah: halaman users/llm-logs/presets/llm-config, `Pagination.tsx`, `table-styles.ts`, middleware, `lib/supabase/*`.

### S5 — Filter bar client untuk stickers
- Tujuan: form filter 8 field yang mendorong state ke URL (reset page=1), konsisten dengan `LogFilterBar`.
- Menyelesaikan: REQ-1 (bagian UI filter).
- Dependency: S2 (tipe `StickerFilters` untuk props `initial`), S4 (route `/stickers` harus ada agar push valid).
- File yang harus dibaca: `src/app/[locale]/(admin)/llm-logs/_components/log-filter-bar.tsx` (seluruh file 1–108: `useTransition`, `push` skip `all/""`, `handleClear` ke base route, grid `filterGrid4`, `filterActions lg:col-span-4`), `src/components/form/controls.tsx` (`FormLabel`, `TextInput`, `SelectInput`).
- File yang harus diubah (1 file baru): `src/app/[locale]/(admin)/stickers/_components/sticker-filter-bar.tsx`.
- Simbol: `export function StickerFilterBar({ locale, initial }: { locale: string; initial: { q: string; status: string; provider: string; model: string; rating: string; flagged: string; date_from: string; date_to: string } })`.
- Kondisi saat ini: file belum ada.
- Perubahan konkret (urutan field di form persis): 1. Search (`TextInput`, placeholder `t("promptPlaceholder")` dari namespace `filters` — reuse key existing, JANGAN tambah key baru untuk placeholder); 2. Status (`SelectInput`: all/pending/success/failed); 3. Provider (`SelectInput`: all + openrouter/gemini/pollinations/pixazo/ollama/cerebras/cloudflare — hardcode sama seperti `log-filter-bar.tsx:61-67`, JANGAN query distinct di langkah ini, lihat OPEN-4); 4. Model (`TextInput` bebas, placeholder `"flux-1-schnell"`, karena model terlalu banyak untuk enum); 5. Rating (`SelectInput`: all/up/down/unrated); 6. Flagged (`SelectInput`: all/flagged/clean); 7. `date_from` (type=date); 8. `date_to` (type=date). Baris aksi: submit (`filterSubmitBtn`, ikon `Search`/`Loader2`, `disabled={pending}`, `aria-busy`) + clear (`toolbarBtn(false)`, push ke `/${locale}/stickers` tanpa query). `push` tiru `log-filter-bar.tsx:29-35` persis (skip `all`/`""`, `page:"1"` selalu disertakan saat submit).
- Urutan di file: `"use client"` → imports → component → state hooks (8, urutan sama dengan field) → `push` → `handleSubmit` → `handleClear` → JSX form.
- Behavior dipertahankan: tidak ada auto-submit onChange (hanya submit button, sama seperti semua filter bar).
- Error handling / edge: input `pending` disable semua; tanggal `date_to < date_from` tidak divalidasi di client (server ignore via guard S4) — dokumentasikan.
- Test: component test di S10 (bagian filter bar). Di langkah ini belum tulis test.
- Verifikasi: `npm run lint`. Expected: bersih (tidak ada unused import).
- Completion criteria: 8 field + 2 tombol, push URL benar, tidak ada fetch langsung.
- Dilarang ubah: `log-filter-bar.tsx`, `filter-bar.tsx` manapun, `controls.tsx`, halaman list S4 selain import komponen ini (import dilakukan di S4? TIDAK — import dilakukan di langkah ini? Untuk menjaga atomisitas: S4 menulis `import { StickerFilterBar } from "./_components/sticker-filter-bar"` sebagai import yang mengarah ke file yang baru ada setelah S5. Urutan eksekusi S4→S5 berarti build rusak di tengah — acceptable selama M2; final gate S11 hijau. Catat di handoff.)

### S6 — Thumbnail + download component (pola baru: signed URL)
- Tujuan: komponen client/server-safe untuk preview 64px + tombol download yang bekerja untuk path relatif maupun URL absolut.
- Menyelesaikan: REQ-6 (bagian komponen), FIND-2.
- Dependency: S2 (`resolveStickerStoragePath`), S4 (page memanggil dengan `signedUrl` yang sudah dibuat server — komponen ini HANYA render, TIDAK buat signed URL sendiri).
- File yang harus dibaca: `src/app/[locale]/(admin)/llm-logs/_components/prompt-cell.tsx` (pola `"use client"` + `toolbarBtn`), `src/components/tables/table-styles.ts` (`toolbarBtn`).
- File yang harus diubah (1 file baru): `src/app/[locale]/(admin)/stickers/_components/sticker-thumb.tsx`.
- Simbol: `export function StickerThumb({ signedUrl, alt }: { signedUrl: string | null; alt: string })`, `export function DownloadStickerButton({ signedUrl, filename }: { signedUrl: string | null; filename: string })`.
- Kondisi saat ini: tidak ada komponen image di repo (`grep <img|next/image` nol).
- Perubahan konkret:
  1. `StickerThumb`: jika `signedUrl` null → `<span className="text-gray-400">—</span>`; else `<img src={signedUrl} alt={alt} width={64} height={64} className="h-16 w-16 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-700" loading="lazy" />`. JANGAN pakai `next/image` (butuh remote pattern config — out of scope).
  2. `DownloadStickerButton`: jika null → return null; else `<a href={signedUrl} download={filename} target="_blank" rel="noreferrer" className={toolbarBtn(false)}>Download</a>` — label pakai `t("download")` dari namespace `stickers` (key dibuat di S10; sementara hardcode "Download"/"Unduh"? TIDAK — pakai `useTranslations("stickers")` dengan key `download` yang dijamin ada setelah S10; urutan eksekusi S6 sebelum S10 berarti key missing sementara → fallback `t("download")` render key itu sendiri, acceptable, final gate S11 memastikan i18n lengkap).
  3. `filename`: `{id}.png` (dibuat page S4 dari row id).
- Behavior dipertahankan: tidak ada.
- Error handling / edge: `signedUrl` kedaluwarsa (60 dtk) → browser tampil broken image; tidak ada retry di langkah ini (dokumentasikan: refresh halaman). `alt` selalu diisi (preset_name atau id) untuk a11y.
- Test: component test di S10. Langkah ini hanya komponen.
- Verifikasi: `npm run lint`. Expected bersih.
- Completion criteria: 2 komponen terekspor, tanpa fetch supabase di dalamnya.
- Dilarang ubah: `next.config.ts` (jangan tambah remotePatterns), komponen UI shared.

### S7 — Detail page + metrik + rating + copy prompt
- Tujuan: `/stickers/[id]` menampilkan semua yang diminta per satu stiker.
- Menyelesaikan: REQ-2, REQ-3, REQ-4, REQ-5, REQ-6 (bagian detail).
- Dependency: S1 (kolom flag di-select), S2 (helper), S6 (thumb/download), S8 (flag form — import dari file yang dibuat di S8; lihat catatan ordering seperti S4/S5).
- File yang harus dibaca: `src/app/[locale]/(admin)/users/[id]/page.tsx` (pola `getX(id)` + `.maybeSingle()` + `notFound()`, header Back + badge + mono id, card sections, cross-link), `src/app/[locale]/(admin)/llm-config/[id]/page.tsx` (pola raw JSON `<pre>`), `src/app/[locale]/(admin)/llm-logs/_components/prompt-cell.tsx` (reuse).
- File yang harus diubah (1 file baru): `src/app/[locale]/(admin)/stickers/[id]/page.tsx`.
- Simbol: `export const dynamic = "force-dynamic"`, `async function getStickerDetail(id: string)`, `export default async function StickerDetailPage({ params }: { params: Promise<{ locale: string; id: string }> })`.
- Kondisi saat ini: file belum ada.
- Perubahan konkret (urutan section di JSX persis):
  1. `getStickerDetail`: service client (pola sama S4); `from("sticker_generations").select(<kolom sama S4>).eq("id", id).maybeSingle()` → `notFound()` jika null; lalu paralel: feedback (`.eq("sticker_generation_id", id).maybeSingle()`), attempts (`.eq(...).order("attempt_index")` kolom `provider_name,model_name,attempt_index,success,retryable,latency_ms,status_code,error_message,created_at`), enhancements (`.eq("sticker_generation_id", id).order("created_at")` kolom `success,cached,latency_ms,error_message,created_at`), signed URL via `resolveStickerStoragePath` + `createSignedUrl(path, 300)` (300 dtk untuk detail, bukan 60).
  2. Header: Back link (`toolbarBtn(false)`, `ArrowLeft`, `t("back")` common) ke `/stickers` + badge status + badge flag + mono id.
  3. Section Preview: `StickerThumb` besar? reuse dengan img 256px inline di page ini (JANGAN ubah `StickerThumb` — tulis `<img>` terpisah 256px) + `DownloadStickerButton` + sub path + `cost` + `preset_name` + link user (`/users/<user_id>`) + link config (`/llm-config/<provider_config_id>`, hanya jika non-null).
  4. Section Prompt: 3 blok `PromptCell` — Final (`final_prompt`), Negative (`negative_prompt ?? ""`), User (`user_prompt`). Label via `t(...)` stickers.
  5. Section Performance: `generation_duration_ms` (format), `completed_at − created_at` (hitung, tampilkan keduanya untuk cross-check), tabel attempts (kolom attempt/provider/model/success/latency/error), daftar enhancements (success/cached/latency). Jika attempts kosong → `"—"`.
  6. Section Rating: `rating` badge + `reason_tags` (join `, ` atau `"—"`) + `note` (`"—"` jika null) + `created_at`.
  7. Section Moderasi: render `<FlagForm id isFlagged flagReason />` (dari S8).
  8. Section Raw: `<pre>{JSON.stringify(row, null, 2)}</pre>` (tiru llm-config detail).
- Behavior dipertahankan: `notFound()` untuk id tak dikenal; tidak ada mutasi di page (semua via actions S8).
- Error handling / edge: `id` bukan UUID → `.maybeSingle()` return null → `notFound()` (jangan validasi UUID manual); signed URL gagal → preview `"—"` tapi data teks tetap tampil; attempts/enhancement error → tampilkan section dengan `"—"` (jangan gagalkan page; bungkus masing-masing dengan try/catch atau cek `error` dan fallback `[]`).
- Test: dicover build + manual. Tidak ada unit test untuk RSC di langkah ini.
- Verifikasi: `npm run build`. Expected: route `/[locale]/stickers/[id]` terdaftar.
- Completion criteria: 8 section sesuai urutan; semua link cross-ref benar; tidak ada `useState` di file ini (RSC murni).
- Dilarang ubah: detail pages lain, `users/[id]/actions.ts`, modal shared.

### S8 — Server actions flag/unflag + form client
- Tujuan: mutasi moderasi dengan validasi + revalidate, pola sama seperti preset/suspend actions.
- Menyelesaikan: REQ-7 (bagian mutasi).
- Dependency: S1 (kolom harus ada di migrasi).
- File yang harus dibaca: `src/app/[locale]/(admin)/presets/actions.ts` (1–95: `svc()`, `ActionState`, `doX` + `WithState` wrapper, `revalidatePath`), `src/app/[locale]/(admin)/users/[id]/actions.ts` (14–49: `getServiceClient`, return `{ success, message }`), `src/app/[locale]/(admin)/presets/_components/delete-button.tsx` (pola `useTransition` + `Modal` confirm + `Alert` auto-hide 3000ms).
- File yang harus diubah (2 file baru): `src/app/[locale]/(admin)/stickers/actions.ts`, `src/app/[locale]/(admin)/stickers/[id]/flag-form.tsx`.
- Simbol: `export type ActionState = { success: boolean; message: string }`, `export async function flagStickerWithState(_prev: ActionState, formData: FormData)`, `export async function unflagStickerWithState(_prev: ActionState, formData: FormData)`, `export function FlagForm({ id, isFlagged, flagReason }: { id: string; isFlagged: boolean; flagReason: string | null })`.
- Kondisi saat ini: belum ada.
- Perubahan konkret:
  1. `actions.ts`: `svc()` tiru `presets/actions.ts:6-10` persis. `flagStickerWithState`: `id = trim(get("id"))`, `reason = trim(get("reason") ?? "").slice(0, 500)`; jika `!id` → `{ success:false, message:"Missing id" }`; update `{ is_flagged: true, flagged_at: new Date().toISOString(), flag_reason: reason || null }` via `.update(...).eq("id", id)`; jika `error` → `{ success:false, message: error.message }`; sukses → `revalidatePath("/[locale]/stickers")` + `revalidatePath(`/[locale]/stickers/${id}`)` lalu `{ success:true, message:"Stiker ditandai tidak pantas" }`. `unflagStickerWithState`: sama tanpa reason, update `{ is_flagged: false, flagged_at: null, flag_reason: null }`, message `"Tanda tidak pantas dicabut"`. Bungkus keduanya dengan try/catch → `{ success:false, message: e.message ?? "Gagal..." }`.
  2. `flag-form.tsx`: `"use client"`; jika `isFlagged` → tombol Unflag (pattern `delete-button` tanpa modal? PAKAI modal confirm sederhana reuse `Modal` + `Alert`, tiru `delete-button.tsx:42-61`); jika tidak flagged → `TextInput` reason (maxLength 500, placeholder dari `t("flagReasonPlaceholder")`) + tombol Flag (style error solid seperti delete button). Panggil action langsung (bukan via `useActionState` form — tiru `DeleteButton.handleConfirm`: `startTransition(async () => { const fd = new FormData(); ...; const res = await flagStickerWithState(...); setMessage... })`). `pending` disable + `aria-busy`, `Loader2 animate-spin`.
- Urutan di `actions.ts`: `svc` → `ActionState` → `flag` → `unflag`. Di `flag-form.tsx`: hooks → `handleFlag` → `handleUnflag` → JSX (Alert di atas, form/modal di bawah).
- Behavior dipertahankan: tidak ada delete fisik; tidak ada perubahan storage; `flagged_at` selalu server time.
- Error handling / edge: reason > 500 di-trim (jangan reject — UX admin); id kosong → failure tanpa DB call; Supabase error → message asli diteruskan; double-flag idempotent (update ulang, tidak error).
- Test: lihat S10 (unit actions dengan mock supabase). Langkah ini hanya source.
- Verifikasi: `npm run lint`. Expected bersih.
- Completion criteria: 2 actions + 1 form, revalidate 2 path tiap aksi.
- Dilarang ubah: actions halaman lain, `Modal`, `Alert`, RLS.

### S9 — Aksi flag inline di list (tombol cepat per row)
- Tujuan: flag/unflag tanpa buka detail (pakai actions S8).
- Menyelesaikan: REQ-7 (bagian UX list).
- Dependency: S8 (actions), S4 (tabel memanggil).
- File yang harus dibaca: `src/app/[locale]/(admin)/presets/_components/delete-button.tsx` (pola confirm modal minimal).
- File yang harus diubah (1 file baru): `src/app/[locale]/(admin)/stickers/_components/flag-button.tsx`.
- Simbol: `export function FlagButton({ id, isFlagged }: { id: string; isFlagged: boolean })`.
- Kondisi saat ini: belum ada.
- Perubahan konkret: tombol kecil (`h-6 px-2 text-xs`, `toolbarBtn(false)`); jika flagged → label `t("unflag")` langsung unflag tanpa modal; jika clean → buka `Modal` confirm (judul `t("flagTitle")`, body id mono, input reason opsional 1 baris, tombol confirm error-solid + cancel). Panggil `flagStickerWithState`/`unflagStickerWithState` via `startTransition` + `Alert` inline 3000ms. Setelah sukses JANGAN `router.refresh()` manual — andalkan `revalidatePath` server (tiru delete-button yang pakai `onDone` opsional; di sini tanpa `onDone`, biarkan revalidate).
- Behavior dipertahankan: tidak ada navigasi; tidak ada optimistic update.
- Error handling / edge: `pending` disable; modal tutup dulu baru call (tiru `handleConfirm`).
- Test: component test di S10.
- Verifikasi: `npm run lint`. Expected bersih.
- Completion criteria: 1 komponen, dipakai S4 di kolom Aksi (catatan ordering: S4 ditulis sebelum file ini ada — executor harus kembali tambahkan import + kolom Aksi FlagButton di S4 setelah S9; checklist handoff menandai ini eksplisit).
- Dilarang ubah: `delete-button.tsx`, actions S8.

### S10 — Sidebar + i18n + component/unit tests sisa
- Tujuan: menu tampil + string lengkap + semua komponen baru ter-test.
- Menyelesaikan: semua REQ (bagian navigasi & bahasa), verifikasi S5/S6/S8/S9.
- Dependency: S4–S9 selesai (key yang dirujuk harus final).
- File yang harus dibaca: `src/layout/AppSidebar.tsx` (30–39: `navItems`/`manageItems`, import icon baris 10), `messages/id.json` + `messages/en.json` (namespace `nav`, `filters`, `common`), `tests/component/prompt-cell.test.tsx` + `tests/component/user-filter-bar.test.tsx` + `tests/component/pagination.test.tsx` (pola render + i18n mock), `tests/unit/presets-actions.test.ts` (pola mock supabase chain).
- File yang harus diubah:
  1. `src/layout/AppSidebar.tsx` — tambah import `Images` dari `lucide-react` (gabung ke import baris 10 yang ada, JANGAN tambah baris import baru), tambah 1 item di `manageItems` SETELAH `llmLogs`, SEBELUM `presets`: `{ icon: <Images className="size-5" />, name: t("stickers"), path: buildLocaleHref(locale, "/stickers") }`.
  2. `messages/id.json` — tambah `"stickers": "Stiker"` di `nav` (setelah `llmLogs`), tambah namespace baru `"stickers": { "title": "Manajemen Stiker", "subtitle": "Hasil generasi stiker + moderasi", "preview": "Pratinjau", "prompt": "Prompt", "finalPrompt": "Final prompt", "negativePrompt": "Negative prompt", "userPrompt": "Prompt user", "provider": "Provider", "model": "Model", "rating": "Rating", "performance": "Performa", "cost": "Biaya", "status": "Status", "created": "Dibuat", "detail": "Detail", "download": "Unduh", "flag": "Tandai tidak pantas", "unflag": "Cabut tanda", "flagTitle": "Tandai stiker tidak pantas?", "flagReason": "Alasan", "flagReasonPlaceholder": "Alasan (opsional, maks 500)", "flagSuccess": "Stiker ditandai tidak pantas", "unflagSuccess": "Tanda tidak pantas dicabut", "flagged": "Ditandai", "clean": "Bersih", "up": "Suka", "down": "Tidak suka", "unrated": "Belum dinilai", "noMatch": "Tidak ada stiker cocok filter." }`.
  3. `messages/en.json` — mirror persis dengan Bahasa Inggris (`"stickers": "Stickers"`, `title: "Sticker Management"`, dst., `download: "Download"`, `flag: "Flag as inappropriate"`, dst.).
  4. `tests/unit/stickers-actions.test.ts` (baru) — mock `next/cache` (`revalidatePath`), mock `@supabase/supabase-js` dengan chain `from → update → eq → resolves { error: null }`; kasus: flag sukses + payload `{ is_flagged: true, flag_reason }` + `flagged_at` string; flag tanpa id → failure + update tidak dipanggil; unflag sukses + payload `{ is_flagged: false, flagged_at: null, flag_reason: null }`; supabase error → failure dengan message asli.
  5. `tests/component/sticker-filter-bar.test.tsx` (baru) — render `StickerFilterBar` dengan mock `next/navigation` (`useRouter` → `{ push: vi.fn() }`) dan `next-intl` (tiru `user-filter-bar.test.tsx`); assert 8 field tampil; submit memanggil `push` dengan `page=1` dan tanpa key `all`.
  6. `tests/component/flag-button.test.tsx` (baru) — render `FlagButton` clean vs flagged; klik buka modal / panggil unflag (mock actions module).
- Urutan edit: sidebar → `id.json` → `en.json` → 3 file test.
- Behavior dipertahankan: tidak ada key existing diubah/dihapus; urutan menu lain tetap; `isActivePath` otomatis cover `/stickers/*`.
- Error handling / edge: JSON harus valid (koma benar); test mock JANGAN import page RSC (hanya actions + komponen client).
- Verifikasi: `npm test -- tests/unit/stickers-actions.test.ts tests/component/sticker-filter-bar.test.tsx tests/component/flag-button.test.tsx tests/unit/stickers-lib.test.ts`. Expected: semua hijau, total test repo 72 → 85+.
- Completion criteria: menu tampil ID+EN; tidak ada key missing; 3 file test hijau.
- Dilarang ubah: test existing, `vitest.config.ts`, locale config, middleware, header search.

### S11 — Gate verifikasi penuh + update plan file
- Tujuan: pastikan tidak ada regresi dan plan file mencerminkan status akhir.
- Menyelesaikan: semua (gate).
- Dependency: S1–S10 selesai.
- File yang harus dibaca: `package.json` (scripts: `lint`, `test`, `build`), file plan ini sendiri.
- File yang harus diubah: file plan ini (centang Tasks + tambah Progress Log) — SATU-SATUNYA edit di langkah ini selain yang sudah selesai.
- Perintah (urutan persis, jalankan satu per satu, JANGAN paralel):
  1. `npm run lint` → expected: `No ESLint warnings or errors`.
  2. `npm test` (alias `vitest run`) → expected: semua projects `unit` + `component` passed, 0 failed.
  3. `npm run build` → expected: `Compiled successfully`, route `/[locale]/stickers` dan `/[locale]/stickers/[id]` terdaftar, tidak ada type error.
- Jika gagal: perbaiki hanya file yang menyebabkan (JANGAN refactor di luar scope); ulangi dari perintah yang gagal.
- Completion criteria: 3 gate hijau berurutan + plan file dicentang + entri `.memory/` DILARANG di langkah ini (memory adalah tugas terpisah, bukan bagian plan ini).
- Dilarang ubah: `.env*`, `supabase/config.toml`, migrasi existing, `package.json`, `package-lock.json`, `vercel.json`, `middleware.ts`, `src/env.ts`.

## Tasks
- [x] S1 migrasi moderasi (`20260922000001_sticker_moderation_flag.sql`)
- [x] S2 helper `src/lib/stickers.ts` (7 simbol)
- [x] S3 test `tests/unit/stickers-lib.test.ts` (10 kasus)
- [x] S4 list page `stickers/page.tsx` (query + tabel 9 kolom + Pagination)
- [x] S5 filter bar `stickers/_components/sticker-filter-bar.tsx` (8 field)
- [x] S6 thumb/download `stickers/_components/sticker-thumb.tsx` (2 komponen)
- [x] S7 detail page `stickers/[id]/page.tsx` (8 section)
- [x] S8 actions + flag form (`stickers/actions.ts`, `stickers/[id]/flag-form.tsx`)
- [x] S9 flag inline (`stickers/_components/flag-button.tsx`) + sambungkan ke kolom Aksi S4
- [x] S10 sidebar + i18n + 3 file test
- [x] S11 gate lint/test/build + centang plan

## Risks
- Kolom `is_flagged` belum di-apply di remote saat code deploy → select gagal (OPEN-2). Mitigasi: apply migrasi dulu via pipeline resmi sebelum deploy admin.
- Filter rating per-halaman tidak akurat untuk count (OPEN-3). Mitigasi: dokumentasikan di UI; jangan klaim akurat.
- Signed URL 60 dtk kedaluwarsa → broken image. Mitigasi: refresh halaman; tidak ada retry otomatis (keputusan sadar).
- `q` dengan koma/kurung merusak sintaks `.or()` → di-strip (S4). Sisa karakter wildcard `%_` dibiarkan sebagai fitur ilike.
- Provider hardcode di filter bar bisa basi (OPEN-4). Mitigasi: enum manual sama seperti llm-logs; distinct query ditunda.

## Progress Log
- 2026-09-22 07:00:00 — Implementation plan ditulis (belum ada eksekusi; S1–S11 pending).
- 2026-09-23 00:00:00 — S1–S11 seluruhnya selesai diimplementasi. Gate hijau: lint 0 errors, test 94 passed (18 files), build Compiled successfully dengan route `/[locale]/stickers` dan `/[locale]/stickers/[id]`.

## Notes
- Keputusan yang sudah dikunci user (2026-09-22): flag via kolom baru; download via signed URL + preview; paket filter/sort default.
- Pola yang wajib ditiru: `presets/page.tsx` (query range+count), `llm-logs/page.tsx` (enrich batch, toolbar), `log-filter-bar.tsx` (form), `presets/actions.ts` (server action), `delete-button.tsx` (modal confirm), `prompt-cell.tsx` (copy).
- Standar: TOGAF proporsional untuk fitur tunggal; tidak ada deviasi skema destruktif; RLS tidak diubah (service-role only).

## Open Questions / Blockers
- OPEN-1 (blocker penegakan, BUKAN blocker admin): query Flutter/Showcase belum filter `is_flagged=false`. Opsi: (a) ubah `get_pack_detail`/`search_showcase_listings`/query home Flutter — butuh repo main-app; (b) biarkan flag hanya badge admin. Risiko: user anggap flag = hide padahal belum. Rekomendasi: (a) sebagai plan lanjutan terpisah.
- OPEN-2: urutan apply migrasi vs deploy. Opsi: migrasi dulu lalu deploy (rekomendasi) vs code defensif (select tanpa `is_flagged` + fallback). Rekomendasi: migrasi dulu; jangan tambah fallback defensif (menambah kompleksitas tanpa nilai).
- OPEN-3: count pagination saat filter rating aktif. Opsi: per-halaman (dipilih, sederhana) vs RPC join akurat (berat). Rekomendasi: per-halaman + label jujur di UI.
- OPEN-4: daftar provider di filter (hardcode vs distinct). Opsi: hardcode 7 provider (dipilih, konsisten llm-logs) vs `select distinct` (1 query ekstra). Rekomendasi: hardcode sekarang.

## Handoff Checklist (untuk model eksekutor kecil)
- [ ] Baca S1→S11 berurutan; JANGAN mulai dari tengah (S4 butuh S2; S9 butuh S8; S10 butuh semua).
- [ ] JANGAN buat file selain yang disebut di tiap langkah (total file baru: 1 migrasi + `src/lib/stickers.ts` + 4 test + `stickers/page.tsx` + `sticker-filter-bar.tsx` + `sticker-thumb.tsx` + `stickers/[id]/page.tsx` + `stickers/actions.ts` + `flag-form.tsx` + `flag-button.tsx` = 12; edit: `AppSidebar.tsx`, `id.json`, `en.json`, file plan ini).
- [ ] Perhatian ordering: S4 mengimpor `StickerFilterBar` (S5), `StickerThumb/DownloadStickerButton` (S6), `FlagButton` (S9) SEBELUM file-file itu ada — biarkan import tertulis di S4, file menyusul di S5/S6/S9; JANGAN hapus import agar "build sementara hijau". Gate final S11 yang menentukan.
- [ ] S7 mengimpor `FlagForm` dari S8 dengan aturan sama.
- [ ] S6 memakai key i18n `stickers.download` yang baru ada di S10 — biarkan; final gate memastikan lengkap.
- [ ] JANGAN sentuh: `.env*`, `middleware.ts`, `src/env.ts`, `package.json/lock`, `vercel.json`, `supabase/config.toml`, `supabase/functions/*`, migrasi existing, RLS/policy, halaman users/llm-logs/presets/llm-config, `Pagination.tsx`, `table-styles.ts`, `tests/setup.ts`, `tests/stubs/*`, `.memory/*`.
- [ ] JANGAN jalankan migrasi ke remote, JANGAN commit, JANGAN staging — hanya buat file + `npm run lint/test/build` lokal.
- [ ] Jika salah satu gate S11 merah: perbaiki file penyebab saja, ulangi perintah yang gagal, JANGAN refactor luar scope.
- [ ] Selesai = 3 gate hijau + semua Tasks dicentang + Progress Log diisi tanggal/jam aktual.
