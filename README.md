# Cuff

Blood pressure & blood sugar tracker with doctor sharing, backed by Supabase.

## 1. Set up Supabase (do this first, either hosting path)

1. Create a free project at supabase.com
2. Project Settings -> API: copy your Project URL and anon public key
3. SQL Editor -> New query -> paste the contents of `supabase-schema.sql` -> Run
4. Authentication -> Providers: make sure Email is enabled
5. (Optional for testing) Authentication -> Settings: turn off "Confirm email" so
   family members can sign up and use the app immediately

## 2. Add your keys

Copy `.env.example` to `.env` and fill in your real values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

---

## Option A: Deploy with Replit (easiest, all in browser)

1. Go to replit.com, sign up free, click "Create App" -> "Import from GitHub"
   OR click "+" -> choose a blank Node.js/Vite template and upload these files
2. In Replit's file panel, upload every file in this folder (keep the folder structure)
3. Open the "Secrets" tab (padlock icon) and add:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Open the Shell tab and run: `npm install`
5. Click Run (or type `npm run dev`)
6. Replit gives you a live public URL automatically -- share that with family

To make it a permanent, always-on URL later, use Replit's "Deploy" button
(Autoscale or Static deploy) instead of just Run.

---

## Option B: Deploy with GitHub + Vercel (more standard)

1. Create a free GitHub account, create a new repository (e.g. "cuff-app")
2. Upload all files in this folder to that repo (drag-and-drop works on
   github.com, or use `git push` if you're comfortable with git)
3. Go to vercel.com, sign up free with your GitHub account
4. Click "Add New" -> "Project", select your cuff-app repo, click Import
5. In "Environment Variables", add:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
6. Click Deploy. Vercel gives you a live URL (e.g. cuff-app.vercel.app)
   and auto-redeploys any time you push new changes to GitHub

---

## Notes

- Each family member signs up with their own real email + password on the
  "Sign up" tab, picks Patient or Doctor, and their data is private to them
  (enforced by Supabase Row Level Security -- see `supabase-schema.sql`)
- Doctors see a dropdown to pick which patient they're viewing
- This is a testing-grade setup: fine for a small trusted group, but treat
  it as a prototype rather than a compliant medical product
