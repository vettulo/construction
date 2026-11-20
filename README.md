# Construction Tracker: client demo

A static, front-end-only demo of a construction follow-up product. Foremen reply to a weekly
text (SMS or WhatsApp) and the project schedule, alerts and issues update on their own.

No backend: the login is hardcoded, the data is seeded relative to today's date, and changes
are saved in the browser (localStorage).

## Run it

```bash
npm install
npm run dev
```

## Build a static site

```bash
npm run build
```

Upload the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages, S3). It uses hash
routes and relative paths, so it works from a subfolder with no server config.

## Demo login

- Email: `demo@constructiontracker.app`
- Password: `Ct-GTTU-roP5-uSQe`

Both are prefilled on the sign-in screen. Change them in `src/config.ts`, along with the product
name (`APP_NAME`).

## Suggested demo script (about 5 minutes)

1. **Sign in** and land on the **Dashboard**: 4 projects, 2 needing attention, latest alerts,
   and who gets the next check-in on which channel.
2. Open **Northview Residences**. Walk through the schedule: Trade → Task → Line item,
   **Expand all**, **Delayed only**, the "Today" line, and the 2nd floor slab rebar: planned for
   last month and still in progress, so it shows as late. Every line item is one month of work
   with a simple status: not started, in progress or done.
3. Click **Send check-in**. A phone opens and you reply as Mike, the foreman:
   - Tap **Done**. The rebar dot fills in, the concrete bar updates, and a toast confirms it.
     (Tap **Still working** instead to see a delay alert go to the PM.)
   - Switch the phone to **WhatsApp** to show that both channels work.
   - Tap **Material didn't arrive**. Issue #12 is created and assigned to Sarah Chen.
4. Open **Issues** → the new issue, with the foreman's original message and the automatic note.
   Reply, then **Mark resolved**.
5. Open **Settings**: check-in frequency, each foreman's channel, and the alert rules
   (toggle them, or change the "days behind" threshold).
6. Show it on a phone: the whole app is responsive.

**Reset before each meeting:** avatar menu (top right) → **Reset demo data**.

## Where things live

- `src/data/seed.ts`: projects, people, alerts, issues and rules (dates are relative to today)
- `src/lib/schedule.ts`: progress against plan, delays, project health and forecast
- `src/components/Gantt.tsx`: the schedule
- `src/components/PhoneSim.tsx`: the scripted SMS / WhatsApp check-in
- `src/styles.css`: grayscale plus one accent (`--accent`)
