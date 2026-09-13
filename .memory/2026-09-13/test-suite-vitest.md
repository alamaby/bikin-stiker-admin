# Test Suite Vitest (Fase 1–3)

Date: 2026-09-13 malam (WIB)

## Task / Problem
Menambahkan test suite Vitest sesuai `plans/2026-09-13-test-suite-plan.md`:
framework Vitest, cakupan Fase 1–3, Playwright → TODO, `npm test` jadi gate verifikasi.

## Key Files Changed
- Baru: `vitest.config.ts` (2 project unit/component, alias `@` + stub `server-only`),
  `tests/setup.ts` (jest-dom + cleanup eksplisit), `tests/stubs/server-only.ts`,
  `tests/helpers/renderWithIntl.tsx` (NextIntlClientProvider + messages/id.json asli),
  6 unit tests + 8 component tests (lihat plan untuk daftar).
- Ubah: `package.json` (+ scripts test/test:watch, devDeps vitest 3.2.4 + jsdom + RTL),
  `src/env.ts` (1 baris: trim input di `isAdminEmail`),
  `README.md` (verifikasi = lint + test + build; TODO Playwright).
- Sengaja dilepas: `@vitejs/plugin-react` (vite bawaannya bentrok tipe dengan vite vitest 3).

## Technical / Business Decisions
- Vitest 3.2.4 (bukan 5) karena repo memakai `@types/node@^20`; upgrade @types/node
  ditolak agar tidak mengganggu build Next.
- Mock `next-intl/server` di unit test dengan dict id/en inline (bukan messages asli)
  karena modul server-nya menolak environment node.
- Component tests memakai messages/id.json asli → sekaligus menjaga validitas key i18n.
- Test `isAdminEmail` menemukan inkonsistensi trim → diperbaiki di produksi (risiko nol:
  middleware selalu menerima email ternormalisasi Supabase).

## Assumptions / Risks
- Tanpa CI runner, `npm test` hanya berjalan manual sampai ditambahkan ke pipeline.
- E2E Playwright belum ada — alur login/locale/search/mobile/dark masih verifikasi manual.

## Blockers / Unresolved
- Tidak ada.

## Verification
- `npm run lint` — bersih (0 error, 0 warning).
- `npm test` — 14 files / 72 tests lolos.
- `npm run build` — lolos termasuk type-check (13 routes + middleware).

## Commit Proposal
- `test: add vitest suite for helpers, actions, middleware, and components`

## Related
- Plan: `plans/2026-09-13-test-suite-plan.md`
