# Plan: Comprehensive Code Quality, UI/UX, i18n & Performance Polish (Opsi B)

Created: 2026-10-05
Scope: Penyempurnaan menyeluruh temuan P1 dan P2 dari Code Review.

## 1. Rincian Pekerjaan

### Fase 1: Bug UI/UX, Aksesibilitas & Dead Code (P1)
1. **Perbaikan CSS Class Injection** di `src/app/[locale]/(admin)/stickers/[id]/page.tsx` line 143 (`t("finalPrompt")` berada di dalam atribut `className`).
2. **Perbaikan Aksesibilitas (`aria-label`)** di `src/app/[locale]/(admin)/stickers/_components/sticker-filter-bar.tsx` line 239 (`ariaLabel={t("clearDate")}` diganti `ariaLabel={t("pickDate")}`).
3. **Pembersihan Dead Code** di `src/app/[locale]/(admin)/stickers/page.tsx` (hapus pemanggilan query `image_generation_attempt_logs` yang selalu mengembalikan `lastAttemptLatency: null`).
4. **Navigasi Notifikasi SPA** di `src/components/header/NotificationDropdown.tsx` dan `src/lib/header-notifications.ts` (sediakan `href` riil ke rute log dan gunakan `<Link>`).

### Fase 2: Performa, Middleware & Pencegahan Dark Mode FOUC (P1)
1. **Optimasi Middleware**: `src/lib/supabase/middleware.ts` dan `middleware.ts` dioptimasi agar tidak melakukan double `getUser()`.
2. **Pencegahan Dark Mode FOUC**: Tambahkan inline script pembacaan tema di `<head>` pada `src/app/layout.tsx` untuk mencegah kedipan putih sebelum React hydration.
3. **Locale-Aware Redirect**: Perbaiki `createPresetAndRedirect` di `src/app/[locale]/(admin)/presets/actions.ts` agar menerima parameter `locale` alih-alih hardcoded `/id/`.
4. **Timezone Preservation**: Format input `valid_from` & `valid_until` di `presets/actions.ts` dengan penanganan WIB (+07:00) yang konsisten.

### Fase 3: Standardisasi Internasionalisasi (i18n) (P2)
1. Perluas `messages/id.json` dan `messages/en.json` untuk mencakup label yang sebelumnya hardcoded:
   - `common`: `prev`, `next`, `createPreset`, `newPreset`, `detailAndEdit`, `viewLlmLogs`, dll.
   - `users`: `wallet`, `subscription`, `balanceAndProfile`, `recentTransactions`, `recentGenerations`, `suspendOrActivate`, dll.
   - `presets`: status validasi (`scheduled`, `expired`, `active`, `inactive`).
2. Terapkan hook translasi `useTranslations` / `getTranslations` pada:
   - `src/app/[locale]/(admin)/users/[id]/page.tsx`
   - `src/app/[locale]/(admin)/presets/new/page.tsx`
   - `src/app/[locale]/(admin)/presets/[id]/page.tsx`
   - `src/app/[locale]/(admin)/llm-config/[id]/page.tsx`
   - `src/app/[locale]/(admin)/llm-config/[id]/detail-form.tsx`
   - `src/app/[locale]/(admin)/presets/_components/detail-form.tsx`
   - `src/components/tables/Pagination.tsx`
   - `src/app/[locale]/unauthorized/page.tsx`

### Fase 4: Penguncian Versi Dependensi (P2)
1. Kunci wildcard `*` pada `package.json` ke versi spesifik terverifikasi dari `package-lock.json`.

### Fase 5: Verifikasi
1. Jalankan `npx tsc --noEmit` -> PASS (0 errors)
2. Jalankan `npm run lint` -> PASS (0 errors, 2 intended <img> warnings)
3. Jalankan `npm test` -> PASS (132/132 tests, 23 files)
4. Jalankan `npm run build` -> PASS (22 routes generated via Turbopack)
5. Dokumentasikan hasil di `.memory/` -> COMPLETED

---
Status: COMPLETED

