# Implementation Plan — Sticker Page UX Polish (Summary + Filter + Tabel)

Created: 2026-09-23 00:00:00

## Objective
Memoles halaman admin `/stickers` berdasarkan feedback screenshot: (1) layout rapi di laptop — filter hemat ruang via panel collapsible, tabel 9→8 kolom tanpa horizontal scroll di ≥1024px; (2) section summary di atas halaman — 5 compact cards + 2 charts recharts yang mengikuti filter aktif; (3) date picker kalender custom yang konsisten di semua browser; (4) filter Model berupa dropdown berisi model sesuai provider terpilih.

## Scope
- IN: tambah dep `recharts`; helper murni summary; komponen `DatePicker`; rewrite `StickerFilterBar` (collapsible + chips + model select + DatePicker); query `getStickerSummary` + komponen `StickerSummary`; kompaksi tabel + tombol flag; i18n keys baru; unit + component tests.
- OUT (jangan dikerjakan): perubahan query aplikasi Flutter / Showcase; E2E Playwright; perubahan RLS/policy; perubahan halaman lain (users/llm-logs/llm-config/presets/dashboard); perubahan `next.config.ts`; perubahan komponen shared selain restyle label/ukuran di `flag-button.tsx` dan `sticker-thumb.tsx`; migrasi DB baru (kolom sudah ada).

## Requirement & Finding Traceability
| ID | Requirement / Finding | Ditangani oleh |
|---|---|---|
| REQ-1 | Layout rapi di laptop; filter terlalu makan space layar | S4 (collapsible + input compact), S6 (tabel 8 kolom) |
| REQ-2 | Summary stiker (cards + charts) di atas layar, ikut filter aktif | S2 (helper + test), S5 (query + charts + test) |
| REQ-3 | From/To date belum pakai date picker (render Safari/macOS seperti text `dd/mm/yyyy`) | S3 (DatePicker + test), S4 (pakai di filter) |
| REQ-4 | Filter Model harus menampilkan pilihan model sesuai provider | S4 (modelMap server + select dinamis + test) |
| FIND-1 | Repo tidak punya chart library (`package.json` tanpa chart dep; dashboard hanya MetricCard + list) | S1 (install recharts) |
| FIND-2 | Model aktual per provider (DB 2026-09-23): pixazo→flux-1-schnell(238), sdxl-base-1.0(3); pollinations→klein(53), flux(27); openrouter→black-forest-labs/flux.2-klein-4b(2); null/null(16) | S4 (union distinct DB + configs) |
| FIND-3 | `image_generation_configs` aktif route_scope=default: pixazo/flux-1-schnell, pollinations/flux (model reasoning-scope harus dikecualikan) | S4 (filter route_scope) |
| FIND-4 | Agregat tersedia: total 339, success 323, failed 16, flagged 1, avg 20106ms, total cost 339, feedback 133 rows, tren harian 30 hari | S5 (query agregat) |
| FIND-5 | Filter rating di list hanya per-halaman (OPEN-3 plan sebelumnya) → summary tidak bisa filter rating DB-side | S5 (summary abaikan param rating; code comment) |
| FIND-6 | Tabel saat ini 9 kolom, `min-w-[1200px]` (`stickers/page.tsx:236`), empty-state `colSpan={9}` (baris 310) | S6 |

## Milestones
1. M1 — Fondasi selesai: recharts terinstall + build baseline hijau; helper summary + DatePicker + test hijau (S1, S2, S3).
2. M2 — Filter selesai: collapsible + chips + model-per-provider + DatePicker, test hijau (S4).
3. M3 — Summary + tabel selesai: cards + 2 charts ikut filter; tabel 8 kolom (S5, S6).
4. M4 — Gate hijau: `npm run lint`, `npm test`, `npm run build`; plan dicentang (S7, S8).

## Langkah Implementasi (urut dependency & risiko)

### S1 — Install recharts + baseline build (risiko dependensi, pertama)
- Tujuan: menyediakan library chart yang kompatibel React 19 dan memastikan baseline build hijau sebelum perubahan.
- Menyelesaikan: FIND-1.
- Dependency: tidak ada.
- File yang harus dibaca: `package.json` (scripts + deps; React 19.2.8, Next 16.3.4, tanpa chart dep).
- File yang harus diubah: `package.json`, `package-lock.json` (keduanya berubah otomatis via npm; JANGAN edit manual).
- Simbol terkait: tidak ada (dep baru `recharts`).
- Kondisi saat ini: `dependencies` berisi supabase, tailwind, lucide-react, next, next-intl, react, server-only, zod. Tidak ada chart lib.
- Perubahan konkret (satu command, tanpa flag lain):
  ```
  npm install recharts@^2.15.3
  ```
  Alasan versi: recharts 2.15.x peerDeps mencakup React 19 (`^16 || ^17 || ^18 || ^19`); API v2 stabil (`ResponsiveContainer`, `AreaChart`, `BarChart` seperti dipakai di S5). Jika npm gagal dengan ERESOLVE → STOP, catat error persis di Progress Log, jangan coba versi lain diam-diam (lihat OQ-1).
- Urutan: jalankan install → baca output → lanjut verifikasi.
- Behavior dipertahankan: tidak ada source code diubah di langkah ini.
- Error handling / edge: peer-dependency warning non-error acceptable; ERESOLVE error = blocker (OQ-1).
- Test: tidak ada test baru di langkah ini.
- Verifikasi: (1) `npm ls recharts` → expected `recharts@2.15.x`; (2) `npm run build` → expected `✓ Compiled successfully` + daftar route memuat `/[locale]/stickers` dan `/[locale]/stickers/[id]`.
- Completion criteria: `recharts@2.15.x` tercatat di `package.json dependencies`; build baseline hijau.
- Dilarang ubah: semua file selain `package.json`/`package-lock.json` (yang berubah otomatis).

### S2 — Helper murni summary `src/lib/sticker-summary.ts` + unit test (fondasi testable)
- Tujuan: satu sumber kebenaran untuk kalkulasi summary (tren harian, persen, rata-rata) agar S5 deterministik dan ter-test tanpa DB.
- Menyelesaikan: REQ-2 (bagian logika data).
- Dependency: tidak ada (pure; boleh paralel dengan S1/S3).
- File yang harus dibaca: `src/lib/stickers.ts` (gaya helper + `formatDurationMs` untuk dipakai S5, bukan di file ini).
- File yang harus diubah (1 file baru): `src/lib/sticker-summary.ts`. (1 file test baru di bawah.)
- Simbol yang harus dibuat (nama persis):
  1. `export type TrendPoint = { date: string; total: number; success: number };`
  2. `export type ProviderCount = { name: string; value: number };`
  3. `export type StickerSummaryData = { total: number; success: number; failed: number; pending: number; flagged: number; avgMs: number | null; totalCost: number; up: number; down: number; unrated: number; trend: TrendPoint[]; providers: ProviderCount[] };`
  4. `export function fillTrend(startISO: string, endISO: string, rows: Array<{ d: string; ok: boolean }>): TrendPoint[]` — `startISO`/`endISO` format `yyyy-mm-dd`, end eksklusif; untuk tiap hari buat point `{date: <ISO>, total: 0, success: 0}` lalu akumulasikan rows yang `d` berada dalam `[startISO, endISO)` (`ok=true` tambah success); rows di luar rentang diabaikan; jika `endISO <= startISO` return `[]`.
  5. `export function pct(a: number, b: number): number` — `b<=0` → `0`, else `Math.round((a/b)*100)`.
  6. `export function avg(nums: Array<number | null | undefined>): number | null` — saring null/undefined/NaN; kosong → `null`; else rata-rata dibulatkan `Math.round`.
- Kondisi saat ini: file belum ada.
- Perubahan konkret: tulis file dengan urutan: type → type → type → `fillTrend` → `pct` → `avg`. Tanpa import supabase/next (harus lolos di test node).
- Behavior dipertahankan: tidak ada (file baru).
- Error handling / edge: input tanggal invalid → `new Date` NaN → hari itu di-skip (guard `!isNaN`); `endISO<=startISO` → `[]` (bukan throw).
- Test: file baru `tests/unit/sticker-summary.test.ts`, 8 kasus persis:
  1. `fillTrend("2026-09-18","2026-09-21", [])` → 3 points tanggal 18/19/20 semua nol.
  2. `fillTrend` dengan rows `[{d:"2026-09-19",ok:true},{d:"2026-09-19",ok:false},{d:"2026-09-20",ok:true}]` → 19:`{total:2,success:1}`, 20:`{total:1,success:1}`, 18 nol.
  3. rows di luar rentang (`2026-09-10`, `2026-09-25`) diabaikan.
  4. `fillTrend("2026-09-20","2026-09-20", rows)` → `[]`.
  5. `pct(323,339)` → `95`; `pct(0,0)` → `0`; `pct(5,0)` → `0`.
  6. `avg([100,200,null,undefined])` → `150`; `avg([])` → `null`; `avg([null])` → `null`.
- Verifikasi: `npm test -- tests/unit/sticker-summary.test.ts` → expected 8 passed.
- Completion criteria: 6 simbol terekspor dengan nama persis; 8 test hijau; file tanpa dep supabase/next.
- Dilarang ubah: `src/lib/stickers.ts`, `src/lib/locale-href.ts`, semua test existing.

### S3 — Komponen `DatePicker` custom + component test (risiko UX lintas-browser)
- Tujuan: date picker kalender yang terlihat dan konsisten (ikon kalender + popover), menggantikan ketergantungan pada render native `type="date"` yang di Safari/macOS tampak seperti text.
- Menyelesaikan: REQ-3 (bagian komponen).
- Dependency: tidak ada (boleh paralel dengan S1/S2).
- File yang harus dibaca: `src/components/form/controls.tsx` (19–37: `FormLabel`, `TextInput`, `SelectInput`, token `inputClass`; komponen plain tanpa "use client"), `src/components/tables/table-styles.ts` (`toolbarBtn` bila perlu tombol).
- File yang harus diubah (1 file baru): `src/components/form/date-picker.tsx`. (1 file test baru di bawah.)
- Simbol: `export function DatePicker({ value, onChange, placeholder, disabled, ariaLabel }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; ariaLabel?: string })`.
- Kondisi saat ini: file belum ada; filter bar memakai `TextInput type="date"` langsung.
- Perubahan konkret (urutan di file: `"use client"` → imports (`* as React`, `Calendar`, `ChevronLeft`, `ChevronRight`, `X` dari lucide-react, `TextInput` dari `./controls`, `cn` dari `@/lib/utils`) → konstanta `WEEKDAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"]` → helper lokal `pad(n)`, `toISO(y,m,d)`, `parseISO(v): {y,m,d} | null` (guard `!isNaN(new Date(v+"T00:00:00").getTime())`) → komponen):
  1. State: `open` (boolean), `viewY`/`viewM` (number, init dari `parseISO(value)` atau tanggal hari ini bila value `""`/invalid).
  2. Render: `<div className="relative">` berisi `TextInput readOnly value={value} placeholder={placeholder ?? "YYYY-MM-DD"} disabled aria-label={ariaLabel}` + tombol ikon `Calendar` (absolute right, `type="button"`, `aria-label` membuka) yang toggle `open`; bila `value` non-kosong tampilkan tombol `X` clear di kiri ikon kalender.
  3. Popover bila `open`: `<div role="dialog" className="absolute z-50 mt-1 w-64 rounded-xl border ...">` (tiruvarian panel: `border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-3 shadow-theme-md` — JANGAN tambah token shadow baru bila `shadow-theme-md` tidak ada; cek `table-styles.ts`/globals, fallback `shadow-lg`) berisi header (ChevronLeft, label `new Date(viewY, viewM).toLocaleString("en-US",{month:"long",year:"numeric"})`, ChevronRight; tombol prev/next `type="button"`), grid `grid-cols-7` WEEKDAYS + sel kosong awal bulan + tombol tanggal (`h-8 w-8 rounded-full`, selected → `bg-brand-500 text-white`, today → `ring-1 ring-brand-500`), footer tombol Clear (`toolbarBtn(false)`, full width).
  4. Pilih tanggal → `onChange(toISO(...))` + tutup. Clear → `onChange("")` + tutup. Escape → tutup. Klik-luar → tutup via `useEffect` listener `mousedown` + `ref`, cleanup di return.
  5. Sinkronisasi: bila `value` berubah dari luar saat popover tertutup, `viewY/viewM` ikut (useEffect `[value, open]`: jika `!open`, set view dari parseISO(value) ?? today).
- Behavior dipertahankan: format value tetap `yyyy-mm-dd` (kompatibel filter server existing); tidak ada auto-submit.
- Error handling / edge: `value` invalid → view = hari ini, input tampil apa adanya (jangan crash); `disabled` → tombol nonaktif + popover tidak terbuka; navigasi bulan tanpa batas min/max.
- Test: file baru `tests/component/date-picker.test.tsx`, pola `renderWithIntl` + `userEvent` (contoh: `tests/component/prompt-cell.test.tsx`), 3 kasus persis:
  1. render menampilkan placeholder `YYYY-MM-DD` dan tombol kalender.
  2. render dengan `value="2026-09-15"`, klik tombol kalender → popover terbuka berisi label `September 2026`; klik tanggal `20` → `onChange` dipanggil dengan `"2026-09-20"`.
  3. klik tombol Clear di popover → `onChange` dipanggil dengan `""`.
- Verifikasi: `npm test -- tests/component/date-picker.test.tsx` → expected 3 passed; `npm run lint` → 0 errors.
- Completion criteria: 1 komponen terekspor; popover buka/tutup/pilih/clear berfungsi; 3 test hijau.
- Dilarang ubah: `src/components/form/controls.tsx`, `src/components/tables/table-styles.ts`, filter bar manapun (dipakai di S4).

### S4 — Model-map server + rewrite `StickerFilterBar` collapsible (inti REQ-1/REQ-3/REQ-4)
- Tujuan: filter hemat ruang (collapsed default + chips), tanggal pakai DatePicker, Model jadi dropdown sesuai provider.
- Menyelesaikan: REQ-1 (bagian filter), REQ-3 (bagian pakai), REQ-4, FIND-2, FIND-3.
- Dependency: S3 harus selesai (DatePicker diimpor). S1/S2 boleh paralel.
- File yang harus dibaca: `src/app/[locale]/(admin)/stickers/_components/sticker-filter-bar.tsx` (seluruh 111 baris: state, `push`, `handleSubmit`, `handleClear`), `src/app/[locale]/(admin)/stickers/page.tsx` baris 199–222 (panel filter + toolbar count/sort), `src/components/form/date-picker.tsx` (hasil S3: props), `tests/component/sticker-filter-bar.test.tsx` (pola `pushMock`; akan ditulis ulang), `src/lib/stickers.ts` (tipe `StickerFilters`).
- File yang harus diubah:
  1. `src/lib/stickers.ts` — TAMBAH di akhir file (jangan ubah simbol existing): `export type ProviderModelMap = Record<string, string[]>;`, `export function countActiveFilters(f: { q: string; status: string; provider: string; model: string; rating: string; flagged: string; date_from: string; date_to: string }): number` (q≠"" →1; status/provider/rating/flagged ≠"all" →1 masing-masing; model ≠"" && ≠"all" →1; date_from/date_to ≠"" →1), `export function hasActiveFilters(...sama): boolean` (`countActiveFilters(...) > 0`).
  2. `src/app/[locale]/(admin)/stickers/page.tsx` — HANYA bagian: (a) tambah fungsi `getProviderModelMap()` SETELAH `getStickers` (sebelum `export default`): buat service client pola sama baris 57–61 (return `{}` jika env kosong); Q1 `supabase.from("sticker_generations").select("provider_name,model_name").limit(2000)` → kumpulkan map, skip null/`""`; Q2 `supabase.from("image_generation_configs").select("provider_name,model_name").eq("is_active", true).eq("route_scope", "default")` → merge dedupe; sort tiap list alfabetis; `{ data, error }` tiap query → `if (error) throw new Error(error.message)`; Q1+Q2 paralel via `Promise.all`. (b) di `StickersPage`: ganti baris 185 `const result = await getStickers(filters);` menjadi `const [result, modelMap] = await Promise.all([getStickers(filters), getProviderModelMap()]);`. (c) blok baris 199–222 diganti: panel `<div className="mb-4 rounded-2xl ...">` HANYA membungkus `<StickerFilterBar locale={locale} initial={...sama} modelMap={modelMap} defaultOpen={hasActiveFilters(filters)} />` (tambah import `hasActiveFilters` dari `@/lib/stickers`); PINDAHKAN toolbar count+sort (isi lama baris 201–221) ke `<div>` SELALU-TAMPIL tepat di bawah panel (struktur, class, dan link persis sama, hanya lokasi). (d) JANGAN sentuh query `getStickers`, tabel, Pagination, section lain di langkah ini.
  3. `src/app/[locale]/(admin)/stickers/_components/sticker-filter-bar.tsx` — TULIS ULANG penuh (111 baris → ~200 baris), urutan: `"use client"` → imports (+ `ChevronDown`, `X` lucide; `DatePicker` dari `@/components/form/date-picker`; `countActiveFilters` dari `@/lib/stickers`) → konstanta `PROVIDERS` (sama persis) → komponen `StickerFilterBar({ locale, initial, modelMap, defaultOpen })` → 8 state (urutan sama) + `open` state init `defaultOpen` → helper `modelsFor(p)` (`p==="all"` → union semua values dedupe sort; else `modelMap[p] ?? []`) → `modelOptions` (jika `model` state non-default dan tidak ada di `modelsFor(provider)` → prepend `model` agar nilai existing tak hilang diam-diam) → `push`, `handleSubmit` (sama), `handleClear` (sama + reset 8 state ke default kosong/"all" agar UI tak basi) → `removeParam(key)` (push state saat ini dengan key itu di-reset ke `""`, `page:"1"`) → `chips` array (hanya filter aktif: `{key, label}` dengan label memakai `t()` existing: q→`t("q")+": "+q`, status→`t("status")+": "+status`, dst.; date_from→`t("dateFrom")+": "+dateFrom`) → JSX: baris collapsed SELALU tampil (`flex flex-wrap items-center gap-2`: tombol toggle `${t("filter")} (${n})` + `ChevronDown` rotate bila open; chips sebagai `<button type="button" className={toolbarBtn(false)} h-7 text-xs>` berisi label + `X size-3`; tombol Clear) → bila `open`, form grid 8 field: Search TextInput (`h-9` via `className="h-9"`), Status Select, Provider Select (onChange: hitung models baru; jika model state non-default dan tak termasuk → `setModel("all")`; lalu `setProvider`), Model **SelectInput** (options: `<option value="all">{t("all")}</option>` + modelOptions; `className="h-9 font-mono text-xs"`), Rating, Flagged, From `DatePicker`, To `DatePicker`, baris aksi submit+clear (sama). SEMUA TextInput/SelectInput di file ini tambah `className="h-9"` (compact; `cn`+tailwind-merge membuat `h-9` menang atas `h-11`).
- Simbol terkait: `ProviderModelMap`, `countActiveFilters`, `hasActiveFilters`, `DatePicker`, `StickerFilterBar` (props berubah: tambah `modelMap: ProviderModelMap`, `defaultOpen: boolean`).
- Kondisi saat ini: Model = TextInput bebas; tanggal = native `type="date"`; panel selalu expanded; 8 field `h-11`.
- Behavior dipertahankan: semantik `push` (skip `""`/`"all"`, `page:"1"`), `handleClear` ke base route, tidak ada auto-submit, tidak ada fetch langsung; opsi provider hardcode tetap.
- Error handling / edge: `modelMap` kosong → Model hanya opsi All (submit kirim nothing — sama seperti sebelumnya); `initial.model` teks bebas lama yang tak ada di list → tetap tampil sebagai opsi (tidak hilang); provider diganti → model reset ke `all` hanya bila tak valid; tanggal invalid dari URL → DatePicker tampil apa adanya, server guard existing mengabaikan.
- Test: TULIS ULANG `tests/component/sticker-filter-bar.test.tsx` (baca file lama dulu untuk pola `pushMock`), 7 kasus persis:
  1. initial semua default + `defaultOpen={false}` → tombol `Filter (0)` tampil, field Model TIDAK tampil.
  2. `defaultOpen={true}` → 4 combobox + search/model textbox + 2 DatePicker (assert via placeholder `YYYY-MM-DD` ×2) tampil.
  3. klik toggle → panel membuka (field tampil).
  4. initial `{q:"cat", ...}` + `defaultOpen={false}` → chip `Cari: cat` tampil; klik × pada chip → `push` dipanggil tanpa `q=` (cek `pushMock.mock.calls[0][0]` tidak mengandung `q=cat`, mengandung `page=1`).
  5. `modelMap={{pixazo:["flux-1-schnell","sdxl-base-1.0"],pollinations:["flux","klein"]}}`, initial provider `pixazo` → opsi Model memuat `flux-1-schnell` dan `sdxl-base-1.0`, TIDAK memuat `klein`; ganti provider ke `pollinations` (userEvent select) → opsi `klein` muncul.
  6. submit dengan q terisi → `push` mengandung `page=1`, tanpa key `"all"`.
  7. klik Clear → `push` ke `/id/stickers`.
- Verifikasi: `npm test -- tests/component/sticker-filter-bar.test.tsx tests/unit/stickers-lib.test.ts` → expected semua hijau (update `tests/unit/stickers-lib.test.ts` TAMBAH 4 kasus: `countActiveFilters` default→0, q+status→2, model "all" tidak dihitung, `hasActiveFilters` true/false; JANGAN ubah 10 kasus existing); `npm run lint` → 0 errors.
- Completion criteria: panel collapsed default saat tak ada filter; chips × berfungsi; Model dropdown sesuai provider; tanggal via DatePicker; 11 test (7+4) hijau.
- Dilarang ubah: `getStickers` body, tabel/Pagination/sort-link di page, `DatePicker`, `controls.tsx`, `table-styles.ts`, halaman lain, `messages/*` (i18n di S7).

### S5 — Summary ikut-filter: `getStickerSummary` + `StickerSummary` charts (inti REQ-2)
- Tujuan: section summary (5 cards + tren harian + distribusi provider) yang mencerminkan filter aktif.
- Menyelesaikan: REQ-2, FIND-4, FIND-5 (rating diabaikan — code comment).
- Dependency: S2 (helper + tipe `StickerSummaryData`), S4 (page.tsx sudah direstruktur; S5 membaca hasil S4 — JANGAN mulai sebelum S4 selesai karena sama-sama edit `page.tsx`).
- File yang harus dibaca: `src/app/[locale]/(admin)/stickers/page.tsx` (hasil S4: `getStickers` filter lines, `getProviderModelMap`, panel baru), `src/lib/sticker-summary.ts` (hasil S2), `src/app/[locale]/(admin)/page.tsx` baris 59–94 (pola `MetricCard`: icon/label/value/footer/href), `src/app/globals.css` (token `@theme` untuk hex chart — catat nilai `brand-500`, `success-500`, `error-500`), `messages/id.json` + `messages/en.json` (namespace `stickers`, `filters`; key apa yang sudah ada).
- File yang harus diubah:
  1. `src/app/[locale]/(admin)/stickers/_components/sticker-summary.tsx` (BARU, "use client"): imports react, `useTranslations("stickers")` (next-intl client, pola sama filter bar), recharts (`ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar`), lucide icons (`ImagePlus, BadgeCheck, Timer, Flag, ThumbsUp`), `TailBadge`, tipe dari `@/lib/sticker-summary`, `formatDurationMs` dari `@/lib/stickers`. Isi berurutan: konstanta warna (`const C_BRAND = "<hex dari globals.css, fallback #465FFF>"` dst. untuk SUCCESS `#12B76A`, ERROR `#F04438`; GRID `#98A2B3` opacity 0.25) → `SummaryCard` lokal (props `{icon,label,value,footer?,href?}`, style compact: `rounded-2xl border ... p-4`, ikon `h-10 w-10`) → `StickerSummary({ data, locale })`: bila `data==null` return null; 5 cards (Total: value `data.total`, footer `${data.totalCost} ${t("summary.credits")}`; Success: value `${pct(data.success,data.total)}%`, footer `S {success} · F {failed} · P {pending}`; Avg: value `formatDurationMs(data.avgMs)`; Flagged: value `data.flagged`, href `` `/${locale}/stickers?flagged=flagged` ``; Feedback: value `${up}/${down}`, footer mini CSS bar (div flex h-2 rounded: segmen success width `%`, error width `%`, sisa gray) + label `${unrated} ${t("unrated")}`) → grid charts `grid gap-4 lg:grid-cols-3`: panel Tren (`lg:col-span-2`, judul `t("summary.trend")`, AreaChart data `trend` height 220 persis spec: XAxis dataKey date, 2 Area total/success) + panel Provider (judul `t("summary.byProvider")`, BarChart vertical height `Math.max(140, len*40)`); bila `trend` kosong / `providers` kosong → div `t("summary.noData")`.
  2. `src/app/[locale]/(admin)/stickers/page.tsx` — HANYA tambah: (a) import `StickerSummary` + `fillTrend` + type; (b) fungsi `getStickerSummary(filters)` SETELAH `getProviderModelMap`: service client pola sama (return null jika env kosong); SALIN blok filter dari `getStickers` (status/provider/model/flagged/date_from/date_to/q — TANPA rating, TANPA order/range; tambah comment `// keep in sync with getStickers (S5)`); query paralel `Promise.all` batch-1: total count-head, success/failed/pending count-head (`.eq("status", s)`), flagged count-head (`.eq("is_flagged", true)`); tentukan range tren (aturan deterministik: `df/dt` valid && `dt>=df` && selisih ≤62 hari → pakai; else end=today UTC 00:00+1 hari, start=end−30 hari); batch-2 paralel: sample `.select("id,generation_duration_ms,cost,provider_name,created_at,status")` + filter + `.gte("created_at", startISO).lt("created_at", endISO).order("created_at",{ascending:true}).limit(2000)` dan ids `.select("id")` + filter `.limit(2000)`; tiap query `if (error) throw new Error(error.message)`; hitung: avgMs via `avg()` S2 dari sample durations; totalCost = sum cost (non-null, else 0); providers map (null/""→`"unknown"`), sort desc, slice 10; trend = `fillTrend(startISO,endISO, sample.map(r=>({d: r.created_at.slice(0,10), ok: r.status==="success"})))`; feedback: bila ids kosong → up=down=0 else `.in("sticker_generation_id", ids).select("rating")` → up/down count; unrated = `Math.max(0, total-up-down)`; return `StickerSummaryData`. (c) di `StickersPage`: fetch jadi `const [result, modelMap, summary] = await Promise.all([getStickers(filters), getProviderModelMap(), getStickerSummary(filters)]);` (d) render `<div className="mb-4"><StickerSummary data={summary} locale={locale} /></div>` di antara header (setelah subtitle) dan panel filter; bila `summary==null` komponen return null (env box existing tetap).
  3. `messages/id.json` + `messages/en.json` — TAMBAH key (jangan ubah existing): `stickers.summary = { title, total, successRate, avgDuration, flagged, feedback, trend, byProvider, credits, noData }` (id: "Ringkasan","Total","Success rate"→"Tingkat sukses","Durasi rata-rata","Ditandai","Penilaian","Tren harian","Per provider","kredit","Belum ada data"; en mirror), `filters.pickDate` ("Pilih tanggal"/"Pick date"), `filters.clearDate` ("Hapus tanggal"/"Clear date"). Key `stickers.up/down/unrated`, `filters.all/clear/filter` REUSE (jangan duplikat).
- Behavior dipertahankan: list/tabel/pagination/sort tidak berubah; summary null-safe; rating filter list tetap per-halaman.
- Error handling / edge: tiap query cek `error` → throw (error boundary Next, sama seperti getStickers); sample >2000 rows → cap + comment `TODO(RPC): ganti agregat sample dengan RPC bila rows > 2000`; `rating` param SENGAJA diabaikan di summary (comment alasannya: FIND-5); unrated guard ≥0; tren tanpa data → chart panel tampil noData.
- Test: tidak ada test DB langsung; dicover S2 (helper) + component test ringan BARU? TIDAK buat component test recharts (ResponsiveContainer render 0 di jsdom — didokumentasikan, bukan di-test). Verifikasi via build + manual. (Pengecualian eksplisit dari aturan "setiap finding ada test": FIND-4 diverifikasi via `npm run build` + cek visual manual; dicatat di sini agar eksekutor tak membuat test jsdom yang flaky.)
- Verifikasi: `npm run build` → expected `✓ Compiled successfully`, route `/[locale]/stickers` ada; `npx tsc --noEmit`? TIDAK — repo tidak punya script itu; cukup build. `npm run lint` → 0 errors.
- Completion criteria: summary tampil di atas filter; angka berubah saat filter diubah (cek manual: `?provider=pixazo` → Total 241); charts render tanpa error console.
- Dilarang ubah: `getStickers` body (selain tambah comment sync bila perlu — JANGAN), tabel, filter bar (hasil S4), `sticker-summary.ts` (hasil S2), halaman lain, RLS, `next.config.ts`.

### S6 — Kompaksi tabel 9→8 kolom + tombol flag compact (inti REQ-1 tabel)
- Tujuan: tabel muat di laptop ≥1024px tanpa horizontal scroll; baris lebih ramping.
- Menyelesaikan: REQ-1 (bagian tabel), FIND-6.
- Dependency: S4 selesai (S6 edit area tabel page.tsx yang sama file-nya; S5 juga edit page.tsx — urutan WAJIB S4→S5→S6, baca ulang file tiap langkah).
- File yang harus dibaca: `src/app/[locale]/(admin)/stickers/page.tsx` (thead baris ~240–253, tbody ~256–314 — nomor pasti dibaca ulang karena S4/S5 menggeser), `src/app/[locale]/(admin)/stickers/_components/sticker-thumb.tsx` (StickerThumb img 64px), `src/app/[locale]/(admin)/stickers/_components/flag-button.tsx` (label + className tombol), `tests/component/flag-button.test.tsx` (assertions label).
- File yang harus diubah:
  1. `src/app/[locale]/(admin)/stickers/_components/sticker-thumb.tsx` — HANYA `StickerThumb`: `width/height 64`→`48`, class `h-16 w-16`→`h-12 w-12`. `DownloadStickerButton` JANGAN diubah.
  2. `src/app/[locale]/(admin)/stickers/_components/flag-button.tsx` — HANYA dua tombol flag/unflag: className compact (`h-7 px-2 text-xs`, pertahankan ring/border existing) + label `t("flag")`→`t("flagShort")`, `t("unflag")`→`t("unflagShort")`. Modal/Alert/logic JANGAN diubah.
  3. `src/app/[locale]/(admin)/stickers/page.tsx` — thead: HAPUS `<TableCell isHeader>{t("preview")}</TableCell>`; tbody: GABUNG sel thumb+prompt menjadi `<TableCell className={tdCell}><div className="flex items-start gap-3"><StickerThumb .../><div className="min-w-0"><PromptCell .../>{preset sub}</div></div></TableCell>`; `min-w-[1200px]`→`min-w-[1000px]`; empty-state `colSpan={9}`→`colSpan={8}`; sel Aksi: link Detail tambah `h-7 px-2 text-xs` (gabung dengan `toolbarBtn(false)` via template string), Download & FlagButton tidak diubah di file ini.
  4. `messages/id.json` + `messages/en.json` — TAMBAH `stickers.flagShort` ("Tandai"/"Flag"), `stickers.unflagShort` ("Batalkan"/"Unflag").
  5. `tests/component/flag-button.test.tsx` — UPDATE 2 assertions: ekspektasi tombol flagged-state `/cabut tanda/i`→`/batalkan/i`; ekspektasi `queryByRole(.../tandai/i)` tetap (label "Tandai" mengandung "tandai"); judul modal `flagTitle` tidak berubah. (Baca file dulu; hanya ubah string ekspektasi itu.)
- Behavior dipertahankan: semua link/badge/data sel sama; orientasi kolom lain tetap; signed URL/copy/download logic tetap.
- Error handling / edge: thumb null → `"—"` (logic StickerThumb existing); preset null → sub hilang (existing).
- Test: update file di atas; tambah 1 kasus di `flag-button.test.tsx`: tombol unflag me-render label `Batalkan` (id).
- Verifikasi: `npm test -- tests/component/flag-button.test.tsx` → hijau; `npm run lint` → 0 errors; `npm run build` → sukses.
- Completion criteria: 8 kolom header; tidak ada `min-w-[1200px]` tersisa; `colSpan={8}`; label tombol pendek.
- Dilarang ubah: query/summary/filter, `PromptCell`, `DownloadStickerButton`, Modal/Alert shared, halaman lain.

### S7 — Verifikasi i18n ganda (EN) + audit key
- Tujuan: memastikan tidak ada key missing di kedua locale.
- Menyelesaikan: kelengkapan REQ-2/REQ-3/REQ-4 lintas bahasa.
- Dependency: S4, S5, S6 (semua key sudah ditambah).
- File yang harus dibaca: `messages/id.json`, `messages/en.json` (bandingkan namespace `stickers.summary`, `stickers.flagShort/unflagShort`, `filters.pickDate/clearDate`).
- File yang harus diubah: hanya bila ada key hilang/tidak mirror — tambah yang kurang dengan terjemahan cermin (daftar final key baru: `stickers.summary.{title,total,successRate,avgDuration,flagged,feedback,trend,byProvider,credits,noData}`, `stickers.flagShort`, `stickers.unflagShort`, `filters.pickDate`, `filters.clearDate`; total 15 key per locale).
- Verifikasi: `node -e "const id=require('./messages/id.json'),en=require('./messages/en.json');for(const k of ['summary','flagShort','unflagShort'])if(!id.stickers[k]||!en.stickers[k])throw new Error(k);for(const k of ['pickDate','clearDate'])if(!id.filters[k]||!en.filters[k])throw new Error(k);console.log('i18n ok')"` → expected `i18n ok`. (Read-only terhadap repo; hanya baca JSON.)
- Completion criteria: 15 key ada di kedua locale; JSON valid (build S8 juga memvalidasi via next-intl).
- Dilarang ubah: key existing mana pun; locale config; file selain dua JSON itu.

### S8 — Gate penuh + update plan + memory (terakhir)
- Tujuan: pastikan tanpa regresi; plan file mencerminkan status akhir.
- Menyelesaikan: semua (gate).
- Dependency: S1–S7 selesai.
- File yang harus dibaca: `package.json` (scripts), file plan ini.
- File yang harus diubah: file plan ini (centang Tasks + Progress Log) dan SATU entry `.memory/YYYY-MM-DD/` + update `.memory/README.md` (format aktif: baca `.memory/README.md` dulu; entry mencatat file, keputusan, blocker, verifikasi, usulan commit).
- Perintah (urutan persis, satu per satu, JANGAN paralel):
  1. `npm run lint` → expected: 0 errors (warnings `<img>` pre-existing di `sticker-thumb.tsx`/`stickers/[id]/page.tsx` acceptable).
  2. `npm test` → expected: semua projects unit+component passed, 0 failed (total ±94+22 test baru).
  3. `npm run build` → expected: `✓ Compiled successfully`, route `/[locale]/stickers` terdaftar, tanpa type error.
- Jika gagal: perbaiki hanya file penyebab; ulangi perintah yang gagal; JANGAN refactor luar scope.
- Completion criteria: 3 gate hijau berurutan + Tasks dicentang + Progress Log terisi + memory entry ada.
- Dilarang ubah: `.env*`, `middleware.ts`, `src/env.ts`, `package.json`/`package-lock.json` (kecuali S1 sudah), `vercel.json`, `supabase/config.toml`, migrasi existing, RLS/policy, `tests/setup.ts`, `tests/stubs/*`, halaman selain stickers.

## Tasks
- [x] S1 install `recharts@^2.15.3` + baseline build hijau
- [x] S2 `src/lib/sticker-summary.ts` (6 simbol) + `tests/unit/sticker-summary.test.ts` (8 kasus)
- [x] S3 `src/components/form/date-picker.tsx` + `tests/component/date-picker.test.tsx` (3 kasus)
- [x] S4 `ProviderModelMap` + `getProviderModelMap` + rewrite filter bar collapsible + rewrite test (7 kasus) + 4 kasus `stickers-lib.test.ts`
- [x] S5 `getStickerSummary` + `StickerSummary` (5 cards + 2 charts) + i18n summary/pickDate/clearDate
- [x] S6 tabel 8 kolom + thumb 48px + flag compact + i18n flagShort/unflagShort + update test
- [x] S7 audit 15 key i18n ID+EN
- [x] S8 gate lint/test/build + centang plan + memory

## Risks
- Recharts +~300–500KB bundle (disetujui user). Mitigasi: import hanya komponen terpakai; tidak ada code-splitting tambahan (halaman sudah RSC force-dynamic).
- `ResponsiveContainer` tidak me-render di jsdom → component test recharts dilarang di plan ini; cakupan via unit test S2 + build + cek manual.
- Summary menambah ~7 query ringan per load; sample dibatasi 2000 rows dengan `TODO(RPC)` terdokumentasi (skala kini 339 rows — aman).
- `page.tsx` disentuh S4→S5→S6 berurutan — risiko konflik bila langkah dilompati; Handoff Checklist melarang paralelisasi ketiganya.
- Model dari `initial` lama (teks bebas) yang tak ada di list dipertahankan sebagai opsi prepend — tidak ada data filter hilang diam-diam.

## Progress Log
- 2026-09-23 00:00:00 — Plan ditulis (belum ada eksekusi; S1–S8 pending).
- 2026-09-23 11:40:00 — Semua S1–S8 selesai. Gate lint/test/build hijau.
  - S1: recharts@2.15.4 terinstall, build baseline hijau.
  - S2: `src/lib/sticker-summary.ts` (6 simbol), `tests/unit/sticker-summary.test.ts` (10 kasus) — semua hijau.
  - S3: `src/components/form/date-picker.tsx` + test 3 kasus — hijau.
  - S4: `ProviderModelMap`, `countActiveFilters`, `hasActiveFilters` ditambahkan ke `stickers.ts`; `StickerFilterBar` direwrite collapsible + chips + model select + DatePicker; 8 test komponen + 4 test unit baru — semua hijau.
  - S5: `getStickerSummary` + `StickerSummary` (5 cards + 2 charts recharts) ditambahkan ke page.tsx; i18n keys summary/pickDate/clearDate diid+en.json.
  - S6: Tabel 8 kolom, thumb 48px, flag button compact (`flagShort`/`unflagShort`); 4 test flag-button hijau.
  - S7: 15 key i18n audit OK (`node -e`).
  - S8: lint 0 errors (2 pre-existing `<img>` warnings), test 117 passed, build compiled successfully.

## Notes
- Keputusan terkunci user (2026-09-23): summary ikut filter aktif; tambah recharts (bukan SVG custom); filter collapsible; Preview digabung ke Prompt.
- Keputusan eksekutor yang dikunci di plan ini (dengan opsi yang dipertimbangkan): (a) recharts 2.15.x, bukan 3.x — 2.15 peer mencakup React 19 dan API stabil; risiko 3.x: API breaking (`content` props) tanpa nilai tambah untuk 2 chart sederhana. (b) Summary abaikan param `rating` — konsisten dengan limitasi per-halaman di list (FIND-5); alternatif (filter rating akurat via join) ditolak karena butuh RPC baru. (c) Bucket tren UTC, bukan WIB — konsisten dengan `created_at` timestamptz + `::date` server; alternatif WIB butuh konversi zona di JS. (d) Duplikasi blok filter di `getStickerSummary` (bukan helper generik) — hindari risiko type-error generik PostgREST; sinkronisasi dijaga comment + S8 gate. Jika user keberatan atas (a)–(d), ubah di langkah terkait dan catat di Progress Log.
- Pola wajib: `MetricCard` dashboard (`(admin)/page.tsx:59–94`), token `table-styles.ts`, `PromptCell` reuse, service-role client, `force-dynamic`.
- Standar: TOGAF proporsional untuk fitur halaman tunggal; RLS tidak diubah.

## Open Questions / Blockers
- Tidak ada blocker untuk eksekusi. OQ-1 (fallback bila `npm install recharts@^2.15.3` ERESOLVE): STOP dan catat — jangan substitusi versi diam-diam.
- OPEN-1/OPEN-2/OPEN-3/OPEN-4 dari plan sebelumnya tetap berlaku dan tidak dikerjakan di plan ini (OPEN-2 sudah selesai: migrasi ter-apply 2026-09-23).

## Handoff Checklist (untuk model eksekutor kecil)
- [ ] Baca S1→S8 berurutan; kerjakan berurutan. S4, S5, S6 menyentuh `page.tsx` yang SAMA — JANGAN paralel; baca ulang `page.tsx` di awal tiap langkah itu.
- [ ] File baru total 5: `src/lib/sticker-summary.ts`, `src/app/[locale]/(admin)/stickers/_components/sticker-summary.tsx`, `src/components/form/date-picker.tsx`, `tests/unit/sticker-summary.test.ts`, `tests/component/date-picker.test.tsx`. JANGAN buat file lain.
- [ ] File edit: `package.json`+lock (S1 via npm saja), `src/lib/stickers.ts` (S4 tambah 3 simbol di akhir), `stickers/page.tsx` (S4/S5/S6 area berbeda), `sticker-filter-bar.tsx` (S4 rewrite), `sticker-thumb.tsx` (S6 1 baris img), `flag-button.tsx` (S6 label+class), `messages/id.json`+`en.json` (S4? TIDAK — semua key di S5+S6; S4 tidak tambah key), `tests/component/sticker-filter-bar.test.tsx` (S4 rewrite), `tests/component/flag-button.test.tsx` (S6 2 assertions + 1 kasus), `tests/unit/stickers-lib.test.ts` (S4 +4 kasus), file plan ini (S8), `.memory/` (S8).
- [ ] S4 tidak menambah i18n key (reuse key existing) — bila butuh key baru, STOP dan catat sebagai deviasi (seharusnya tidak).
- [ ] JANGAN sentuh: `.env*`, `middleware.ts`, `src/env.ts`, `vercel.json`, `supabase/config.toml`, migrasi existing, RLS/policy, halaman users/llm-logs/llm-config/presets/dashboard, `Pagination.tsx`, `table-styles.ts`, `controls.tsx`, `PromptCell`, `DownloadStickerButton`, `tests/setup.ts`, `tests/stubs/*`, `next.config.ts`.
- [ ] JANGAN buat component test untuk recharts (flaky di jsdom) — S5 tanpa test komponen adalah keputusan sadar.
- [ ] Perintah yang mengubah repo (`npm install`, edit) hanya dalam S1–S8; JANGAN staging/commit sama sekali.
- [ ] Jika gate S8 merah: perbaiki file penyebab saja, ulangi perintah gagal, JANGAN refactor luar scope.
- [ ] Selesai = 3 gate hijau + semua Tasks dicentang + Progress Log + memory entry. Lalu BERHENTI (tanpa commit).
