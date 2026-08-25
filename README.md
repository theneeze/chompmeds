# ChompMeds

An arcade-style vitamin and medicine reminder for Chiara. Add and edit doses, pick a time and a sound for each one, tick them off with a satisfying chomp, and get nagged again after a custom interval if she forgets.

Built as a PWA (installable web app) because that's the only way to get real push notifications on iOS.

## What you're setting up

- **Supabase** — stores the medicine list and the tick-off history
- **Vercel** — hosts the app and runs two small serverless functions
- **cron-job.org** (free) — pings the reminder function every minute, since Vercel's own cron only runs once a day on the free Hobby plan
- **VAPID keys** — the credentials that let your server send push notifications to Chiara's phone

Takes about 15–20 minutes the first time.

---

## 1. Supabase

1. Go to [supabase.com](https://supabase.com), create a free project (any name and region, e.g. `chompmeds`).
2. Open the **SQL Editor**, paste in the contents of `supabase-schema.sql` from this folder, and run it. This creates the `medicines`, `logs`, `push_subscriptions` and `settings` tables.
3. Go to **Project Settings → API**. You'll need two values in a minute:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public key** (a long string starting with `eyJ...`)

Note: row-level security is set to allow full access with the anon key, since this is a single-user app for Chiara with no login. Don't reuse this exact setup for anything with multiple people's data in it.

## 2. Generate VAPID keys

VAPID keys let your serverless function send push notifications on your behalf. Generate a pair once:

```bash
npx web-push generate-vapid-keys
```

This prints a **Public Key** and a **Private Key**. Keep both somewhere safe, you'll need them in step 4.

## 3. Fill in the app's config

Open `index.html` and edit the top of the `<script>` block:

```js
const SUPABASE_URL = "https://xxxxx.supabase.co";       // from step 1
const SUPABASE_ANON_KEY = "eyJ...";                       // from step 1
const VAPID_PUBLIC_KEY = "your-public-key-here";          // from step 2
```

## 4. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**, and either drag-and-drop this whole `chompmeds` folder or push it to a Git repo and import it.
2. Vercel auto-detects the `api/` folder as serverless functions and serves everything else (`index.html`, `sw.js`, `manifest.json`, `icons/`) as static files. No framework preset needed.
3. Once it's created, go to **Settings → Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | same as above |
   | `SUPABASE_ANON_KEY` | same as above |
   | `VAPID_PUBLIC_KEY` | from step 2 |
   | `VAPID_PRIVATE_KEY` | from step 2 |
   | `VAPID_SUBJECT` | `mailto:you@example.com` (any email, required by the push spec) |
   | `CRON_SECRET` | any random string you make up, protects the reminder endpoint (see step 5) |

4. Redeploy (Deployments → ⋯ → Redeploy) so the functions pick up the environment variables and install `web-push` / `@supabase/supabase-js` from `package.json`.

## 5. Make reminders actually fire on time

**Important**: Vercel's free Hobby plan only allows cron jobs to run once a day, so it can't be used to check every minute. `vercel.json` deliberately has no `crons` block, an external scheduler does this job instead, for free:

1. Go to [cron-job.org](https://cron-job.org) and create a free account.
2. Create a new cron job that hits, every 1 minute:
   ```
   https://YOUR-PROJECT.vercel.app/api/send-reminders?key=YOUR_CRON_SECRET
   ```
   (use the same random string you set as `CRON_SECRET` above)
3. Save it. That's the entire scheduling engine, it's a plain HTTP GET on a timer.

## 6. Get it onto Chiara's iPhone

This is the important bit for iOS. A normal Safari tab **cannot** receive push notifications, the app has to be added to the Home Screen first.

1. On her iPhone, open the ChompMeds URL in **Safari** (must be Safari, not Chrome).
2. Tap the **Share** icon (square with an arrow) → **Add to Home Screen** → **Add**.
3. Open ChompMeds from the new home screen icon (not from Safari).
4. Go to the **Settings** tab inside the app and tap **Enable notifications**, then allow when iOS asks.

From then on, reminders arrive as real push notifications even when the app is closed.

## Add the first vitamins and medicines

Open the **All meds** tab, tap **+**, and fill in name, time, days, sound and how long to wait before nagging again. She can edit or delete any entry the same way, and tick things off from the **Today** tab.

## A few things worth knowing

- **Notification sounds**: iOS doesn't allow custom sound files in background push notifications, only the system alert sound. The funny custom arcade sounds (chomp, siren, coin, etc.) play whenever the app is actually open, including the moment she taps a notification to open it.
- **Funny messages**: a rotating set of arcade-themed one-liners lives in `lib/messages.js` if you ever want to add more or change the tone.
- **Nagging**: once a dose is due, it keeps reminding every N minutes (set per medicine) until she ticks it off. There's no cut-off, it'll nag all day if ignored.
- **Timezone**: set once in the app's Settings tab. All times are based on that, not the phone's clock, so it stays correct even across time zone changes.
- **Why cron-job.org instead of Vercel Cron**: Vercel Hobby caps cron at once a day; Pro allows per-minute cron natively if you'd rather pay for that than use an external pinger.
