# Progress Photo Report (Before / During / After)

Next.js + Supabase + Vercel. No login. Photos are captioned by category and shared to WhatsApp.

## Setup
1. Create a Supabase project. In SQL Editor, run `supabase/schema.sql`.
2. Copy `.env.example` to `.env.local` and fill in your Project URL and anon key (Project Settings > API).
3. `npm install` then `npm run dev` (test on a phone using your computer's network address, or deploy first).
4. Deploy: push to GitHub, import in Vercel, add the same two environment variables, deploy.

## Notes
- The WhatsApp share needs HTTPS (Vercel provides it) and a phone browser (Chrome Android / Safari iPhone).
- The user picks the WhatsApp group in the share sheet; web apps cannot auto-send to a group.
- Anyone with the link can add and view reports. Nobody can edit or delete through the app.
