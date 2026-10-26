# LifeHub: prototype (installable PWA)

Mobile-first "everything in one place" hub: **EMERGENCY, Calendar, Medical, Banking, Chat, Contacts, Social, Utilities, Add New**. Location sharing sits with Premium.
Plain HTML/CSS/JS with no build step and no backend. All data stays in the browser's `localStorage` on the device.

## Run it
- **Quickest:** open `index.html` in a browser. Everything works except the offline service worker and passkeys, which need http(s).
- **Recommended (installable PWA):** serve the folder, then open it on a phone or desktop:
  ```
  python3 -m http.server 5173      # then visit http://localhost:5173
  ```
  On a phone, choose "Add to Home Screen" (iOS Safari) or "Install app" (Android Chrome). Over a LAN you'll need HTTPS for install, camera, location and passkeys (e.g. `npx serve` behind a tunnel such as Cloudflare Tunnel or ngrok).

## First run
Onboarding asks for your name and region (AU default; NZ/US/UK/EU also available) and offers optional sample data. You then choose a sign-in method: PIN, password, passkey/biometric (real WebAuthn where supported, otherwise simulated), or Google/Apple (demo buttons).

## Files
- `index.html`, `styles.css`, `app.js`: the app (hash router, single file of logic)
- `manifest.webmanifest`, `sw.js`, `icons/`, `screenshots/`: PWA install, offline cache and store listing images
- `privacy.html`, `terms.html`, `support.html`, `delete-account.html`: store and privacy pages
- `CNAME`: custom domain name `lifehubapp.app` (GitHub Actions Pages ignores this file for domain setup; set the domain in Settings > Pages)
- `.well-known/assetlinks.json`: Android link placeholder (`[]` until a signing key exists)
- `.nojekyll`: so Pages serves dot paths such as `.well-known`

## Website
The same files are served at `https://christurtleday-hue.github.io/LifeHub/` and, once DNS and Pages are pointed, at `https://lifehubapp.app/`. Paths in the app, manifest and service worker are relative, so both addresses work. Support: support@lifehubapp.app (Chris Day, Launceston TAS).

## Import formats
- Contacts: `.vcf` (vCard, including `BDAY`), `.csv` (Google/Outlook exports: name, phone, email), `.json` array; Contact Picker API on Android Chrome. Birthday and a demo "LifeHub Premium" flag are on each contact.
- Bills: `.csv`/`.json` with `provider, category, amount, due, type` (owed or credit). Due dates show on the calendar.
- Bank transactions: `.csv` with `date, description, amount`
- Calendar: `.ics`, plus roster text or CSV such as `Mon 7:00-15:30` or `2026-11-02,09:00,17:30,Office`
- Full backup: Settings > Export / Import (JSON)

## Demo-only parts
Bank linking, balances, transfers and tap-to-pay (incl. the $0.01 fee) are simulated. Scheduled payments are calendar reminders only. Chat replies and calls are simulated. Social counts and feeds are samples. Google, Outlook and Apple calendar linking is a demo (sample events, no real account). Google/Apple sign-in is simulated. Shared contact locations are simulated pins. Labels in the app make all of this clear.

## Plans (v1.3)
- **Free (default):** everything works, including Calendar (month, week and agenda), automatic events, overlap warnings, reminders and the work-schedule wizard. One slim, dismissible "Ad" card sits at the bottom of Home only (house ads / clearly-marked sample sponsors). Never shown on Emergency, Medical ID, lock, payment/authorisation, call or Location screens. Photos are kept at standard quality (max 1080px, JPEG 0.75). Auto-refresh: Manual, 15 min or 5 min. Pull-to-refresh for everyone. Free is never deliberately slowed down. The Emergency screen can still show your current location to read out to emergency services.
- **Premium ($0.99 AUD/month, demo billing):** no ads, **Location** (your position on an OpenStreetMap map (tiles from OpenStreetMap France), and live sharing only with Premium contacts you tick one by one), full-resolution photos (JPEG 0.92 / originals kept), 1-minute and Live refresh, Midnight & Tassie Forest themes, 5 extra accent colours, glass icons, snappier animations, instant section preloading, Premium badge. Location sharing is off until you choose people and a duration (1 hour, until you stop, or always). There is no share-with-everyone option. Stopping or removing a person takes effect immediately.
- Plan screen: Settings > Plan (also "Go Premium" in the ad). Demo checkout with a confirm step + PIN/biometric, Cancel (keeps Premium to period end), Resume, Restore purchase.
- Ads plug-in point: `AD_CONFIG` / `AdSlot()` / `mountAds()` in app.js (set provider to `adsense` with your client/slot ids).
