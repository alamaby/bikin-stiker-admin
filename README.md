# Bikin Stiker Admin

Admin dashboard untuk mengoperasikan backend Supabase `bikinstiker` (Flutter). Dibuat dengan Next.js 15 + Supabase SSR + next-intl + next-themes. Host di Vercel Free Tier.

## Fitur Tahap Awal
- **Login admin** email+password, whitelist `alam.aby.b@gmail.com`, `alamaby@gmail.com` (via `ADMIN_EMAILS` + middleware)
- **Dashboard** ringkasan: total users, new 7d/30d, generasi stiker total/7d/30d, success rate, kredit beredar, recent generations, by provider
- **Users** list + detail (wallet, subscription, recent tx/gen), search
- **LLM Config** `image_generation_configs` (route `default`/`reasoning`/`experiment`) – edit masked api_key replace-only
- **LLM Logs** `image_generation_attempt_logs` + `prompt_enhancement_logs`
- **Preset Style** `sticker_presets` CRUD text-only (no image upload)
- Responsive mobile/tablet/desktop, i18n `id`/`en`, light/dark

## Stack
Next.js 16.3.4 (App Router, RSC), React 19, TypeScript strict, Tailwind 4, shadcn/ui, next-intl, next-themes, Supabase SSR, Zod env, Vercel.

## Struktur
```
.
├── supabase/            # git submodule → github.com/alamaby/bikinstiker-supabase
│   ├── config.toml
│   ├── migrations/
│   └── functions/
├── src/
│   ├── app/
│   │   ├── page.tsx              # redirect / → /id
│   │   └── [locale]/
│   │       ├── login/page.tsx
│   │       ├── unauthorized/page.tsx
│   │       └── (admin)/
│   │           ├── page.tsx              # dashboard
│   │           ├── users/page.tsx + [id]/page.tsx
│   │           ├── llm-config/page.tsx + actions.ts
│   │           ├── llm-logs/page.tsx
│   │           └── presets/page.tsx + actions.ts
│   ├── lib/supabase/    # client/server/middleware helpers
│   ├── components/      # ui + sidebar + theme
│   ├── i18n/            # next-intl config
│   └── env.ts           # Zod env validation
├── messages/id.json, en.json
├── middleware.ts        # locale + Supabase session + whitelist gate
└── plans/2026-09-01-bikin-stiker-admin-dashboard-plan.md
```

## Setup Lokal
```bash
git clone --recurse-submodules https://github.com/alamaby/bikin-stiker-admin.git
cd bikin-stiker-admin
cp .env.example .env.local  # isi SUPABASE_URL + keys + ADMIN_EMAILS
npm install
npm run dev   # http://localhost:3000
```

Env wajib (lihat `.env.example`):
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...placeholder
SUPABASE_SECRET_KEY=sb_secret_...placeholder  # server-only
ADMIN_EMAILS=alam.aby.b@gmail.com,alamaby@gmail.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...placeholder
```

## Deploy Vercel
1. Import repo di Vercel, framework Next.js
2. Set env vars di Vercel dashboard (same keys, jangan pakai `NEXT_PUBLIC_` untuk secret)
3. Deploy – `vercel.json` sudah ada, region `sin1`

## TODO Tahap Berikutnya
- User actions: grant credits via `admin_grant_credits`, ban, tier change (saat ini list/detail only)
- Role granular `admin_users` table
- Preset image preview upload
- Charts 30d & pagination lanjutan

## Keamanan
- `SUPABASE_SECRET_KEY` hanya di server (`server-only`), tidak pernah ke client
- `api_key` di LLM config masked, replace-only (input password, kosong = keep)
- Middleware cek `user.email ∈ ADMIN_EMAILS` + RLS tetap aktif
- Jangan commit `.env*` (sudah di `.gitignore`)

## Verifikasi
```bash
npm run lint
npm run build
```
