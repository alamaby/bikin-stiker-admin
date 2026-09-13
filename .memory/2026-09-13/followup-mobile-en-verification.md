# Follow-up: Verifikasi Mobile + EN dan Perbaikan

Date: 2026-09-13 sore (WIB)

## Task / Problem
Menuntaskan 2 open items dari migrasi TailAdmin: verifikasi mobile dan locale EN di browser.

## Key Files Changed
- `src/layout/AppSidebar.tsx` — tambah `closeMobile()` (tutup drawer via `toggleMobileSidebar`
  saat link diklik; no-op di desktop karena `isMobileOpen` selalu false).
- `src/app/[locale]/layout.tsx` — tambah `setRequestLocale(locale)` + prop `locale={locale}`
  di `NextIntlClientProvider` (pola resmi next-intl 4.x; memperbaiki bug pre-existing).
- `src/app/[locale]/login/page.tsx` — pisah `LoginCard` (pakai `useSearchParams`) + `LoginBrand`,
  bungkus `LoginCard` dalam `React.Suspense` dengan skeleton fallback (solusi resmi Next.js
  missing-suspense-with-csr-bailout; bug laten yang terungkap setelah locale diperbaiki).
- `plans/2026-09-13-tailadmin-layout-migration-plan.md` — Tasks + Progress Log diperbarui.
- `.memory/README.md` — Current State / Open Items / Recent Entries diperbarui.

## Technical / Business Decisions
- Bug locale EN adalah pre-existing (ada sejak sebelum migrasi — layout lama juga tidak memanggil
  `setRequestLocale`), bukan regresi migrasi. Diperbaiki karena verifikasi EN adalah acceptance criteria.
- Perbaikan sidebar mobile mengikuti pola admin-sidebar lama (`onClick={() => setOpen(false)}`).

## Assumptions / Risks
- Asumsi: viewport mobile browser OpenChamber (390px) mewakili target 360px — layout 1 kolom
  dan drawer tidak bergantung pada lebar spesifik, jadi risiko rendah.
- Backdrop tidak terlihat terpisah di snapshot karena sidebar menutupi konten; perilaku overlay
  (fixed, z-40, klik menutup) mengikuti kode TailAdmin yang di-port mentah.

## Blockers / Unresolved
- Tidak ada.

## Verification
- Mobile 390px: sidebar tersembunyi + konten 1 kolom; drawer terbuka penuh; klik "Pengguna"
  → pindah ke /id/users + drawer menutup otomatis (sebelum perbaikan: tetap terbuka).
- Locale EN: /en/login tampil "Admin Login / Only allowlisted emails can sign in / Sign In";
  /en tampil "MENU / Dashboard / Users / MANAGE / LLM Config / ..." + konten EN; /id tetap Indonesia.
- Search header: ketik "pixazo" + Enter → /id/llm-logs?q=pixazo (190 logs, filter terisi).
- `npm run lint` bersih; `npm run build` lolos (login/unauthorized SSG per-locale);
  runtime /id/login + /en/login?next=/en/users 200 + EN benar.

## Commit Proposal
- `fix(i18n): set request locale so EN pages render English`
- Digabung dengan fix sidebar dalam satu commit lanjutan bila diinginkan.

## Related
- Plan: `plans/2026-09-13-tailadmin-layout-migration-plan.md`
- Entri utama: `.memory/2026-09-13/121300-tailadmin-layout-migration.md`
