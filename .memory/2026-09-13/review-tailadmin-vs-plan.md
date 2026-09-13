# Review: TailAdmin Implementation vs Plan (2026-09-13 malam)

Scope review: branch `main`, commit `adc2611` + `e5d99f7` vs
`plans/2026-09-13-tailadmin-layout-migration-plan.md`.
Verification gates repo: `npm run lint`, `npm run build` (tidak ada test suite).

## Status kesesuaian
SESUAI DENGAN CATATAN — semua item scope plan terimplementasi (shell, tema penuh,
4 tabel + filter, dashboard + breadcrumb, modal/alert/dropdown, login/unauthorized,
bersih-bersih, atribusi MIT). Review ini menemukan 1 regresi, 1 regresi parsial,
dan 2 temuan kecil dalam scope — semuanya diperbaiki di commit lanjutan ini.
Sisa temuan di luar scope didokumentasikan dan TIDAK dikerjakan.

## Temuan dalam scope (diperbaiki)
1. F1 [HIGH — regresi] `switchLocale` header (`src/layout/AppHeader.tsx:44`)
   membuang halaman aktif (`router.push(`/${next}`)` → selalu dashboard).
   Implementasi lama mempertahankan path+query. Dampak: ganti bahasa dari halaman
   dalam selalu melempar ke dashboard. Root cause: penulisan ulang tanpa
   membawa logika segment-swap. Solusi: segmen locale diganti via `stripLocale`
   + `buildLocaleHref`, query dipertahankan; no-op bila locale sama.
   Verifikasi: browser /id/users?sort=balance&order=asc → klik EN →
   /en/users?sort=balance&order=asc, konten EN, filter tetap.
2. F2 [LOW — maintainability] `SidebarContext` menyimpan `activeItem`/`openSubmenu`
   + setter yang tidak dipakai siapa pun (sisa port submenu yang dibuang).
   Dampak: state mati + API menyesatkan. Solusi: hapus field/state/setter.
   Verifikasi: `npm run lint` + grep pemakaian = hanya definisi yang tersisa
   (dihapus), collapse/hover/mobile tetap lolos verifikasi browser sebelumnya.
3. F3 [MEDIUM — i18n] Copy baru hasil migrasi hardcoded Indonesia di kedua locale:
   header search, dropdown notifikasi + helper server, sign-out, judul Alert
   ("Berhasil"/"Gagal", "Login gagal", "Akses ditolak"), toolbar + header tabel
   + ringkasan Users/LLM Logs/LLM Config/Presets, PromptCell, modal hapus.
   Solusi: namespace `header` + `filters` baru, keys `common.*`, `dashboard.allLogs`,
   `presets.delete*`, `llmLogs.{type,prompt,preset,config,viewConfig,viewPreset,clearFilter,noMatch}`,
   `users.{status,date,until}`; semua pemakaian diganti `useTranslations`/`getTranslations`.
   Verifikasi: browser /en/users + /en/llm-logs (filter, header tabel "Created",
   PromptCell "Show more/Copy", ringkasan "20 users · page 1/2").
   Batasan: label form domain detail (preset/llm-config/suspend) + pesan hasil
   server action masih Indonesia — di luar scope (lihat temuan luar scope).
4. F4 [LOW — dead code] `ComponentCard.tsx` dan `ui/toaster.tsx` tak terpakai
   (tidak ada import di luar definisinya). Solusi: hapus kedua file.
   Verifikasi: `npm run lint` + `npm run build` lolos.

## Temuan di luar scope (tidak dikerjakan)
- O1 [MEDIUM] Label form domain detail (preset `Description/Role/...`,
  llm-config `Provider/Route Scope/...`, suspend `Alasan suspend...`), pesan hasil
  server action, dan empty-state detail masih Indonesia di route EN —
  pre-existing (form lama juga hardcoded), butuh namespace i18n baru per domain.
  Rekomendasi: plan i18n lanjutan terpisah.
- O2 [LOW] `README.md` menyebut struktur lama — diperbaiki seperlunya dalam
  commit ini (stack + struktur layout/context) karena menyesatkan reviewer;
  TODO Tahap Berikutnya tidak diubah (keputusan fitur milik user).
- O3 [INFO] Pagination hanya Prev/Next bernomor halaman (bukan numbered pages
  TailAdmin) — disengaja agar sesuai pola URL searchParams eksisting; bukan bug.
- O4 [INFO] Tidak ada test suite di repo (`package.json` tanpa test runner);
  verifikasi mengandalkan lint + type-check via build + verifikasi browser manual.

## Perbaikan dalam commit ini
- F1, F2, F3 (header/notifikasi/user/form judul Alert/4 filter-bar/PromptCell/
  modal hapus/header+ringkasan 4 halaman daftar), F4, touch-up README.

## Test
- Tidak ada test suite di repo; tidak ada test yang ditambah/diubah.
- Verifikasi: `npm run lint` bersih; `npm run build` lolos (13 routes, login/
  unauthorized SSG per-locale); JSON messages valid; browser desktop 1440px:
  switch ID→EN mempertahankan halaman+query, filter EN, PromptCell EN,
  ringkasan EN; mobile + dark mode sudah lolos di sesi sebelumnya.

## Risiko sisa
- Pesan hasil server action + label form domain detail masih Indonesia di EN (O1).
- Tidak ada automated test — regresi visual hanya tertangkap via verifikasi manual.

## Commit
- `fix: align implementation with plan and resolve review findings` (+ hash menyusul)
