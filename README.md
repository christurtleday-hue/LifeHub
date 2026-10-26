# LifeHub: prototype (installable PWA)

Mobile-first "everything in one place" hub: **EMERGENCY, Medical, Banking, Chat, Contacts, Social, Utilities, Add New**.
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
- `manifest.webmanifest`, `sw.js`, `icons/`: PWA install and offline cache

## Import formats
- Contacts: `.vcf` (vCard), `.csv` (Google/Outlook exports: name, phone, email), `.json` array; Contact Picker API on Android Chrome
- Bills: `.csv`/`.json` with `provider, category, amount, due, type` (owed or credit)
- Bank transactions: `.csv` with `date, description, amount`
- Full backup: Settings > Export / Import (JSON)

## Demo-only parts
Bank linking, balances, transfers and tap-to-pay (incl. the $0.01 fee) are simulated. Chat replies and calls are simulated. Social counts and feeds are samples. Google/Apple sign-in is simulated. Labels in the app make all of this clear.

## Plans (v1.1)
- **Free (default):** everything works. One slim, dismissible "Ad" card sits at the bottom of Home only (house ads / clearly-marked sample sponsors). Never shown on Emergency, Medical ID, lock, payment/authorisation or call screens. Photos are kept at standard quality (max 1080px, JPEG 0.75). Auto-refresh: Manual, 15 min or 5 min. Pull-to-refresh for everyone. Free is never deliberately slowed down.
- **Premium ($0.99 AUD/month, demo billing):** no ads, full-resolution photos (JPEG 0.92 / originals kept), 1-minute and Live refresh, Midnight & Tassie Forest themes, 5 extra accent colours, glass icons, snappier animations, instant section preloading, Premium badge.
- Plan screen: Settings > Plan (also "Go Premium" in the ad). Demo checkout with a confirm step + PIN/biometric, Cancel (keeps Premium to period end), Resume, Restore purchase.
- Ads plug-in point: `AD_CONFIG` / `AdSlot()` / `mountAds()` in app.js (set provider to `adsense` with your client/slot ids).
