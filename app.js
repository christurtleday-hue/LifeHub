/* LifeHub prototype. All data stays on this device (localStorage). */
'use strict';
(function () {
const t = (k, v) => (window.LH ? LH.t(k, v) : k);
const KEY = 'lifehub.v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const dOff = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const TZ = 'Australia/Hobart';
function hobartNowParts(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const o = {};
  for (const p of f.formatToParts(d)) if (p.type !== 'literal') o[p.type] = p.value;
  const hh = String(o.hour).padStart(2, '0'), mm = String(o.minute).padStart(2, '0');
  return { iso: `${o.year}-${o.month}-${o.day}`, hh, mm };
}
function hobartToday() { return hobartNowParts().iso; }
function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}
function wdIndex(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
function onWeekday(want) { const t = hobartToday(); return addDays(t, (want - wdIndex(t) + 7) % 7); }
function mondayOf(iso) { const w = wdIndex(iso); return addDays(iso, w === 0 ? -6 : 1 - w); }
function weekStart() {
  try {
    const loc = new Intl.Locale(homeLocale());
    const info = typeof loc.getWeekInfo === 'function' ? loc.getWeekInfo() : loc.weekInfo;
    if (info && info.firstDay) return info.firstDay % 7;
  } catch (e) {}
  return 1;
}
function startOfWeek(iso) { const w = wdIndex(iso); return addDays(iso, -((w - weekStart() + 7) % 7)); }
function weekDayOrder() { const s = weekStart(); return [0, 1, 2, 3, 4, 5, 6].map(i => (s + i) % 7); }
function weekdayName(jsDay, style) {
  const iso = addDays('2023-01-01', jsDay);
  try { return new Date(iso + 'T00:00:00Z').toLocaleDateString(homeLocale(), { weekday: style || 'short', timeZone: 'UTC' }); }
  catch (e) { return iso; }
}
function usesHour12() {
  try {
    const c = new Intl.DateTimeFormat(homeLocale(), { hour: 'numeric' }).resolvedOptions().hourCycle;
    return c === 'h11' || c === 'h12';
  } catch (e) { return true; }
}
function fmtClock(hm) {
  if (!hm) return '';
  const [h, m] = hm.split(':').map(Number); if (Number.isNaN(h)) return hm;
  const d = new Date(Date.UTC(2020, 0, 1, h, m || 0));
  try { return new Intl.DateTimeFormat(homeLocale(), { hour: 'numeric', minute: '2-digit', timeZone: 'UTC', hourCycle: usesHour12() ? 'h12' : 'h23' }).format(d); }
  catch (e) { return hm; }
}
function fmtDay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  try { return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(homeLocale(), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); }
  catch (e) { return iso; }
}
function pctText(n) {
  const v = Number(n) || 0;
  try { return new Intl.NumberFormat(homeLocale(), { style: 'percent', maximumFractionDigits: 0 }).format(v / 100); }
  catch (e) { return Math.round(v) + '%'; }
}
function relTime(ts) {
  const diff = new Date(ts).getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = () => new Intl.RelativeTimeFormat(homeLocale(), { numeric: 'auto' });
  try {
    if (abs < 60000) return rtf().format(Math.round(diff / 1000), 'second');
    if (abs < 3600000) return rtf().format(Math.round(diff / 60000), 'minute');
    if (abs < 86400000) return rtf().format(Math.round(diff / 3600000), 'hour');
    if (abs < 7 * 86400000) return rtf().format(Math.round(diff / 86400000), 'day');
  } catch (e) {}
  return '';
}
function span(date, start, end) {
  const endDate = end <= start ? addDays(date, 1) : date;
  return { start: `${date}T${start}`, end: `${endDate}T${end}` };
}
function wallToMs(stamp) {
  const [ds, ts] = String(stamp).split('T');
  const [y, m, d] = ds.split('-').map(Number);
  const [hh, mm] = (ts || '00:00').split(':').map(Number);
  for (const off of [11, 10, 12]) {
    const utc = Date.UTC(y, m - 1, d, hh - off, mm);
    const p = hobartNowParts(new Date(utc));
    if (p.iso === ds && Number(p.hh) === hh && Number(p.mm) === mm) return utc;
  }
  return Date.UTC(y, m - 1, d, hh - 11, mm);
}
const minsAgo = n => Date.now() - n * 60000;

/* ---------- icons ---------- */
const P = {
  back: '<path d="M15 18l-6-6 6-6"/>', chev: '<path d="M9 18l6-6-6-6"/>', up: '<path d="M18 15l-6-6-6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  video: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  bank: '<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  block: '<circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
  signal: '<path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/>',
  off: '<path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>',
  micoff: '<path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8"/>',
  speaker: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
  swap: '<path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>',
  nfc: '<path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17M5 11a1.5 1.5 0 0 1 0 2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  finger: '<path d="M12 11v3a8 8 0 0 1-1.2 4.3M8 11.5a4 4 0 0 1 8 0V14a12 12 0 0 1-.6 3.8M5 12a7 7 0 0 1 12.9-3.8M19 12v1.5M4.3 7.5A9 9 0 0 1 12 3a9 9 0 0 1 4.5 1.2M9 21a14 14 0 0 0 2.6-3"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  card: '<rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
  type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
};
const ic = (n, s = 22, w = 2) => `<svg class="ic${n === 'back' || n === 'chev' || n === 'send' ? ' dir' : ''}" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

/* ---------- reference data ---------- */
const REGIONS = {
  AU: { name: 'Australia', flag: '🇦🇺', currency: 'AUD', locale: 'en-AU', primary: '000', services: [
    { name: 'Police, Fire, Ambulance', num: '000', desc: t("Life-threatening emergencies"), urgent: true },
    { name: t("Emergency from a mobile"), num: '112', desc: t("Works from any mobile network, even without credit") },
    { name: t("Text / TTY emergency"), num: '106', desc: t("For people who are deaf or have a hearing or speech impairment") },
    { name: t("SES (storm, flood)"), num: '132500', disp: '132 500', desc: t("State Emergency Service") },
    { name: t("Police Assistance Line"), num: '131444', disp: '131 444', desc: t("Non-urgent police matters") },
    { name: t("Poisons Information"), num: '131126', disp: '13 11 26', desc: t("24/7 poisons advice") },
    { name: 'Lifeline', num: '131114', disp: '13 11 14', desc: t("24/7 crisis support & suicide prevention") },
    { name: 'Healthdirect', num: '1800022222', disp: '1800 022 222', desc: t("24/7 registered nurse advice") } ] },
  NZ: { name: t("New Zealand"), flag: '🇳🇿', currency: 'NZD', locale: 'en-NZ', primary: '111', services: [
    { name: 'Police, Fire, Ambulance', num: '111', desc: t("Life-threatening emergencies"), urgent: true },
    { name: t("Police non-emergency"), num: '105', desc: t("Report things that have already happened") },
    { name: 'Healthline', num: '0800611116', disp: '0800 611 116', desc: t("24/7 health advice") },
    { name: t("Need to talk?"), num: '1737', desc: t("Free call or text, 24/7 counselling") },
    { name: t("Poisons Centre"), num: '0800764766', disp: '0800 764 766', desc: t("24/7 poisons advice") } ] },
  US: { name: t("United States"), flag: '🇺🇸', currency: 'USD', locale: 'en-US', primary: '911', services: [
    { name: 'Police, Fire, EMS', num: '911', desc: t("Life-threatening emergencies"), urgent: true },
    { name: t("988 Suicide & Crisis Lifeline"), num: '988', desc: t("Call or text, 24/7") },
    { name: t("Poison Control"), num: '18002221222', disp: '1-800-222-1222', desc: t("24/7 poison help") } ] },
  UK: { name: t("United Kingdom"), flag: '🇬🇧', currency: 'GBP', locale: 'en-GB', primary: '999', services: [
    { name: 'Police, Fire, Ambulance, Coastguard', num: '999', desc: t("Life-threatening emergencies"), urgent: true },
    { name: t("Emergency (EU standard)"), num: '112', desc: t("Also connects to UK emergency services") },
    { name: 'NHS 111', num: '111', desc: t("Urgent medical help, not life-threatening") },
    { name: t("Police non-emergency"), num: '101', desc: t("Non-urgent police matters") },
    { name: 'Samaritans', num: '116123', disp: '116 123', desc: t("24/7 emotional support") } ] },
  EU: { name: t("European Union"), flag: '🇪🇺', currency: 'EUR', locale: 'en-IE', primary: '112', services: [
    { name: t("Emergency services"), num: '112', desc: t("Works across every EU country"), urgent: true },
    { name: t("Medical on-call (where available)"), num: '116117', disp: '116 117', desc: t("Non-emergency out-of-hours doctor") },
    { name: t("Emotional support (where available)"), num: '116123', disp: '116 123', desc: t("Helpline for emotional support") },
    { name: t("Missing children"), num: '116000', disp: '116 000', desc: t("Hotline for missing children") } ] },
};
const BANNERS = {
  emergency: { title: 'EMERGENCY', icon: 'alert', color: '#d61f1f', href: '#/emergency' },
  calendar: { title: 'Calendar', icon: 'cal', color: '#1d4ed8', href: '#/calendar' },
  medical: { title: 'Medical', icon: 'cross', color: '#e0457b', href: '#/medical' },
  banking: { title: 'Banking', icon: 'bank', color: '#0f766e', href: '#/banking' },
  chat: { title: 'Chat', icon: 'msg', color: '#2557d6', href: '#/chat' },
  contacts: { title: 'Contacts', icon: 'users', color: '#7c3aed', href: '#/contacts' },
  social: { title: 'Social', icon: 'share', color: '#db2777', href: '#/social' },
  utilities: { title: 'Utilities', icon: 'zap', color: '#d97706', href: '#/utilities' },
  documents: { title: 'Documents', icon: 'file', color: '#0e7490', href: '#/documents' },
  addnew: { title: t("Add New"), icon: 'plus', color: '#475569', href: '#/addnew' },
};
const PLATFORMS = {
  facebook: { name: 'Facebook', color: '#1877f2', l: 'f', url: 'https://www.facebook.com/' },
  instagram: { name: 'Instagram', color: '#d62976', l: 'IG', url: 'https://www.instagram.com/' },
  x: { name: 'X', color: '#111111', l: '𝕏', url: 'https://x.com/' },
  tiktok: { name: 'TikTok', color: '#010101', l: '♪', url: 'https://www.tiktok.com/' },
  snapchat: { name: 'Snapchat', color: '#f7d000', l: '👻', url: 'https://www.snapchat.com/' },
  linkedin: { name: 'LinkedIn', color: '#0a66c2', l: 'in', url: 'https://www.linkedin.com/' },
  reddit: { name: 'Reddit', color: '#ff4500', l: 'r/', url: 'https://www.reddit.com/' },
  youtube: { name: 'YouTube', color: '#ff0000', l: '▶', url: 'https://www.youtube.com/' },
  threads: { name: 'Threads', color: '#000000', l: '@', url: 'https://www.threads.net/' },
  custom: { name: 'Custom', color: '#475569', l: '★', url: '' },
};
const AU_BANKS = [t("Bank of us"), t("MyState Bank"), t("Commonwealth Bank"), 'Westpac', 'NAB', 'ANZ', t("Bendigo Bank"), 'ING', 'Macquarie', t("Bank Australia"), 'Suncorp', 'BOQ', 'Up', 'ubank', t("Heritage and People's Choice")];
const AV_COLORS = ['#2557d6', '#7c3aed', '#db2777', '#0f766e', '#d97706', '#0891b2', '#4f46e5', '#be123c'];
const METHODS = {
  pin: { label: 'auth.pin', desc: 'auth.pinDesc', icon: ic('grid') },
  password: { label: 'auth.password', desc: 'auth.passwordDesc', icon: ic('lock') },
  passkey: { label: 'auth.passkey', desc: 'auth.passkeyDesc', icon: ic('finger') },
  google: { label: 'auth.google', desc: 'auth.googleDesc', icon: '<b style="color:#4285f4">G</b>' },
  apple: { label: 'auth.apple', desc: 'auth.appleDesc', icon: ic('user') },
};
function methodLabel(k) { return t((METHODS[k] || METHODS.pin).label); }
function methodDesc(k) { return t((METHODS[k] || METHODS.pin).desc); }

/* ---------- state ---------- */
let S = null;
let activeId = '';
let profileKey = null;
let registry = { active: '', ids: [] };
let creating = false;
let saveGen = 0;
const COLORS = ['#d61f1f', '#2557d6', '#0f766e', '#c2410c', '#7c3aed', '#be185d', '#0e7490', '#a16207'];
const PIN_ITERS = 120000;
function pkey(kind, id) { return 'lifehub.' + kind + '.' + (id || activeId); }
function mediaName(id) { return 'lifehub-media-' + (id || activeId); }
function readReg() { try { return JSON.parse(localStorage.getItem('lifehub.profiles') || 'null'); } catch (e) { return null; } }
function writeReg() { try { localStorage.setItem('lifehub.profiles', JSON.stringify(registry)); } catch (e) {} }
function metaOf(id) { try { return JSON.parse(localStorage.getItem(pkey('meta', id)) || 'null'); } catch (e) { return null; } }
function writeMeta(m) { try { localStorage.setItem(pkey('meta', m.id), JSON.stringify(m)); } catch (e) {} }
function isEnc(raw) { return typeof raw === 'string' && raw.startsWith('LH1:'); }
function save() {
  invalidateCache();
  if (!S || !activeId) return;
  const id = activeId, gen = ++saveGen, text = JSON.stringify(S), key = profileKey;
  const meta = metaOf(id) || { id, created: Date.now(), color: COLORS[0] };
  meta.name = (S.profile && S.profile.name) || meta.name || '';
  meta.color = (S.profile && S.profile.color) || meta.color || COLORS[0];
  meta.region = (S.profile && S.profile.region) || meta.region || 'AU';
  writeMeta(meta);
  const put = value => { if (gen !== saveGen) return; try { localStorage.setItem(pkey('data', id), value); } catch (e) { toast(t('toast.storage')); } };
  if (key) sealText(key, text).then(box => put('LH1:' + JSON.stringify(box))).catch(() => toast(t('toast.storage')));
  else put(text);
}
let unlocked = false;
let lastAct = Date.now();
function touchSession() { lastAct = Date.now(); if (unlocked && activeId && !(metaOf(activeId) || {}).lock) { try { sessionStorage.setItem('lh.session.' + activeId, JSON.stringify({ t: lastAct })); } catch (e) {} } }
function restoreSession() {
  if (!S || !S.auth || !S.auth.method || (metaOf(activeId) || {}).lock) { unlocked = !(metaOf(activeId) || {}).lock; return; }
  try {
    const u = JSON.parse(sessionStorage.getItem('lh.session.' + activeId) || 'null');
    const mins = S.settings && S.settings.lockMinutes;
    unlocked = !!(u && Date.now() - u.t < ((mins || mins === 0) ? (mins || 60) : 60) * 60000);
  } catch (e) { unlocked = false; }
  if (S.settings && S.settings.lockMinutes === 0) unlocked = true;
}
function profileLocked() {
  if (!activeId || creating) return false;
  if ((metaOf(activeId) || {}).lock) return !profileKey;
  if (!S || !S.auth || !S.auth.method) return false;
  return !unlocked;
}
function publishProfile() {
  const id = activeId || '';
  try { if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'lh-profile', id }); } catch (e) {}
  try { caches.open('lifehub-bg').then(c => c.put('./active-profile', new Response(id))).catch(() => {}); } catch (e) {}
}
function loadCalView() {
  calView = 'month';
  try { const v = localStorage.getItem(pkey('cal')); if (['day', 'week', 'month', 'agenda'].includes(v)) calView = v; } catch (e) {}
}
async function hydrate(id) {
  activeId = id;
  registry.active = id;
  writeReg();
  profileKey = null;
  if (typeof loadCalView === 'function') loadCalView();
  const raw = localStorage.getItem(pkey('data', id));
  if (isEnc(raw)) { S = null; unlocked = false; }
  else {
    try { S = raw ? JSON.parse(raw) : null; } catch (e) { S = null; }
    restoreSession();
  }
  publishProfile();
  const lang = localStorage.getItem(pkey('lang', id)) || (S && S.profile && S.profile.lang) || '';
  if (lang && window.LH) { try { await LH.load(lang); } catch (e) {} }
}
function openMediaDb(name) {
  return new Promise((res, rej) => {
    const r = indexedDB.open(name, 2);
    r.onupgradeneeded = () => { const db = r.result; ['images', 'files', 'inbox'].forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s); }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function copyDb(from, to) {
  let src; try { src = await openMediaDb(from); } catch (e) { return; }
  const dst = await openMediaDb(to);
  for (const store of ['images', 'files', 'inbox']) {
    if (!src.objectStoreNames.contains(store)) continue;
    const rows = await new Promise(r => { const q = src.transaction(store).objectStore(store); const a = q.getAll(); const k = q.getAllKeys(); let vals, keys; const done = () => { if (vals && keys) r(keys.map((id, i) => [id, vals[i]])); }; a.onsuccess = () => { vals = a.result || []; done(); }; k.onsuccess = () => { keys = k.result || []; done(); }; a.onerror = k.onerror = () => r([]); });
    if (!rows.length) continue;
    await new Promise((res, rej) => { const t = dst.transaction(store, 'readwrite'); rows.forEach(([id, val]) => t.objectStore(store).put(val, id)); t.oncomplete = res; t.onerror = () => rej(t.error); });
  }
  src.close(); dst.close();
}
function deleteDb(name) { return new Promise(res => { try { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = () => res(); } catch (e) { res(); } }); }
async function migrateLegacy() {
  if (readReg()) { registry = readReg(); return; }
  const raw = localStorage.getItem(KEY);
  registry = { active: '', ids: [] };
  if (!raw) { writeReg(); return; }
  let data = null; try { data = JSON.parse(raw); } catch (e) {}
  if (!data || !data.profile) { writeReg(); return; }
  const id = Math.random().toString(36).slice(2, 10);
  const meta = { id, name: data.profile.name || 'Me', color: COLORS[0], region: data.profile.region || 'AU', created: data.created || Date.now() };
  localStorage.setItem(pkey('meta', id), JSON.stringify(meta));
  localStorage.setItem(pkey('data', id), raw);
  [['lifehub.lang', 'lang'], ['lifehub.demoPersona', 'persona'], ['lifehub.calView', 'cal'], ['lifehub.receipt', 'receipt']].forEach(([oldK, kind]) => { const v = localStorage.getItem(oldK); if (v != null) localStorage.setItem(pkey(kind, id), v); });
  try { const oldSess = sessionStorage.getItem('lh.session'); if (oldSess) sessionStorage.setItem('lh.session.' + id, oldSess); } catch (e) {}
  try { await copyDb('lifehub-media', mediaName(id)); } catch (e) {}
  localStorage.removeItem(KEY);
  ['lifehub.lang', 'lifehub.demoPersona', 'lifehub.calView', 'lifehub.receipt'].forEach(k => localStorage.removeItem(k));
  try { sessionStorage.removeItem('lh.session'); } catch (e) {}
  await deleteDb('lifehub-media');
  registry = { active: id, ids: [id] };
  writeReg();
}
async function eraseProfile(id) {
  if (!id) return;
  ['data', 'meta', 'lang', 'persona', 'cal', 'receipt'].forEach(k => { try { localStorage.removeItem(pkey(k, id)); } catch (e) {} });
  try { sessionStorage.removeItem('lh.session.' + id); } catch (e) {}
  await deleteDb(mediaName(id));
  registry.ids = (registry.ids || []).filter(x => x !== id);
  if (activeId === id) {
    profileKey = null; S = null; unlocked = false;
    activeId = registry.ids[0] || '';
    registry.active = activeId;
    if (activeId) await hydrate(activeId);
  }
  writeReg();
  publishProfile();
}

const region = () => REGIONS[(S && S.profile && S.profile.region) || (metaOf(activeId) || {}).region] || REGIONS.AU;
const REGION_CURRENCY = {
  AU: 'AUD', NZ: 'NZD', US: 'USD', GB: 'GBP', CA: 'CAD', IE: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SI: 'EUR', SK: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
  JP: 'JPY', KR: 'KRW', IN: 'INR', BR: 'BRL', MX: 'MXN', CN: 'CNY', HK: 'HKD', TW: 'TWD', SG: 'SGD', MY: 'MYR', TH: 'THB', ID: 'IDR', PH: 'PHP', VN: 'VND',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN',
  ZA: 'ZAR', AE: 'AED', SA: 'SAR', IL: 'ILS', TR: 'TRY',
  AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN', EG: 'EGP', NG: 'NGN', KE: 'KES', PK: 'PKR', BD: 'BDT', FJ: 'FJD'
};
const EURO = new Set(['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK']);
const CURRENCY_CHOICES = ['AUD', 'NZD', 'USD', 'GBP', 'EUR', 'CAD', 'JPY', 'KRW', 'INR', 'BRL', 'MXN', 'CNY', 'HKD', 'SGD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'ZAR', 'AED'];
const LOCALE_CHOICES = ['en-AU', 'en-NZ', 'en-US', 'en-GB', 'en-CA', 'en-IN', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'];
function emergencyForCountry(country) {
  if (country === 'AU') return 'AU';
  if (country === 'NZ') return 'NZ';
  if (country === 'US') return 'US';
  if (country === 'GB') return 'UK';
  if (EURO.has(country)) return 'EU';
  return 'EU';
}
function detectMoney(langs) {
  const list = (langs && langs.length) ? langs : (typeof navigator !== 'undefined' && navigator.languages && navigator.languages.length ? [...navigator.languages] : [(typeof navigator !== 'undefined' && navigator.language) || 'en-AU']);
  let tag = list[0] || 'en-AU';
  let country = '';
  for (const item of list) {
    try {
      const loc = new Intl.Locale(item);
      const regionCode = loc.region || (loc.maximize ? loc.maximize().region : '');
      if (regionCode) { tag = loc.baseName || item; country = regionCode; break; }
    } catch (e) {}
  }
  if (!country) {
    try { const loc = new Intl.Locale(tag); country = loc.region || (loc.maximize ? loc.maximize().region : '') || ''; tag = loc.baseName || tag; } catch (e) {}
  }
  const currency = REGION_CURRENCY[country] || 'USD';
  return { locale: tag || 'en-AU', currency, country, emergency: emergencyForCountry(country) };
}
function homeCurrency() { return (S && S.profile && S.profile.currency) || 'AUD'; }
function homeLocale() { return (S && S.profile && S.profile.locale) || region().locale || 'en-AU'; }
function currencyDigits(code) {
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits; }
  catch (e) { return 2; }
}
function formatMoney(n, cur, locale) {
  const code = cur || 'AUD';
  const loc = locale || 'en-AU';
  const digits = currencyDigits(code);
  const num = Number(n);
  const safe = Number.isFinite(num) ? num : 0;
  try { return new Intl.NumberFormat(loc, { style: 'currency', currency: code, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(safe); }
  catch (e) { return safe.toFixed(digits) + ' ' + code; }
}
function money(n, cur) { return formatMoney(n, cur || homeCurrency(), homeLocale()); }
function appFee(cur) { return currencyDigits(cur || homeCurrency()) === 0 ? 1 : 0.01; }
function currencyOptionList(selected) {
  const list = [...CURRENCY_CHOICES];
  if (selected && !list.includes(selected)) list.unshift(selected);
  return list;
}
function moneyList(pairs) {
  if (!pairs || !pairs.length) return money(0);
  return pairs.map(([c, n]) => money(n, c)).join(' · ');
}
function groupSum(items, amountOf, currencyOf) {
  const map = new Map();
  (items || []).forEach(it => {
    const c = currencyOf(it) || homeCurrency();
    map.set(c, (map.get(c) || 0) + (Number(amountOf(it)) || 0));
  });
  return [...map.entries()];
}
function acctCurrency(a) { return (a && a.currency) || homeCurrency(); }
function txCurrency(t) { const a = t && acctById(t.accountId); return (t && t.currency) || (a && a.currency) || homeCurrency(); }
function premiumPrice() {
  const store = S && S.plan && S.plan.storePrice;
  if (store && typeof store.amount === 'number' && store.currency) {
    return { amount: store.amount, currency: store.currency, period: store.period || 'month', source: store.source || 'store', label: money(store.amount, store.currency) + '/' + (store.period || 'month') };
  }
  const cur = homeCurrency();
  let name = cur;
  try { name = new Intl.DisplayNames(homeLocale(), { type: 'currency' }).of(cur) || cur; } catch (e) {}
  return { amount: null, currency: cur, period: 'month', source: 'placeholder', label: t('plan.priceIn', { name }) };
}
function currencyChoices() {
  const set = new Set(CURRENCY_CHOICES);
  set.add(homeCurrency());
  (S && S.accounts || []).forEach(a => { if (a.currency) set.add(a.currency); });
  if (S && S.budget && S.budget.currency) set.add(S.budget.currency);
  return [...set];
}
function stampMissing(obj, code) {
  if (obj && !obj.currency) { obj.currency = code; return true; }
  return false;
}
function migrateMoney() {
  if (!S || !S.profile) return false;
  let changed = false;
  if (!S.profile.currency) { S.profile.currency = 'AUD'; changed = true; }
  if (!S.profile.locale) { S.profile.locale = (REGIONS[S.profile.region] || REGIONS.AU).locale || 'en-AU'; changed = true; }
  const home = S.profile.currency;
  (S.accounts || []).forEach(a => { if (stampMissing(a, home)) changed = true; });
  (S.transactions || []).forEach(t => {
    if (!t.currency) {
      const a = (S.accounts || []).find(x => x.id === t.accountId);
      t.currency = (a && a.currency) || home;
      changed = true;
    }
  });
  (S.bills || []).forEach(b => { if (stampMissing(b, home)) changed = true; });
  (S.scheduled || []).forEach(p => { if (stampMissing(p, home)) changed = true; });
  if (S.budget && typeof S.budget === 'object') {
    if (!S.budget.currency) { S.budget.currency = home; changed = true; }
    ['entries', 'bills', 'debts', 'goals'].forEach(k => {
      (S.budget[k] || []).forEach(item => { if (stampMissing(item, S.budget.currency)) changed = true; });
    });
  }
  return changed;
}
function retagCurrency(obj, prev, next) {
  if (!obj) return;
  if (!obj.currency || obj.currency === prev) obj.currency = next;
}
function setHomeMoney(locale, currency) {
  const prev = homeCurrency();
  const next = String(currency || prev).toUpperCase();
  S.profile.locale = locale || homeLocale();
  if (next !== prev) {
    (S.accounts || []).forEach(a => retagCurrency(a, prev, next));
    (S.transactions || []).forEach(t => retagCurrency(t, prev, next));
    (S.bills || []).forEach(b => retagCurrency(b, prev, next));
    (S.scheduled || []).forEach(p => retagCurrency(p, prev, next));
    if (S.budget && typeof S.budget === 'object' && (!S.budget.currency || S.budget.currency === prev)) {
      ['entries', 'bills', 'debts', 'goals'].forEach(k => (S.budget[k] || []).forEach(item => retagCurrency(item, prev, next)));
      S.budget.currency = next;
    }
    S.profile.currency = next;
    toast(t('toast.currency'));
  } else toast(t('toast.format'));
}
const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean).map(w => w[0].toUpperCase()).join('') || '?';
const avColor = s => AV_COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];
const av = (name, size) => `<span class="av" style="background:${avColor(name)}${size ? `;width:${size}px;height:${size}px` : ''}">${esc(initials(name))}</span>`;
const telHref = n => 'tel:' + String(n || '').replace(/[^\d+]/g, '');
const fmtTime = ts => { const d = new Date(ts); const now = new Date(); const rel = relTime(ts); if (rel && Math.abs(d - now) < 86400000) return rel; return d.toDateString() === now.toDateString() ? d.toLocaleTimeString(homeLocale(), { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(homeLocale(), { day: 'numeric', month: 'short' }); };
const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString(homeLocale(), { weekday: 'short', day: 'numeric', month: 'short' }) : '';
const daysUntil = s => Math.round((new Date(s + 'T00:00:00') - new Date(todayISO() + 'T00:00:00')) / 86400000);

const DEMO_PEOPLE = [
  { id: 'amara', first: 'Amara', last: 'Okonkwo', partner: 'Chidi', parent: 'Ngozi' },
  { id: 'mei', first: 'Mei', last: 'Chen', partner: 'Wei', parent: 'Lin' },
  { id: 'sofia', first: 'Sofia', last: 'Alvarez', partner: 'Mateo', parent: 'Lucia' },
  { id: 'priya', first: 'Priya', last: 'Nair', partner: 'Arjun', parent: 'Lakshmi' },
  { id: 'leila', first: 'Leila', last: 'Haddad', partner: 'Omar', parent: 'Hana' },
  { id: 'soren', first: 'Soren', last: 'Lindqvist', partner: 'Freja', parent: 'Ingrid' },
  { id: 'aisha', first: 'Aisha', last: 'Rahman', partner: 'Yusuf', parent: 'Fatima' },
  { id: 'hiro', first: 'Hiro', last: 'Tanaka', partner: 'Yuki', parent: 'Keiko' },
  { id: 'elena', first: 'Elena', last: 'Popescu', partner: 'Andrei', parent: 'Ioana' },
  { id: 'kwame', first: 'Kwame', last: 'Mensah', partner: 'Ama', parent: 'Akua' },
  { id: 'diego', first: 'Diego', last: 'Morales', partner: 'Camila', parent: 'Rosa' },
  { id: 'hana', first: 'Hana', last: 'Kim', partner: 'Minjun', parent: 'Soojin' },
  { id: 'imani', first: 'Imani', last: 'Brooks', partner: 'Malik', parent: 'Aaliyah' },
  { id: 'ananya', first: 'Ananya', last: 'Reddy', partner: 'Vikram', parent: 'Padma' },
  { id: 'noah', first: 'Noam', last: 'Benami', partner: 'Yael', parent: 'Rivka' },
  { id: 'linh', first: 'Linh', last: 'Tran', partner: 'Minh', parent: 'Hoa' },
];
function demoPersona() {
  let id = '';
  try { id = localStorage.getItem(pkey('persona')) || ''; } catch (e) {}
  if (S && S.demoPersona && !id) id = S.demoPersona;
  let person = DEMO_PEOPLE.find(p => p.id === id);
  if (!person) {
    person = DEMO_PEOPLE[Math.floor(Math.random() * DEMO_PEOPLE.length)];
    try { localStorage.setItem(activeId ? pkey('persona') : 'lifehub.demoPersona', person.id); } catch (e) {}
  }
  const plain = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return { ...person, full: person.first + ' ' + person.last, slug: plain(person.first + person.last), handle: plain(person.first) + '_' + plain(person.last) };
}
function seed(name, regionCode, sample, moneyPrefs) {
  const cur = (moneyPrefs && moneyPrefs.currency) || 'AUD';
  const locale = (moneyPrefs && moneyPrefs.locale) || 'en-AU';
  const st = {
    v: 1, created: Date.now(),
    profile: { name: name || 'Me', region: regionCode || 'AU', locale, currency: cur, lang: (moneyPrefs && moneyPrefs.lang) || (window.LH && LH.code) || 'en', location: '' },
    auth: { method: null },
    settings: { theme: 'system', textSize: 'normal', lockMinutes: 5, preferWifi: true, notify: { messages: false, emergency: false }, banners: ['emergency', 'calendar', 'medical', 'banking', 'chat', 'contacts', 'social', 'utilities', 'documents', 'addnew'].map(id => ({ id, hidden: false })) },
    medical: { bloodType: '', organDonor: false, allergies: [], conditions: [], medications: [], appointments: [], family: [], doctor: { name: '', clinic: '', phone: '' }, medicare: { number: '', irn: '', expiry: '' }, notes: '', showOnLock: true },
    accounts: [], transactions: [], contacts: [], chats: [], platforms: [], notifications: [], posts: [], bills: [], apps: [], groups: [], reports: [], scheduled: [], events: [], jobs: [],
    cal: { dismissed: [], alerted: [], notices: [], skip: {}, linked: {}, fired: [] },
    loc: { on: false, mode: '', until: null, ids: [] },
    sample: false,
  };
  if (!sample) return st;
  const who = demoPersona();
  st.sample = true;
  st.demoPersona = who.id;
  const c = (n, phone, extra = {}) => ({ id: uid(), name: n, phone, email: '', relation: '', ice: false, blocked: false, onLifeHub: true, notes: '', birthday: '', premium: false, demo: true, ...extra });
  const thu = onWeekday(4), tue = onWeekday(2), fri = onWeekday(5), tomorrow = addDays(hobartToday(), 1);
  const partnerName = who.partner + ' ' + who.last;
  const parentName = who.parent + ' ' + who.last;
  const sarah = c(partnerName, '0491 570 156', { relation: 'Partner', ice: true, email: who.slug + '@example.com', premium: true, birthday: '1991-' + thu.slice(5) });
  const mum = c(t('demo.mum', { name: parentName }), '0491 570 157', { relation: 'Mother', ice: true, birthday: '1964-03-12' });
  const jake = c(t("Jake Wilson"), '0491 570 158', { relation: 'Friend', premium: true, birthday: '1990-06-15' });
  const emma = c(t("Emma Nguyen"), '0491 570 159', { relation: 'Work' });
  const gp = c(t("Dr Anika Patel (GP)"), '(03) 6000 0000', { relation: 'Doctor', onLifeHub: false });
  const tom = c(t("Tom Bennett"), '0491 570 110', { relation: 'Neighbour', onLifeHub: false });
  st.contacts = [sarah, mum, jake, emma, gp, tom];
  st.medical = { bloodType: 'O+', organDonor: true,
    allergies: [{ id: uid(), name: 'Penicillin', severity: 'Severe', reaction: 'Hives, swelling' }, { id: uid(), name: t("Bee stings"), severity: 'Moderate', reaction: 'Swelling' }],
    conditions: [{ id: uid(), name: t("Asthma (mild)"), notes: t("Uses reliever when needed") }],
    medications: [{ id: uid(), name: t("Ventolin (salbutamol)"), dose: t("100mcg, 2 puffs as needed") }, { id: uid(), name: t("Vitamin D"), dose: '1 tablet', time: '08:00' }],
    appointments: [{ id: uid(), title: t("GP checkup"), start: tue + 'T10:30', end: tue + 'T11:15', place: t("Launceston Medical Centre (sample)"), notes: t("Bring Medicare card") }],
    family: [{ id: uid(), condition: 'Type 2 diabetes', relative: 'Father', status: t("Likely inherited") }, { id: uid(), condition: t("High cholesterol"), relative: 'Mother', status: t("Confirmed inherited") }],
    doctor: { name: t("Dr Anika Patel"), clinic: t("Launceston Medical Centre (sample)"), phone: '(03) 6000 0000' },
    medicare: { number: '2123 45670 1', irn: '1', expiry: '2029-06' }, notes: '', showOnLock: true };
  const a1 = { id: uid(), bank: t("Bank of us"), name: 'Everyday', number: '807-009 •••• 4821', balance: 2341.56, currency: cur, type: 'transaction', color: 'linear-gradient(135deg,#0f766e,#115e59)' };
  const a2 = { id: uid(), bank: t("Bank of us"), name: 'Savings', number: '807-009 •••• 9930', balance: 12480, currency: cur, type: 'savings', color: 'linear-gradient(135deg,#2557d6,#1e3a8a)' };
  const a3 = { id: uid(), bank: t("MyState Bank"), name: t("Low Rate Visa"), number: '•••• •••• •••• 5512', balance: -842.1, currency: cur, type: 'credit', color: 'linear-gradient(135deg,#334155,#0f172a)' };
  st.accounts = [a1, a2, a3];
  const txRow = (acc, days, desc, amount, cat) => ({ id: uid(), accountId: acc.id, date: dOff(-days), desc, amount, currency: cur, cat });
  st.transactions = [txRow(a1, 0, t("Banjo's Bakery Launceston"), -8.9, 'Food'), txRow(a1, 1, t("Woolworths Launceston"), -86.4, 'Groceries'), txRow(a1, 2, 'Salary', 2950, 'Income'),
    txRow(a3, 3, t("Ampol Kings Meadows"), -72.15, 'Fuel'), txRow(a1, 4, t("Transfer to Savings"), -500, 'Transfer'), txRow(a2, 4, t("Transfer from Everyday"), 500, 'Transfer'), txRow(a1, 6, t("Aurora Energy"), -212.3, 'Bills')];
  st.chats = [
    { id: uid(), contactId: sarah.id, unread: 2, messages: [{ id: uid(), me: false, text: t("Can you grab milk on the way home?"), t: minsAgo(50) }, { id: uid(), me: true, text: t("Yep, anything else?"), t: minsAgo(45) }, { id: uid(), me: false, text: t("Bread too please 🙂"), t: minsAgo(12) }, { id: uid(), me: false, text: t("And the kids want pizza Friday"), t: minsAgo(11) }] },
    { id: uid(), contactId: jake.id, unread: 1, messages: [{ id: uid(), me: false, text: t("Still on for the footy Saturday at UTAS Stadium?"), t: minsAgo(180) }] },
    { id: uid(), contactId: mum.id, unread: 0, messages: [{ id: uid(), me: true, text: t("Call you tonight Mum"), t: minsAgo(1500) }, { id: uid(), me: false, text: t("Lovely, talk then x"), t: minsAgo(1490) }] },
  ];
  st.platforms = [{ id: uid(), key: 'facebook', handle: who.full, friendReq: 2, dms: 3, demo: true }, { id: uid(), key: 'instagram', handle: '@' + who.slug, friendReq: 0, dms: 5, demo: true }, { id: uid(), key: 'x', handle: '@' + who.handle, friendReq: 0, dms: 1, demo: true }, { id: uid(), key: 'linkedin', handle: who.full, friendReq: 1, dms: 0, demo: true }];
  st.notifications = [
    { id: uid(), key: 'facebook', text: t('demo.tagged', { name: partnerName }), t: minsAgo(25), demo: true },
    { id: uid(), key: 'instagram', text: t("Jake Wilson: \"Mate, check your DMs about Saturday\""), t: minsAgo(70) },
    { id: uid(), key: 'linkedin', text: t("Priya Shah wants to connect (1 new request)"), t: minsAgo(240) },
    { id: uid(), key: 'facebook', text: t("Event reminder: Launceston Show is tomorrow"), t: minsAgo(600), eventTitle: t("Launceston Show"), eventStart: tomorrow + 'T10:00', eventEnd: tomorrow + 'T16:00' },
  ];
  const b = (provider, category, amount, due, type = 'owed', extra = {}) => ({ id: uid(), provider, category, amount, currency: cur, due, type, paid: false, reminder: true, remindDays: 3, ...extra });
  st.bills = [b('TasWater', 'Water', 182.75, dOff(-2)), b(t("Aurora Energy"), 'Electricity', 286.4, dOff(4)), b(t("Launtel NBN"), 'Internet', 89, dOff(9)), b('Telstra', 'Mobile', 65, dOff(12)), b(t("City of Launceston"), t("Council rates"), 420.5, dOff(26)), b(t("RACT Insurance"), 'Insurance', 35.2, '', 'credit', { reminder: false })];
  const g1 = { id: uid(), name: 'Shopping', emoji: '🛒', onHome: false };
  const g2 = { id: uid(), name: 'Family', emoji: '🏡', onHome: true };
  st.groups = [g1, g2];
  st.apps = [{ id: uid(), name: 'Woolworths', url: 'https://www.woolworths.com.au/', emoji: '🥦', groupId: g1.id }, { id: uid(), name: 'Coles', url: 'https://www.coles.com.au/', emoji: '🍎', groupId: g1.id }, { id: uid(), name: 'eBay', url: 'https://www.ebay.com.au/', emoji: '🏷️', groupId: g1.id },
    { id: uid(), name: t("School app"), url: 'https://www.education.tas.gov.au/', emoji: '🎒', groupId: g2.id, nextOn: tomorrow, nextLabel: t("School pickup"), nextStart: '15:00', nextEnd: '15:20' }, { id: uid(), name: t("Family calendar"), url: 'https://calendar.google.com/', emoji: '📅', groupId: g2.id }, { id: uid(), name: t("Metro Tas"), url: 'https://www.metrotas.com.au/', emoji: '🚌', groupId: '' }];
  st.scheduled = [{ id: uid(), name: 'Rent', amount: 450, currency: cur, every: 'fortnight', next: fri }];
  const budCats = [['Pay', 'income', ''], [t("Other income"), 'income', ''], ['Housing', 'expense', 'needs'], ['Groceries', 'expense', 'needs'], ['Transport', 'expense', 'needs'], ['Bills & utilities', 'expense', 'needs'], ['Health', 'expense', 'needs'], [t("Eating out"), 'expense', 'wants'], ['Fun', 'expense', 'wants'], ['Shopping', 'expense', 'wants'], ['Savings', 'expense', 'save']].map(([name, kind, group]) => ({ id: uid(), name, kind, group, limit: name === 'Groceries' ? 600 : name === 'Housing' ? 900 : name === t("Eating out") ? 200 : 0 }));
  const payCat = budCats.find(c => c.name === 'Pay');
  const grocCat = budCats.find(c => c.name === 'Groceries');
  const houseCat = budCats.find(c => c.name === 'Housing');
  const budMonth = hobartToday().slice(0, 7);
  st.budget = { currency: cur, alertAt: 80, rollover: false, extra: 0, strategy: 'snowball', categories: budCats, seen: {}, debts: [],
    entries: [{ id: uid(), catId: payCat.id, amount: 2950, date: budMonth + '-01', note: 'Salary', currency: cur }, { id: uid(), catId: grocCat.id, amount: 186.4, date: hobartToday(), note: 'Woolworths', currency: cur }],
    goals: [{ id: uid(), name: 'Holiday', target: 2000, saved: 450, due: addDays(hobartToday(), 120), currency: cur }],
    bills: [{ id: uid(), name: 'Rent', amount: 450, day: 14, catId: houseCat.id, currency: cur }] };
  const job = { id: uid(), name: t("Day job"), color: '#0f766e' };
  st.jobs = [job];
  const weekMon = mondayOf(hobartToday());
  for (let i = 0; i < 5; i++) {
    const d = addDays(weekMon, i);
    const sp = span(d, '09:00', '17:00');
    st.events.push({ id: uid(), title: t("Day job"), start: sp.start, end: sp.end, allDay: false, source: 'shift', sourceLabel: 'Work', auto: false, hidden: false, color: job.color, jobId: job.id, loc: 'Launceston', notes: '', reminderMin: 60, demo: true });
  }
  stampDemo(st);
  return st;
}
function stampDemo(st) {
  const tag = o => { if (o && typeof o === 'object') o.demo = true; };
  ['contacts', 'accounts', 'transactions', 'chats', 'platforms', 'notifications', 'bills', 'groups', 'apps', 'scheduled', 'jobs', 'events'].forEach(k => (st[k] || []).forEach(tag));
  const m = st.medical || {};
  ['allergies', 'conditions', 'medications', 'appointments', 'family'].forEach(k => (m[k] || []).forEach(tag));
  if (m.doctor) m.doctor.demo = true;
  if (m.medicare) m.medicare.demo = true;
  m.demoBlood = m.bloodType || '';
  m.demoOrgan = !!m.organDonor;
  const b = st.budget || {};
  ['categories', 'entries', 'goals', 'bills', 'debts'].forEach(k => (b[k] || []).forEach(tag));
}
function stripDemoData(state) {
  const keep = arr => (arr || []).filter(x => x && !x.demo);
  ['contacts', 'accounts', 'transactions', 'chats', 'platforms', 'notifications', 'bills', 'groups', 'apps', 'scheduled', 'jobs', 'events'].forEach(k => { state[k] = keep(state[k]); });
  const m = state.medical;
  if (m) {
    ['allergies', 'conditions', 'medications', 'appointments', 'family'].forEach(k => { m[k] = keep(m[k]); });
    if (m.doctor && m.doctor.demo) m.doctor = { name: '', clinic: '', phone: '' };
    if (m.medicare && m.medicare.demo) m.medicare = { number: '', irn: '', expiry: '' };
    if (m.demoBlood && m.bloodType === m.demoBlood) m.bloodType = '';
    if (m.demoOrgan && m.organDonor === true) m.organDonor = false;
    delete m.demoBlood; delete m.demoOrgan;
  }
  const b = state.budget;
  if (b) {
    ['categories', 'entries', 'goals', 'bills', 'debts'].forEach(k => { b[k] = keep(b[k]); });
    const ids = new Set((b.categories || []).map(c => c.id));
    b.entries = (b.entries || []).filter(e => !e.catId || ids.has(e.catId));
    b.bills = (b.bills || []).filter(x => !x.catId || ids.has(x.catId));
  }
  const cids = new Set((state.contacts || []).map(c => c.id));
  state.chats = (state.chats || []).filter(ch => cids.has(ch.contactId));
  const aids = new Set((state.accounts || []).map(a => a.id));
  state.transactions = (state.transactions || []).filter(tx => aids.has(tx.accountId));
  const gids = new Set((state.groups || []).map(g => g.id));
  (state.apps || []).forEach(a => { if (a.groupId && !gids.has(a.groupId)) a.groupId = ''; });
  state.sample = false;
}
function applyKept(fresh, kept) {
  if (!kept) return;
  const add = (dest, src) => {
    const have = new Set((dest || []).map(x => x && x.id));
    (src || []).forEach(x => { if (x && !have.has(x.id)) dest.push(x); });
  };
  ['contacts', 'accounts', 'transactions', 'chats', 'platforms', 'notifications', 'bills', 'groups', 'apps', 'scheduled', 'jobs', 'events'].forEach(k => add(fresh[k], kept[k]));
  const fm = fresh.medical || {}, km = kept.medical || {};
  ['allergies', 'conditions', 'medications', 'appointments', 'family'].forEach(k => add(fm[k], km[k]));
  if (!fm.bloodType && km.bloodType) fm.bloodType = km.bloodType;
  if (fm.doctor && !fm.doctor.name && km.doctor && km.doctor.name) fm.doctor = km.doctor;
  if (fm.medicare && !fm.medicare.number && km.medicare && km.medicare.number) fm.medicare = km.medicare;
  if (!fm.notes && km.notes) fm.notes = km.notes;
  const fb = fresh.budget || {}, kb = kept.budget || {};
  ['categories', 'entries', 'goals', 'bills', 'debts'].forEach(k => { fb[k] = fb[k] || []; add(fb[k], kb[k]); });
  if (kept.docs && kept.docs.items) {
    fresh.docs = fresh.docs || { items: [] };
    fresh.docs.items = fresh.docs.items || [];
    add(fresh.docs.items, kept.docs.items);
  }
}

/* ---------- helpers: toast, sheets, files ---------- */
let toastT;
function toast(msg) { const el = $('#toast'); if (!el) return; el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600); }
let sheetClose = null;
function openSheet(html, onMount, onClose) {
  closeSheet(true);
  const w = document.createElement('div'); w.className = 'sheet-wrap';
  w.innerHTML = `<div class="sheet-bg"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  document.body.appendChild(w); requestAnimationFrame(() => w.classList.add('open'));
  w.querySelector('.sheet-bg').onclick = () => closeSheet();
  sheetClose = onClose || null;
  const sh = w.querySelector('.sheet');
  sh.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
  if (onMount) onMount(sh);
  const f = sh.querySelector('input:not([type=checkbox]):not([type=hidden]),textarea'); if (f && !('noautofocus' in (f.dataset || {}))) setTimeout(() => f.focus({ preventScroll: true }), 260);
  return sh;
}
function closeSheet(silent) { const w = $('.sheet-wrap'); if (!w) return; const cb = sheetClose; sheetClose = null; w.remove(); if (!silent && cb) cb(); }
function confirmSheet(title, msg, okLabel = 'Confirm', danger = false) {
  return new Promise(res => { let d = false; const fin = v => { if (d) return; d = true; closeSheet(true); res(v); };
    openSheet(`<h2>${esc(title)}</h2><p class="muted">${msg}</p><div class="row gap"><button class="btn" id="cNo">${esc(t("Cancel"))}</button><button class="btn ${danger ? 'redb' : 'primary'}" id="cOk">${esc(okLabel)}</button></div>`,
      el => { $('#cNo', el).onclick = () => fin(false); $('#cOk', el).onclick = () => fin(true); }, () => fin(false)); });
}
function field(fl, v) {
  const val = v ?? fl.default ?? '';
  const lab = `<span>${esc(fl.label)}</span>`;
  if (fl.type === 'select') return `<label class="fld">${lab}<select name="${fl.k}">${fl.options.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select></label>`;
  if (fl.type === 'checkbox') return `<label class="fld chk"><input type="checkbox" name="${fl.k}" ${val ? 'checked' : ''}><span>${esc(fl.label)}</span></label>`;
  if (fl.type === 'textarea') return `<label class="fld">${lab}<textarea name="${fl.k}" placeholder="${esc(fl.ph || '')}">${esc(val)}</textarea></label>`;
  return `<label class="fld">${lab}<input name="${fl.k}" type="${fl.type || 'text'}" value="${esc(val)}" ${fl.req ? 'required' : ''} ${fl.step ? `step="${fl.step}"` : ''} ${fl.min != null ? `min="${fl.min}"` : ''} ${fl.im ? `inputmode="${fl.im}"` : ''} placeholder="${esc(fl.ph || '')}" autocomplete="off"></label>`;
}
function formSheet(cfg) {
  const v = cfg.values || {};
  openSheet(`<h2>${esc(cfg.title)}</h2>${cfg.intro ? `<p class="muted small">${cfg.intro}</p>` : ''}<form id="sheetForm" novalidate>${cfg.fields.map(fl => field(fl, v[fl.k])).join('')}
    <div class="row gap" style="margin-top:6px"><button type="button" class="btn" data-close>${esc(t("Cancel"))}</button><button class="btn primary" type="submit">${esc(cfg.submit || 'Save')}</button></div>
    ${cfg.danger ? `<button type="button" class="btn ghost danger full" id="sheetDanger" style="margin-top:8px">${ic('trash', 18)} ${esc(cfg.danger.label)}</button>` : ''}</form>`, el => {
    $('#sheetForm', el).onsubmit = async e => {
      e.preventDefault(); const f = e.target; const out = {};
      for (const fl of cfg.fields) { const inp = f.elements[fl.k]; out[fl.k] = fl.type === 'checkbox' ? inp.checked : fl.type === 'number' ? parseFloat(inp.value) : inp.value.trim(); if (fl.req && (out[fl.k] === '' || (fl.type === 'number' && isNaN(out[fl.k])))) { inp.focus(); toast(`${fl.label} ${esc(t("is required"))}`); return; } }
      const r = await cfg.onSave(out); if (r !== false) { closeSheet(true); save(); render(); }
    };
    if (cfg.danger) $('#sheetDanger', el).onclick = async () => { closeSheet(true); if (await confirmSheet(cfg.danger.label + '?', t("This cannot be undone."), cfg.danger.label, true)) { cfg.danger.fn(); save(); render(); } };
  });
}
function pickFile(accept, capture) {
  return new Promise(res => { const i = $('#fileIn'); i.value = ''; i.multiple = false; i.accept = accept || ''; if (capture) i.setAttribute('capture', capture); else i.removeAttribute('capture'); i.onchange = () => res(i.files[0] || null); i.click(); });
}
function pickFiles(accept) {
  return new Promise(res => { const i = $('#fileIn'); i.value = ''; i.multiple = true; i.accept = accept || ''; i.removeAttribute('capture'); i.onchange = () => { const files = [...(i.files || [])]; i.multiple = false; res(files); }; i.click(); });
}
const readText = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsText(f); });
function download(name, text, type = 'application/json') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function parseCSV(t) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c; }
  if (f || row.length) { row.push(f); rows.push(row); }
  const hdr = (rows.shift() || []).map(h => h.trim().toLowerCase().replace(/^\ufeff/, ''));
  return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(hdr.map((h, i) => [h, (r[i] || '').trim()])));
}
function parseVCard(t) {
  const out = []; const lines = t.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/); let cur = null;
  for (const ln of lines) { const u = ln.toUpperCase();
    if (u.startsWith('BEGIN:VCARD')) cur = { name: '', phone: '', email: '' };
    else if (u.startsWith('END:VCARD')) { if (cur && (cur.name || cur.phone)) out.push(cur); cur = null; }
    else if (cur) { const i = ln.indexOf(':'); if (i < 0) continue; const k = ln.slice(0, i).toUpperCase(), v = ln.slice(i + 1).trim();
      if (k.startsWith('FN')) cur.name = v; else if (k.startsWith('N') && !k.startsWith('NOTE') && !k.startsWith('NICK') && !cur.name) cur.name = v.split(';').filter(Boolean).reverse().join(' ');
      else if (k.includes('TEL') && !cur.phone) cur.phone = v; else if (k.includes('EMAIL') && !cur.email) cur.email = v; else if (k.startsWith('BDAY')) { const m = v.match(/(\d{4})-?(\d{2})-?(\d{2})/); cur.birthday = m ? `${m[1]}-${m[2]}-${m[3]}` : ''; } else if (k.startsWith('ORG')) cur.org = v.replace(/;/g, ' '); } }
  return out;
}
const pick = (o, ...keys) => { for (const k of Object.keys(o)) { if (keys.some(x => k.includes(x)) && o[k]) return o[k]; } return ''; };

/* ---------- auth ---------- */
async function hash(s) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lifehub:' + s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { let h = 7; for (const c of 'lifehub:' + s) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h; }
}
const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function pinKey(pin, saltB64) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(saltB64), iterations: PIN_ITERS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function sealText(key, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  return { iv: b64(iv), ct: b64(ct) };
}
async function openText(key, box) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct));
  return new TextDecoder().decode(pt);
}
const REC_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function recoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let s = '';
  for (let i = 0; i < 24; i++) s += REC_ALPHABET[bytes[i] % REC_ALPHABET.length];
  return s.match(/.{4}/g).join('-');
}
function normRecovery(s) { return String(s || '').toUpperCase().replace(/[^A-Z2-9]/g, ''); }
async function newDataKey() { return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']); }
async function wrapRaw(wrapper, dataKey) {
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', dataKey));
  return sealText(wrapper, b64(raw));
}
async function unwrapRaw(wrapper, box) {
  const raw = unb64(await openText(wrapper, box));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}
let recoveryGate = null;
let pinReset = false;
async function installPin(pin, dataKey) {
  if (!dataKey) dataKey = await newDataKey();
  const code = recoveryCode();
  const pinSalt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const recSalt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const pinK = await pinKey(pin, pinSalt);
  const recK = await pinKey(normRecovery(code), recSalt);
  const meta = metaOf(activeId) || { id: activeId, name: S.profile.name, color: (S.profile && S.profile.color) || COLORS[0], region: S.profile.region || 'AU', created: Date.now() };
  meta.name = S.profile.name;
  meta.lock = { iters: PIN_ITERS, len: String(pin).length, pinSalt, pinWrap: await wrapRaw(pinK, dataKey), recSalt, recWrap: await wrapRaw(recK, dataKey) };
  writeMeta(meta);
  profileKey = dataKey;
  S.auth = { method: 'pin', pinLen: String(pin).length, enc: true };
  const box = await sealText(dataKey, JSON.stringify(S));
  saveGen++;
  localStorage.setItem(pkey('data'), 'LH1:' + JSON.stringify(box));
  return code;
}
async function applyPin(pin) { return installPin(pin, null); }
async function openEnc(key) {
  const raw = localStorage.getItem(pkey('data')) || '';
  if (!isEnc(raw)) return false;
  S = JSON.parse(await openText(key, JSON.parse(raw.slice(4))));
  profileKey = key;
  unlocked = true;
  return true;
}
async function tryPin(pin) {
  const meta = metaOf(activeId) || {};
  try {
    if (meta.lock && meta.lock.pinWrap) {
      const pinK = await pinKey(pin, meta.lock.pinSalt);
      const dataKey = await unwrapRaw(pinK, meta.lock.pinWrap);
      return openEnc(dataKey);
    }
    if (meta.lock && meta.lock.ct) {
      const key = await pinKey(pin, meta.lock.salt);
      if (await openText(key, meta.lock) !== 'ok') return false;
      if (!(await openEnc(key))) return false;
      const code = await installPin(pin, null);
      recoveryGate = { code };
      return true;
    }
  } catch (e) { return false; }
  if (S && S.auth && S.auth.pinHash && await hash(pin) === S.auth.pinHash) {
    unlocked = true;
    try { const code = await installPin(pin, null); recoveryGate = { code }; } catch (e) {}
    return true;
  }
  return false;
}
async function tryRecovery(code) {
  const meta = metaOf(activeId) || {};
  if (!meta.lock || !meta.lock.recWrap) return 'none';
  try {
    const recK = await pinKey(normRecovery(code), meta.lock.recSalt);
    const dataKey = await unwrapRaw(recK, meta.lock.recWrap);
    if (!(await openEnc(dataKey))) return 'bad';
    pinReset = true;
    return 'ok';
  } catch (e) { return 'bad'; }
}
const passkeySupported = () => !!(window.PublicKeyCredential && navigator.credentials && window.isSecureContext);
async function createPasskey(name) {
  const cred = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'LifeHub' }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: name || 'lifehub-user', displayName: name || t("LifeHub user") },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { userVerification: 'required', residentKey: 'preferred' }, timeout: 60000 } });
  return b64(cred.rawId);
}
async function verifyPasskey() {
  if (!S.auth.credId || !passkeySupported()) return false;
  try { await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(S.auth.credId) }], userVerification: 'required', timeout: 60000 } }); return true; } catch (e) { return false; }
}
function pinLength() { const m = metaOf(activeId); if (m && m.lock && m.lock.len) return m.lock.len; return (S && S.auth && S.auth.pinLen) || 4; }
function keypadHTML(btn = 'Unlock') { return `<div class="pin-dots" id="pinDots">${'<i></i>'.repeat(pinLength())}</div><div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button type="button" class="key" data-k="${k}" aria-label="${k === '⌫' ? 'Delete' : k}">${k}</button>`).join('')}</div>`; }
function bindKeypad(root, onDone) {
  let v = ''; let busy = false; const len = pinLength(); const dots = $('#pinDots', root);
  const upd = () => $$('i', dots).forEach((d, i) => d.classList.toggle('on', i < v.length));
  const fail = () => { v = ''; upd(); dots.classList.add('shake'); setTimeout(() => dots.classList.remove('shake'), 400); if (navigator.vibrate) navigator.vibrate(120); };
  const press = x => {
    if (busy) return;
    if (x === '⌫') v = v.slice(0, -1); else if (v.length < len) v += x;
    upd();
    if (v.length === len) { const val = v; busy = true; setTimeout(() => onDone(val, () => { busy = false; fail(); }), 120); }
  };
  root.addEventListener('click', e => { const k = e.target.closest('[data-k]'); if (k) press(k.dataset.k); });
  const kh = e => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫'); };
  document.addEventListener('keydown', kh); return () => document.removeEventListener('keydown', kh);
}
function authorize(reason) {
  return new Promise(res => {
    let done = false; let unbind = null;
    const fin = v => { if (done) return; done = true; if (unbind) unbind(); closeSheet(true); res(v); };
    const m = (S && S.auth && S.auth.method) || ((metaOf(activeId) || {}).lock ? 'pin' : '');
    if (!m) { res(true); return; }
    const head = `<h2>${esc(t("Confirm it's you"))}</h2><p class="muted">${esc(reason)}</p>`;
    if (m === 'pin' || (metaOf(activeId) || {}).lock) openSheet(head + keypadHTML() + "<button class=\"btn full\" data-close>" + esc(t("Cancel")) + "</button>", el => { unbind = bindKeypad(el, async (v, fail) => { if (await tryPin(v)) fin(true); else fail(); }); }, () => fin(false));
    else if (m === 'password') openSheet(head + `<form id="pwF"><label class="fld"><span>${esc(t("Password"))}</span><input type="password" name="pw" autocomplete="current-password"></label><div class="row gap"><button type="button" class="btn" data-close>${esc(t("Cancel"))}</button><button class="btn primary">${esc(t("Confirm"))}</button></div></form>`, el => { $('#pwF', el).onsubmit = async e => { e.preventDefault(); if (await hash(e.target.pw.value) === S.auth.pwHash) fin(true); else { toast(t('auth.incorrect')); e.target.pw.select(); } }; }, () => fin(false));
    else if (m === 'passkey') openSheet(head + `<button class="bigbio" id="bio">${ic('finger', 56, 1.6)}<span>${S.auth.credId ? t("Use passkey / biometric") : t("Touch to verify (simulated)")}</span></button>${S.auth.credId ? "<button class=\"linkbtn\" id=\"bioSim\" style=\"width:100%\">" + esc(t("Device not available? Simulate (demo)")) + "</button>" : ''}<button class="btn full" data-close style="margin-top:8px">${esc(t("Cancel"))}</button>`, el => {
      $('#bio', el).onclick = async () => { if (!S.auth.credId) return fin(true); if (await verifyPasskey()) fin(true); else toast(t('auth.passkeyFail')); };
      const sim = $('#bioSim', el); if (sim) sim.onclick = () => fin(true); }, () => fin(false));
    else openSheet(head + `<button class="btn primary full" id="ssoOk">${esc(t("Continue as"))} ${esc(S.profile.name)} with ${m === 'apple' ? 'Apple' : 'Google'}</button><p class="small muted" style="margin-top:10px">${esc(t("Demo: a real build would re-authenticate with your"))} ${m === 'apple' ? t("Apple ID (Face ID / Touch ID)") : t("Google account")}.</p><button class="btn full" data-close>${esc(t("Cancel"))}</button>`, el => { $('#ssoOk', el).onclick = () => fin(true); }, () => fin(false));
  });
}
function unlock() { unlocked = true; touchSession(); checkReminders(); if (!location.hash || location.hash === '#/' || location.hash === '#/lock') location.hash = '#/home'; else render(); }
function lock() { invalidateCache(); unlocked = false; profileKey = null; if ((metaOf(activeId) || {}).lock) S = null; try { sessionStorage.removeItem('lh.session.' + activeId); } catch (e) {} closeSheet(true); render(); }

/* ---------- layout ---------- */
function legalFooter() {
  return `<footer class="legalfoot"><a href="privacy.html">${esc(t("Privacy"))}</a><a href="terms.html">${esc(t("Terms"))}</a><a href="support.html">${esc(t("Support"))}</a><a href="delete.html">${esc(t("Delete data"))}</a></footer>`;
}
function screen({ title, back = '#/home', body, right = '', cls = '', demo = '' }) {
  const line = demo ? `<p class="demoline"><span class="tag amber">${esc(t("Demo"))}</span> ${demo}</p>` : '';
  return `<header class="topbar ${cls}">${back ? `<a class="iconbtn" href="${back}" aria-label="${esc(t('common.back'))}">${ic('back')}</a>` : '<span class="iconbtn-sp"></span>'}<h1>${esc(title)}</h1><div class="tb-right">${right || '<span class="iconbtn-sp"></span>'}</div></header><main class="content">${demoBar()}${line}${body}</main>${legalFooter()}`;
}
const demoNote = txt => `<div class="notice">${ic('alert', 18)}<div>${txt}</div></div>`;
function demoBar() {
  if (!S || !S.sample) return '';
  return `<button class="demobar" data-act="leaveDemo"><span>${esc(t('demo.using'))}</span><b>${esc(t('demo.startOwn'))}</b></button>`;
}

/* ---------- onboarding ---------- */
let ob = { step: 0, name: '', region: 'AU', currency: 'AUD', locale: 'en-AU', method: 'pin', sample: true, color: '#d61f1f', adding: false };
(function initOb() { const d = detectMoney(); ob.region = d.emergency; ob.currency = d.currency; ob.locale = d.locale; })();
function renderOnboarding() {
  const dots = `<div class="onb-dots">${[0, 1, 2].map(i => `<i class="${i <= ob.step ? 'on' : ''}"></i>`).join('')}</div>`;
  let body = '';
  if (ob.step === 0) body = `<div class="logo">${ic('cross', 40, 2.4)}</div><h1>${esc(t("LifeHub"))}</h1><p class="lead">${esc(t('onb.lead'))}</p>
    <div class="feat"><div>${ic('alert')}${esc(t('onb.f1'))}</div><div>${ic('bank')}${esc(t('onb.f2'))}</div><div>${ic('msg')}${esc(t('onb.f3'))}</div><div>${ic('shield')}${esc(t('onb.f4'))}</div></div>
    <div class="spacer"></div><div class="choice"><button class="btn primary full" data-act="obDemo">${esc(t('onb.tryDemo'))}</button><button class="btn full" data-act="obScratch">${esc(t('onb.scratch'))}</button></div>
    <a class="btn ghost full red" style="margin-top:8px" href="tel:${(REGIONS[ob.region] || REGIONS.AU).primary}">${ic('phone', 18)} ${esc(t('onb.call', { num: (REGIONS[ob.region] || REGIONS.AU).primary }))}</a>`;
  if (ob.step === 1) body = `<h1>${esc(t('onb.about'))}</h1><p class="lead">${esc(t('onb.aboutLead'))}</p>
    <form id="obF"><label class="fld"><span>${esc(t('onb.name'))}</span><input name="name" value="${esc(ob.sample ? (ob.name || demoPersona().full) : ob.name)}" placeholder="${esc(t('onb.namePh', { name: demoPersona().full }))}" autocomplete="name" required></label>
    <label class="fld"><span>${esc(t('onb.region'))}</span><select name="region">${Object.entries(REGIONS).map(([k, r]) => `<option value="${k}" ${k === ob.region ? 'selected' : ''}>${r.flag} ${esc(regionLabel(k))}</option>`).join('')}</select></label>
    <label class="fld"><span>${esc(t('onb.currency'))}</span><select name="currency">${currencyOptionList(ob.currency).map(c => `<option value="${c}" ${c === ob.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <span class="fld"><span>${esc(t('prof.colour'))}</span><span class="colours">${COLORS.map(c => `<button type="button" class="${ob.color === c ? 'on' : ''}" style="background:${c}" data-act="obColor" data-c="${c}" aria-label="${esc(t('prof.colour'))}"></button>`).join('')}</span></span>
    <p class="small muted">${esc(ob.sample ? t('onb.demoChosen') : t('onb.scratchChosen'))}</p>
    <div class="spacer"></div><div class="row gap"><button type="button" class="btn" data-act="obBack">${esc(t('common.back'))}</button><button class="btn primary">${esc(t('common.continue'))}</button></div></form>`;
  if (ob.step === 2) body = `<h1>${esc(t('prof.pinTitle'))}</h1><p class="lead">${esc(t('prof.pinLead'))}</p>
    <form id="setF"><label class="fld"><span>${esc(t('PIN'))}</span><input name="a" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password"></label><label class="fld"><span>${esc(t('Confirm PIN'))}</span><input name="b" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></label>
    <div class="row gap"><button type="button" class="btn" data-act="obBack">${esc(t('common.back'))}</button><button class="btn primary">${esc(t('prof.pinSave'))}</button></div></form>
    <button class="btn ghost full" data-act="obSkipPin">${esc(t('prof.pinSkip'))}</button><p class="small muted">${esc(t('prof.noPinNote'))}</p>`;
  return `<div class="onb">${dots}${body}</div>`;
}
let pendingKeep = null;
async function finishOnboarding(pin) {
  const keep = pendingKeep; pendingKeep = null;
  const useSample = ob.sample && !(keep && keep.keepDemo);
  if (creating && activeId && S) save();
  const fresh = seed(ob.name, ob.region, useSample, { currency: ob.currency, locale: ob.locale, lang: LH.code });
  if (keep) { applyKept(fresh, keep.data); if (keep.keepDemo) fresh.sample = false; }
  fresh.profile.color = ob.color || COLORS[0];
  fresh.auth = { method: null };
  const id = Math.random().toString(36).slice(2, 10);
  if (!registry.ids) registry.ids = [];
  registry.ids.push(id);
  activeId = id; registry.active = id; writeReg();
  profileKey = null;
  S = fresh;
  writeMeta({ id, name: fresh.profile.name, color: fresh.profile.color, region: fresh.profile.region, created: Date.now() });
  try { const persona = localStorage.getItem('lifehub.demoPersona'); if (persona && !localStorage.getItem(pkey('persona', id))) localStorage.setItem(pkey('persona', id), persona); localStorage.removeItem('lifehub.demoPersona'); } catch (e) {}
  if (pin) { try { recoveryGate = { code: await applyPin(pin) }; } catch (e) { S.auth = { method: null }; save(); } }
  else save();
  unlocked = true; creating = false; touchSession(); publishProfile();
  ob = { step: 0, name: '', region: ob.region, currency: ob.currency, locale: ob.locale, method: 'pin', sample: true, color: COLORS[0], adding: false };
  location.hash = '#/home'; render(); toast(t('onb.welcome', { name: S.profile.name.split(' ')[0] }));
}
function afterOnboarding() {
  const f = $('#obF'); if (f) f.onsubmit = e => { e.preventDefault(); const n = f.name.value.trim(); if (!n) { toast(t('onb.needName')); f.name.focus(); return; } ob.name = n; ob.region = f.region.value; ob.currency = f.currency.value || ob.currency; ob.step = 2; render(); };
  const s = $('#setF'); if (s) s.onsubmit = async e => { e.preventDefault(); const a = s.a.value, b = s.b.value;
    if (!/^\d{4,6}$/.test(a)) return toast(t('onb.pinRule')); if (a !== b) return toast(t('onb.pinMatch')); await finishOnboarding(a); };
}

/* ---------- lock screen ---------- */
let lockUnbind = null;
function pav(name, color, size) {
  const ch = esc((name || '?').trim().charAt(0).toUpperCase() || '?');
  const px = size || 36;
  return `<span class="pav" style="background:${color || COLORS[0]};width:${px}px;height:${px}px;font-size:${Math.round(px * .42)}px">${ch}</span>`;
}
function renderLock() {
  const meta = metaOf(activeId) || {};
  const enc = !!(meta.lock && (meta.lock.ct || meta.lock.pinWrap));
  const m = enc ? 'pin' : (S && S.auth && S.auth.method);
  const name = (S && S.profile && S.profile.name) || meta.name || '';
  const first = esc((name || '').split(' ')[0]);
  const unlockUI = m === 'pin' ? keypadHTML() : m === 'password' ? `<form id="lockPw"><label class="fld"><span>${esc(t("Password"))}</span><input type="password" name="pw" autocomplete="current-password"></label><button class="btn primary full">${esc(t("Unlock"))}</button></form>`
    : `<button class="btn primary full" data-act="lockAuth">${m === 'passkey' ? ic('finger', 20) + ' ' + t('auth.unlockPasskey') : t('prof.continue')}</button>`;
  const emerg = S ? `<a class="btn redb" href="#/emergency">${ic('alert', 18)} ${esc(t('lock.emergency'))}</a><a class="btn" href="#/medical-id" style="color:var(--red)">${ic('cross', 18)} ${esc(t('lock.medicalId'))}</a>`
    : `<a class="btn redb" href="tel:${region().primary}">${ic('phone', 18)} ${esc(t('onb.call', { num: region().primary }))}</a>`;
  return `<div class="lock"><div class="logo" style="width:64px;height:64px;border-radius:18px">${pav(name, meta.color || (S && S.profile && S.profile.color), 64)}</div><h1>${esc(t('prof.hi', { name: first }))}</h1><p class="lead">${m === 'pin' ? t('prof.enterPin') : t("LifeHub is locked")}</p>${enc ? `<p class="small muted">${esc(t('prof.pinOn'))}</p>` : ''}${unlockUI}<div class="spacer"></div>
    <div class="lock-emerg">${emerg}</div>
    <button class="linkbtn" data-act="profiles">${esc(t('prof.switch'))}</button>
    <button class="linkbtn" style="margin-top:6px" data-act="${enc ? 'useRecovery' : 'forgot'}">${esc(enc ? t('rec.forgot') : t("Forgot? Reset LifeHub"))}</button></div>`;
}
function afterLock() {
  const enc = !!((metaOf(activeId) || {}).lock);
  const m = enc ? 'pin' : (S && S.auth && S.auth.method);
  if (m === 'pin') lockUnbind = bindKeypad($('.lock'), async (v, fail) => { if (await tryPin(v)) unlock(); else fail(); });
  const f = $('#lockPw'); if (f) f.onsubmit = async e => { e.preventDefault(); if (S && S.auth && await hash(f.pw.value) === S.auth.pwHash) unlock(); else { toast(t('auth.incorrect')); f.pw.select(); } };
}
function openProfiles() {
  const rows = (registry.ids || []).map(id => {
    const m = metaOf(id) || { name: '', color: COLORS[0] };
    const on = id === activeId;
    return `<button class="li" data-pid="${id}">${pav(m.name, m.color)}<span class="grow"><b>${esc(m.name || '')}</b>${on ? `<span>${esc(t('prof.current'))}</span>` : ''}</span>${on ? ic('check', 18) : ''}</button>`;
  }).join('');
  openSheet(`<h2>${esc(t('prof.switch'))}</h2><div class="list">${rows}</div><button class="btn primary full" id="addProfile">${esc(t('prof.add'))}</button><p class="small muted">${esc(t('prof.deviceOnly'))}</p>`, el => {
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-pid]'); if (!b) return;
      switchProfile(b.dataset.pid);
    });
    $('#addProfile', el).onclick = () => startAddProfile();
  });
}
async function switchProfile(id) {
  if (!id || id === activeId) { closeSheet(true); return; }
  if (S && activeId) save();
  closeSheet(true);
  await hydrate(id);
  location.hash = '#/home';
  render();
  if (!profileLocked()) toast(t('prof.switched', { name: (metaOf(id) || {}).name || '' }));
}
function startAddProfile() {
  if (S && activeId) save();
  closeSheet(true);
  const d = detectMoney();
  ob = { step: 0, name: '', region: d.emergency, currency: d.currency, locale: d.locale, method: 'pin', sample: false, color: COLORS[Math.floor(Math.random() * COLORS.length)], adding: true };
  creating = true;
  render();
}

/* ---------- home ---------- */
function bannerTitle(id) { return t('banner.' + id); }
function regionLabel(code) { const s = t('region.' + code); return s === 'region.' + code ? ((REGIONS[code] || {}).name || code) : s; }
function svcField(code, i, field, fallback) { const key = `svc.${code}.${i}.${field}`; const s = t(key); return s === key ? fallback : s; }
function bannerInfo(id) {
  const r = region();
  switch (id) {
    case 'emergency': return { sub: t('home.emergencySub', { num: r.primary }) };
    case 'calendar': { const today = hobartToday(); const n = (S.events || []).filter(e => !e.hidden && onDay(e, today)).length; const c = activePairs().length; const todayTxt = t('home.calToday', { n }); return { sub: c ? t('home.calOverlap', { n: c, rest: todayTxt }) : n ? todayTxt : t('home.calEmpty'), badge: c }; }
    case 'medical': return { sub: S.medical.bloodType ? t('home.medBlood', { type: S.medical.bloodType, n: S.medical.allergies.length }) : t('home.medEmpty') };
    case 'banking': return { sub: S.accounts.length ? t('home.bankSub', { money: moneyList(groupSum(S.accounts, a => a.balance, a => a.currency)), n: S.accounts.length }) : t('home.bankEmpty') };
    case 'chat': { const u = S.chats.reduce((a, c) => a + (c.unread || 0), 0); return { sub: u ? t('home.chatUnread', { n: u }) : t('home.chatEmpty'), badge: u }; }
    case 'contacts': return { sub: t('home.contacts', { n: S.contacts.filter(c => !c.blocked).length }) };
    case 'social': { const n = S.platforms.reduce((a, p) => a + p.friendReq + p.dms, 0); return { sub: S.platforms.length ? t('home.socialSub', { platforms: S.platforms.length, n }) : t('home.socialEmpty'), badge: n }; }
    case 'utilities': { const { owed, overdue } = billTotals(); return { sub: owed.length ? `<em class="owe">${esc(t('home.billsOwed', { money: moneyList(owed) }))}</em>${overdue ? esc(t('home.billsOverdue', { n: overdue })) : ''}` : t('home.billsPaid'), badge: overdue, raw: true }; }
    case 'documents': { const n = (S.docs && S.docs.items || []).length; return { sub: n ? t('home.docs', { n }) : t('home.docsEmpty') }; }
    case 'addnew': return { sub: t('home.apps', { apps: S.apps.length, groups: S.groups.length }) };
  }
  return { sub: '' };
}
function renderHome() {
  const h = new Date().getHours(); const greet = h < 12 ? t('home.morning') : h < 18 ? t('home.afternoon') : t('home.evening');
  const items = S.settings.banners.filter(b => !b.hidden && BANNERS[b.id]);
  const html = items.map(b => { const B = BANNERS[b.id]; const i = bannerInfo(b.id);
    return `<a class="banner ${b.id === 'emergency' ? 'emergency' : ''}" href="${B.href}"><span class="chip" style="${b.id === 'emergency' ? '' : `background:${B.color}`}">${ic(B.icon, b.id === 'emergency' ? 30 : 26, 2.2)}</span><span class="txt"><b>${esc(bannerTitle(b.id))}</b><span>${i.raw ? i.sub : esc(i.sub)}</span></span>${i.badge ? `<span class="badge">${i.badge}</span>` : ''}<span class="chev">${ic('chev')}</span></a>`; }).join('');
  const groups = S.groups.filter(g => g.onHome).map(g => { const n = S.apps.filter(a => a.groupId === g.id).length; return `<a class="banner" href="#/group/${g.id}"><span class="chip" style="background:var(--card2);border:1px solid var(--line)">${esc(g.emoji || '📁')}</span><span class="txt"><b>${esc(g.name)}</b><span>${esc(t('home.groupApps', { n }))}</span></span><span class="chev">${ic('chev')}</span></a>`; }).join('');
  const who = S.profile.name || '';
  return `<header class="home-head"><button class="who" data-act="profiles" aria-label="${esc(t('prof.who'))}">${pav(who, S.profile.color, 40)}<span class="hello"><small>${esc(greet)}</small><b>${esc(who.split(' ')[0])}</b>${isPremium() ? ' ' + premBadge() : ''}</span></button><a class="iconbtn" href="#/search" aria-label="${esc(t('common.search'))}">${ic('search')}</a><a class="iconbtn" href="#/settings" aria-label="${esc(t('common.settings'))}">${ic('settings')}</a></header>
  ${demoBar()}
  <nav class="banners" data-screen="home" aria-label="${esc(t('Main sections'))}">${html}${groups}</nav>
  <div class="dropzone home-drop" data-drop="home"><b>${esc(t('home.dropTitle'))}</b><span>${esc(t('home.dropBody'))}</span></div>
  ${AdSlot('home-bottom')}`;
}

/* ---------- search ---------- */
let searchQ = '';
function searchResults(q) {
  q = q.trim().toLowerCase(); if (!q) return "<p class=\"empty\">" + esc(t("Search contacts, events, bills, apps, chats, medical info and emergency numbers.")) + "</p>";
  const R = [];
  Object.entries(BANNERS).forEach(([id, b]) => { const title = bannerTitle(id); if (title.toLowerCase().includes(q) || b.title.toLowerCase().includes(q)) R.push([b.href, ic(b.icon), title, t('search.section')]); });
  region().services.forEach(s => { if ((s.name + s.num + s.desc).toLowerCase().includes(q)) R.push([telHref(s.num), ic('phone'), s.name, s.disp || s.num]); });
  S.contacts.forEach(c => { if ((c.name + c.phone + c.email).toLowerCase().includes(q)) R.push(['#/contacts/' + c.id, ic('user'), c.name, c.phone]); });
  S.bills.forEach(b => { if ((b.provider + b.category).toLowerCase().includes(q)) R.push(['#/utilities', ic('zap'), b.provider, `${b.category} · ${money(b.amount, b.currency)}`]); });
  S.apps.forEach(a => { if (a.name.toLowerCase().includes(q)) R.push([a.url, `<span style="font-size:1.3rem">${esc(a.emoji)}</span>`, a.name, t("App link")]); });
  S.chats.forEach(c => { const ct = contactById(c.contactId); c.messages.forEach(m => { if (m.text.toLowerCase().includes(q)) R.push(['#/chat/' + c.id, ic('msg'), ct ? ct.name : 'Chat', m.text]); }); });
  ['allergies', 'conditions', 'medications'].forEach(k => S.medical[k].forEach(x => { if (x.name.toLowerCase().includes(q)) R.push(['#/medical', ic('cross'), x.name, k[0].toUpperCase() + k.slice(1)]); }));
  (S.medical.appointments || []).forEach(a => { if ((a.title + (a.place || '')).toLowerCase().includes(q)) R.push(['#/calendar', ic('cross'), a.title, 'Appointment']); });
  (S.events || []).forEach(e => { if (!e.hidden && (e.title + (e.loc || '') + (e.notes || '')).toLowerCase().includes(q)) R.push(['#/calendar', ic(SRC_ICON[e.source] || 'cal'), e.title, fmtWhen(e)]); });
  (S.docs && S.docs.items || []).forEach(d => { if ((d.name + ' ' + (d.tags || []).join(' ')).toLowerCase().includes(q)) R.push(['#/doc/' + d.id, ic('file'), d.name, 'Document']); });
  if (!R.length) return "<p class=\"empty\">" + esc(t("No results")) + "</p>";
  return `<div class="list">${R.slice(0, 40).map(([h, i, t, s]) => `<a class="li" href="${esc(h)}" ${/^https?:/.test(h) ? 'target="_blank" rel="noopener"' : ''}>${i}<span class="grow"><b>${esc(t)}</b><span>${esc(s)}</span></span></a>`).join('')}</div>`;
}
function renderSearch() {
  return { html: screen({ title: t('search.title'), body: `<div class="searchbox">${ic('search', 20)}<input class="input" id="sq" type="search" placeholder="Search everything" value="${esc(searchQ)}" aria-label="Search everything"></div><div id="sr">${searchResults(searchQ)}</div>` }),
    after: () => { const i = $('#sq'); i.focus(); i.oninput = () => { searchQ = i.value; $('#sr').innerHTML = searchResults(searchQ); }; } };
}

/* ---------- emergency ---------- */
function renderEmergency() {
  const r = region(); const ice = S.contacts.filter(c => c.ice && !c.blocked);
  const [main, ...rest] = r.services;
  const body = `
  <label class="fld" style="margin-bottom:12px"><span>${esc(t('emerg.region'))}</span><select data-change="setRegion" aria-label="${esc(t('emerg.region'))}">${Object.entries(REGIONS).map(([k, x]) => `<option value="${k}" ${k === S.profile.region ? 'selected' : ''}>${x.flag} ${esc(regionLabel(k))}</option>`).join('')}</select></label>
  <a class="sos" href="${telHref(main.num)}" aria-label="${esc(t('common.call'))} ${main.num} ${esc(svcField(S.profile.region, 0, 'name', main.name))}"><span class="grow"><span class="num">${main.num}</span><small>${esc(svcField(S.profile.region, 0, 'name', main.name))}<br>${esc(svcField(S.profile.region, 0, 'desc', main.desc))}</small></span><span class="callbtn">${ic('phone', 30, 2.4)}</span></a>
  <div class="qgrid"><button class="qbtn" data-act="shareLoc">${ic('pin', 26)}${esc(t("Share my location"))}<span>${esc(t("Send a maps link"))}</span></button><a class="qbtn" href="#/medical-id">${ic('cross', 26)}${esc(t("Medical ID"))}<span>${esc(t("Allergies, blood type, meds"))}</span></a></div>
  <div id="locBox"></div>
  <div class="sec-h"><h2>${esc(t("Emergency contacts (ICE)"))}</h2><a class="linkbtn" href="#/contacts">${esc(t("Manage"))}</a></div>
  <div class="list">${ice.length ? ice.map(c => `<div class="li">${av(c.name)}<span class="grow"><b>${esc(c.name)}</b><span>${esc(c.relation || '')} · ${esc(c.phone)}</span></span><a class="callbtn sm" href="${telHref(c.phone)}" aria-label="Call ${esc(c.name)}">${ic('phone', 20)}</a></div>`).join('') : "<p class=\"empty\">" + esc(t("No emergency contacts yet. Open a contact and turn on \"Emergency contact\".")) + "</p>"}</div>
  <div class="sec-h"><h2>Other services · ${r.flag} ${r.name}</h2></div>
  <div class="list">${rest.map((s, idx) => { const i = idx + 1; return `<div class="li"><span class="grow"><b>${esc(svcField(S.profile.region, i, 'name', s.name))}</b><span>${esc(svcField(S.profile.region, i, 'desc', s.desc))}</span></span><span class="num-pill">${esc(s.disp || s.num)}</span><a class="callbtn sm" href="${telHref(s.num)}" aria-label="${esc(t('common.call'))} ${esc(svcField(S.profile.region, i, 'name', s.name))}">${ic('phone', 20)}</a></div>`; }).join('')}</div>
  <p class="footnote">${esc(t('emerg.foot', { num: r.primary, place: regionLabel(S.profile.region) }))}</p>`;
  return screen({ title: t('emerg.title'), back: unlocked ? '#/home' : '#/lock', body, cls: 'red' });
}
function shareLocation() {
  const box = $('#locBox'); if (!navigator.geolocation) { toast(t('emerg.noGeo')); return; }
  box.innerHTML = `<div class="card">${ic('pin', 18)} ${esc(t("Finding your location…"))}</div>`;
  navigator.geolocation.getCurrentPosition(async p => {
    const { latitude: la, longitude: lo, accuracy } = p.coords; const url = `https://maps.google.com/?q=${la.toFixed(6)},${lo.toFixed(6)}`;
    const text = `I need help. My location (±${Math.round(accuracy)}m): ${url}`;
    box.innerHTML = `<div class="card"><h3>${ic('pin', 18)} ${esc(t("Your location"))}</h3><p class="small muted" style="margin:0 0 10px">${la.toFixed(5)}, ${lo.toFixed(5)} (±${Math.round(accuracy)} m)</p><div class="row gap wrap"><a class="btn sm" href="${url}" target="_blank" rel="noopener">${esc(t("Open map"))}</a><button class="btn sm primary" id="shareNow">${esc(t("Share"))}</button><a class="btn sm" href="sms:?&body=${encodeURIComponent(text)}">${esc(t("Text"))}</a></div></div>`;
    $('#shareNow').onclick = async () => { if (navigator.share) { try { await navigator.share({ title: t("My location"), text, url }); } catch (e) {} } else { try { await navigator.clipboard.writeText(text); toast(t('emerg.copied')); } catch (e) { toast(url); } } };
  }, err => { box.innerHTML = `<div class="card small">${ic('alert', 18)} Couldn't get location (${esc(err.message || t("permission denied"))}). Tell the operator your address or nearest landmark.</div>`; }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
}

/* ---------- medical ---------- */
const MED_SECTIONS = {
  allergies: { title: 'Allergies', fields: [{ k: 'name', label: 'Allergy', req: true, ph: 'e.g. Penicillin' }, { k: 'severity', label: 'Severity', type: 'select', options: ['Mild', 'Moderate', 'Severe', 'Anaphylaxis'] }, { k: 'reaction', label: 'Reaction', ph: 'e.g. hives' }], line: x => [x.name, `${x.severity || ''}${x.reaction ? ' · ' + x.reaction : ''}`], tag: x => /severe|anaph/i.test(x.severity) ? '<span class="tag red">' + esc(x.severity) + '</span>' : '' },
  conditions: { title: t("Medical conditions"), fields: [{ k: 'name', label: 'Condition', req: true }, { k: 'notes', label: 'Notes' }], line: x => [x.name, x.notes] },
  medications: { title: 'Medications', fields: [{ k: 'name', label: 'Medication', req: true }, { k: 'dose', label: 'Dose & frequency' }, { k: 'time', label: t("Daily time (optional)"), type: 'time' }], line: x => [x.name, [x.dose, x.time ? 'daily ' + fmtClock(x.time) : ''].filter(Boolean).join(' · ')] },
  family: { title: t("Family history"), fields: [{ k: 'condition', label: 'Condition', req: true, ph: t("e.g. Heart disease") }, { k: 'relative', label: 'Relative', ph: 'e.g. Father' }, { k: 'status', label: 'Inheritance', type: 'select', options: [t("Confirmed inherited"), t("Likely inherited"), t("Family history only")] }], line: x => [x.condition, x.relative], tag: x => `<span class="tag ${/Confirmed/.test(x.status) ? 'red' : /Likely/.test(x.status) ? 'amber' : ''}">${esc(x.status)}</span>` },
};
function medList(key) {
  const sec = MED_SECTIONS[key], arr = S.medical[key];
  return `<div class="sec-h"><h2>${sec.title}</h2><button class="btn sm" data-act="medAdd" data-k="${key}">${ic('plus', 16)} ${esc(t("Add"))}</button></div><div class="list">${arr.length ? arr.map(x => { const [a, b] = sec.line(x); return `<button class="li" data-act="medEdit" data-k="${key}" data-id="${x.id}"><span class="grow"><b>${esc(a)}</b>${b ? `<span>${esc(b)}</span>` : ''}</span>${sec.tag ? sec.tag(x) : ''}<span class="muted">${ic('edit', 18)}</span></button>`; }).join('') : `<p class="empty">None recorded</p>`}</div>`;
}
function renderMedical() {
  const m = S.medical;
  const body = `<div class="medhead"><button class="stat redbg" data-act="medBasics" style="text-align:left;border:0"><small>${esc(t("Blood type"))}</small><b>${esc(m.bloodType || '—')}</b></button><button class="stat" data-act="medBasics" style="text-align:left"><small>${esc(t("Organ donor"))}</small><b style="font-size:1.25rem">${m.organDonor ? '✅ Yes' : 'No'}</b></button></div>
  <a class="btn full" href="#/medical-id" style="margin-bottom:6px;color:var(--red)">${ic('cross', 18)} ${esc(t("View Medical ID"))}</a>
  ${medList('allergies')}${medList('conditions')}${apptSection()}${medList('medications')}${medList('family')}
  <div class="sec-h"><h2>${esc(t("Doctor & Medicare"))}</h2><button class="btn sm" data-act="medBasics">${ic('edit', 16)} ${esc(t("Edit"))}</button></div>
  <div class="list"><div class="li">${ic('user')}<span class="grow"><b>${esc(m.doctor.name || t("No doctor added"))}</b><span>${esc(m.doctor.clinic)}</span></span>${m.doctor.phone ? `<a class="callbtn sm" href="${telHref(m.doctor.phone)}" aria-label="Call doctor">${ic('phone', 20)}</a>` : ''}</div>
  <div class="li">${ic('card')}<span class="grow"><b>${esc(t("Medicare"))} ${m.medicare.number ? esc(m.medicare.number) : t("not added")}</b><span>${m.medicare.number ? `IRN ${esc(m.medicare.irn)} · Exp ${esc(m.medicare.expiry)}` : t("Tap Edit to add")}</span></span></div></div>
  ${m.notes ? `<div class="card"><h3>Notes</h3>${esc(m.notes)}</div>` : ''}
  <p class="footnote">${esc(t("Medical details are stored only on this device. Keep them up to date; first responders may use your Medical ID."))}</p>`;
  return screen({ title: t('med.title'), body });
}
function editMedBasics() {
  const m = S.medical;
  formSheet({ title: t("Medical details"), values: { bloodType: m.bloodType, organDonor: m.organDonor, docName: m.doctor.name, docClinic: m.doctor.clinic, docPhone: m.doctor.phone, mc: m.medicare.number, irn: m.medicare.irn, exp: m.medicare.expiry, notes: m.notes, showOnLock: m.showOnLock },
    fields: [{ k: 'bloodType', label: t("Blood type"), type: 'select', options: ['', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Unknown'] }, { k: 'organDonor', label: t("Registered organ donor"), type: 'checkbox' },
      { k: 'docName', label: 'Doctor / GP' }, { k: 'docClinic', label: 'Clinic' }, { k: 'docPhone', label: t("Doctor phone"), type: 'tel' },
      { k: 'mc', label: S.profile.region === 'AU' ? t("Medicare number") : t("Health insurance / ID number"), im: 'numeric' }, { k: 'irn', label: t("IRN (position on card)"), im: 'numeric' }, { k: 'exp', label: t("Card expiry"), type: 'month' },
      { k: 'notes', label: t("Notes for first responders"), type: 'textarea', ph: 'e.g. Wears contact lenses; pacemaker' }, { k: 'showOnLock', label: t("Show Medical ID on lock screen"), type: 'checkbox' }],
    onSave: v => { Object.assign(m, { bloodType: v.bloodType, organDonor: v.organDonor, notes: v.notes, showOnLock: v.showOnLock }); m.doctor = { name: v.docName, clinic: v.docClinic, phone: v.docPhone }; m.medicare = { number: v.mc, irn: v.irn, expiry: v.exp }; } });
}
function editMedItem(key, id) {
  const sec = MED_SECTIONS[key]; const arr = S.medical[key]; const x = arr.find(i => i.id === id);
  formSheet({ title: (x ? 'Edit ' : 'Add ') + sec.title.toLowerCase().replace(/s$/, ''), fields: sec.fields, values: x || {},
    onSave: v => { if (x) Object.assign(x, v); else arr.push({ id: uid(), ...v }); }, danger: x ? { label: 'Delete', fn: () => S.medical[key] = arr.filter(i => i.id !== id) } : null });
}
function renderMedicalID() {
  const m = S.medical, locked = !unlocked;
  if (locked && !m.showOnLock) return screen({ title: t('med.id'), back: '#/lock', cls: 'red', body: '<p class="empty">' + esc(t('med.hidden')) + '</p>' });
  const ice = S.contacts.filter(c => c.ice && !c.blocked);
  const mc = m.medicare.number ? (locked ? '•••• ' + m.medicare.number.replace(/\s/g, '').slice(-4) : m.medicare.number) : '';
  const body = `<div class="mid-hero"><small>${esc(t("Medical ID"))}</small><h2>${esc(S.profile.name)}</h2><div class="row"><div><small>${esc(t("Blood"))}</small><b>${esc(m.bloodType || '—')}</b></div><div><small>${esc(t("Organ donor"))}</small><b>${m.organDonor ? 'Yes' : 'No'}</b></div>${mc ? `<div><small>${S.profile.region === 'AU' ? 'Medicare' : t("Health ID")}</small><b style="font-size:1rem">${esc(mc)}</b></div>` : ''}</div></div>
  <div class="card"><h3 class="red">${ic('alert', 18)} ${esc(t("Allergies"))}</h3>${m.allergies.length ? m.allergies.map(a => `<div style="margin:4px 0"><b>${esc(a.name)}</b> <span class="tag ${/severe|anaph/i.test(a.severity) ? 'red' : ''}">${esc(a.severity)}</span><div class="small muted">${esc(a.reaction)}</div></div>`).join('') : "<span class=\"muted\">" + esc(t("None recorded")) + "</span>"}</div>
  <div class="card"><h3>${esc(t("Conditions"))}</h3>${m.conditions.length ? m.conditions.map(a => `<div><b>${esc(a.name)}</b> <span class="small muted">${esc(a.notes)}</span></div>`).join('') : "<span class=\"muted\">" + esc(t("None recorded")) + "</span>"}</div>
  <div class="card"><h3>${esc(t("Medications"))}</h3>${m.medications.length ? m.medications.map(a => `<div><b>${esc(a.name)}</b> <span class="small muted">${esc(a.dose)}</span></div>`).join('') : "<span class=\"muted\">" + esc(t("None recorded")) + "</span>"}</div>
  ${m.notes ? `<div class="card"><h3>Notes</h3>${esc(m.notes)}</div>` : ''}
  <div class="sec-h"><h2>${esc(t("Emergency contacts"))}</h2></div><div class="list">${ice.length ? ice.map(c => `<div class="li">${av(c.name)}<span class="grow"><b>${esc(c.name)}</b><span>${esc(c.relation)}</span></span><a class="callbtn sm" href="${telHref(c.phone)}" aria-label="Call ${esc(c.name)}">${ic('phone', 20)}</a></div>`).join('') : "<p class=\"empty\">" + esc(t("None")) + "</p>"}
  ${m.doctor.name ? `<div class="li">${ic('cross')}<span class="grow"><b>${esc(m.doctor.name)}</b><span>Doctor</span></span>${m.doctor.phone ? `<a class="callbtn sm" href="${telHref(m.doctor.phone)}">${ic('phone', 20)}</a>` : ''}</div>` : ''}</div>
  ${unlocked ? '<a class="btn full" href="#/medical">' + ic('edit', 18) + ' Edit medical details</a>' : ''}`;
  return screen({ title: t('med.id'), back: unlocked ? '#/medical' : '#/lock', cls: 'red', body });
}

/* ---------- banking ---------- */
const acctById = id => S.accounts.find(a => a.id === id);
function renderBanking() {
  const nets = groupSum(S.accounts, a => a.balance, a => a.currency);
  const tx = [...S.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25);
  const body = `<div class="total"><span class="muted">${nets.length > 1 ? esc(t('bank.balances')) : esc(t('bank.net'))}</span><b>${moneyList(nets)}</b></div>
  <div class="bcards">${S.accounts.map(a => `<button class="bcard" style="background:${a.color}" data-act="acctMenu" data-id="${a.id}"><div class="row between"><small>${esc(a.bank)}</small><small>${esc(a.type)}</small></div><div><small>${esc(a.name)}</small><div class="bal">${money(a.balance, a.currency)}</div><small>${esc(a.number)}</small></div></button>`).join('') || "<p class=\"empty\">" + esc(t("No accounts yet")) + "</p>"}</div>
  <div class="actions"><button class="act" data-act="transfer">${ic('swap', 26)}${esc(t("Transfer"))}</button><a class="act" href="#/banking/pay">${ic('nfc', 26)}${esc(t("Tap to pay"))}</a><a class="act" href="#/banking/link">${ic('link', 26)}${esc(t("Link a bank"))}</a></div>
  <a class="card" href="#/banking/budget" style="display:flex;align-items:center;gap:12px"><span style="flex:1"><b>${esc(t("Budget planner"))}</b><span class="small muted" style="display:block">${esc(t("Categories, goals and what you have left this month"))}</span></span>${ic('chev')}</a>
  ${updatedLine()}<div class="sec-h"><h2>${esc(t("Recent transactions"))}</h2><button class="btn sm" data-act="importTx">${ic('upload', 16)} ${esc(t("Import CSV"))}</button></div>
  <div class="list">${tx.length ? tx.map(t => { const a = acctById(t.accountId); return `<div class="li"><span class="av" style="background:var(--card2);color:var(--text);border:1px solid var(--line)">${t.amount > 0 ? '↓' : t.cat === t("App fee") ? '¢' : '↑'}</span><span class="grow"><b>${esc(t.desc)}</b><span>${fmtDate(t.date)} · ${esc(a ? a.name : 'Account')}${t.cat ? ' · ' + esc(t.cat) : ''}</span></span><span class="amt ${t.amount > 0 ? 'green' : ''}">${t.amount > 0 ? '+' : ''}${money(t.amount, txCurrency(t))}</span></div>`; }).join('') : "<p class=\"empty\">" + esc(t("No transactions")) + "</p>"}</div>
  ${schedSection()}
  <p class="footnote">To go live in Australia, bank linking would use the Consumer Data Right (Open Banking) via an accredited data recipient, and payments via the New Payments Platform (PayTo / Osko). Scheduled payments are a reminder on your calendar, not a real debit.</p>`;
  return screen({ title: t('bank.title'), demo: t('bank.demo'), body, right: `<button class="iconbtn" data-act="addAcct" aria-label="${esc(t('bank.add'))}">${ic('plus')}</button>` });
}
function addAccount(bank) {
  formSheet({ title: t("Add account manually"), fields: [{ k: 'bank', label: 'Bank', req: true }, { k: 'name', label: t("Account name"), req: true, ph: 'e.g. Everyday' }, { k: 'type', label: 'Type', type: 'select', options: ['transaction', 'savings', 'credit', 'loan'] }, { k: 'currency', label: 'Currency', type: 'select', options: currencyChoices() }, { k: 'number', label: t("Account number (last 4 is enough)") }, { k: 'balance', label: t("Current balance"), type: 'number', step: '0.01', req: true, im: 'decimal' }],
    values: { bank: bank || '', currency: homeCurrency() }, onSave: v => { S.accounts.push({ id: uid(), ...v, currency: v.currency || homeCurrency(), balance: v.type === 'credit' || v.type === 'loan' ? -Math.abs(v.balance) : v.balance, color: `linear-gradient(135deg,${avColor(v.bank + v.name)},#0f172a)` }); toast(t("Account added")); } });
}
function acctMenu(id) {
  const a = acctById(id); if (!a) return;
  formSheet({ title: `${a.bank} · ${a.name}`, intro: t("Edit or remove this account (demo). Changing the currency re-labels this account. The number is not converted."), fields: [{ k: 'name', label: t("Account name") }, { k: 'currency', label: 'Currency', type: 'select', options: currencyChoices() }, { k: 'balance', label: 'Balance', type: 'number', step: '0.01' }], values: { name: a.name, balance: a.balance, currency: acctCurrency(a) },
    onSave: v => { const prev = acctCurrency(a); a.name = v.name; if (!isNaN(v.balance)) a.balance = v.balance; if (v.currency) { a.currency = v.currency; S.transactions.forEach(t => { if (t.accountId === a.id && (!t.currency || t.currency === prev)) t.currency = v.currency; }); } }, danger: { label: t("Unlink account"), fn: () => { S.accounts = S.accounts.filter(x => x.id !== id); S.transactions = S.transactions.filter(t => t.accountId !== id); } } });
}
function transfer() {
  if (S.accounts.length < 1) return toast(t("Add an account first"));
  const opts = S.accounts.map(a => [a.id, `${a.name} (${money(a.balance, a.currency)})`]);
  formSheet({ title: t("Transfer money"), intro: '<span class="tag amber">Demo</span> No money moves. This transfer stays on this device.', submit: 'Review & authorise',
    fields: [{ k: 'from', label: 'From', type: 'select', options: opts }, { k: 'to', label: 'To', type: 'select', options: [...opts, ['payee', t("Someone else (payee / PayID)")]] }, { k: 'payee', label: t("Payee name, BSB & account, or PayID"), ph: t("Only if paying someone else") }, { k: 'amount', label: 'Amount', type: 'number', step: '0.01', min: 0, req: true, im: 'decimal' }, { k: 'desc', label: 'Description', ph: 'e.g. Rent' }],
    onSave: async v => {
      if (!(v.amount > 0)) { toast(t("Enter an amount")); return false; } if (v.from === v.to) { toast(t("Choose different accounts")); return false; } if (v.to === 'payee' && !v.payee) { toast(t("Enter payee details")); return false; }
      const from = acctById(v.from); const toA = v.to === 'payee' ? null : acctById(v.to);
      if (toA && acctCurrency(from) !== acctCurrency(toA)) { toast(t("Those accounts use different currencies. LifeHub does not convert between them.")); return false; }
      closeSheet(true); const ok = await authorize(`${esc(t("Transfer"))} ${money(v.amount, from.currency)} from ${from.name} to ${toA ? toA.name : v.payee}`); if (!ok) { toast(t("Transfer cancelled")); return false; }
      from.balance -= v.amount; S.transactions.push({ id: uid(), accountId: from.id, date: todayISO(), desc: `${esc(t("Transfer to"))} ${toA ? toA.name : v.payee}${v.desc ? ' · ' + v.desc : ''}`, amount: -v.amount, currency: acctCurrency(from), cat: 'Transfer' });
      if (toA) { toA.balance += v.amount; S.transactions.push({ id: uid(), accountId: toA.id, date: todayISO(), desc: `${esc(t("Transfer from"))} ${from.name}`, amount: v.amount, currency: acctCurrency(toA), cat: 'Transfer' }); }
      toast(`${esc(t("Sent"))} ${money(v.amount, from.currency)} (demo)`);
    } });
}
async function importTx() {
  const f = await pickFile('.csv,text/csv'); if (!f) return; if (!S.accounts.length) return toast(t("Add an account first"));
  const rows = parseCSV(await readText(f)); let n = 0;
  rows.forEach(r => { const amt = parseFloat(String(pick(r, 'amount', 'value', 'debit')).replace(/[^\d.-]/g, '')); if (isNaN(amt)) return; const dt = new Date(pick(r, 'date')); const code = String(pick(r, 'currency', 'ccy') || '').toUpperCase(); S.transactions.push({ id: uid(), accountId: S.accounts[0].id, date: isNaN(dt) ? todayISO() : dt.toISOString().slice(0, 10), desc: pick(r, 'desc', 'narrative', 'detail', 'payee') || 'Imported', amount: amt, currency: /^[A-Z]{3}$/.test(code) ? code : acctCurrency(S.accounts[0]), cat: pick(r, 'cat') || 'Imported' }); n++; });
  save(); render(); toast(`${esc(t("Imported"))} ${n} ${esc(t("transactions into"))} ${S.accounts[0].name}`);
}
let pay = null;
function renderPay() {
  const cards = S.accounts.filter(a => a.type !== 'savings' && a.type !== 'loan');
  if (!pay) pay = { step: 'setup', amount: 12.5, merchant: t("Demo Café, Launceston"), accountId: (cards[0] || {}).id };
  const a = acctById(pay.accountId) || cards[0]; const fee = appFee(a && a.currency);
  let body;
  if (!a) body = `<p class="empty">${esc(t("Add a transaction or credit account to use Tap to pay."))}</p><a class="btn primary full" href="#/banking/link">${esc(t("Link a bank"))}</a>`;
  else if (pay.step === 'setup') body = `<div class="paycard" style="background:${a.color}"><div class="row between"><b>${esc(a.bank)}</b>${ic('nfc', 30)}</div><div><small style="opacity:.85">${esc(a.name)} · ${esc(a.number)}</small><div style="font-size:1.4rem;font-weight:800;margin-top:4px">${money(a.balance, a.currency)}</div></div></div>
    ${cards.length > 1 ? `<label class="fld"><span>Pay with</span><select id="payAcct">${cards.map(c => `<option value="${c.id}" ${c.id === a.id ? 'selected' : ''}>${esc(c.bank)} · ${esc(c.name)}</option>`).join('')}</select></label>` : ''}
    <label class="fld"><span>Amount (${esc(acctCurrency(a))})</span><input id="payAmt" class="amount-in" type="number" step="${currencyDigits(acctCurrency(a)) ? '0.01' : '1'}" min="${currencyDigits(acctCurrency(a)) ? '0.01' : '1'}" inputmode="decimal" value="${pay.amount}"></label>
    <div class="feebox"><div><span>${esc(t("Merchant"))}</span><b>${esc(pay.merchant)}</b></div><div><span>${esc(t("Purchase"))}</span><span id="fPur">${money(pay.amount, a.currency)}</span></div><div><span>${esc(t("LifeHub app fee"))}</span><span>${money(fee, a.currency)}</span></div><div class="tot"><span>${esc(t("Total"))}</span><span id="fTot">${money(pay.amount + fee, a.currency)}</span></div></div>
    <button class="btn primary full" data-act="payAuth">${ic('lock', 18)} ${esc(t("Authorise & pay"))}</button>
    <p class="footnote">The ${money(fee, a.currency)} ${esc(t("line is part of the demo. No money is taken."))}</p>`;
  else if (pay.step === 'tap') body = `<div class="nfc">${ic('nfc', 80, 1.6)}</div><h2 style="text-align:center">${esc(t("Hold near the reader"))}</h2><p class="muted" style="text-align:center">${money(pay.amount + fee, a.currency)} to ${esc(pay.merchant)}</p><button class="btn primary full" data-act="payTap" style="margin-top:20px">${esc(t("Simulate tap"))}</button><button class="btn ghost full" data-act="payCancel" style="margin-top:8px">${esc(t("Cancel"))}</button>`;
  else body = `<div class="okc">${ic('check', 60, 3)}</div><h2 style="text-align:center">${esc(t("Payment approved"))}</h2><p class="muted" style="text-align:center">${money(pay.amount, a.currency)} + ${money(fee, a.currency)} ${esc(t("app fee"))}<br>${esc(pay.merchant)} · ${esc(a.name)}</p><a class="btn primary full" href="#/banking" data-act="payDone">${esc(t("Done"))}</a>`;
  return { html: screen({ title: t("Tap to pay"), back: '#/banking', demo: t("No real payment is made. This does not use NFC or charge a card."), body }), after: () => {
    const amt = $('#payAmt'); if (amt) amt.oninput = () => { const v = parseFloat(amt.value) || 0; pay.amount = v; const cur = a && a.currency; $('#fPur').textContent = money(v, cur); $('#fTot').textContent = money(v + fee, cur); };
    const sel = $('#payAcct'); if (sel) sel.onchange = () => { pay.accountId = sel.value; render(); };
    if (pay.step === 'tap') { const t = setTimeout(() => { if (pay && pay.step === 'tap') completePay(); }, 3500); cleanupFn = () => clearTimeout(t); }
  } };
}
async function payAuth() {
  if (!(pay.amount > 0)) return toast(t("Enter an amount"));
  const a = acctById(pay.accountId);
  const cur = acctCurrency(a);
  const fee = appFee(cur);
  const ok = await authorize(`${esc(t("Pay"))} ${money(pay.amount + fee, cur)} to ${pay.merchant} (includes ${money(fee, cur)} ${esc(t("app fee)"))}`);
  if (!ok) return toast(t("Payment cancelled"));
  pay.step = 'tap'; render();
}
function completePay() {
  const a = acctById(pay.accountId); if (!a) return;
  const cur = acctCurrency(a);
  const fee = appFee(cur);
  a.balance -= pay.amount + fee;
  S.transactions.push({ id: uid(), accountId: a.id, date: todayISO(), desc: pay.merchant + t(" (tap to pay)"), amount: -pay.amount, currency: cur, cat: 'Purchase' }, { id: uid(), accountId: a.id, date: todayISO(), desc: t("LifeHub app fee"), amount: -fee, currency: cur, cat: t("App fee") });
  save(); pay.step = 'done'; if (navigator.vibrate) navigator.vibrate([60, 40, 60]); render();
}
let linkQ = '';
function renderLink() {
  const list = AU_BANKS.filter(b => b.toLowerCase().includes(linkQ.toLowerCase()));
  const body = `<div class="notice blue">${ic('shield', 18)}<div>${esc(t("In Australia, banks share data securely under the"))} <b>${esc(t("Consumer Data Right (Open Banking)"))}</b>. You choose what to share and for how long, and you can stop at any time. This prototype simulates that flow.</div></div>
  <div class="searchbox">${ic('search', 20)}<input class="input" id="lq" type="search" placeholder="Find your bank" value="${esc(linkQ)}"></div>
  <div class="list" id="bankList">${list.map(b => `<button class="li" data-act="linkBank" data-b="${esc(b)}">${av(b)}<span class="grow"><b>${esc(b)}</b><span>Open Banking (CDR) · demo</span></span>${ic('chev')}</button>`).join('')}</div>
  <button class="btn full" data-act="addAcct">${ic('plus', 18)} ${esc(t("Add an account manually"))}</button>`;
  return { html: screen({ title: t("Link a bank"), back: '#/banking', demo: t("This does not connect to a real bank. The sign-in step is simulated."), body }), after: () => { const i = $('#lq'); i.oninput = () => { linkQ = i.value; const p = i.selectionStart; render(); const j = $('#lq'); j.focus(); j.setSelectionRange(p, p); }; } };
}
function linkBank(b) {
  openSheet(`<h2>${esc(t("Connect"))} ${esc(b)}</h2><p class="muted small">${esc(t("LifeHub is requesting access to:"))}</p>
  <div class="list"><div class="li">${ic('card')}<span class="grow"><b>${esc(t("Account name, type & balance"))}</b></span></div><div class="li">${ic('file')}<span class="grow"><b>${esc(t("Transaction details"))}</b></span></div><div class="li">${ic('clock')}<span class="grow"><b>${esc(t("For 12 months"))}</b><span>${esc(t("You can withdraw consent at any time"))}</span></span></div></div>
  <p class="small muted">${esc(t("Next you'd be sent to"))} ${esc(b)} ${esc(t("to log in. LifeHub never sees your banking password."))}</p>
  <div class="row gap"><button class="btn" data-close>${esc(t("Cancel"))}</button><button class="btn primary" id="lbOk">${esc(t("Connect (demo)"))}</button></div>`, el => {
    $('#lbOk', el).onclick = () => { const bal = Math.round(Math.random() * 500000) / 100; S.accounts.push({ id: uid(), bank: b, name: 'Everyday', number: '•••• ' + String(Math.floor(1000 + Math.random() * 9000)), balance: bal, currency: homeCurrency(), type: 'transaction', color: `linear-gradient(135deg,${avColor(b)},#0f172a)` }); save(); closeSheet(true); toast(`${b} ${esc(t("linked (demo)"))}`); location.hash = '#/banking'; };
  });
}

/* ---------- chat ---------- */
const contactById = id => S.contacts.find(c => c.id === id);
function netStatus() {
  const c = navigator.connection;
  if (!navigator.onLine) return { label: t("Offline: messages will send when connected"), cls: 'bad', icon: 'off' };
  if (c && c.type) { if (c.type === 'wifi' || c.type === 'ethernet') return { label: t("Using Wi‑Fi"), cls: '', icon: 'wifi' }; if (c.type === 'cellular') return { label: S.settings.preferWifi ? t("Wi‑Fi unavailable: using mobile data") : t("Using mobile data"), cls: 'warn', icon: 'signal' }; }
  return { label: `${esc(t("Online"))}${c && c.effectiveType ? ' · ' + c.effectiveType.toUpperCase() : ''} · Wi‑Fi preferred`, cls: '', icon: 'wifi' };
}
const netChip = () => { const n = netStatus(); return `<span class="netchip ${n.cls}">${ic(n.icon, 15, 2.4)} ${esc(n.label)}</span>`; };
function renderChats() {
  const threads = [...S.chats].filter(t => { const c = contactById(t.contactId); return c && !c.blocked; }).sort((a, b) => (b.messages.at(-1)?.t || 0) - (a.messages.at(-1)?.t || 0));
  const body = `<div class="row between" style="margin-bottom:6px">${netChip()}</div>${updatedLine()}
  <label class="card row between" style="padding:12px 14px"><span><b>${esc(t("Prefer Wi‑Fi"))}</b><br><span class="small muted">${esc(t("Fall back to mobile data when Wi‑Fi isn't available"))}</span></span><span class="switch"><input type="checkbox" data-change="preferWifi" ${S.settings.preferWifi ? 'checked' : ''}><i></i></span></label>
  <div class="list">${threads.length ? threads.map(t => { const c = contactById(t.contactId); const last = t.messages.at(-1); return `<a class="li" href="#/chat/${t.id}">${av(c.name)}<span class="grow"><b>${esc(c.name)}</b><span>${last ? (last.me ? 'You: ' : '') + esc(last.text) : t("No messages yet")}</span></span><span style="text-align:right"><span class="small muted">${last ? fmtTime(last.t) : ''}</span><br>${t.unread ? `<span class="badge">${t.unread}</span>` : ''}</span></a>`; }).join('') : "<p class=\"empty\">" + esc(t("No conversations yet")) + "</p>"}</div>
  <p class="footnote">A live version would use end-to-end encryption. This one does not contact a chat server.</p>`;
  return screen({ title: t('banner.chat'), demo: t('home.chatEmpty'), body, right: `<button class="iconbtn" data-act="newChat" aria-label="${esc(t('New chat'))}">${ic('edit')}</button>` });
}
function openChatWith(cid) { let t = S.chats.find(x => x.contactId === cid); if (!t) { t = { id: uid(), contactId: cid, unread: 0, messages: [] }; S.chats.push(t); save(); } location.hash = '#/chat/' + t.id; }
function newChat() {
  const cs = S.contacts.filter(c => !c.blocked);
  openSheet(`<h2>${esc(t("New conversation"))}</h2><div class="list">${cs.map(c => `<button class="li" data-cid="${c.id}">${av(c.name)}<span class="grow"><b>${esc(c.name)}</b><span>${c.onLifeHub ? t("On LifeHub") : t("Will invite by SMS")}</span></span></button>`).join('')}</div>`, el => { el.addEventListener('click', e => { const b = e.target.closest('[data-cid]'); if (b) { closeSheet(true); openChatWith(b.dataset.cid); } }); });
}
const REPLIES = [t("Sounds good 👍"), t("Haha yes!"), t("On my way"), t("Can I call you in 5?"), 'Thanks!', t("No worries"), t("Love it ❤️")];
function renderThread(id) {
  const thread = S.chats.find(x => x.id === id); if (!thread) { location.hash = '#/chat'; return ''; }
  const c = contactById(thread.contactId); if (thread.unread) { thread.unread = 0; save(); }
  const html = `<div class="thread"><header class="topbar"><a class="iconbtn" href="#/chat" aria-label="${esc(t('common.back'))}">${ic('back')}</a>${av(c.name, 38)}<h1 style="font-size:1.1rem">${esc(c.name)}<br><span class="small muted" style="font-weight:500">${c.onLifeHub ? t("LifeHub · private chat") : t("SMS contact")}</span></h1><div class="tb-right"><a class="iconbtn" href="#/call/${c.id}" aria-label="Voice call">${ic('phone')}</a><a class="iconbtn" href="#/call/${c.id}/video" aria-label="Video call">${ic('video')}</a></div></header>
  <div class="msgs" id="msgs"><div style="align-self:center;margin:4px 0 8px">${netChip()}</div><p class="demoline" style="align-self:stretch"><span class="tag amber">${esc(t("Demo"))}</span> ${esc(t("Replies are simulated on this device."))}</p>${thread.messages.map(m => `<div class="bub ${m.me ? 'me' : 'them'}">${esc(m.text)}<time>${fmtTime(m.t)}</time></div>`).join('')}</div>
  ${legalFooter()}
  <form class="composer" id="cmp"><input name="m" placeholder="${esc(t('Message'))}" autocomplete="off" aria-label="${esc(t('Message'))}"><button aria-label="${esc(t('Send'))}">${ic('send', 20)}</button></form></div>`;
  return { html, after: () => {
    const ms = $('#msgs'); ms.scrollTop = ms.scrollHeight;
    $('#cmp').onsubmit = e => { e.preventDefault(); const v = e.target.m.value.trim(); if (!v) return;
      if (!c.onLifeHub) { location.href = `sms:${c.phone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(v)}`; }
      thread.messages.push({ id: uid(), me: true, text: v, t: Date.now() }); save(); render(); $('#cmp input').focus();
      if (c.onLifeHub) setTimeout(() => { const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)]; thread.messages.push({ id: uid(), me: false, text: reply, t: Date.now() }); if (!location.hash.endsWith(thread.id)) thread.unread++; save(); incomingNotice(c, reply, thread.id); if (location.hash.endsWith(thread.id)) { const val = $('#cmp input')?.value; render(); const i = $('#cmp input'); if (i) { i.value = val || ''; i.focus(); } } }, 1600); };
  } };
}
let cleanupFn = null;
function renderCall(cid, video) {
  const c = contactById(cid); if (!c) { location.hash = '#/chat'; return ''; }
  const n = netStatus();
  const html = `<div class="call">${video ? '<video id="selfv" autoplay playsinline muted></video>' : ''}<div class="over">${av(c.name)}<h1>${esc(c.name)}</h1><p id="cst" style="opacity:.85">${video ? t("Video calling") : 'Calling'} over ${n.cls === 'warn' ? t("mobile data") : 'Wi‑Fi'}…</p><p class="demoline" style="color:#fff"><span class="tag amber">${esc(t("Demo"))}</span> ${esc(t("No audio or video is sent to the other person."))}</p>
  <div class="call-ctrls"><button data-act="tgl" data-k="mute" aria-label="${esc(t('Mute'))}">${ic('mic', 28)}</button><button class="end" data-act="endCall" aria-label="${esc(t('End call'))}">${ic('phone', 30)}</button><button data-act="tgl" aria-label="${esc(t('Speaker'))}">${ic('speaker', 28)}</button></div>
  <a class="btn" style="margin-top:18px;background:transparent;color:#fff;border-color:rgba(255,255,255,.3)" href="${telHref(c.phone)}">${esc(t("Call"))} ${esc(c.phone)} ${esc(t("by phone instead"))}</a>${legalFooter()}</div></div>`;
  return { html, after: () => {
    let stream = null, sec = 0; const st = $('#cst');
    const t1 = setTimeout(() => { st.textContent = '00:00'; }, 2200);
    const iv = setInterval(() => { if (st.textContent.includes(':')) { sec++; st.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; } }, 1000);
    if (video && navigator.mediaDevices?.getUserMedia) navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }).then(s => { stream = s; const v = $('#selfv'); if (v) v.srcObject = s; else s.getTracks().forEach(x => x.stop()); }).catch(() => {});
    cleanupFn = () => { clearTimeout(t1); clearInterval(iv); if (stream) stream.getTracks().forEach(x => x.stop()); };
  } };
}

/* ---------- contacts ---------- */
let contactQ = '';
function contactRows(q) {
  const list = S.contacts.filter(c => (c.name + c.phone + c.email).toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const act = list.filter(c => !c.blocked), bl = list.filter(c => c.blocked);
  const row = c => `<div class="li"><a href="#/contacts/${c.id}" class="row gap grow" style="min-width:0">${av(c.name)}<span class="grow"><b>${esc(c.name)} ${c.ice ? "<span class=\"tag red\">" + esc(t("ICE")) + "</span>" : ''}</b><span>${esc(c.phone)}${c.relation ? ' · ' + esc(c.relation) : ''}</span></span></a>${c.blocked ? "<span class=\"tag\">" + esc(t("Blocked")) + "</span>" : `<a class="callbtn sm" href="${telHref(c.phone)}" aria-label="Call ${esc(c.name)}">${ic('phone', 20)}</a>`}</div>`;
  return `<div class="list">${act.length ? act.map(row).join('') : "<p class=\"empty\">" + esc(t("No contacts found")) + "</p>"}</div>${bl.length ? `<div class="sec-h"><h2>Blocked</h2></div><div class="list">${bl.map(row).join('')}</div>` : ''}`;
}
function renderContacts() {
  const body = `<div class="searchbox">${ic('search', 20)}<input class="input" id="cq" type="search" placeholder="Search ${S.contacts.length} contacts" value="${esc(contactQ)}"></div>
  <div class="row gap" style="margin-bottom:12px"><button class="btn sm" data-act="importContacts">${ic('upload', 16)} ${esc(t("Import"))}</button>${'contacts' in navigator && 'ContactsManager' in window ? `<button class="btn sm" data-act="pickContacts">${ic('users', 16)} From phone</button>` : ''}<button class="btn sm primary" data-act="addContact">${ic('plus', 16)} ${esc(t("Add"))}</button></div>
  <div id="clist">${contactRows(contactQ)}</div><p class="footnote">${esc(t("Import a vCard (.vcf) or CSV exported from Google Contacts, iCloud or Outlook."))}</p>`;
  return { html: screen({ title: t('banner.contacts'), body }), after: () => { const i = $('#cq'); i.oninput = () => { contactQ = i.value; $('#clist').innerHTML = contactRows(contactQ); }; } };
}
const CONTACT_FIELDS = [{ k: 'name', label: 'Name', req: true }, { k: 'phone', label: 'Phone', type: 'tel', im: 'tel' }, { k: 'email', label: 'Email', type: 'email' }, { k: 'relation', label: 'Relationship', ph: 'e.g. Partner, Friend' }, { k: 'birthday', label: 'Birthday', type: 'date' }, { k: 'notes', label: 'Notes', type: 'textarea' }, { k: 'ice', label: t("Emergency contact (ICE)"), type: 'checkbox' }, { k: 'onLifeHub', label: t("Uses LifeHub (in-app chat & calls)"), type: 'checkbox' }, { k: 'premium', label: t("LifeHub Premium (demo). Only Premium contacts can be picked for location sharing"), type: 'checkbox' }];
function editContact(id) {
  const c = id && contactById(id);
  formSheet({ title: c ? t("Edit contact") : t("New contact"), fields: CONTACT_FIELDS, values: c || { onLifeHub: false }, onSave: v => { if (c) Object.assign(c, v); else S.contacts.push({ id: uid(), blocked: false, ...v }); toast(t('common.saved')); },
    danger: c ? { label: t("Delete contact"), fn: () => { S.contacts = S.contacts.filter(x => x.id !== id); S.chats = S.chats.filter(t => t.contactId !== id); if (S.loc) { S.loc.ids = (S.loc.ids || []).filter(x => x !== id); if (!S.loc.ids.length) S.loc.on = false; } location.hash = '#/contacts'; } } : null });
}
function renderContact(id) {
  const c = contactById(id); if (!c) { location.hash = '#/contacts'; return ''; }
  const body = `<div style="text-align:center;margin:8px 0 16px"><span class="av" style="margin:0 auto;font-size:2rem;width:96px;height:96px;background:${avColor(c.name)}">${esc(initials(c.name))}</span><h2 style="margin-top:10px;font-size:1.5rem">${esc(c.name)}${c.premium ? ' ' + premBadge('Premium') : ''}</h2><p class="muted" style="margin:4px 0">${esc(c.relation || '')}${c.ice ? ' <span class="tag red">Emergency contact</span>' : ''}${c.blocked ? ' <span class="tag">Blocked</span>' : ''}</p></div>
  ${c.blocked ? '' : `<div class="actions"><a class="act" href="${telHref(c.phone)}">${ic('phone', 26)}Call</a><button class="act" data-act="msgContact" data-id="${c.id}">${ic('msg', 26)}Message</button>${c.onLifeHub ? `<a class="act" href="#/call/${c.id}/video">${ic('video', 26)}Video</a>` : `<a class="act" href="sms:${esc(c.phone.replace(/[^\d+]/g, ''))}">${ic('msg', 26)}SMS</a>`}</div>`}
  <div class="list"><div class="li">${ic('phone')}<span class="grow"><b>${esc(c.phone || '—')}</b><span>${esc(t("Phone"))}</span></span></div>${c.email ? `<a class="li" href="mailto:${esc(c.email)}">${ic('msg')}<span class="grow"><b>${esc(c.email)}</b><span>Email</span></span></a>` : ''}${c.birthday ? `<div class="li">${ic('star')}<span class="grow"><b>${esc(fmtDay(nextBday(c.birthday)))}</b><span>Birthday</span></span></div>` : ''}${c.notes ? `<div class="li">${ic('file')}<span class="grow"><b>Notes</b><span>${esc(c.notes)}</span></span></div>` : ''}</div>
  <div class="list"><button class="li" data-act="editContact" data-id="${c.id}">${ic('edit')}<span class="grow"><b>${esc(t("Edit contact"))}</b></span></button><button class="li" data-act="toggleIce" data-id="${c.id}">${ic('alert')}<span class="grow"><b>${c.ice ? t("Remove from") : t("Add to")} ${esc(t("emergency contacts"))}</b></span></button>
  <button class="li" data-act="toggleBlock" data-id="${c.id}" style="color:var(--red)">${ic('block')}<span class="grow"><b>${c.blocked ? 'Unblock' : 'Block'} ${esc(c.name.split(' ')[0])}</b></span></button><button class="li" data-act="reportContact" data-id="${c.id}" style="color:var(--red)">${ic('flag')}<span class="grow"><b>${esc(t("Report"))}</b></span></button></div>`;
  return screen({ title: 'Contact', back: '#/contacts', body });
}
function reportContact(id) {
  const c = contactById(id);
  formSheet({ title: `${esc(t("Report"))} ${c.name}`, intro: t("Reports help keep LifeHub safe. In this prototype reports are stored on your device only."), submit: t("Submit report"),
    fields: [{ k: 'reason', label: 'Reason', type: 'select', options: [t("Spam or scam"), t("Harassment or bullying"), 'Impersonation', t("Inappropriate content"), 'Other'] }, { k: 'details', label: t("Details (optional)"), type: 'textarea' }, { k: 'block', label: `${esc(t("Also block"))} ${c.name.split(' ')[0]}`, type: 'checkbox', default: true }],
    onSave: v => { S.reports.push({ id: uid(), contactId: id, ...v, t: Date.now() }); if (v.block) c.blocked = true; toast(t("Report submitted (demo)")); } });
}
async function importContacts() {
  const f = await pickFile('.vcf,.csv,.json,text/vcard,text/csv,application/json'); if (!f) return;
  const txt = await readText(f); let rows = [];
  try { if (/\.vcf$/i.test(f.name) || txt.includes('BEGIN:VCARD')) rows = parseVCard(txt);
    else if (/\.json$/i.test(f.name)) { const j = JSON.parse(txt); rows = (Array.isArray(j) ? j : j.contacts || []).map(o => ({ name: o.name || o.fullName, phone: o.phone || o.tel, email: o.email })); }
    else rows = parseCSV(txt).map(r => ({ name: r.name || [pick(r, t("first name"), 'given'), pick(r, t("last name"), 'family')].filter(Boolean).join(' ') || pick(r, 'name'), phone: pick(r, 'phone', 'mobile', 'tel'), email: pick(r, 'mail') }));
  } catch (e) { return toast(t("Could not read that file")); }
  addImported(rows);
}
function addImported(rows) {
  let n = 0; rows.forEach(r => { if (!r || !(r.name || r.phone)) return; if (S.contacts.some(c => c.name === r.name && c.phone === r.phone)) return; S.contacts.push({ id: uid(), name: r.name || r.phone, phone: r.phone || '', email: r.email || '', relation: r.org || '', ice: false, blocked: false, onLifeHub: false, notes: '', birthday: r.birthday || '', premium: false }); n++; });
  save(); render(); toast(`${esc(t("Imported"))} ${n} contact${n === 1 ? '' : 's'}`);
}
async function pickContacts() {
  try { const res = await navigator.contacts.select(['name', 'tel', 'email'], { multiple: true }); addImported(res.map(r => ({ name: (r.name || [])[0], phone: (r.tel || [])[0], email: (r.email || [])[0] }))); } catch (e) { toast(t("Contact picker cancelled")); }
}

/* ---------- plans: Free vs Premium ---------- */
/* Premium price is filled by a store later (Play Billing, Digital Goods API, or Microsoft Store) via S.plan.storePrice = { amount, currency, period, source }. */
const receiptKey = () => pkey('receipt');
const ACCENTS = { blue: ['Blue', '#2557d6', false], ocean: ['Ocean', '#0e7490', true], emerald: ['Emerald', '#047857', true], sunset: ['Sunset', '#c2410c', true], grape: ['Grape', '#7c3aed', true], rose: ['Rose', '#be185d', true] };
const SKINS = { midnight: t("Midnight (OLED)"), forest: t("Tassie Forest") };
function ensurePlan() {
  if (!S) return;
  if (!S.plan) S.plan = { tier: 'free' };
  const p = S.plan;
  if (p.tier === 'premium' && p.status === 'cancelled' && p.renews && Date.now() > p.renews) { S.plan = { tier: 'free', lapsed: Date.now() }; save(); if (typeof refreshTimer !== 'undefined') scheduleRefresh(); }
  else if (p.tier === 'premium' && p.status === 'active' && p.renews && Date.now() > p.renews) { p.renews += 30 * 86400000; save(); } // demo auto-renew
}
const isPremium = () => !!(S && S.plan && S.plan.tier === 'premium');
const premBadge = (txt = 'Premium') => `<span class="pbadge" title="${esc(t('LifeHub Premium'))}">★ ${txt}</span>`;
const fmtLong = ts => new Date(ts).toLocaleDateString(homeLocale(), { day: 'numeric', month: 'long', year: 'numeric' });

/* Ad slot: one component. Only Home's bottom placement is allowed. Never rendered for Premium
   or on Emergency, Medical ID, lock, payment/authorisation or call screens. To use a real network,
   set AD_CONFIG.provider = 'adsense' (web) with your client/slot ids; mountAds() injects the tag. */
const AD_CONFIG = { provider: 'house', adsense: { client: 'ca-pub-XXXXXXXXXXXXXXXX', slot: '0000000000' } };
const AD_PLACEMENTS = ['home-bottom'];
const HOUSE_ADS = [
  { title: t("LifeHub Premium: no ads"), body: t('ad.premiumBody'), cta: t("Go Premium"), href: '#/plan' },
  { title: t("Example ad: Tamar Bike Hire"), body: t("Sample only, not a real offer"), cta: null },
  { title: t("Example ad: Farmers Market"), body: t("Sample only, not a real offer"), cta: null },
];
function AdSlot(placement) {
  if (!AD_PLACEMENTS.includes(placement) || isPremium() || sessionStorage.getItem('lh.adHidden')) return '';
  const ad = HOUSE_ADS[new Date().getDate() % HOUSE_ADS.length];
  const inner = AD_CONFIG.provider === 'adsense' ? '<div class="ad-net" data-ad-net></div>'
    : `<span class="ad-txt"><b>${esc(ad.title)}</b><span>${esc(ad.body)}</span></span>`;
  return `<aside class="adslot" data-placement="${placement}" aria-label="Advertisement"><span class="ad-lbl">Ad</span>${inner}<a class="ad-go" href="#/plan">${esc(t("Go Premium"))}</a><button class="ad-x" data-act="hideAd" aria-label="${esc(t('Hide ad for this session'))}">${ic('x', 16)}</button></aside>`;
}
function mountAds() {
  if (AD_CONFIG.provider !== 'adsense') return;
  $$('[data-ad-net]').forEach(el => {
    if (!document.querySelector('script[data-adsbygoogle]')) { const s = document.createElement('script'); s.async = true; s.dataset.adsbygoogle = '1'; s.crossOrigin = 'anonymous'; s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CONFIG.adsense.client}`; document.head.appendChild(s); }
    el.innerHTML = `<ins class="adsbygoogle" style="display:block;height:50px" data-ad-client="${AD_CONFIG.adsense.client}" data-ad-slot="${AD_CONFIG.adsense.slot}" data-ad-format="horizontal" data-full-width-responsive="false"></ins>`;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  });
}

/* Premium perk: instant section preloading (sections are pre-rendered while idle). */
const routeCache = new Map();
const PRELOAD = ['/emergency', '/medical', '/banking', '/chat', '/contacts', '/social', '/utilities', '/addnew', '/calendar', '/location', '/settings'];
function invalidateCache() { routeCache.clear(); }
function preloadSections() {
  if (!isPremium() || !unlocked) return;
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 60));
  idle(() => { PRELOAD.forEach(p => { if (routeCache.has(p)) return; const r = ROUTES.find(([re]) => re.test(p)); if (r) try { routeCache.set(p, r[1]()); } catch (e) {} }); });
}

function renderPlan() {
  const p = S.plan, prem = isPremium();
  const rows = [[t("All sections & imports"), '✓', '✓'], [t("Emergency & Medical ID"), t("Always free"), t("Always free")], [t("Calendar, reminders & work schedule"), '✓', '✓'], [t("Budget planner"), 'Categories, month, 3 goals, chart', t("Unlimited goals, debt plan, CSV, trends")], [t("Share live location with contacts"), '–', t("Only people you tick")], ['Ads', t("1 small ad on Home"), t("No ads")],
    ['Themes', 'Light, Dark, Auto', t("+ Midnight & Tassie Forest")], [t("Accent colours"), 'Blue', t("+ 5 premium accents")], [t("Icon style"), 'Standard', t("+ Glass icons")],
    [t("Photo & image quality"), t("Standard (up to 1080px)"), t("Full resolution, sharper")], [t('plan.updates'), t('plan.updatesFree'), t('plan.updatesPrem')],
    ['Animations', 'Smooth', t("Extra snappy")], [t("Opening sections"), 'Fast', t("Instant (preloaded)")], [t("Priority features & early access"), '–', '★']];
  const status = !prem ? `<p class="muted" style="margin:6px 0 0">${esc(t("You're on the"))} <b>${esc(t("Free"))}</b> plan.</p>`
    : p.status === 'cancelled' ? `<p style="margin:6px 0 0">${esc(t("Cancelled. Premium stays on until"))} <b>${fmtLong(p.renews)}</b>, then you'll move to Free.</p>`
    : `<p style="margin:6px 0 0">${esc(t("Active since"))} ${fmtLong(p.since)} · renews <b>${fmtLong(p.renews)}</b></p>`;
  const body = `${demoNote('<b>Demo billing.</b> No money is charged in this prototype.')}
  <div class="plan-hero ${prem ? 'on' : ''}"><div class="row between"><b style="font-size:1.25rem">${prem ? t("LifeHub Premium") : t("LifeHub Free")}</b>${prem ? premBadge(p.status === 'cancelled' ? t("Ends soon") : 'Active') : ''}</div>${status}</div>
  <div class="cmp"><div class="cmp-h"><span></span><b>${esc(t("Free"))}</b><b class="pc">${esc(t("Premium"))}</b></div>${rows.map(r => `<div class="cmp-r"><span>${r[0]}</span><span>${r[1]}</span><span class="pc">${r[2]}</span></div>`).join('')}</div>
  <div class="price ${premiumPrice().source === 'placeholder' ? 'placeholder' : ''}"><b>${esc(premiumPrice().source === 'store' ? money(premiumPrice().amount, premiumPrice().currency) : premiumPrice().label)}</b><span>${premiumPrice().source === 'store' ? '/' + esc(premiumPrice().period) + t(" · from the store · cancel anytime") : t("Shown until a store price is available. Nothing is charged now.")}</span></div>
  ${!prem ? `<button class="btn primary full" data-act="upgrade">★ Upgrade to Premium</button>`
    : p.status === 'cancelled' ? `<button class="btn primary full" data-act="resume">Resume subscription</button>`
    : `<button class="btn full danger" data-act="cancelSub">Cancel subscription</button>`}
  <button class="btn ghost full" style="margin-top:8px" data-act="restore">${esc(t("Restore purchase"))}</button>
  ${prem ? "<button class=\"linkbtn\" style=\"width:100%\" data-act=\"endNow\">" + esc(t("Switch to Free now (demo/testing)")) + "</button>" : ''}
  <p class="footnote">${esc(t("Free is never slowed down on purpose. Emergency numbers, the Emergency screen location readout and Medical ID are never behind a paywall and never show ads. Sharing your live location with contacts is part of Premium."))}</p>`;
  return screen({ title: t('plan.title'), back: '#/settings', body });
}
function upgrade() {
  openSheet(`<h2>${esc(t("Checkout"))}</h2><div class="notice">${ic('alert', 18)}<div><b>${esc(t("Demo checkout."))}</b> ${esc(t("No card is charged and no real subscription is created."))}</div></div>
  <div class="feebox"><div><span>${esc(t("LifeHub Premium (monthly)"))}</span><b>${esc(premiumPrice().label)}</b></div><div class="tot"><span>${esc(t("Charged today"))}</span><span>${esc(t("Nothing · demo"))}</span></div></div>
  <label class="fld"><span>${esc(t("Pay with"))}</span><select id="coPm"><option>Demo card •••• 4242</option><option>${esc(t("Apple Pay (demo)"))}</option><option>${esc(t("Google Pay (demo)"))}</option></select></label>
  <label class="fld chk"><input type="checkbox" id="coOk"><span>I understand this is a demo and renews monthly until cancelled</span></label>
  <div class="row gap"><button class="btn" data-close>${esc(t("Cancel"))}</button><button class="btn primary" id="coGo" disabled>${esc(t("Continue"))}</button></div>`, el => {
    const ok = $('#coOk', el), go = $('#coGo', el); ok.onchange = () => go.disabled = !ok.checked;
    go.onclick = async () => { closeSheet(true); if (!(await authorize(t("Subscribe to LifeHub Premium (demo, no charge)")))) return toast(t("Checkout cancelled"));
      const now = Date.now(); S.plan = { tier: 'premium', status: 'active', since: now, renews: now + 30 * 86400000, receipt: 'demo_' + uid() };
      localStorage.setItem(receiptKey(), JSON.stringify(S.plan)); save(); invalidateCache(); scheduleRefresh(); render(); toast(t("Welcome to Premium ★ Ads removed"));
    };
  });
}
async function cancelSub() {
  if (!(await confirmSheet(t("Cancel Premium?"), `${esc(t("You'll keep Premium until"))} ${fmtLong(S.plan.renews)}. After that, LifeHub moves to Free and shows one small ad on Home.`, t("Cancel subscription"), true))) return;
  S.plan.status = 'cancelled'; localStorage.setItem(receiptKey(), JSON.stringify(S.plan)); save(); render(); toast(t("Subscription cancelled"));
}
function restore() {
  let r = null; try { r = JSON.parse(localStorage.getItem(receiptKey()) || 'null'); } catch (e) {}
  if (r && r.tier === 'premium' && (r.status === 'active' || Date.now() < r.renews)) { S.plan = r; save(); invalidateCache(); scheduleRefresh(); render(); toast(t("Premium restored")); }
  else toast(t("No active subscription found on this device"));
}

/* Premium perk: image quality. Free = standard (max 1080px longest edge, JPEG 0.75).
   Premium = full resolution kept, re-encoded only if needed at JPEG 0.92. Nothing is slowed down. */
const IMG_FREE = { max: 1080, q: 0.75 }, IMG_PREM = { max: Infinity, q: 0.92 };
async function processImage(file) {
  if (!file || !/^image\/(jpeg|png|webp|heic|heif)/i.test(file.type || 'image/jpeg')) return { blob: file, w: 0, h: 0, note: '' };
  const prem = isPremium(), cfg = prem ? IMG_PREM : IMG_FREE;
  let bmp; try { bmp = await createImageBitmap(file); } catch (e) { return { blob: file, w: 0, h: 0, note: '' }; }
  const { width: w0, height: h0 } = bmp; const sc = Math.min(1, cfg.max / Math.max(w0, h0));
  if (prem && file.type === 'image/jpeg') { bmp.close?.(); return { blob: file, w: w0, h: h0, note: `Full quality · ${w0}×${h0}` }; }
  const w = Math.round(w0 * sc), h = Math.round(h0 * sc);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingQuality = prem ? 'high' : 'medium'; g.drawImage(bmp, 0, 0, w, h); bmp.close?.();
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', cfg.q));
  return { blob: blob || file, w, h, note: prem ? `Full quality · ${w}×${h}` : `Standard quality · ${w}×${h}` };
}
/* images live in IndexedDB (too big for localStorage) */
const idb = () => openMediaDb(mediaName());
async function putStore(store, id, blob) {
  const db = await idb();
  let value = blob;
  if (profileKey && blob && typeof blob.arrayBuffer === 'function') {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, profileKey, await blob.arrayBuffer()));
    value = { e: 1, iv, ct, type: blob.type || '' };
  }
  return new Promise((res, rej) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(value, id); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
}
async function getStore(store, id) {
  const db = await idb();
  const value = await new Promise(res => { const q = db.transaction(store).objectStore(store).get(id); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); });
  if (!value) return null;
  if (value.e === 1) {
    if (!profileKey) return null;
    try { const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: value.iv }, profileKey, value.ct); return new Blob([buf], { type: value.type || '' }); } catch (e) { return null; }
  }
  if (profileKey && typeof Blob !== 'undefined' && value instanceof Blob) putStore(store, id, value);
  return value;
}
async function putImage(id, blob) { return putStore('images', id, blob); }
async function getImage(id) { return getStore('images', id); }
async function delImage(id) { try { const db = await idb(); db.transaction('images', 'readwrite').objectStore('images').delete(id); } catch (e) {} }

/* Free never waits longer than 5 minutes. Premium polls often while the app is open, and refreshes again when the tab is focused. A real feed would use its own push; nothing here calls a server. */
const FREE_REFRESH_MS = 5 * 60 * 1000;
const LIVE_REFRESH_MS = 15 * 1000;
const refreshMs = () => (isPremium() ? LIVE_REFRESH_MS : FREE_REFRESH_MS);
const refreshBlocked = () => document.hidden || navigator.onLine === false;
let refreshTimer = null;
let wakeAt = 0;
function scheduleRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => { if (unlocked && S && !refreshBlocked()) refreshAll(false); }, refreshMs());
}
function wakeRefresh() {
  if (!unlocked || !S || refreshBlocked()) return;
  const now = Date.now();
  if (now - wakeAt < 1500) return;
  wakeAt = now;
  refreshAll(false);
  scheduleRefresh();
}
const DEMO_NEW = [['instagram', t("Emma Nguyen liked your photo")], ['facebook', t("Jake Wilson commented: \"Great game!\"")], ['x', t("You have a new follower")], ['linkedin', t("Your post was viewed 24 times")]];
function refreshAll(manual, background) {
  if (!S) return;
  if (!manual && navigator.onLine === false) return;
  if (!manual && !background && document.hidden) return;
  S.lastRefresh = Date.now();
  if (!S._demoPing || Date.now() - S._demoPing > FREE_REFRESH_MS) {
    if (Math.random() < 0.35 && S.platforms && S.platforms.length) {
      const [k, note] = DEMO_NEW[Math.floor(Math.random() * DEMO_NEW.length)];
      const p = S.platforms.find(x => x.key === k);
      if (p) { S.notifications.push({ id: uid(), key: k, text: note, t: Date.now() }); p.dms += k === 'x' ? 0 : 1; S._demoPing = Date.now(); }
    }
  }
  save();
  const h = location.hash; if (/^#\/(home|social|banking|chat|utilities|calendar|location)?$/.test(h) || h === '') { const y = scrollY; render(); scrollTo(0, y); }
  if (manual) toast(t('refresh.done'));
}
const updatedLine = () => {
  const when = S.lastRefresh;
  const ago = !when ? t('not yet') : Date.now() - when < 60000 ? t('just now') : `${Math.round((Date.now() - when) / 60000)} ${t('min ago')}`;
  const mode = isPremium() ? t('refresh.live') : t('refresh.every5');
  return `<div class="updated small muted">${ic('clock', 14)} ${esc(t('Updated'))} ${esc(ago)} · ${esc(mode)}<button class="linkbtn small" data-act="refreshNow">${esc(t('Refresh'))}</button></div>`;
};
/* Later: set provider to "vapid" or "fcm" and vapidPublicKey. enableWebPush() then subscribes. No server is contacted while this is empty. */
const PUSH_CONFIG = { provider: '', vapidPublicKey: '' };
function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
function enableWebPush() {
  if (!PUSH_CONFIG.provider || !PUSH_CONFIG.vapidPublicKey) return Promise.resolve({ ok: false, reason: 'unconfigured' });
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return Promise.resolve({ ok: false, reason: 'unsupported' });
  return navigator.serviceWorker.ready.then(reg => reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(PUSH_CONFIG.vapidPublicKey) })).then(sub => ({ ok: true, subscription: sub.toJSON() })).catch(err => ({ ok: false, reason: String(err && err.message || err) }));
}
function showSwNotification(title, opts) {
  const options = Object.assign({ icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' }, opts || {});
  const fallback = () => { if (typeof Notification === 'function' && Notification.permission === 'granted') new Notification(title, options); };
  if (!('serviceWorker' in navigator)) { try { fallback(); } catch (e) {} return Promise.resolve(); }
  return navigator.serviceWorker.getRegistration().then(reg => (reg && reg.showNotification ? reg.showNotification(title, options) : fallback())).catch(() => {});
}
function notifyOn(kind) { return !!(S && S.settings && S.settings.notify && S.settings.notify[kind]); }
function ensureNotify() {
  if (!S || !S.settings) return false;
  let changed = false;
  if (!S.settings.notify || typeof S.settings.notify !== 'object') { S.settings.notify = { messages: false, emergency: false }; changed = true; }
  if (typeof S.settings.notify.messages !== 'boolean') { S.settings.notify.messages = false; changed = true; }
  if (typeof S.settings.notify.emergency !== 'boolean') { S.settings.notify.emergency = false; changed = true; }
  return changed;
}
function presentAlert(kind, title, body, url) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return Promise.resolve();
  const emergency = kind === 'emergency';
  if (emergency ? !notifyOn('emergency') : !notifyOn('messages')) return Promise.resolve();
  return showSwNotification(title, {
    body, tag: emergency ? 'lifehub-emergency' : 'lifehub-message', renotify: true, requireInteraction: emergency,
    vibrate: emergency ? [400, 120, 400, 120, 800] : [80, 40, 80],
    data: { kind, url: url || (emergency ? './#/emergency' : './#/chat') }
  });
}
function incomingNotice(contact, text, threadId) {
  const ice = !!(contact && contact.ice);
  const title = contact && contact.name ? contact.name : t('notify.messages');
  const url = './#/chat/' + (threadId || '');
  if (ice && notifyOn('emergency')) presentAlert('emergency', title, text, url);
  else if (notifyOn('messages')) presentAlert('message', title, text, url);
}
function bgStatus() {
  const bg = S && S.settings && S.settings.notify && S.settings.notify.bg;
  if (bg === 'periodic') return t('notify.bgPeriodic');
  if (bg === 'fallback') return t('notify.bgFallback');
  if (bg === 'blocked') return t('notify.bgBlocked');
  return t('notify.bgOff');
}
async function registerBackgroundRefresh() {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return 'off';
  let reg;
  try { reg = await navigator.serviceWorker.ready; } catch (e) { return 'unsupported'; }
  if (reg.periodicSync && reg.periodicSync.register) {
    try { await reg.periodicSync.register('lifehub-refresh', { minInterval: FREE_REFRESH_MS }); return 'periodic'; } catch (e) { /* browser declined a timer */ }
  }
  if (reg.sync && reg.sync.register) {
    try { await reg.sync.register('lifehub-refresh'); return 'fallback'; } catch (e) { return 'blocked'; }
  }
  return 'unsupported';
}
async function setNotify(kind, on) {
  ensureNotify();
  if (!on) { S.settings.notify[kind] = false; save(); render(); return; }
  if (!('Notification' in window)) { toast(t('notify.unsupported')); render(); return; }
  let perm = Notification.permission;
  if (perm === 'default') { try { perm = await Notification.requestPermission(); } catch (e) { perm = 'denied'; } }
  if (perm !== 'granted') { S.settings.notify[kind] = false; save(); toast(t('notify.denied')); render(); return; }
  S.settings.notify[kind] = true;
  S.settings.notify.bg = await registerBackgroundRefresh();
  save(); render(); toast(t('notify.on'));
}
async function testNotify() {
  ensureNotify();
  const n = S.settings.notify;
  if (!n.messages && !n.emergency) { toast(t('notify.pick')); return; }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') { toast(t('notify.needOn')); return; }
  if (n.messages) await presentAlert('message', t('notify.testMsgTitle'), t('notify.testMsgBody'), './#/chat');
  if (n.emergency) await presentAlert('emergency', t('notify.testEmTitle'), t('notify.testEmBody'), './#/emergency');
  toast(t('notify.sent'));
}
async function consumeBackgroundRefresh() {
  if (!S || !unlocked || !('caches' in window)) return;
  try {
    const cache = await caches.open('lifehub-bg');
    const res = await cache.match('./bg-refresh.json');
    if (!res) return;
    const data = await res.json();
    await cache.delete('./bg-refresh.json');
    if (data && data.at) refreshAll(false, true);
  } catch (e) {}
}
/* pull-to-refresh (everyone) */
(function () {
  let y0 = null, pulled = false; const ind = document.createElement('div'); ind.className = 'ptr'; ind.innerHTML = t("↓ Pull to refresh"); document.body.appendChild(ind);
  addEventListener('touchstart', e => { y0 = (scrollY <= 0 && !$('.sheet-wrap') && unlocked && !/^#\/(call|chat\/)/.test(location.hash)) ? e.touches[0].clientY : null; pulled = false; }, { passive: true });
  addEventListener('touchmove', e => { if (y0 == null) return; const d = e.touches[0].clientY - y0; if (d > 10) { ind.style.transform = `translate(-50%,${Math.min(d, 90) - 50}px)`; ind.classList.add('show'); pulled = d > 70; ind.textContent = pulled ? t("↻ Release to refresh") : t("↓ Pull to refresh"); } }, { passive: true });
  addEventListener('touchend', () => { if (y0 == null) return; ind.classList.remove('show'); ind.style.transform = ''; if (pulled) refreshAll(true); y0 = null; });
})();

/* ---------- social ---------- */
let postMedia = null;
function platBadge(p, sz = 42) { const P0 = PLATFORMS[p.key] || PLATFORMS.custom; return `<span class="pl" style="width:${sz}px;height:${sz}px;border-radius:${Math.round(sz * .28)}px;font-size:${(sz / 42).toFixed(2)}rem;background:${p.color || P0.color};${p.key === 'snapchat' ? 'color:#111' : ''}">${esc(p.key === 'custom' ? initials(p.name) : P0.l)}</span>`; }
const platName = p => p.key === 'custom' ? p.name : (PLATFORMS[p.key] || {}).name;
function renderSocial() {
  const notes = [...S.notifications].sort((a, b) => b.t - a.t);
  const body = `<div class="plats">${S.platforms.map(p => `<button class="plat" data-act="platMenu" data-id="${p.id}">${platBadge(p)}<span style="min-width:0"><b>${esc(platName(p))}</b><span class="counts"><span class="cnt ${p.friendReq ? '' : 'zero'}" title="Friend requests">${ic('user', 12, 2.6)}${p.friendReq}</span><span class="cnt ${p.dms ? '' : 'zero'}" title="Direct messages">${ic('msg', 12, 2.6)}${p.dms}</span></span></span></button>`).join('')}
  <button class="plat" data-act="addPlatform" style="border-style:dashed;box-shadow:none;justify-content:center">${ic('plus')}<b>${esc(t("Add platform"))}</b></button></div>
  <div class="card compose"><h3>${ic('edit', 18)} ${esc(t("Create a post"))}</h3><textarea id="postTxt" placeholder="What's on your mind, ${esc(S.profile.name.split(' ')[0])}?" aria-label="Post text"></textarea>
  <div id="pmedia">${postMedia ? `<div class="preview">${postMedia.type.startsWith('video') ? `<video src="${postMedia.url}" controls></video>` : `<img src="${postMedia.url}" alt="Attached photo">`}${postMedia.note ? `<div class="small muted">${esc(postMedia.note)}${isPremium() ? '' : ' · <a class="linkbtn small" href="#/plan">Full quality with Premium</a>'}</div>` : ''}<button class="iconbtn" style="position:absolute;top:8px;right:8px" data-act="clearMedia" aria-label="Remove">${ic('x')}</button></div>` : ''}</div>
  <div class="row gap" style="margin:6px 0"><button class="btn sm" data-act="camera">${ic('camera', 18)} ${esc(t("Camera"))}</button><button class="btn sm" data-act="gallery">${ic('image', 18)} ${esc(t("Photo / video"))}</button></div>
  <div class="small muted" style="margin-top:8px">${esc(t("Post to:"))}</div><div class="chkrow">${S.platforms.map(p => `<label class="chkp"><input type="checkbox" name="pp" value="${p.id}" checked>${esc(platName(p))}</label>`).join('') || "<span class=\"small muted\">" + esc(t("Add a platform first")) + "</span>"}</div>
  <button class="btn primary full" data-act="post">${ic('send', 18)} ${esc(t("Post"))}</button></div>
  ${updatedLine()}<div class="sec-h"><h2>${esc(t("Important notifications"))}</h2>${notes.length ? "<button class=\"linkbtn\" data-act=\"clearNotes\">" + esc(t("Clear all")) + "</button>" : ''}</div>
  <div class="list">${notes.length ? notes.map(n => { const p = S.platforms.find(x => x.key === n.key) || { key: n.key }; return `<div class="li">${platBadge(p, 36)}<span class="grow"><b style="font-weight:600;font-size:.95rem">${esc(n.text)}</b><span>${esc((PLATFORMS[n.key] || {}).name || '')} · ${fmtTime(n.t)}</span></span><button class="iconbtn" style="box-shadow:none;width:36px;height:36px" data-act="dismissNote" data-id="${n.id}" aria-label="Dismiss">${ic('x', 18)}</button></div>`; }).join('') : '<p class="empty">You\'re all caught up 🎉</p>'}</div>
  ${S.posts.length ? `<div class="sec-h"><h2>Your recent posts</h2></div><div class="list">${S.posts.slice(-5).reverse().map(p => `<div class="li"><span class="grow"><b style="font-weight:550">${esc(p.text || '(media)')}</b><span>${fmtTime(p.t)} · ${esc(p.to.join(', '))}${p.media ? ' · 📷' : ''}</span></span><span class="tag green">Posted</span></div>`).join('')}</div>` : ''}`;
  return screen({ title: t('banner.social'), demo: t('home.socialEmpty'), body });
}
function addPlatform() {
  formSheet({ title: t("Add a platform"), intro: t("Demo: a live version would sign in with the platform (OAuth) to read notifications and post on your behalf."), submit: 'Add',
    fields: [{ k: 'key', label: 'Platform', type: 'select', options: Object.entries(PLATFORMS).map(([k, p]) => [k, p.name]) }, { k: 'name', label: t("Name (for Custom)"), ph: 'e.g. Discord, Strava' }, { k: 'handle', label: t("Your username / handle") }, { k: 'url', label: t("Link to open (optional)"), type: 'url', ph: 'https://' }],
    onSave: v => { if (v.key === 'custom' && !v.name) { toast(t("Give your custom platform a name")); return false; } S.platforms.push({ id: uid(), key: v.key, name: v.name, handle: v.handle, url: v.url, friendReq: 0, dms: 0, color: v.key === 'custom' ? avColor(v.name) : undefined }); toast(t("Platform added")); } });
}
function platMenu(id) {
  const p = S.platforms.find(x => x.id === id); const url = p.url || (PLATFORMS[p.key] || {}).url;
  openSheet(`<div class="row gap" style="margin-bottom:12px">${platBadge(p, 52)}<div><h2 style="margin:0">${esc(platName(p))}</h2><span class="muted">${esc(p.handle || '')}</span></div></div>
  <div class="list"><div class="li">${ic('user')}<span class="grow"><b>${p.friendReq} ${esc(t("friend request"))}${p.friendReq === 1 ? '' : 's'}</b></span></div><div class="li">${ic('msg')}<span class="grow"><b>${p.dms} ${esc(t("direct message"))}${p.dms === 1 ? '' : 's'}</b></span></div></div>
  ${url ? `<a class="btn primary full" href="${esc(url)}" target="_blank" rel="noopener" style="margin-bottom:8px">${ic('ext', 18)} Open ${esc(platName(p))}</a>` : ''}
  <div class="row gap"><button class="btn" id="pmRead">${esc(t("Mark all seen"))}</button><button class="btn danger" id="pmDel">${esc(t("Remove"))}</button></div>`, el => {
    $('#pmRead', el).onclick = () => { p.friendReq = 0; p.dms = 0; save(); closeSheet(true); render(); };
    $('#pmDel', el).onclick = () => { S.platforms = S.platforms.filter(x => x.id !== id); save(); closeSheet(true); render(); toast(t("Platform removed")); }; });
}
async function attachMedia(capture) {
  const f = await pickFile('image/*,video/*', capture ? 'environment' : null); if (!f) return;
  const img = f.type.startsWith('video') ? { blob: f, note: '' } : await processImage(f);
  if (postMedia) URL.revokeObjectURL(postMedia.url); postMedia = { url: URL.createObjectURL(img.blob), type: img.blob.type || f.type || 'image/jpeg', name: f.name, note: img.note };
  const txt = $('#postTxt').value; render(); $('#postTxt').value = txt;
}
function doPost() {
  const text = $('#postTxt').value.trim(); const ids = $$('input[name=pp]:checked').map(i => i.value);
  if (!text && !postMedia) return toast(t("Write something or add a photo"));
  if (!ids.length) return toast(t("Choose at least one platform"));
  const to = ids.map(id => platName(S.platforms.find(p => p.id === id)));
  S.posts.push({ id: uid(), text, to, media: !!postMedia, t: Date.now() }); if (postMedia) URL.revokeObjectURL(postMedia.url); postMedia = null; save(); render(); toast(`${esc(t("Posted to"))} ${to.join(', ')} (demo)`);
}

/* ---------- utilities ---------- */
function billTotals() {
  const owedItems = [], creditItems = [];
  let overdue = 0;
  S.bills.forEach(b => { if (b.type === 'credit') creditItems.push(b); else if (!b.paid) { owedItems.push(b); if (b.due && daysUntil(b.due) < 0) overdue++; } });
  return { owed: groupSum(owedItems, b => b.amount, b => b.currency), credit: groupSum(creditItems, b => b.amount, b => b.currency), overdue };
}
let billSort = 'due';
function renderUtilities() {
  const { owed, credit, overdue } = billTotals();
  const arr = [...S.bills].sort((a, b) => billSort === 'amount' ? b.amount - a.amount : (a.paid - b.paid) || ((a.type === 'credit') - (b.type === 'credit')) || (a.due || '9').localeCompare(b.due || '9'));
  const row = b => { const d = b.due ? daysUntil(b.due) : null; const od = !b.paid && b.type !== 'credit' && d != null && d < 0;
    const dueTxt = b.type === 'credit' ? "<span class=\"green\">" + esc(t("In credit")) + "</span>" : b.paid ? '<span class="green">Paid ✓</span>' : d == null ? t("No due date") : d < 0 ? `<span class="red">${esc(t("Overdue by"))} ${-d} day${d === -1 ? '' : 's'}</span>` : d === 0 ? "<span class=\"amber\">" + esc(t("Due today")) + "</span>" : d <= 7 ? `<span class="amber">${esc(t("Due in"))} ${d} day${d === 1 ? '' : 's'} · ${fmtDate(b.due)}</span>` : `${esc(t("Due"))} ${fmtDate(b.due)}`;
    return `<div class="li bill ${od ? 'overdue' : ''} ${b.paid ? 'paid' : ''}"><button style="flex:1;min-width:0;background:none;border:0;padding:0;text-align:left" data-act="editBill" data-id="${b.id}"><span class="grow" style="display:block"><b>${esc(b.provider)}</b><span>${esc(b.category)}</span><div class="due">${dueTxt}${b.reminder && !b.paid && b.type !== 'credit' ? ' · 🔔' : ''}${b.file || b.imageId ? ' · 📎' : ''}</div></span></button><span style="text-align:right"><span class="amt ${b.type === 'credit' ? 'green' : b.paid ? '' : 'red'}">${b.type === 'credit' ? '+' : ''}${money(b.amount, b.currency)}</span><br>${!b.paid && b.type !== 'credit' ? `<button class="btn sm" style="margin-top:4px" data-act="payBill" data-id="${b.id}">Mark paid</button>` : ''}</span></div>`; };
  const body = `<div class="sumgrid"><div class="sum owed"><small>${esc(t("Total owed"))}</small><b>${moneyList(owed)}</b><div class="small">${overdue ? `${overdue} overdue` : t("Nothing overdue")}</div></div><div class="sum cred"><small>${esc(t("Total in credit"))}</small><b>${moneyList(credit)}</b><div class="small">${S.bills.filter(b => b.type === 'credit').length} account(s)</div></div></div>
  <div class="row gap" style="margin-bottom:12px"><button class="btn sm primary" data-act="addBill">${ic('plus', 16)} ${esc(t("Add bill"))}</button><button class="btn sm" data-act="uploadBill">${ic('camera', 16)} ${esc(t("Upload"))}</button><button class="btn sm" data-act="importBills">${ic('upload', 16)} ${esc(t("Import"))}</button></div>
  <div class="seg" style="margin-bottom:12px" role="tablist"><button class="${billSort === 'due' ? 'on' : ''}" data-act="billSort" data-s="due">${esc(t("By due date"))}</button><button class="${billSort === 'amount' ? 'on' : ''}" data-act="billSort" data-s="amount">${esc(t("By amount"))}</button></div>
  <div class="list">${arr.length ? arr.map(row).join('') : "<p class=\"empty\">" + esc(t("No bills yet. Add one manually, upload a photo/PDF, or import a CSV.")) + "</p>"}</div>
  <p class="footnote">${esc(t("Tap a bill to edit, set reminders or delete. CSV columns: provider, category, amount, due, type (owed/credit)."))}</p>`;
  return screen({ title: t('banner.utilities'), body });
}
const BILL_FIELDS = [{ k: 'provider', label: 'Provider', req: true, ph: t("e.g. Aurora Energy") }, { k: 'category', label: 'Category', type: 'select', options: ['Electricity', 'Gas', 'Water', 'Internet', 'Mobile', t("Council rates"), 'Insurance', 'Rent / mortgage', 'Subscription', 'Car / rego', 'Other'] },
  { k: 'amount', label: 'Amount', type: 'number', step: '0.01', req: true, im: 'decimal' }, { k: 'type', label: 'Balance', type: 'select', options: [['owed', t("Amount owed")], ['credit', t("In credit")]] }, { k: 'due', label: t("Due date"), type: 'date' },
  { k: 'reminder', label: t("Remind me before it's due"), type: 'checkbox', default: true }, { k: 'remindDays', label: t("Days before"), type: 'number', min: 0, default: 3, im: 'numeric' }, { k: 'paid', label: 'Paid', type: 'checkbox' }];
function editBill(id, preset) {
  const b = id && S.bills.find(x => x.id === id);
  const fields = [];
  BILL_FIELDS.forEach(f => { fields.push(f); if (f.k === 'amount') fields.push({ k: 'currency', label: 'Currency', type: 'select', options: currencyChoices() }); });
  formSheet({ title: b ? t("Edit bill") : t("Add bill"), intro: preset?.file ? `${esc(t("Attached:"))} ${esc(preset.file)}. Demo: a live version would read the amount and due date automatically (OCR).` : '', fields, values: { currency: homeCurrency(), ...(b || preset || {}) },
    onSave: v => { v.amount = Math.abs(v.amount); v.currency = v.currency || homeCurrency(); v.remindDays = isNaN(v.remindDays) ? 3 : v.remindDays; if (v.reminder) askNotify(); if (b) Object.assign(b, v); else S.bills.push({ id: uid(), file: preset?.file, imageId: preset?.imageId || null, ...v }); toast(t("Bill saved")); },
    danger: b ? { label: t("Delete bill"), fn: () => { if (b.imageId) delImage(b.imageId); S.bills = S.bills.filter(x => x.id !== id); } } : null });
  const imgId = b?.imageId || preset?.imageId; if (imgId) getImage(imgId).then(bl => { const f = $('#sheetForm'); if (!bl || !f) return; const d = document.createElement('div'); d.className = 'preview'; d.innerHTML = `<img alt="Bill image" src="${URL.createObjectURL(bl)}"><div class="small muted">${esc(preset?.note || (isPremium() ? t("Full quality") : t("Standard quality")))}</div>`; f.prepend(d); });
}
async function uploadBill() { const f = await pickFile('image/*,application/pdf', null); if (!f) return; const guess = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  let imageId = null, note = ''; if (/^image\//.test(f.type)) { const img = await processImage(f); imageId = 'bill_' + uid(); try { await putImage(imageId, img.blob); note = img.note; } catch (e) { imageId = null; } }
  editBill(null, { provider: guess.slice(0, 40), file: f.name, imageId, note, reminder: true, remindDays: 3 }); }
async function importBills() {
  const f = await pickFile('.csv,.json,text/csv,application/json'); if (!f) return; const txt = await readText(f); let rows;
  try { rows = /\.json$/i.test(f.name) ? JSON.parse(txt) : parseCSV(txt); if (!Array.isArray(rows)) rows = rows.bills || []; } catch (e) { return toast(t("Could not read that file")); }
  let n = 0; rows.forEach(r => { const amt = parseFloat(String(r.amount ?? pick(r, 'amount', 'total')).replace(/[^\d.-]/g, '')); const prov = r.provider || pick(r, 'provider', 'biller', 'name'); if (!prov || isNaN(amt)) return;
    const due = r.due || pick(r, 'due'); const dd = due ? new Date(due) : null; const type = /credit/i.test(r.type || pick(r, 'type', 'status')) || amt < 0 ? 'credit' : 'owed';
    const code = String(r.currency || pick(r, 'currency', 'ccy') || '').toUpperCase();
    S.bills.push({ id: uid(), provider: prov, category: r.category || pick(r, 'categ') || 'Other', amount: Math.abs(amt), currency: /^[A-Z]{3}$/.test(code) ? code : homeCurrency(), due: dd && !isNaN(dd) ? dd.toISOString().slice(0, 10) : '', type, paid: /paid/i.test(r.status || ''), reminder: true, remindDays: 3 }); n++; });
  save(); render(); toast(`${esc(t("Imported"))} ${n} bill${n === 1 ? '' : 's'}`);
}
function askNotify() { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); }
function checkReminders() {
  if (!S) return; checkEventReminders(); const due = S.bills.filter(b => b.reminder && !b.paid && b.type !== 'credit' && b.due && daysUntil(b.due) <= (b.remindDays ?? 3));
  if (!due.length) return; const od = due.filter(b => daysUntil(b.due) < 0).length;
  const msg = `${due.length} bill${due.length > 1 ? 's' : ''} ${esc(t("due soon"))}${od ? ` (${od} overdue)` : ''}`;
  setTimeout(() => toast('🔔 ' + msg), 600);
  try { if ('Notification' in window && Notification.permission === 'granted' && !sessionStorage.getItem('lh.notified')) { new Notification(t("LifeHub bill reminder"), { body: due.map(b => `${b.provider}: ${money(b.amount, b.currency)}`).join('\n'), icon: 'icons/icon-192.png' }); sessionStorage.setItem('lh.notified', '1'); } } catch (e) {}
}

/* ---------- add new / groups ---------- */
const appTile = a => `<a class="app" href="${esc(a.url)}" target="_blank" rel="noopener" data-app="${a.id}"><span class="ai">${esc(a.emoji || '🔗')}</span>${esc(a.name)}</a>`;
function renderAddNew() {
  const ung = S.apps.filter(a => !a.groupId || !S.groups.some(g => g.id === a.groupId));
  const body = `<div class="card"><b>${esc(t("Quick sync"))}</b><p class="muted" style="margin:6px 0 10px">${esc(t("Tick apps you might already use and add them in one step. LifeHub cannot see what is installed on this device."))}</p><button class="btn primary full" data-act="quickSync">${ic('grid', 18)} ${esc(t("Apps you might use"))}</button></div>
  <div class="dropzone" data-drop="add"><b>${esc(t("Drop an app, shortcut or link here"))}</b><span>A browser link, a Play Store or App Store link, or a shortcut (.lnk, .url, .desktop, .webloc). LifeHub only reads what you drop.</span></div>
  <button class="btn full" data-act="pasteLink" style="margin-bottom:12px">${esc(t("Paste a link"))}</button>
  <div class="row gap" style="margin-bottom:14px"><button class="btn" data-act="addOne">${ic('plus', 18)} ${esc(t("Add one link"))}</button><button class="btn" data-act="addGroup">${ic('grid', 18)} ${esc(t("New group"))}</button></div>
  <div class="sec-h"><h2>${esc(t("Your groups"))}</h2></div>
  <div class="list">${S.groups.length ? S.groups.map(g => { const n = S.apps.filter(a => a.groupId === g.id).length; return `<a class="li" href="#/group/${g.id}"><span class="ai" style="width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--card2);border:1px solid var(--line);font-size:1.4rem">${esc(g.emoji || '📁')}</span><span class="grow"><b>${esc(g.name)}</b><span>${n} app${n === 1 ? '' : 's'}${g.onHome ? t(" · on Home") : ''}</span></span>${ic('chev')}</a>`; }).join('') : "<p class=\"empty\">" + esc(t("No groups yet")) + "</p>"}</div>
  <div class="sec-h"><h2>${esc(t("Other apps"))}</h2></div><div class="appgrid">${ung.map(appTile).join('')}<button class="app add" data-act="addApp"><span class="ai">${ic('plus', 26)}</span>${esc(t("Add"))}</button></div>
  <p class="footnote">${esc(t("Tip: long-press (or right-click) an app to edit it. Deep links like spotify: or whatsapp: also work. On a phone, use Share and choose LifeHub."))}</p>`;
  return { html: screen({ title: t('add.title'), body }), after: () => openPendingDraft() };
}
function renderGroup(id) {
  const g = S.groups.find(x => x.id === id); if (!g) { location.hash = '#/addnew'; return ''; }
  const apps = S.apps.filter(a => a.groupId === id);
  const body = `<div class="appgrid">${apps.map(appTile).join('')}<button class="app add" data-act="addApp" data-g="${id}"><span class="ai">${ic('plus', 26)}</span>${esc(t("Add"))}</button></div>
  <button class="btn full" data-act="editGroup" data-id="${id}">${ic('edit', 18)} ${esc(t("Edit group"))}</button><p class="footnote">${esc(t("Long-press (or right-click) an app to edit or move it."))}</p>`;
  return screen({ title: `${g.emoji || ''} ${g.name}`.trim(), back: '#/addnew', body });
}
function editApp(id, groupId, preset) {
  const a = id && S.apps.find(x => x.id === id);
  const base = a || { groupId: groupId || '', emoji: '🔗', name: '', url: '', ...(preset || {}) };
  const intro = !a && preset && preset.note ? preset.note : '';
  formSheet({ title: a ? t("Edit app") : t("Add app or link"), intro, fields: [{ k: 'name', label: 'Name', req: true }, { k: 'url', label: t("Web address or app link"), req: true, ph: 'https://… or app-name://' }, { k: 'emoji', label: t("Icon (emoji)"), ph: '🔗' }, { k: 'groupId', label: 'Group', type: 'select', options: [['', t("No group")], ...S.groups.map(g => [g.id, `${g.emoji || ''} ${g.name}`])] }, { k: 'nextLabel', label: t("Calendar label (optional)"), ph: t("e.g. School pickup") }, { k: 'nextOn', label: t("Next date"), type: 'date' }, { k: 'nextStart', label: 'Starts', type: 'time' }, { k: 'nextEnd', label: 'Ends', type: 'time' }],
    values: base, onSave: async v => {
      if (!/^[a-z][\w+.-]*:/i.test(v.url)) v.url = 'https://' + v.url;
      try { await ensureCatalog(); } catch (e) {}
      const checked = LHSafety.scanLink(v.url, linkCheckContext());
      if (!(await presentSafety(checked, v.url))) return false;
      v.emoji = v.emoji || '🔗'; if (a) Object.assign(a, v); else S.apps.push({ id: uid(), catalogId: (preset && preset.catalogId) || '', android: (preset && preset.android) || '', ios: (preset && preset.ios) || '', ...v }); toast(checked.level === 'safe' ? t("Saved · safety check: Safe") : 'Saved');
    },
    danger: a ? { label: t("Remove app"), fn: () => S.apps = S.apps.filter(x => x.id !== id) } : null });
}
function editGroup(id) {
  const g = id && S.groups.find(x => x.id === id);
  formSheet({ title: g ? t("Edit group") : t("New group"), fields: [{ k: 'name', label: t("Group name"), req: true, ph: 'e.g. Travel, Kids, Work' }, { k: 'emoji', label: t("Icon (emoji)"), ph: '📁' }, { k: 'onHome', label: t("Show as a banner on Home"), type: 'checkbox' }],
    values: g || {}, onSave: v => { if (g) Object.assign(g, v); else { const ng = { id: uid(), ...v }; S.groups.push(ng); setTimeout(() => location.hash = '#/group/' + ng.id, 0); } toast(t("Group saved")); },
    danger: g ? { label: t("Delete group"), fn: () => { S.groups = S.groups.filter(x => x.id !== id); S.apps.forEach(a => { if (a.groupId === id) a.groupId = ''; }); location.hash = '#/addnew'; } } : null });
}

/* ---------- settings ---------- */
function renderSettings() {
  const s = S.settings; const bs = s.banners;
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(s[key]) === String(v) ? 'on' : ''}" data-act="setPref" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const langName = (LH.LANGS.find(([c]) => c === (S.profile.lang || LH.code)) || ['', LH.code])[1];
  const body = `<div class="list"><button class="li" data-act="editProfile">${av(S.profile.name)}<span class="grow"><b>${esc(S.profile.name)}</b><span>${esc(t('set.emergencyLine', { flag: region().flag, name: regionLabel(S.profile.region) }))}</span></span>${ic('edit', 18)}</button>
  <button class="li" data-act="editLang">${ic('type')}<span class="grow"><b>${esc(t('set.language'))}</b><span>${esc(langName)}</span></span>${ic('edit', 18)}</button>
  <button class="li" data-act="editMoney">${ic('bank')}<span class="grow"><b>${esc(t('set.money'))}</b><span>${esc(homeLocale())} · ${esc(homeCurrency())} · ${esc(money(1234.56))}</span></span>${ic('edit', 18)}</button>
  <a class="li" href="#/plan">${ic('star')}<span class="grow"><b>${esc(isPremium() ? t('set.planPrem') : t('set.planFree'))} ${isPremium() ? premBadge(S.plan.status === 'cancelled' ? t('set.ends') : t('set.active')) : ''}</b><span>${isPremium() ? esc(t('set.planSubPrem')) : esc(t('set.planSubFree', { price: premiumPrice().label }))}</span></span>${ic('chev')}</a>
  <a class="li" href="#/location">${ic('pin')}<span class="grow"><b>${esc(t('set.location'))} ${isPremium() ? premBadge() : '<span class="tag">' + esc(t('common.premium')) + '</span>'}</b><span>${S.loc && S.loc.on ? esc(t('set.locOn')) : esc(t('set.locOff'))}</span></span>${ic('chev')}</a></div>
  <div class="sec-h"><h2>${esc(t('set.security'))}</h2></div>
  <div class="list"><button class="li" data-act="changeLogin">${ic('lock')}<span class="grow"><b>${esc(t('prof.pinTitle'))}</b><span>${esc(S.auth && S.auth.method ? methodLabel(S.auth.method) : t('prof.noPin'))}</span></span>${ic('chev')}</button>
  ${(metaOf(activeId) || {}).lock ? `<p class="small muted" style="margin:8px 2px">${esc(t('prof.pinOn'))} ${esc(t('rec.bothLost'))}</p><button class="li" data-act="newRecovery">${ic('lock')}<span class="grow"><b>${esc(t('rec.regen'))}</b><span>${esc(t('rec.regenSub'))}</span></span></button>` : `<p class="small muted" style="margin:8px 2px">${esc(t('prof.noPinNote'))}</p>`}
  ${S.auth && S.auth.method ? `<div class="li" style="display:block">${ic('clock')} <b>${esc(t('set.autolock'))}</b><div style="margin-top:8px">${seg('lockMinutes', [[1, t('set.min1')], [5, t('set.min5')], [15, t('set.min15')], [0, t('set.never')]])}</div></div>
  <button class="li" data-act="lockNow">${ic('lock')}<span class="grow"><b>${esc(t('set.lockNow'))}</b></span></button>` : ''}</div>
  <div class="sec-h"><h2>${esc(t('set.display'))}</h2></div>
  <div class="list"><div class="li" style="display:block">${ic('type')} <b>${esc(t('set.text'))}</b><div style="margin-top:8px">${seg('textSize', [['normal', t('set.textStd')], ['large', t('set.textLg')], ['xl', t('set.textXl')]])}</div></div>
  <div class="li" style="display:block">${ic('sun')} <b>${esc(t('set.theme'))}</b><div style="margin-top:8px">${seg('theme', [['system', t('set.themeAuto')], ['light', t('set.themeLight')], ['dark', t('set.themeDark')]])}</div></div>
  <div class="li" style="display:block"><b>${esc(t('set.looks'))}</b> ${isPremium() ? premBadge() : '<span class="tag">' + esc(t('common.premium')) + '</span>'}
   <div class="swatches">${Object.entries(SKINS).map(([k, l]) => `<button class="skin skin-${k} ${s.skin === k && isPremium() ? 'on' : ''}" data-act="prem" data-k="skin" data-v="${k}">${isPremium() ? '' : ic('lock', 14) + ' '}${l}</button>`).join('')}${isPremium() && s.skin ? "<button class=\"skin\" data-act=\"prem\" data-k=\"skin\" data-v=\"\">" + esc(t("Off")) + "</button>" : ''}</div>
   <div class="swatches">${Object.entries(ACCENTS).map(([k, [l, c, pr]]) => `<button class="sw ${(s.accent || 'blue') === k ? 'on' : ''}" style="background:${c}" data-act="prem" data-k="accent" data-v="${k}" aria-label="${l} accent${pr && !isPremium() ? ' (Premium)' : ''}">${pr && !isPremium() ? ic('lock', 14) : (s.accent || 'blue') === k ? ic('check', 16, 3) : ''}</button>`).join('')}</div>
   <label class="row between" style="margin-top:10px"><span>${esc(t('set.glass'))} ${isPremium() ? '' : ic('lock', 14)}</span><span class="switch"><input type="checkbox" data-change="glass" ${s.iconStyle === 'glass' && isPremium() ? 'checked' : ''}><i></i></span></label></div></div>
  <div class="sec-h"><h2>${esc(t('cal.overlapTitle'))}</h2></div>
  <div class="list"><div class="li" style="display:block"><b>${esc(t('cal.overlapMode'))}</b><div class="seg" style="margin-top:8px">${[['on', 'cal.overlapOn'], ['summary', 'cal.overlapSummary'], ['off', 'cal.overlapOff']].map(([v, key]) => `<button class="${(S.cal.overlap || 'on') === v ? 'on' : ''}" data-act="setOverlap" data-v="${v}">${esc(t(key))}</button>`).join('')}</div>
  <p class="small muted">${esc(t('cal.quietNote'))}</p>
  <label class="row between"><span>${esc(t('cal.includeAllDay'))}</span><span class="switch"><input type="checkbox" data-change="allDayOverlap" ${S.cal && S.cal.allDayOverlap ? 'checked' : ''}><i></i></span></label>
  <p class="small" style="margin:8px 0 4px">${esc(t('cal.ignore'))}</p><p class="small muted">${esc(t('cal.ignoreOnly'))}</p>
  ${['event|work', 'event|appointment', 'event|budget', 'appointment|work', 'appointment|budget', 'work|budget'].map(pair => { const [a, b] = pair.split('|'); const on = ((S.cal && S.cal.ignore) || []).includes(pair); return `<label class="row between" style="margin:4px 0"><span>${esc(kindName(a))} + ${esc(kindName(b))}</span><span class="switch"><input type="checkbox" data-change="ignorePair" data-pair="${pair}" ${on ? 'checked' : ''}><i></i></span></label>`; }).join('')}
  </div></div>
  <div class="sec-h"><h2>${esc(t('set.banners'))}</h2></div><p class="small muted" style="margin:-4px 2px 8px">${esc(t('set.bannerNote'))}</p>
  <div class="list reorder">${bs.map((b, i) => `<div class="li"><span class="chip" style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;color:#fff;background:${BANNERS[b.id].color}">${ic(BANNERS[b.id].icon, 18)}</span><span class="grow"><b style="${b.hidden ? 'opacity:.45' : ''}">${esc(bannerTitle(b.id))}</b></span>
    <button class="mv" data-act="mvBanner" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${ic('up', 18)}</button><button class="mv" data-act="mvBanner" data-i="${i}" data-d="1" ${i === bs.length - 1 ? 'disabled' : ''} aria-label="Move down">${ic('down', 18)}</button>
    ${b.id === 'emergency' ? '<span class="mv" style="border:0;background:none"></span>' : `<button class="mv" data-act="hideBanner" data-i="${i}" aria-label="${b.hidden ? 'Show' : 'Hide'}">${ic(b.hidden ? 'eyeoff' : 'eye', 18)}</button>`}</div>`).join('')}</div>
  <div class="sec-h"><h2>${esc(t('set.refresh'))}</h2></div>
  <div class="list"><div class="li" style="display:block">${ic('clock')} <b>${esc(t('plan.updatesFree'))}</b><p class="small" style="margin:6px 0 0">${esc(t('plan.updatesPrem'))}</p><p class="small muted">${esc(isPremium() ? t('set.refreshPrem') : t('set.refreshFree'))}</p><p class="small muted">${esc(t('set.refreshPause'))}</p></div></div>
  <div class="sec-h"><h2>${esc(t('notify.title'))}</h2></div>
  <div class="list"><label class="li"><span class="grow"><b>${esc(t('notify.messages'))}</b><span>${esc(t('notify.messagesSub'))}</span></span><span class="switch"><input type="checkbox" data-change="notifyMessages" ${notifyOn('messages') ? 'checked' : ''}><i></i></span></label>
  <label class="li"><span class="grow"><b>${esc(t('notify.emergency'))}</b><span>${esc(t('notify.emergencySub'))}</span></span><span class="switch"><input type="checkbox" data-change="notifyEmergency" ${notifyOn('emergency') ? 'checked' : ''}><i></i></span></label>
  <button class="li" data-act="testNotify">${ic('bell')}<span class="grow"><b>${esc(t('notify.test'))}</b><span>${esc(t('notify.testSub'))}</span></span></button></div>
  <p class="small muted" style="margin:8px 2px 0">${esc(t('notify.honest'))} ${esc(bgStatus())}</p>
  <div class="sec-h"><h2>${esc(t('set.network'))}</h2></div>
  <label class="list li" style="border:1px solid var(--line)"><span class="grow"><b>${esc(t('set.wifi'))}</b><span>${esc(t('set.wifiSub'))}</span></span><span class="switch"><input type="checkbox" data-change="preferWifi" ${s.preferWifi ? 'checked' : ''}><i></i></span></label>
  <div class="sec-h"><h2>${esc(t('set.safety'))}</h2></div>
  <p class="small muted" style="margin:-4px 2px 8px">${esc(t('set.safetyNote'))}</p>
  <label class="list li" style="border:1px solid var(--line)"><span class="grow"><b>${esc(t('set.strict'))}</b><span>${esc(t('set.strictSub'))}</span></span><span class="switch"><input type="checkbox" data-change="safetyStrict" ${S.safety && S.safety.strict ? 'checked' : ''}><i></i></span></label>
  <div class="list">${(S.safety && S.safety.log || []).length ? S.safety.log.slice(0, 12).map(item => { const why = item.reasons ? item.reasons.map(reasonText).filter(Boolean).join(' ') : (item.reason || ''); return `<div class="li"><span class="grow"><b>${esc(item.name || t('safety.title'))}</b><span>${esc(why)}</span></span>${safetyTag(item.level)}</div>`; }).join('') : '<p class="empty">' + esc(t('set.noChecks')) + '</p>'}</div>
  <p class="footnote">${esc(t('set.safetyFoot'))}</p>
  <div class="sec-h"><h2>${esc(t('set.data'))}</h2></div>
  <div class="list"><button class="li" data-act="exportData">${ic('download')}<span class="grow"><b>${esc(t('set.export'))}</b><span>${esc(t('set.exportSub'))}</span></span></button>
  <button class="li" data-act="importData">${ic('upload')}<span class="grow"><b>${esc(t('set.import'))}</b><span>${esc(t('set.importSub'))}</span></span></button>
  <button class="li" data-act="deleteProfile" style="color:var(--red)">${ic('trash')}<span class="grow"><b>${esc(t('set.deleteProfile'))}</b><span>${esc(t('set.deleteProfileSub'))}</span></span></button>
  <button class="li" data-act="wipeData" style="color:var(--red)">${ic('trash')}<span class="grow"><b>${esc(t('set.deleteDevice'))}</b><span>${esc(t('set.deleteDeviceSub'))}</span></span></button></div>
  <div class="sec-h"><h2>${esc(t('set.policies'))}</h2></div>
  <div class="list"><a class="li" href="privacy.html">${ic('shield')}<span class="grow"><b>${esc(t('set.privacy'))}</b><span>${esc(t('set.privacySub'))}</span></span>${ic('chev')}</a>
  <a class="li" href="terms.html">${ic('file')}<span class="grow"><b>${esc(t('set.terms'))}</b></span>${ic('chev')}</a>
  <a class="li" href="support.html">${ic('msg')}<span class="grow"><b>${esc(t('set.support'))}</b><span>support@lifehubapp.app</span></span>${ic('chev')}</a></div>
  <div class="sec-h"><h2>${esc(t('set.about'))}</h2></div>
  <div class="list"><div class="li" style="display:block"><b>${esc(t('set.version', { v: APP_VERSION, net: navigator.onLine ? t('common.online') : t('common.offline') }))}</b>
  <button class="btn full" style="margin-top:10px" data-act="checkUpdates">${esc(t('set.checkUpdates'))}</button></div></div>`;
  return screen({ title: t('set.title'), body });
}
async function setLanguage(code) {
  const use = await LH.load(code);
  try { if (activeId) localStorage.setItem(pkey('lang'), use); localStorage.setItem('lifehub.lang', use); } catch (e) {}
  if (S && S.profile) { S.profile.lang = use; save(); }
  render();
  toast(t('set.langSaved'));
}
function editLang() {
  const buttons = LH.LANGS.map(([code, name]) => `<button class="method ${LH.code === code ? 'on' : ''}" data-lang="${esc(code)}" dir="auto"><span><b>${esc(name)}</b></span>${LH.code === code ? ic('check', 18) : ''}</button>`).join('');
  openSheet(`<h2>${esc(t('set.language'))}</h2><p class="muted small">${esc(t('set.languageNote'))}</p>${buttons}`, el => {
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-lang]'); if (!b) return;
      closeSheet(true);
      await setLanguage(b.dataset.lang);
    });
  });
}
function editProfile() {
  formSheet({ title: 'Profile', fields: [{ k: 'name', label: 'Name', req: true }, { k: 'region', label: t("Emergency region"), type: 'select', options: Object.entries(REGIONS).map(([k, r]) => [k, `${r.flag} ${r.name}`]) }], values: S.profile, onSave: v => { Object.assign(S.profile, v); } });
}
function editMoney() {
  const locales = [...LOCALE_CHOICES];
  if (!locales.includes(homeLocale())) locales.unshift(homeLocale());
  formSheet({ title: 'Region & currency', intro: t("This changes labels and number format only. Existing amounts stay the same number. LifeHub does not convert them with an exchange rate. An account already in another currency stays in that currency."), fields: [
    { k: 'locale', label: t("Number format"), type: 'select', options: locales },
    { k: 'currency', label: t("Home currency"), type: 'select', options: currencyChoices() },
  ], values: { locale: homeLocale(), currency: homeCurrency() }, onSave: v => { setHomeMoney(v.locale, v.currency); } });
}
function changeLogin() {
  openSheet(`<h2>${esc(t('set.signin'))}</h2><p class="muted small">${esc(t('onb.signInLead'))}</p>${Object.entries(METHODS).map(([k, m]) => `<button class="method ${S.auth.method === k ? 'on' : ''}" data-m="${k}"><span class="mi">${m.icon}</span><span><b>${esc(methodLabel(k))}</b><span>${esc(methodDesc(k))}</span></span></button>`).join('')}`, el => {
    el.addEventListener('click', async e => { const b = e.target.closest('[data-m]'); if (!b) return; const nm = b.dataset.m; closeSheet(true);
      if (!(await authorize(t("Confirm to change your sign-in method")))) return;
      if (nm === 'pin' || nm === 'password') formSheet({ title: nm === 'pin' ? t("New PIN") : t("New password"), fields: [{ k: 'a', label: nm === 'pin' ? 'PIN (4–6 digits)' : 'Password (8+ characters)', type: 'password', im: nm === 'pin' ? 'numeric' : '' }, { k: 'b', label: 'Confirm', type: 'password', im: nm === 'pin' ? 'numeric' : '' }],
        intro: nm === 'pin' ? t('prof.pinLead') : '',
        onSave: async v => { if (nm === 'pin' && !/^\d{4,6}$/.test(v.a)) { toast(t("PIN must be 4–6 digits")); return false; } if (nm === 'password' && v.a.length < 8) { toast(t("Use at least 8 characters")); return false; } if (v.a !== v.b) { toast("Those don't match"); return false; }
          if (nm === 'pin') { const keep = (metaOf(activeId) || {}).lock && (metaOf(activeId) || {}).lock.pinWrap ? profileKey : null; recoveryGate = { code: await installPin(v.a, keep) }; }
          else { profileKey = null; const m = metaOf(activeId); if (m && m.lock) { delete m.lock; writeMeta(m); } S.auth = { method: 'password', pwHash: await hash(v.a) }; save(); toast(t("Sign-in method updated")); } } });
      else if (nm === 'passkey') { let credId = null; if (passkeySupported()) { try { credId = await createPasskey(S.profile.name); } catch (err) { toast(t("Passkey not created: using simulated biometric")); } } profileKey = null; const meta = metaOf(activeId); if (meta && meta.lock) { delete meta.lock; writeMeta(meta); } S.auth = { method: 'passkey', credId }; save(); render(); toast(t("Sign-in method updated")); }
      else { profileKey = null; const meta = metaOf(activeId); if (meta && meta.lock) { delete meta.lock; writeMeta(meta); } S.auth = { method: nm }; save(); render(); toast(t("Sign-in method updated (demo)")); } });
  });
}
async function importData() {
  const f = await pickFile('.json,.vcf,.csv,application/json,text/vcard,text/csv'); if (!f) return;
  if (!/\.json$/i.test(f.name)) { const txt = await readText(f); const rows = txt.includes('BEGIN:VCARD') ? parseVCard(txt) : parseCSV(txt).map(r => ({ name: r.name || pick(r, 'name'), phone: pick(r, 'phone', 'mobile', 'tel'), email: pick(r, 'mail') })); return addImported(rows); }
  try { const j = JSON.parse(await readText(f)); if (!j || !j.profile) throw 0; if (!(await confirmSheet(t("Restore backup?"), t("This replaces your current LifeHub data (your sign-in method stays the same)."), 'Restore', true))) return; const auth = S.auth; S = { ...seed(j.profile.name, j.profile.region, false), ...j, auth }; ensureHub(); save(); render(); toast(t("Backup restored")); }
  catch (e) { toast(t("That file is not a LifeHub backup")); }
}

/* ---------- calendar, work schedule, location ---------- */
const SRC_ICON = { bill: 'zap', medical: 'cross', banking: 'bank', budget: 'bank', birthday: 'star', social: 'share', app: 'grid', shift: 'clock', manual: 'cal', import: 'download', goal: 'star', entry: 'bank' };
const KINDS = {
  event: { color: '#1d4ed8', icon: 'cal' },
  appointment: { color: '#e0457b', icon: 'cross' },
  work: { color: '#0f766e', icon: 'clock' },
  budget: { color: '#d97706', icon: 'bank' },
};
function itemKind(e) {
  if (e && e.kind && KINDS[e.kind]) return e.kind;
  const s = (e && e.source) || '';
  if (s === 'shift') return 'work';
  if (s === 'medical') return 'appointment';
  if (s === 'bill' || s === 'banking' || s === 'budget' || s === 'goal' || s === 'entry') return 'budget';
  return 'event';
}
function kindColor(e) { return KINDS[itemKind(e)].color; }
function kindIcon(e) { return KINDS[itemKind(e)].icon; }
function kindName(k) { return t('cal.kind.' + k); }
function typeOn(k) {
  const f = S && S.cal && S.cal.types;
  if (!f || f[k] == null) return true;
  return !!f[k];
}
const REMIND = [['', t("No reminder")], ['0', t("At the time")], ['15', t("15 minutes before")], ['30', t("30 minutes before")], ['60', t("1 hour before")], ['1440', t("1 day before")]];
const JOB_COLORS = ['#1d4ed8', '#0f766e', '#d97706', '#7c3aed', '#be123c', '#0891b2'];
const WDAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 0]];
const DAYNAMES = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
const DEMO_PLACES = [
  { label: t("Cataract Gorge"), lat: -41.4462, lng: 147.1186 },
  { label: t("UTAS Stadium"), lat: -41.4258, lng: 147.1386 },
  { label: t("Civic Square"), lat: -41.4352, lng: 147.1374 },
  { label: t("Kings Meadows"), lat: -41.4694, lng: 147.1622 },
  { label: 'Invermay', lat: -41.4185, lng: 147.1468 },
];
let calView = 'month';
function setCalView(v) {
  if (!['day', 'week', 'month', 'agenda'].includes(v)) return;
  calView = v;
  try { if (activeId) localStorage.setItem(pkey('cal'), v); } catch (e) {}
  if (S && S.cal) S.cal.view = v;
}
let calCursor = '';
let work = null;
let locMap = null;
let leafletP = null;
let locMe = null;

function fmtWhen(ev) {
  const day = fmtDay(ev.start.slice(0, 10));
  if (ev.allDay) return day + t(" · all day");
  const endExtra = ev.end.slice(0, 10) !== ev.start.slice(0, 10) ? ' +1' : '';
  return `${day} · ${fmtClock(ev.start.slice(11, 16))}–${fmtClock(ev.end.slice(11, 16))}${endExtra}`;
}
function rangesOverlap(a, b) { return !!(a && b && a.start < b.end && b.start < a.end); }
function ignoreKey(a, b) { return [itemKind(a), itemKind(b)].sort().join('|'); }
function visualOverlap(a, b) {
  if (!a || !b || a.id === b.id || a.hidden || b.hidden) return false;
  const includeAllDay = !!(S && S.cal && S.cal.allDayOverlap);
  if (!includeAllDay && (a.allDay || b.allDay)) return false;
  return rangesOverlap(a, b);
}
function silencedByType(a, b) {
  const skip = (S && S.cal && S.cal.ignore) || [];
  return skip.includes(ignoreKey(a, b));
}
function realOverlap(a, b) { return visualOverlap(a, b); }
function clashSig(a, b) {
  const [x, y] = a.id < b.id ? [a, b] : [b, a];
  return [x.id, x.start, x.end, x.title, y.id, y.start, y.end, y.title].join('\u001f');
}
function timeSig(a, b) {
  const [x, y] = a.id < b.id ? [a, b] : [b, a];
  return [x.id, x.start, x.end, y.id, y.start, y.end].join('\u001f');
}
function pairIgnored(a, b) {
  const gone = (S && S.cal && S.cal.dismissed) || [];
  return gone.includes(timeSig(a, b)) || gone.includes(clashSig(a, b)) || gone.includes(pairKey(a, b));
}
function localDay() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function quietHours() { const h = new Date().getHours(); return h >= 22 || h < 7; }
function onDay(ev, day) { const a = day + 'T00:00', b = addDays(day, 1) + 'T00:00'; return ev.start < b && ev.end > a; }
function pairKey(a, b) { const ka = a.id + '@' + a.start, kb = b.id + '@' + b.start; return ka < kb ? ka + '|' + kb : kb + '|' + ka; }
function findConflicts() {
  const ev = (S.events || []).filter(e => !e.hidden);
  const pairs = [];
  for (let i = 0; i < ev.length; i++) for (let j = i + 1; j < ev.length; j++) if (visualOverlap(ev[i], ev[j])) pairs.push([ev[i], ev[j]]);
  return pairs;
}
function activePairs() { return findConflicts().filter(([a, b]) => !pairIgnored(a, b) && !silencedByType(a, b)); }
function clashState(e) {
  let state = '';
  findConflicts().forEach(([a, b]) => {
    if (a.id !== e.id && b.id !== e.id) return;
    if (!pairIgnored(a, b)) state = 'open';
    else if (state !== 'open') state = 'ignored';
  });
  return state;
}
function eventClashes(e) { return clashState(e) === 'open'; }
function plusMinutes(hm, mins) {
  const [h, m] = hm.split(':').map(Number);
  const t = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}
function monthStep(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const next = new Date(Date.UTC(y, m, 1));
  const dim = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  const dd = Math.min(d, dim);
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
function everyStep(iso, every) { if (every === 'weekly') return addDays(iso, 7); if (every === 'monthly') return monthStep(iso); return addDays(iso, 14); }
function nextBday(iso) {
  if (!iso) return '';
  const bits = String(iso).split('-');
  const m = String(bits.length === 3 ? bits[1] : bits[0]).padStart(2, '0');
  const d = String(bits.length === 3 ? bits[2] : bits[1]).padStart(2, '0');
  const today = hobartToday();
  const clamp = yr => { const dim = new Date(Date.UTC(yr, Number(m), 0)).getUTCDate(); return `${yr}-${m}-${String(Math.min(Number(d), dim)).padStart(2, '0')}`; };
  let y = Number(today.slice(0, 4));
  let cand = clamp(y);
  if (cand < today) cand = clamp(y + 1);
  return cand;
}
function autoId(key) { return 'auto_' + String(key).replace(/[^a-zA-Z0-9_]/g, '_'); }
function pushAuto(out, key, ev) {
  if (S.cal.skip[key]) return;
  const row = { id: autoId(key), sourceKey: key, auto: true, hidden: false, allDay: false, loc: '', notes: '', color: '#1d4ed8', reminderMin: null, ...ev };
  row.kind = ev.kind || itemKind(row);
  row.color = KINDS[row.kind].color;
  out.push(row);
}
function socialTextEvent(n) {
  const text = n.text || '';
  const m = text.match(/event reminder:\s*(.+)$/i);
  if (!m) return null;
  const title = m[1].replace(/\s+is\s+(tomorrow|today)\s*$/i, '').trim() || t("Social event");
  const today = hobartToday();
  const day = /tomorrow/i.test(text) ? addDays(today, 1) : today;
  return { title, start: day + 'T10:00', end: day + 'T16:00' };
}
function syncAutoEvents() {
  const out = [];
  const today = hobartToday();
  (S.bills || []).forEach(b => {
    if (!b.due || b.paid || b.type === 'credit') return;
    pushAuto(out, 'bill_' + b.id, { title: t("Bill due: ") + b.provider, start: b.due + 'T00:00', end: addDays(b.due, 1) + 'T00:00', allDay: true, source: 'bill', sourceLabel: 'Utilities', color: '#d97706', reminderMin: (Number(b.remindDays) || 0) * 1440 });
  });
  (S.medical.appointments || []).forEach(a => {
    if (!a.start || !a.end) return;
    pushAuto(out, 'appt_' + a.id, { title: a.title || 'Appointment', start: a.start, end: a.end, loc: a.place || '', notes: a.notes || '', source: 'medical', sourceLabel: 'Medical', color: '#e0457b', reminderMin: 60 });
  });
  (S.medical.medications || []).forEach(med => {
    if (!med.time) return;
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i);
      const sp = span(d, med.time, plusMinutes(med.time, 15));
      pushAuto(out, 'med_' + med.id + '_' + d, { title: 'Medication: ' + med.name, start: sp.start, end: sp.end, notes: med.dose || '', source: 'medical', sourceLabel: 'Medical', color: '#e0457b', reminderMin: 0 });
    }
  });
  (S.scheduled || []).forEach(p => {
    if (!p.next) return;
    let d = p.next, guard = 0;
    while (d < addDays(today, -1) && guard++ < 36) d = everyStep(d, p.every);
    for (let i = 0; i < 6 && d <= addDays(today, 120); i++) {
      pushAuto(out, 'pay_' + p.id + '_' + d, { title: `${p.name} · ${money(p.amount, p.currency)}`, start: d + 'T00:00', end: addDays(d, 1) + 'T00:00', allDay: true, source: 'banking', sourceLabel: 'Banking', color: '#0f766e', reminderMin: 1440 });
      d = everyStep(d, p.every);
    }
  });
  (S.contacts || []).forEach(c => {
    if (!c.birthday || c.blocked) return;
    const when = nextBday(c.birthday);
    if (!when) return;
    const first = String(c.name || 'Contact').split(' ')[0];
    pushAuto(out, 'bday_' + c.id + '_' + when.slice(0, 4), { title: first + "'s birthday", start: when + 'T00:00', end: addDays(when, 1) + 'T00:00', allDay: true, source: 'birthday', sourceLabel: 'Birthday', color: '#db2777', reminderMin: 1440 });
  });
  (S.notifications || []).forEach(n => {
    let title = n.eventTitle, start = n.eventStart, end = n.eventEnd;
    if (!start) { const parsed = socialTextEvent(n); if (!parsed) return; title = parsed.title; start = parsed.start; end = parsed.end; }
    if (!end) end = start.slice(0, 10) + 'T23:59';
    pushAuto(out, 'social_' + n.id, { title: title || n.text || t("Social event"), start, end, source: 'social', sourceLabel: 'Social', color: '#db2777', reminderMin: 60 });
  });
  (S.apps || []).forEach(a => {
    if (!a.nextOn) return;
    const sp = span(a.nextOn, a.nextStart || '09:00', a.nextEnd || '10:00');
    pushAuto(out, 'app_' + a.id, { title: a.nextLabel || a.name, start: sp.start, end: sp.end, source: 'app', sourceLabel: a.name || 'App', color: '#475569', reminderMin: 30 });
  });
  if (S.budget && Array.isArray(S.budget.bills)) S.budget.bills.forEach(b => {
    if (!b || !b.name) return;
    let ym = today.slice(0, 7);
    const day = String(Math.min(28, Math.max(1, Number(b.day) || 1))).padStart(2, '0');
    if (today.slice(8) > day) ym = shiftMonth(ym, 1);
    for (let i = 0; i < 4; i++) {
      const date = ym + '-' + day;
      pushAuto(out, 'bbill_' + b.id + '_' + ym, { title: t("Budget bill: ") + b.name, start: date + 'T00:00', end: addDays(date, 1) + 'T00:00', allDay: true, source: 'budget', sourceLabel: 'Budget', color: '#d97706', reminderMin: 1440, notes: money(b.amount, b.currency || S.budget.currency) });
      ym = shiftMonth(ym, 1);
    }
  });
  (S.budget.entries || []).forEach(en => {
    if (!en || !en.date) return;
    const cat = (S.budget.categories || []).find(c => c.id === en.catId);
    pushAuto(out, 'entry_' + en.id, { title: (cat && cat.name ? cat.name + ': ' : '') + (en.note || t('cal.budgetItem')), start: en.date + 'T09:00', end: en.date + 'T09:30', allDay: false, source: 'entry', sourceLabel: 'Budget', notes: en.note || '' });
  });
  (S.budget.goals || []).forEach(g => {
    if (!g || !g.due) return;
    pushAuto(out, 'goal_' + g.id, { title: t('cal.goalDue', { name: g.name }), start: g.due + 'T00:00', end: addDays(g.due, 1) + 'T00:00', allDay: true, source: 'goal', sourceLabel: 'Budget' });
  });
  const prev = new Map((S.events || []).filter(e => e.auto).map(e => [e.id, e]));
  out.forEach(e => { const old = prev.get(e.id); if (old) { e.hidden = !!old.hidden; if (old.reminderTouched) e.reminderMin = old.reminderMin; } });
  S.events = (S.events || []).filter(e => !e.auto).concat(out);
}
function eventSig(list) { return (list || []).map(e => [e.id, e.title, e.start, e.end, e.hidden ? 1 : 0, e.auto ? 1 : 0, e.reminderMin ?? '', e.source || ''].join('\u001f')).sort().join('\n'); }
function ensureBanners() {
  if (!S.settings) S.settings = {};
  if (!Array.isArray(S.settings.banners)) S.settings.banners = [];
  let changed = false;
  if (!S.settings.banners.some(b => b.id === 'calendar')) {
    const i = S.settings.banners.findIndex(b => b.id === 'emergency');
    S.settings.banners.splice(i < 0 ? 0 : i + 1, 0, { id: 'calendar', hidden: false });
    changed = true;
  }
  if (!S.settings.banners.some(b => b.id === 'documents')) {
    const i = S.settings.banners.findIndex(b => b.id === 'addnew');
    S.settings.banners.splice(i < 0 ? S.settings.banners.length : i, 0, { id: 'documents', hidden: false });
    changed = true;
  }
  const filtered = S.settings.banners.filter(b => BANNERS[b.id]);
  if (filtered.length !== S.settings.banners.length) { S.settings.banners = filtered; changed = true; }
  return changed;
}
function tidyLoc() {
  if (!S.loc || typeof S.loc !== 'object') S.loc = { on: false, mode: '', until: null, ids: [] };
  if (!Array.isArray(S.loc.ids)) S.loc.ids = [];
  let changed = false;
  const ok = new Set((S.contacts || []).filter(c => c.premium && !c.blocked).map(c => c.id));
  const ids = S.loc.ids.filter(id => ok.has(id));
  if (ids.length !== S.loc.ids.length) { S.loc.ids = ids; changed = true; }
  if (S.loc.on && !S.loc.ids.length) { S.loc.on = false; changed = true; }
  if (S.loc.on && S.loc.mode === '1h' && S.loc.until && Date.now() > S.loc.until) { S.loc.on = false; changed = true; }
  return changed;
}
function migrateDemoNames() {
  if (!S) return false;
  const who = demoPersona();
  let changed = false;
  const ch = (...codes) => String.fromCharCode(...codes);
  const oldFull = ch(67, 104, 114, 105, 115, 32, 68, 97, 121);
  const oldCompact = ch(64, 99, 104, 114, 105, 115, 100, 97, 121);
  const oldSnake = ch(64, 99, 104, 114, 105, 115, 95, 100, 97, 121);
  const oldGh = ch(99, 104, 114, 105, 115, 116, 117, 114, 116, 108, 101, 100, 97, 121);
  const oldPartner = ch(83, 97, 114, 97, 104, 32, 68, 97, 121);
  const oldParent = ch(76, 105, 110, 100, 97, 32, 68, 97, 121);
  const swap = s => {
    if (typeof s !== 'string' || !s) return s;
    return s.split(oldSnake).join('@' + who.handle).split(oldCompact).join('@' + who.slug).split(oldFull).join(who.full).split(oldPartner).join(who.partner + ' ' + who.last).split(oldParent).join(who.parent + ' ' + who.last).split(oldGh).join(who.slug);
  };
  const touch = (obj, field) => {
    if (!obj || typeof obj[field] !== 'string') return;
    const next = swap(obj[field]);
    if (next !== obj[field]) { obj[field] = next; changed = true; }
  };
  const phones = new Set(['0491570156', '0491570157', '0491570158', '0491570159', '0491570110', '0360000000']);
  (S.contacts || []).forEach(c => {
    const digits = String(c.phone || '').replace(/\D/g, '');
    if (c.demo || phones.has(digits)) {
      if (!c.demo) { c.demo = true; changed = true; }
      touch(c, 'name');
      touch(c, 'email');
    }
  });
  (S.platforms || []).forEach(p => {
    if (p.demo || p.handle === oldFull || p.handle === oldCompact || p.handle === oldSnake) {
      if (!p.demo) { p.demo = true; changed = true; }
      touch(p, 'handle');
    }
  });
  (S.notifications || []).forEach(n => {
    if (!n || typeof n.text !== 'string') return;
    if (n.demo || [oldFull, oldPartner, oldParent, oldCompact, oldSnake, oldGh].some(needle => n.text.includes(needle))) {
      if (!n.demo) { n.demo = true; changed = true; }
      touch(n, 'text');
      touch(n, 'eventTitle');
    }
  });
  if (S.demoPersona !== who.id) { S.demoPersona = who.id; changed = true; }
  return changed;
}
function ensureHub() {
  const moneyChanged = migrateMoney();
  if (!S || !S.medical) { if (moneyChanged) save(); return; }
  if (!Array.isArray(S.medical.appointments)) S.medical.appointments = [];
  if (!Array.isArray(S.events)) S.events = [];
  if (!Array.isArray(S.jobs)) S.jobs = [];
  if (!Array.isArray(S.scheduled)) S.scheduled = [];
  if (!S.cal || typeof S.cal !== 'object') S.cal = {};
  ['dismissed', 'alerted', 'notices', 'fired'].forEach(k => { if (!Array.isArray(S.cal[k])) S.cal[k] = []; });
  if (!S.cal.skip || typeof S.cal.skip !== 'object') S.cal.skip = {};
  if (!S.cal.linked || typeof S.cal.linked !== 'object') S.cal.linked = {};
  if (!S.cal.overlap) S.cal.overlap = 'on';
  if (!Array.isArray(S.cal.ignore)) S.cal.ignore = [];
  if (!S.cal.types || typeof S.cal.types !== 'object') S.cal.types = { event: true, appointment: true, work: true, budget: true };
  const namesChanged = migrateDemoNames();
  (S.events || []).forEach(e => { if (!e.auto) { const k = itemKind(e); if (e.kind !== k) e.kind = k; } });
  (S.contacts || []).forEach(c => { if (c.birthday == null) c.birthday = ''; if (typeof c.premium !== 'boolean') c.premium = false; });
  (S.apps || []).forEach(a => { if (a.nextOn == null) a.nextOn = ''; });
  const notifyChanged = ensureNotify();
  const bannersChanged = ensureBanners();
  const budgetChanged = ensureBudget();
  const docsChanged = ensureDocs();
  const safetyChanged = ensureSafety();
  const before = eventSig(S.events);
  syncAutoEvents();
  if (moneyChanged || namesChanged || notifyChanged || bannersChanged || budgetChanged || docsChanged || safetyChanged || eventSig(S.events) !== before || tidyLoc()) save();
}
function announceConflicts() {
  if (!unlocked || !S || !S.cal) return;
  const mode = S.cal.overlap || 'on';
  if (mode === 'off') return;
  if (!Array.isArray(S.cal.alerted)) S.cal.alerted = [];
  const fresh = [];
  activePairs().forEach(([a, b]) => {
    const sig = timeSig(a, b);
    if (S.cal.alerted.includes(sig) || S.cal.alerted.includes(clashSig(a, b))) return;
    fresh.push({ a, b, sig, synced: !!(a.auto && b.auto) });
  });
  if (!fresh.length) return;
  if (quietHours()) return;
  const today = localDay();
  const synced = fresh.filter(f => f.synced);
  const direct = fresh.filter(f => !f.synced);
  let shown = [];
  if (mode === 'summary') {
    if (S.cal.summaryDay === today) { fresh.forEach(f => S.cal.alerted.push(f.sig)); save(); return; }
    shown = fresh;
    S.cal.summaryDay = today;
  } else {
    shown = direct.slice();
    if (synced.length && S.cal.summaryDay !== today) { shown = shown.concat(synced); S.cal.summaryDay = today; }
    else synced.forEach(f => { if (!S.cal.alerted.includes(f.sig)) S.cal.alerted.push(f.sig); });
  }
  if (!shown.length) { if (synced.length) save(); return; }
  shown.forEach(f => { if (!S.cal.alerted.includes(f.sig)) S.cal.alerted.push(f.sig); });
  const text = t('cal.overlapCount', { n: shown.length });
  const detail = shown.slice(0, 3).map(f => t('cal.overlapsPair', { a: f.a.title, b: f.b.title })).join('\n');
  S.cal.notices.unshift({ id: uid(), text: shown.length === 1 ? t('cal.overlapsPair', { a: shown[0].a.title, b: shown[0].b.title }) : text, t: Date.now(), k: shown[0].sig });
  if (S.cal.notices.length > 30) S.cal.notices.length = 30;
  save();
  setTimeout(() => toast(shown.length === 1 ? t('cal.overlapsPair', { a: shown[0].a.title, b: shown[0].b.title }) : text), 350);
  if ('Notification' in window && Notification.permission === 'granted') showSwNotification(t('cal.overlapTitle'), { body: detail || text, tag: 'lifehub-overlap' });
}
function checkEventReminders() {
  if (!S || !S.events || !S.cal) return;
  const now = Date.now();
  let changed = false;
  S.events.forEach(e => {
    if (e.hidden || e.reminderMin == null || e.reminderMin === '') return;
    const mins = Number(e.reminderMin);
    if (Number.isNaN(mins)) return;
    const startMs = wallToMs(e.start);
    const fireAt = startMs - mins * 60000;
    if (now < fireAt || now > startMs + 15 * 60000) return;
    const key = e.id + '@' + e.start;
    if (S.cal.fired.includes(key)) return;
    if (quietHours()) return;
    S.cal.fired.push(key); changed = true;
    setTimeout(() => { if (!document.hidden) toast(t('cal.reminder', { title: e.title })); }, 400);
    if ('Notification' in window && Notification.permission === 'granted') showSwNotification(t('cal.reminderTitle'), { body: e.title + '\n' + fmtWhen(e), tag: 'lifehub-reminder-' + e.id });
  });
  if (S.cal.fired.length > 200) S.cal.fired.splice(0, S.cal.fired.length - 200);
  if (changed) save();
}
function parseTimeToken(s) {
  s = String(s || '').trim().toLowerCase().replace(/\./g, ':');
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = +m[1], min = +(m[2] || 0);
  if (min > 59 || h > 23) return null;
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  if (h > 23) return null;
  return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
}
function parseRoster(text, fromISO) {
  const from = fromISO || hobartToday();
  const out = [];
  String(text || '').split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || /^(date|day)\b/i.test(line)) return;
    const csv = line.split(',').map(s => s.trim());
    if (/^\d{4}-\d{2}-\d{2}$/.test(csv[0]) && csv.length >= 3) {
      const st = parseTimeToken(csv[1]), en = parseTimeToken(csv[2]);
      if (st && en) out.push({ date: csv[0], start: st, end: en, title: csv[3] || 'Shift' });
      return;
    }
    const m = line.match(/^([A-Za-z]+)\s+(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)\s*(?:-|–|—|to)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)(?:\s+(.+))?$/i);
    if (!m) return;
    const wd = DAYNAMES[m[1].toLowerCase()];
    const st = parseTimeToken(m[2]), en = parseTimeToken(m[3]);
    if (wd == null || !st || !en) return;
    out.push({ date: addDays(from, (wd - wdIndex(from) + 7) % 7), start: st, end: en, title: (m[4] || 'Shift').trim() });
  });
  return out;
}
function parseICS(text) {
  const out = [];
  String(text || '').replace(/\r\n[ \t]/g, '').split(/BEGIN:VEVENT/i).slice(1).forEach(block => {
    const lines = block.split(/END:VEVENT/i)[0].split(/\r?\n/);
    const val = k => { const ln = lines.find(l => l.toUpperCase().startsWith(k)); if (!ln) return ''; const i = ln.indexOf(':'); return i < 0 ? '' : ln.slice(i + 1).trim().replace(/\\n/gi, ' ').replace(/\\,/g, ','); };
    const ds = val('DTSTART'), de = val('DTEND');
    const one = raw => {
      const m = String(raw).match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
      if (!m) return null;
      const date = `${m[1]}-${m[2]}-${m[3]}`;
      if (!m[4]) return { date, time: '00:00', allDay: true };
      if (/Z$/i.test(raw)) { const p = hobartNowParts(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]))); return { date: p.iso, time: p.hh + ':' + p.mm, allDay: false }; }
      return { date, time: m[4] + ':' + m[5], allDay: false };
    };
    const a = one(ds); if (!a) return;
    const b = de ? one(de) : null;
    let start, end, allDay;
    if (a.allDay) { allDay = true; start = a.date + 'T00:00'; end = (b && b.allDay ? b.date : addDays(a.date, 1)) + 'T00:00'; if (end <= start) end = addDays(a.date, 1) + 'T00:00'; }
    else { allDay = false; start = a.date + 'T' + a.time; end = b && !b.allDay ? b.date + 'T' + b.time : span(a.date, a.time, plusMinutes(a.time, 60)).end; if (end <= start) end = addDays(a.date, 1) + 'T' + (b && b.time ? b.time : a.time); }
    out.push({ title: val('SUMMARY') || t("Imported event"), start, end, allDay, loc: val('LOCATION') });
  });
  return out;
}
function cursor() { if (!calCursor) calCursor = hobartToday(); return calCursor; }
function clashMark(e) {
  const state = clashState(e);
  if (state === 'open') return `<span class="clash-dot" title="${esc(t('cal.clashMark'))}">!</span>`;
  if (state === 'ignored') return `<span class="clash-dot soft" title="${esc(t('cal.ignoredMark'))}">!</span>`;
  return '';
}
function eventRow(e) {
  return `<button class="li" data-act="openEvent" data-id="${e.id}"><span class="evdot" style="background:${esc(kindColor(e))}"></span><span class="grow"><b>${esc(e.title)}</b><span>${esc(fmtWhen(e))}${e.loc ? ' · ' + esc(e.loc) : ''}</span></span>${clashMark(e)}<span class="tag">${ic(kindIcon(e), 14)} ${esc(kindName(itemKind(e)))}</span></button>`;
}
function dayEvents(day, budgetOnly) {
  return S.events.filter(e => !e.hidden && onDay(e, day) && (!budgetOnly || itemKind(e) === 'budget') && (budgetOnly || typeOn(itemKind(e)))).sort((a, b) => a.start.localeCompare(b.start));
}
function clashBlock(pairs) {
  if (!pairs.length) return '';
  const ordered = pairs.slice().sort((a, b) => (pairIgnored(a[0], a[1]) ? 1 : 0) - (pairIgnored(b[0], b[1]) ? 1 : 0));
  return `<section class="clash" id="clashes" data-role="clash"><h3>${ic('alert', 18)} ${esc(t('cal.overlaps', { n: pairs.length }))}</h3>
    ${ordered.slice(0, 8).map(([a, b]) => {
      const ignored = pairIgnored(a, b);
      return `<div class="clash-row${ignored ? ' ignored' : ''}"><b>${esc(a.title)}</b> ${esc(t('cal.overlapsWord'))} <b>${esc(b.title)}</b><div class="small">${esc(fmtWhen(a))}${ignored ? ' · ' + esc(t('cal.ignoredNote')) : ''}</div>
      <div class="row gap wrap" style="margin-top:8px"><button class="btn sm" data-act="editClash" data-id="${a.id}">${esc(t('cal.editNamed', { name: a.title }))}</button><button class="btn sm" data-act="editClash" data-id="${b.id}">${esc(t('cal.editNamed', { name: b.title }))}</button><button class="btn sm" data-act="${ignored ? 'unignorePair' : 'ignorePair'}" data-a="${a.id}" data-b="${b.id}">${esc(t(ignored ? 'cal.unignore' : 'cal.ignoreClash'))}</button></div></div>`;
    }).join('')}
    ${pairs.length > 8 ? `<p class="small">${esc(t('cal.moreClashes', { n: pairs.length - 8 }))}</p>` : ''}
    <button class="btn sm" data-act="askClashNotify" style="margin-top:8px">${ic('bell', 16)} ${esc(t('cal.notify'))}</button></section>`;
}
function noticesBlock() {
  const notes = (S.cal.notices || []).slice(0, 5);
  if (!notes.length) return '';
  return `<div class="sec-h"><h2>${esc(t('cal.notes'))}</h2></div><div class="list">${notes.map(n => `<div class="li">${ic('bell')}<span class="grow"><b>${esc(n.text)}</b><span>${fmtTime(n.t)}</span></span><button class="iconbtn" style="box-shadow:none;width:36px;height:36px" data-act="dismissNotice" data-id="${n.id}" aria-label="${esc(t('cal.dismiss'))}">${ic('x', 16)}</button></div>`).join('')}</div>`;
}
function monthCells(iso) {
  const [y, m] = iso.split('-').map(Number);
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const lead = (wdIndex(first) - weekStart() + 7) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('');
  for (let d = 1; d <= days; d++) cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7) cells.push('');
  return cells;
}
function monthLabel(iso) { const [y, m] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(homeLocale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }); }
function navRow(label, mode) {
  const step = mode === 'month' ? ['data-m="-1"', 'data-m="1"'] : mode === 'day' ? ['data-d="-1"', 'data-d="1"'] : ['data-d="-7"', 'data-d="7"'];
  return `<div class="cal-nav"><button class="iconbtn" data-act="calNav" ${step[0]} aria-label="${esc(t('cal.prev'))}">${ic('back')}</button><b>${esc(label)}</b><button class="iconbtn" data-act="calNav" data-today="1" aria-label="${esc(t('cal.today'))}">${esc(t('cal.today'))}</button><button class="iconbtn" data-act="calNav" ${step[1]} aria-label="${esc(t('cal.next'))}">${ic('chev')}</button></div>`;
}
function dayCell(d, day, today, budgetOnly) {
  if (!d) return '<span class="cal-day" style="visibility:hidden"></span>';
  const ev = dayEvents(d, budgetOnly).slice(0, 3);
  const states = dayEvents(d, budgetOnly).map(clashState);
  const mark = states.includes('open') ? '<i class="clash-dot">!</i>' : states.includes('ignored') ? '<i class="clash-dot soft">!</i>' : '';
  return `<button class="cal-day ${d === today ? 'today' : ''} ${d === day ? 'on' : ''}" data-act="calDay" data-d="${d}" aria-current="${d === today ? 'date' : 'false'}" aria-label="${esc(fmtDay(d))}"><span class="n">${Number(d.slice(8))}${mark}</span><span class="dots">${ev.map(e => `<i class="dot" style="background:${esc(kindColor(e))}"></i>`).join('')}</span></button>`;
}
function monthView(day, budgetOnly) {
  const cells = monthCells(day);
  const today = hobartToday();
  const grid = cells.map(d => dayCell(d, day, today, budgetOnly)).join('');
  const list = dayEvents(day, budgetOnly);
  return `${navRow(monthLabel(day), 'month')}<div class="cal-grid cal-dow">${weekDayOrder().map(wd => `<span>${esc(weekdayName(wd, 'narrow'))}</span>`).join('')}</div><div class="cal-grid">${grid}</div>
    <div class="sec-h"><h2>${esc(fmtDay(day))}${day === today ? esc(t('cal.todayMark')) : ''}</h2></div><div class="list">${list.length ? list.map(eventRow).join('') : '<p class="empty">' + esc(t('cal.emptyDay')) + '</p>'}</div>`;
}
function dayView(day, budgetOnly) {
  const list = dayEvents(day, budgetOnly);
  const hours = [];
  for (let h = 6; h <= 21; h++) hours.push(String(h).padStart(2, '0') + ':00');
  const timed = hours.map(h => {
    const hits = list.filter(e => !e.allDay && e.start.slice(11, 13) === h.slice(0, 2));
    return `<div class="day-hour"><span>${esc(fmtClock(h))}</span><div>${hits.map(eventRow).join('') || ''}</div></div>`;
  }).join('');
  const all = list.filter(e => e.allDay);
  return `${navRow(fmtDay(day), 'day')}${all.length ? `<div class="list">${all.map(eventRow).join('')}</div>` : ''}<div class="day-board">${timed}</div>${list.length ? '' : '<p class="empty">' + esc(t('cal.emptyDay')) + '</p>'}`;
}
function weekView(day, budgetOnly) {
  const start = startOfWeek(day);
  const today = hobartToday();
  const cols = weekDayOrder().map((wd, idx) => {
    const d = addDays(start, idx);
    const ev = dayEvents(d, budgetOnly);
    const states = ev.map(clashState);
    const mark = states.includes('open') ? '<em>!</em>' : states.includes('ignored') ? '<em class="soft">!</em>' : '';
    return `<button class="week-col ${d === today ? 'today' : ''} ${d === day ? 'on' : ''}" data-act="calDay" data-d="${d}"><b>${esc(weekdayName(wd, 'narrow'))}</b><span>${Number(d.slice(8))}</span>${ev.slice(0, 4).map(e => `<i style="background:${esc(kindColor(e))}">${esc(e.title)}</i>`).join('')}${mark}</button>`;
  }).join('');
  const list = dayEvents(day, budgetOnly);
  return `${navRow(t('cal.weekOf', { day: fmtDay(start) }), 'week')}<div class="week-board">${cols}</div>
    <div class="sec-h"><h2>${esc(fmtDay(day))}</h2></div><div class="list">${list.length ? list.map(eventRow).join('') : '<p class="empty">' + esc(t('cal.emptyWeek')) + '</p>'}</div>`;
}
function agendaView(day, budgetOnly) {
  const end = addDays(day, 45);
  const items = S.events.filter(e => !e.hidden && e.end > day + 'T00:00' && e.start < end + 'T00:00' && (!budgetOnly || itemKind(e) === 'budget') && (budgetOnly || typeOn(itemKind(e)))).sort((a, b) => a.start.localeCompare(b.start));
  if (!items.length) return '<p class="empty">' + esc(t('cal.emptyAhead')) + '</p>';
  let html = '', last = '';
  items.forEach(e => {
    const d = e.start.slice(0, 10);
    if (d !== last) { if (last) html += '</div>'; html += `<div class="sec-h"><h2>${esc(fmtDay(d))}${d === hobartToday() ? esc(t('cal.todayMark')) : ''}</h2></div><div class="list">`; last = d; }
    html += eventRow(e);
  });
  return html + '</div>';
}
function typeFilters(budgetOnly) {
  if (budgetOnly) return '';
  return `<div class="kind-filters" role="group" aria-label="${esc(t('cal.filters'))}">${Object.keys(KINDS).map(k => `<button type="button" class="kind-btn ${typeOn(k) ? 'on' : ''}" data-act="calType" data-k="${k}" aria-pressed="${typeOn(k)}" style="--k:${KINDS[k].color}">${ic(KINDS[k].icon, 16)} ${esc(kindName(k))}</button>`).join('')}</div>`;
}
function viewSwitcher() {
  const btn = (v, label) => `<button type="button" class="${calView === v ? 'on' : ''}" data-act="calView" data-v="${v}">${esc(label)}</button>`;
  return `<div class="seg" style="margin-bottom:12px" role="tablist" aria-label="${esc(t('cal.view'))}">${btn('day', t('cal.day'))}${btn('week', t('cal.week'))}${btn('month', t('cal.month'))}${btn('agenda', t('cal.agenda'))}</div>`;
}
function calBody(day, budgetOnly) {
  if (calView === 'day') return dayView(day, budgetOnly);
  if (calView === 'week') return weekView(day, budgetOnly);
  if (calView === 'agenda') return agendaView(day, budgetOnly);
  return monthView(day, budgetOnly);
}
function importBlock() {
  const linked = S.cal.linked || {};
  return `<div class="row gap wrap" style="margin:4px 0 12px"><a class="btn" href="#/calendar/work">${ic('clock', 18)} ${esc(t("Work schedule"))}</a><a class="btn" href="#/location">${ic('pin', 18)} ${esc(t("Location"))}</a><button class="btn" data-act="importIcs">${ic('upload', 16)} ${esc(t("Import .ics"))}</button></div>
    <div class="sec-h"><h2>${esc(t("Link a calendar"))}</h2></div><p class="demoline"><span class="tag amber">${esc(t("Demo"))}</span> ${esc(t("Nothing is read from Google, Outlook or Apple."))}</p><div class="list">${['Google', 'Outlook', 'Apple'].map(n => `<button class="li" data-act="linkCal" data-name="${n}">${ic('link')}<span class="grow"><b>${n} Calendar</b><span>${linked[n] ? t("Sample event added on this device") : t("Nothing is read from ") + n}</span></span><span class="tag amber">Demo</span></button>`).join('')}</div>
    <p class="footnote">${esc(t("Bills, budget bills, appointments, medication times, scheduled payments, birthdays, social events and dated apps appear here automatically. Hide one, or turn it into a normal event."))}</p>`;
}
function bindCalSwipe(budgetOnly) {
  const root = document.querySelector('[data-screen="calendar"]');
  if (!root || root.dataset.swipe) return;
  root.dataset.swipe = '1';
  let x0 = null;
  root.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) < 60) return;
    const step = calView === 'month' ? null : calView === 'day' ? 1 : 7;
    if (step) calCursor = addDays(cursor(), dx < 0 ? step : -step);
    else {
      const day = cursor();
      const [y, m, d] = day.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1 + (dx < 0 ? 1 : -1), 1));
      const dim = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
      calCursor = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(d, dim)).padStart(2, '0')}`;
    }
    render();
  }, { passive: true });
}
function renderCalendar() {
  const day = cursor();
  const pairs = findConflicts();
  const openPairs = pairs.filter(([a, b]) => !pairIgnored(a, b));
  const hidden = S.events.filter(e => e.hidden);
  const body = `<div data-screen="calendar">${viewSwitcher()}${typeFilters(false)}
    ${openPairs.length ? `<button class="clash-banner" data-act="jumpClashes">${ic('alert', 18)} ${esc(t('cal.overlaps', { n: openPairs.length }))}</button>` : ''}${calBody(day, false)}
    ${clashBlock(pairs)}${noticesBlock()}
    ${importBlock()}${hidden.length ? `<div class="sec-h"><h2>${esc(t('cal.hidden'))}</h2></div><div class="list">${hidden.map(e => `<div class="li"><span class="grow"><b>${esc(e.title)}</b><span>${esc(kindName(itemKind(e)))}</span></span><button class="btn sm" data-act="showAuto" data-id="${e.id}">${esc(t('cal.show'))}</button></div>`).join('')}</div>` : ''}</div>`;
  return { html: screen({ title: t('cal.title'), body, right: `<button class="iconbtn" data-act="addEvent" aria-label="${esc(t('cal.add'))}">${ic('plus')}</button>` }), after: () => bindCalSwipe(false) };
}
function renderBudgetCal() {
  ensureBudget();
  const day = cursor();
  const body = `<div data-screen="calendar"><p class="muted" style="margin-top:0">${esc(t('cal.budgetLead'))}</p>${viewSwitcher()}${calBody(day, true)}
    <p class="footnote">${esc(t('cal.budgetFoot'))}</p></div>`;
  return { html: screen({ title: t('cal.budgetTitle'), back: '#/banking/budget', body, right: `<button class="iconbtn" data-act="budAdd" aria-label="${esc(t('budget.add'))}">${ic('plus')}</button>` }), after: () => bindCalSwipe(true) };
}
function calNav(el) {
  const day = cursor();
  if (el.dataset.today) calCursor = hobartToday();
  else if (el.dataset.m) {
    const [y, m, d] = day.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1 + Number(el.dataset.m), 1));
    const dim = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
    calCursor = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(d, dim)).padStart(2, '0')}`;
  } else if (el.dataset.d) calCursor = addDays(day, Number(el.dataset.d));
  render();
}
function commitEvent(ev) {
  const i = S.events.findIndex(x => x.id === ev.id);
  if (i >= 0) S.events[i] = ev; else S.events.push(ev);
  if (ev.reminderMin != null) askNotify();
  save(); announceConflicts(); render(); toast(t('common.saved'));
}
function deleteEv(id) {
  const e = S.events.find(x => x.id === id); if (!e) return;
  if (e.auto) { e.hidden = true; toast(t("Hidden from the calendar")); } else { S.events = S.events.filter(x => x.id !== id); toast('Deleted'); }
  save(); render();
}
function ignorePair(aId, bId) {
  const a = S.events.find(x => x.id === aId), b = S.events.find(x => x.id === bId); if (!a || !b) return;
  const k = timeSig(a, b);
  if (!S.cal.dismissed.includes(k)) S.cal.dismissed.push(k);
  if (!S.cal.alerted.includes(k)) S.cal.alerted.push(k);
  save(); render(); toast(t('cal.ignoredNote'));
}
function unignorePair(aId, bId) {
  const a = S.events.find(x => x.id === aId), b = S.events.find(x => x.id === bId); if (!a || !b) return;
  const drop = new Set([timeSig(a, b), clashSig(a, b), pairKey(a, b)]);
  S.cal.dismissed = S.cal.dismissed.filter(x => !drop.has(x));
  save(); render();
}
function movePair(aId, bId) {
  const a = S.events.find(x => x.id === aId), b = S.events.find(x => x.id === bId);
  const manual = [a, b].find(e => e && !e.auto);
  if (manual) editManual(manual); else toast(t("Edit that item in Medical, Utilities, Banking or Contacts, or hide one of them."));
}
function convertAuto(id) {
  const e = S.events.find(x => x.id === id); if (!e) return;
  if (e.sourceKey) S.cal.skip[e.sourceKey] = true;
  S.events.push({ ...e, id: uid(), auto: false, source: 'manual', sourceLabel: 'Calendar', converted: true, hidden: false });
  syncAutoEvents(); save(); render(); toast(t("Kept as a normal event"));
}
function editLinked(e) {
  const key = String(e.sourceKey || '');
  const id = key.split('_')[1] || '';
  if (key.startsWith('bill_')) return editBill(key.slice(5));
  if (key.startsWith('bbill_')) return editBBill(id);
  if (key.startsWith('pay_')) return editSched(id);
  if (key.startsWith('appt_')) return editAppt(key.slice(5));
  if (key.startsWith('goal_')) return editGoal(key.slice(5));
  if (key.startsWith('entry_')) { const en = (S.budget.entries || []).find(x => x.id === key.slice(6)); if (en) return budSpend(en.catId); }
  if (e.source === 'shift') return editManual(e);
  editManual(e);
}
function openEvent(id) { const e = S.events.find(x => x.id === id); if (!e) return; if (e.auto && itemKind(e) === 'budget') return editLinked(e); if (e.auto) autoSheet(e); else editManual(e); }
function autoSheet(e) {
  openSheet(`<h2>${esc(e.title)}</h2><p class="muted">${esc(fmtWhen(e))}</p><p class="small">${esc(t("From"))} ${esc(e.sourceLabel || 'LifeHub')}. This stays in step when that information changes.</p>
    <label class="fld"><span>${esc(t("Reminder"))}</span><select id="rem">${REMIND.map(([v, l]) => `<option value="${v}" ${String(e.reminderMin ?? '') === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <button class="btn primary full" id="remSave">${esc(t('cal.saveReminder'))}</button>
    ${e.sourceKey ? `<button class="btn full" id="editSrc" style="margin-top:8px">${esc(t('cal.editSource'))}</button>` : ''}
    <button class="btn full" id="toManual" style="margin-top:8px">${esc(t("Make this a normal event"))}</button>
    <button class="btn ghost danger full" id="hideEv" style="margin-top:8px">${esc(t("Hide"))}</button>`, el => {
    $('#remSave', el).onclick = () => { const v = $('#rem', el).value; e.reminderMin = v === '' ? null : Number(v); e.reminderTouched = true; if (e.reminderMin != null) askNotify(); save(); closeSheet(true); render(); toast(t('cal.reminderSaved')); };
    const srcBtn = $('#editSrc', el); if (srcBtn) srcBtn.onclick = () => { closeSheet(true); editLinked(e); };
    $('#toManual', el).onclick = () => { closeSheet(true); convertAuto(e.id); };
    $('#hideEv', el).onclick = () => { closeSheet(true); e.hidden = true; save(); render(); toast('Hidden'); };
  });
}
function editManual(existing, draft) {
  const base = draft || existing || {};
  const date = base.date || (base.start ? base.start.slice(0, 10) : cursor());
  const startTime = base.startTime || (base.start && String(base.start).length > 11 ? base.start.slice(11, 16) : '09:00');
  const endTime = base.endTime || (base.end && String(base.end).length > 11 ? base.end.slice(11, 16) : '10:00');
  const allDay = !!base.allDay;
  const reminder = base.reminderMin == null || base.reminderMin === '' ? (existing ? '' : '30') : String(base.reminderMin);
  openSheet(`<h2>${existing ? t("Edit event") : t("New event")}</h2><form id="evForm">
    <label class="fld"><span>${esc(t('cal.fieldTitle'))}</span><input name="title" required value="${esc(base.title || '')}" placeholder="${esc(t('cal.titlePh'))}"></label>
    <label class="fld"><span>${esc(t('cal.fieldType'))}</span><select name="kind">${Object.keys(KINDS).map(k => `<option value="${k}" ${itemKind(base) === k ? 'selected' : ''}>${esc(kindName(k))}</option>`).join('')}</select></label>
    <label class="fld"><span>${esc(t("Date"))}</span><input name="date" type="date" required value="${esc(date)}"></label>
    <label class="fld chk"><input name="allDay" type="checkbox" ${allDay ? 'checked' : ''}><span>${esc(t("All day"))}</span></label>
    <div class="row gap"><label class="fld" style="flex:1"><span>${esc(t("Start"))}</span><input name="startTime" type="time" value="${esc(startTime)}"></label><label class="fld" style="flex:1"><span>${esc(t("End"))}</span><input name="endTime" type="time" value="${esc(endTime)}"></label></div>
    <label class="fld"><span>${esc(t("Place"))}</span><input name="loc" value="${esc(base.loc || '')}" placeholder="Optional"></label>
    <label class="fld"><span>${esc(t("Notes"))}</span><textarea name="notes">${esc(base.notes || '')}</textarea></label>
    <label class="fld"><span>${esc(t("Reminder"))}</span><select name="reminderMin">${REMIND.map(([v, l]) => `<option value="${v}" ${reminder === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <div class="row gap"><button type="button" class="btn" data-close>${esc(t("Cancel"))}</button><button class="btn primary" type="submit">${esc(t("Save"))}</button></div>
    ${existing ? "<button type=\"button\" class=\"btn ghost danger full\" id=\"evDel\" style=\"margin-top:8px\">" + esc(t("Delete")) + "</button>" : ''}</form>`, el => {
    const form = $('#evForm', el);
    const syncDis = () => { form.startTime.disabled = form.allDay.checked; form.endTime.disabled = form.allDay.checked; };
    form.allDay.onchange = syncDis; syncDis();
    form.onsubmit = e => {
      e.preventDefault();
      const title = form.title.value.trim(); if (!title) return toast(t("Add a title"));
      const day = form.date.value; if (!day) return toast(t("Choose a date"));
      const isAll = form.allDay.checked;
      let start, end;
      if (isAll) { start = day + 'T00:00'; end = addDays(day, 1) + 'T00:00'; }
      else { if (!form.startTime.value || !form.endTime.value) return toast(t("Add a start and end")); const sp = span(day, form.startTime.value, form.endTime.value); start = sp.start; end = sp.end; }
      const kind = KINDS[form.kind.value] ? form.kind.value : 'event';
      const ev = { id: existing ? existing.id : uid(), title, start, end, allDay: isAll, loc: form.loc.value.trim(), notes: form.notes.value.trim(), reminderMin: form.reminderMin.value === '' ? null : Number(form.reminderMin.value), source: kind === 'work' ? 'shift' : (existing && existing.source) || 'manual', sourceLabel: kindName(kind), kind, auto: false, hidden: false, color: KINDS[kind].color, jobId: (existing && existing.jobId) || '' };
      const back = { title, date: day, startTime: form.startTime.value, endTime: form.endTime.value, allDay: isAll, loc: ev.loc, notes: ev.notes, reminderMin: ev.reminderMin, kind };
      const hits = S.events.filter(o => realOverlap(ev, o));
      if (!hits.length) { closeSheet(true); commitEvent(ev); return; }
      openSheet(`<h2>${esc(t('cal.overlapWarn'))}</h2><p>${esc(t('cal.overlapSaveBody', { name: ev.title }))}</p>
        <button class="btn primary full" id="saveAnyway">${esc(t('cal.saveAnyway'))}</button><button class="btn full" id="editBack" style="margin-top:8px">${esc(t('common.edit'))}</button>
        <div class="list" style="margin-top:12px">${hits.slice(0, 6).map(h => `<div class="li"><span class="grow"><b>${esc(h.title)}</b><span>${esc(fmtWhen(h))}</span></span><button class="btn sm" data-act="editHit" data-id="${h.id}">${esc(t('common.edit'))}</button></div>`).join('')}</div>`, el2 => {
        $('#saveAnyway', el2).onclick = () => { closeSheet(true); commitEvent(ev); };
        $('#editBack', el2).onclick = () => { closeSheet(true); editManual(existing, back); };
        el2.querySelectorAll('[data-act="editHit"]').forEach(btn => { btn.onclick = () => { closeSheet(true); commitEvent(ev); openEvent(btn.dataset.id); }; });
      });
    };
    const del = $('#evDel', el); if (del) del.onclick = () => { closeSheet(true); deleteEv(existing.id); };
  });
}
async function importIcs() {
  const f = await pickFile('.ics,text/calendar'); if (!f) return;
  const evs = parseICS(await readText(f));
  if (!evs.length) return toast(t("No events found in that file"));
  evs.forEach(e => S.events.push({ ...e, id: uid(), source: 'import', sourceLabel: 'Imported', auto: false, hidden: false, color: '#475569', reminderMin: 30, notes: '', loc: e.loc || '' }));
  save(); announceConflicts(); render(); toast(`${esc(t("Imported"))} ${evs.length} event${evs.length === 1 ? '' : 's'}`);
}
function linkCalendarSilent(name) {
  if (!S.cal.linked) S.cal.linked = {};
  if (S.cal.linked[name]) return false;
  S.cal.linked[name] = true;
  const day = addDays(hobartToday(), 3);
  S.events.push({ id: uid(), title: name + t(" sample: Team catch-up"), start: day + 'T14:00', end: day + 'T14:45', allDay: false, source: 'import', sourceLabel: name, auto: false, hidden: false, color: '#64748b', reminderMin: 15, loc: '', notes: t("Demo event. Nothing was read from ") + name + '.' });
  return true;
}
function linkExternal(name) {
  if (!linkCalendarSilent(name)) return toast(name + t(" is already linked (demo)"));
  save(); announceConflicts(); render(); toast(name + t(" linked (demo)"));
}
function apptSection() {
  const arr = S.medical.appointments || [];
  return `<div class="sec-h"><h2>${esc(t("Appointments"))}</h2><button class="btn sm" data-act="addAppt">${ic('plus', 16)} ${esc(t("Add"))}</button></div><div class="list">${arr.length ? arr.map(a => `<button class="li" data-act="editAppt" data-id="${a.id}"><span class="grow"><b>${esc(a.title)}</b><span>${esc(fmtWhen(a))}${a.place ? ' · ' + esc(a.place) : ''}</span></span>${ic('edit', 18)}</button>`).join('') : "<p class=\"empty\">" + esc(t("No appointments yet. Add one and it shows on your calendar.")) + "</p>"}</div>`;
}
function editAppt(id) {
  const a = id && (S.medical.appointments || []).find(x => x.id === id);
  const date = a ? a.start.slice(0, 10) : hobartToday();
  const start = a ? a.start.slice(11, 16) : '10:00';
  const end = a ? a.end.slice(11, 16) : '10:30';
  formSheet({ title: a ? t("Edit appointment") : t("Add appointment"), fields: [{ k: 'title', label: 'Appointment', req: true, ph: t("e.g. GP checkup") }, { k: 'date', label: 'Date', type: 'date', req: true }, { k: 'start', label: 'Start', type: 'time', req: true }, { k: 'end', label: 'End', type: 'time', req: true }, { k: 'place', label: 'Place' }, { k: 'notes', label: 'Notes', type: 'textarea' }],
    values: { title: a ? a.title : '', date, start, end, place: a ? a.place || '' : '', notes: a ? a.notes || '' : '' },
    onSave: v => { if (!v.date || !v.start || !v.end) { toast(t("Add a date and times")); return false; } const sp = span(v.date, v.start, v.end); const row = { title: v.title, start: sp.start, end: sp.end, place: v.place, notes: v.notes }; if (a) Object.assign(a, row); else S.medical.appointments.push({ id: uid(), ...row }); toast(t("Appointment saved")); },
    danger: a ? { label: t("Delete appointment"), fn: () => { S.medical.appointments = S.medical.appointments.filter(x => x.id !== id); } } : null });
}
function schedSection() {
  const rows = (S.scheduled || []).map(p => `<button class="li" data-act="editSched" data-id="${p.id}"><span class="grow"><b>${esc(p.name)}</b><span>${esc(p.every)} · next ${esc(fmtDay(p.next))}</span></span><span class="amt">${money(p.amount, p.currency)}</span></button>`).join('');
  return `<div class="sec-h"><h2>${esc(t("Scheduled payments"))}</h2><button class="btn sm" data-act="addSched">${ic('plus', 16)} ${esc(t("Add"))}</button></div><div class="list">${rows || "<p class=\"empty\">" + esc(t("Add rent, a loan or a transfer and it appears on your calendar. This does not move any money.")) + "</p>"}</div>`;
}
function editSched(id) {
  const p = id && (S.scheduled || []).find(x => x.id === id);
  formSheet({ title: p ? t("Edit scheduled payment") : t("Scheduled payment"), intro: t("Demo reminder only. No money leaves your account."), fields: [{ k: 'name', label: t("What is it?"), req: true, ph: 'e.g. Rent' }, { k: 'amount', label: 'Amount', type: 'number', step: '0.01', req: true, im: 'decimal' }, { k: 'currency', label: 'Currency', type: 'select', options: currencyChoices() }, { k: 'every', label: 'Repeats', type: 'select', options: [['weekly', t("Every week")], ['fortnight', t("Every fortnight")], ['monthly', t("Every month")]] }, { k: 'next', label: t("Next date"), type: 'date', req: true }],
    values: { currency: homeCurrency(), every: 'fortnight', next: hobartToday(), ...(p || {}) },
    onSave: v => { if (!(v.amount > 0) || !v.next) { toast(t("Add an amount and a date")); return false; } v.amount = Math.abs(v.amount); v.currency = v.currency || homeCurrency(); if (p) Object.assign(p, v); else S.scheduled.push({ id: uid(), ...v }); toast(t("Saved to your calendar")); },
    danger: p ? { label: t("Delete schedule"), fn: () => { S.scheduled = S.scheduled.filter(x => x.id !== id); } } : null });
}

/* work schedule wizard */
function workState() {
  if (!work) work = { step: 'menu', jobId: '', mode: '95', until: addDays(hobartToday(), 27), days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00', date: hobartToday(), text: '' };
  if (!work.until) work.until = addDays(hobartToday(), 27);
  if (!work.date) work.date = hobartToday();
  return work;
}
function selectedJob() { const w = workState(); return S.jobs.find(j => j.id === w.jobId) || S.jobs[0] || null; }
function eachDate(from, until, days) { const out = []; let d = from, g = 0; while (d <= until && g++ < 400) { if (days.includes(wdIndex(d))) out.push(d); d = addDays(d, 1); } return out; }
function shiftEvent(job, date, start, end, title) {
  const sp = span(date, start, end);
  return { id: uid(), title: title || job.name, start: sp.start, end: sp.end, allDay: false, source: 'shift', sourceLabel: 'Work', kind: 'work', auto: false, hidden: false, color: KINDS.work.color, jobId: job.id, loc: '', notes: '', reminderMin: 60 };
}
function buildDrafts() {
  const w = workState(); const job = selectedJob(); if (!job) return [];
  const from = hobartToday();
  if (w.mode === '95') return eachDate(from, w.until, [1, 2, 3, 4, 5]).map(d => shiftEvent(job, d, '09:00', '17:00'));
  if (w.mode === 'night') return eachDate(from, w.until, [1, 2, 3, 4, 5]).map(d => shiftEvent(job, d, '22:00', '06:00'));
  if (w.mode === 'rotate') {
    const mon0 = mondayOf(from);
    return eachDate(from, w.until, [1, 2, 3, 4, 5]).map(d => {
      const weeks = Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(mon0 + 'T00:00:00Z')) / 86400000 / 7);
      const afternoon = Math.abs(weeks) % 2 === 1;
      return shiftEvent(job, d, afternoon ? '15:00' : '07:00', afternoon ? '23:00' : '15:30');
    });
  }
  if (w.mode === 'build') return eachDate(from, w.until, w.days.length ? w.days : [1]).map(d => shiftEvent(job, d, w.start || '09:00', w.end || '17:00'));
  if (w.mode === 'quick') return w.date ? [shiftEvent(job, w.date, w.start || '09:00', w.end || '17:00')] : [];
  if (w.mode === 'paste') return parseRoster(w.text).map(r => shiftEvent(job, r.date, r.start, r.end, r.title && r.title !== 'Shift' ? r.title : job.name));
  return [];
}
function confirmDrafts(drafts) {
  if (!drafts.length) return toast(t("Nothing to add. Check the days and times."));
  const clashes = drafts.map(d => ({ d, hits: S.events.filter(e => !e.hidden && rangesOverlap(d, e)) })).filter(x => x.hits.length);
  const go = () => { drafts.forEach(d => S.events.push(d)); save(); announceConflicts(); workState().step = 'menu'; location.hash = '#/calendar'; toast(`${esc(t("Added"))} ${drafts.length} shift${drafts.length === 1 ? '' : 's'}`); };
  if (!clashes.length) return go();
  openSheet(`<h2>${esc(t('cal.overlapWarn'))}</h2><p>${esc(t('cal.shiftOverlap', { clashes: clashes.length, total: drafts.length }))}</p><div class="list">${clashes.slice(0, 6).map(c => `<div class="li"><span class="grow"><b>${esc(c.d.title)}</b><span>${esc(fmtWhen(c.d))} ${esc(t('cal.overlapsWord'))} ${esc(c.hits[0].title)}</span></span></div>`).join('')}</div>
    <button class="btn primary full" id="yesAdd">${esc(t('cal.saveAnyway'))}</button><button class="btn full" id="editShifts" style="margin-top:8px">${esc(t('common.edit'))}</button>`, el => {
    $('#yesAdd', el).onclick = () => { closeSheet(true); go(); };
    $('#editShifts', el).onclick = () => closeSheet();
  });
}
function readWorkFields() {
  const w = workState();
  const until = $('#workUntil'); if (until && until.value) w.until = until.value;
  const st = $('#workStart'); if (st && st.value) w.start = st.value;
  const en = $('#workEnd'); if (en && en.value) w.end = en.value;
  const tx = $('#workText'); if (tx) w.text = tx.value;
  const dt = $('#workDate'); if (dt && dt.value) w.date = dt.value;
}
function workSave() { readWorkFields(); confirmDrafts(buildDrafts()); }
function workDay(d) { const w = workState(); w.days = w.days.includes(d) ? w.days.filter(x => x !== d) : w.days.concat(d); render(); }
function copyLastWeek() {
  const mon = mondayOf(hobartToday()), prev = addDays(mon, -7);
  const shifts = S.events.filter(e => e.source === 'shift' && e.start.slice(0, 10) >= prev && e.start.slice(0, 10) < mon);
  if (!shifts.length) return toast(t("No shifts last week to copy"));
  const drafts = shifts.map(s => { const j = S.jobs.find(x => x.id === s.jobId) || selectedJob() || { id: s.jobId || uid(), name: s.title, color: s.color || '#0f766e' }; return shiftEvent(j, addDays(s.start.slice(0, 10), 7), s.start.slice(11, 16), s.end.slice(11, 16), s.title); });
  confirmDrafts(drafts);
}
function newJob() {
  openSheet(`<h2>${esc(t("New job"))}</h2><label class="fld"><span>${esc(t("Job name"))}</span><input id="jn" placeholder="e.g. Warehouse, Office"></label><div class="swatches" id="jcols">${JOB_COLORS.map((c, i) => `<button type="button" class="sw ${i === 0 ? 'on' : ''}" style="background:${c}" data-c="${c}" aria-label="Colour ${i + 1}"></button>`).join('')}</div><button class="btn primary full" id="jok">${esc(t("Add job"))}</button>`, el => {
    let col = JOB_COLORS[0];
    $$('.sw', el).forEach(b => b.onclick = () => { col = b.dataset.c; $$('.sw', el).forEach(x => x.classList.remove('on')); b.classList.add('on'); });
    $('#jok', el).onclick = () => { const name = $('#jn', el).value.trim(); if (!name) return toast(t("Add a job name")); const j = { id: uid(), name, color: col }; S.jobs.push(j); workState().jobId = j.id; save(); closeSheet(true); render(); toast(t("Job added")); };
  });
}
async function importRoster() {
  const f = await pickFile('.ics,.csv,.txt,text/calendar,text/csv,text/plain'); if (!f) return;
  const txt = await readText(f); const job = selectedJob();
  if (/BEGIN:VCALENDAR/i.test(txt)) {
    if (!job) return toast(t("Add a job first"));
    const evs = parseICS(txt).map(e => ({ id: uid(), title: e.title || job.name, start: e.start, end: e.end, allDay: !!e.allDay, source: 'shift', sourceLabel: 'Work', auto: false, hidden: false, color: job.color, jobId: job.id, loc: e.loc || '', notes: '', reminderMin: 60 }));
    return confirmDrafts(evs);
  }
  workState().text = ((workState().text ? workState().text + '\n' : '') + txt).trim();
  workState().mode = 'paste'; workState().step = 'form'; render();
}
function renderWork() {
  const w = workState();
  if (!S.jobs.length) {
    const body = `<div data-screen="work"><h2 style="font-size:1.3rem;margin-bottom:6px">${esc(t("Add my work schedule"))}</h2><p class="muted">${esc(t("Start with the job, then pick an easy pattern."))}</p><button class="btn primary full" data-act="newJob">${ic('plus', 18)} ${esc(t("Add a job"))}</button></div>`;
    return screen({ title: t("Work schedule"), back: '#/calendar', body });
  }
  if (!w.jobId || !S.jobs.some(j => j.id === w.jobId)) w.jobId = S.jobs[0].id;
  const job = S.jobs.find(j => j.id === w.jobId);
  if (w.step !== 'form') {
    const body = `<div data-screen="work"><h2 style="font-size:1.3rem;margin-bottom:6px">${esc(t("Add my work schedule"))}</h2><p class="muted">${esc(t("Choose the job, then a pattern you can live with. Shifts are checked against the rest of your calendar."))}</p>
      <div class="sec-h"><h2>${esc(t("Job"))}</h2><button class="linkbtn" data-act="newJob">${esc(t("New job"))}</button></div>
      <div class="list">${S.jobs.map(j => `<button class="li" data-act="pickJob" data-id="${j.id}"><span class="evdot" style="background:${j.color}"></span><span class="grow"><b>${esc(j.name)}</b><span>${j.id === job.id ? 'Selected' : t("Tap to use this job")}</span></span>${j.id === job.id ? ic('check') : ''}</button>`).join('')}</div>
      <button class="btn primary full" data-act="workGo" data-m="95">9–5, Monday to Friday</button>
      <button class="btn full" style="margin-top:8px" data-act="workGo" data-m="rotate">${esc(t("Rotating roster"))}</button>
      <button class="btn full" style="margin-top:8px" data-act="workGo" data-m="night">${esc(t("Night shift, Monday to Friday"))}</button>
      <button class="btn full" style="margin-top:8px" data-act="workGo" data-m="build">${esc(t("Build my own week"))}</button>
      <button class="btn full" style="margin-top:8px" data-act="workGo" data-m="quick">${esc(t("Add one shift"))}</button>
      <button class="btn full" style="margin-top:8px" data-act="workGo" data-m="paste">${esc(t("Paste or import a roster"))}</button>
      <button class="btn ghost full" style="margin-top:8px" data-act="copyWeek">${ic('download', 18)} ${esc(t("Copy last week"))}</button>
      <p class="footnote">${esc(t("Paste lines such as Mon 7:00-15:30, or a CSV of date, start, end, title. .ics files work too."))}</p></div>`;
    return screen({ title: t("Work schedule"), back: '#/calendar', body });
  }
  const help = { '95': t("Weekdays, 9:00am to 5:00pm, from today until the date you pick."), rotate: t("Weekdays alternate: one week 7:00am–3:30pm, the next 3:00pm–11:00pm."), night: t("Weekdays 10:00pm to 6:00am the next morning."), build: t("Tap the days you work and set one start and finish."), quick: t("Just this one shift."), paste: t("One shift per line. Examples: Mon 7:00-15:30 or 2026-11-02,09:00,17:30,Office.") }[w.mode] || '';
  const drafts = buildDrafts();
  const hits = drafts.filter(d => S.events.some(e => !e.hidden && rangesOverlap(d, e))).length;
  const body = `<div data-screen="work"><button class="btn sm" data-act="workBack">${ic('back', 16)} ${esc(t("Patterns"))}</button>
    <h2 style="font-size:1.25rem;margin:12px 0 6px">${esc(job.name)}</h2><p class="muted">${esc(help)}</p>
    ${w.mode === 'build' ? `<div class="days" role="group" aria-label="Days worked">${WDAYS.map(([n, i]) => `<button type="button" class="${w.days.includes(i) ? 'on' : ''}" data-act="workDay" data-d="${i}" aria-pressed="${w.days.includes(i)}">${n}</button>`).join('')}</div>` : ''}
    ${w.mode === 'build' || w.mode === 'quick' ? `<div class="row gap"><label class="fld" style="flex:1"><span>Start</span><input id="workStart" type="time" value="${esc(w.start)}"></label><label class="fld" style="flex:1"><span>End</span><input id="workEnd" type="time" value="${esc(w.end)}"></label></div>` : ''}
    ${w.mode === 'quick' ? `<label class="fld"><span>Date</span><input id="workDate" type="date" value="${esc(w.date)}"></label>` : ''}
    ${w.mode !== 'quick' ? `<label class="fld"><span>Repeat until</span><input id="workUntil" type="date" value="${esc(w.until)}"></label>` : ''}
    ${w.mode === 'paste' ? `<label class="fld"><span>Roster</span><textarea id="workText" placeholder="Mon 7:00-15:30&#10;Tue 7:00-15:30">${esc(w.text)}</textarea></label><button class="btn sm" data-act="importRoster">${ic('upload', 16)} Import file</button><button class="btn sm" data-act="workPreview">Preview</button>` : ''}
    <div class="card"><h3>${drafts.length} shift${drafts.length === 1 ? '' : 's'}${hits ? ` · ${hits} overlap` : ''}</h3>${drafts.slice(0, 6).map(d => `<div class="small" style="margin:4px 0">${esc(fmtWhen(d))}</div>`).join('') || "<p class=\"small muted\">" + esc(t("Nothing matches yet.")) + "</p>"}${drafts.length > 6 ? `<div class="small muted">And ${drafts.length - 6} more.</div>` : ''}</div>
    <button class="btn primary full" data-act="workSave">${esc(t("Add these shifts"))}</button></div>`;
  return { html: screen({ title: t("Work schedule"), back: '#/calendar', body }), after: () => {} };
}

/* location (premium) */
function demoPlace(c) { const n = [...String(c.id)].reduce((a, ch) => a + ch.charCodeAt(0), 0); return DEMO_PLACES[n % DEMO_PLACES.length]; }
function shareNames() { return (S.loc.ids || []).map(contactById).filter(Boolean); }
function locTick(id) {
  if (!S.loc.ids) S.loc.ids = [];
  S.loc.ids = S.loc.ids.includes(id) ? S.loc.ids.filter(x => x !== id) : S.loc.ids.concat(id);
  if (S.loc.on && !S.loc.ids.length) { S.loc.on = false; S.loc.until = null; }
  save(); render();
}
function locMode(v) { S.loc.mode = v; if (S.loc.on) S.loc.until = v === '1h' ? Date.now() + 3600000 : null; save(); render(); }
function locStart() {
  if (!S.loc.ids.length) return toast(t("Tick at least one Premium contact"));
  if (!S.loc.mode) return toast(t("Choose how long to share"));
  S.loc.on = true; S.loc.until = S.loc.mode === '1h' ? Date.now() + 3600000 : null; save(); render();
  toast(t("Sharing with ") + shareNames().map(c => c.name.split(' ')[0]).join(', '));
}
function locStop() { S.loc.on = false; S.loc.until = null; save(); render(); toast(t("Sharing stopped")); }
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletP) return leafletP;
  leafletP = new Promise((res, rej) => {
    if (!document.querySelector('link[data-leaflet]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.leaflet = '1'; l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(l); }
    const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = () => res(); s.onerror = () => rej(new Error('map')); document.head.appendChild(s);
  });
  return leafletP;
}
function getPos() {
  const fallback = { lat: -41.4332, lng: 147.1441, acc: null, demo: true };
  return new Promise(res => {
    if (!navigator.geolocation) return res(fallback);
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, demo: false }), () => res(fallback), { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 });
  });
}
function drawMap(me) {
  const el = $('#locMap'); if (!el || !window.L) return;
  if (locMap) { locMap.remove(); locMap = null; }
  locMap = L.map(el, { zoomControl: true }).setView([me.lat, me.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', { maxZoom: 19, subdomains: 'abc', attribution: '&copy; OpenStreetMap France &copy; OpenStreetMap' }).addTo(locMap);
  const bounds = [[me.lat, me.lng]];
  L.circleMarker([me.lat, me.lng], { radius: 11, color: '#fff', weight: 2, fillColor: '#d61f1f', fillOpacity: 1 }).addTo(locMap).bindPopup(me.demo ? t("Sample pin · Launceston") : 'You');
  if (S.loc.on) S.loc.ids.forEach(id => {
    const c = contactById(id); if (!c) return; const p = demoPlace(c); bounds.push([p.lat, p.lng]);
    L.circleMarker([p.lat, p.lng], { radius: 9, color: '#fff', weight: 2, fillColor: '#1d4ed8', fillOpacity: 1 }).addTo(locMap).bindPopup(c.name + ' · ' + p.label + ' (demo)');
  });
  if (bounds.length > 1) locMap.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
  setTimeout(() => { if (locMap) locMap.invalidateSize(); }, 250);
  cleanupFn = () => { if (locMap) { locMap.remove(); locMap = null; } };
}
async function fillAddress(me) {
  const el = $('#locAddr'); if (!el) return;
  if (me.demo) { el.textContent = t("Showing a sample pin in Launceston. Allow location to use where you actually are."); return; }
  el.textContent = `${me.lat.toFixed(5)}, ${me.lng.toFixed(5)}${me.acc ? ' (±' + Math.round(me.acc) + ' m)' : ''}`;
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + me.lat + '&lon=' + me.lng, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    clearTimeout(t); if (!r.ok) return; const j = await r.json(); if (j.display_name && $('#locAddr')) $('#locAddr').textContent = j.display_name;
  } catch (e) {}
}
function mountLocation() {
  getPos().then(me => { locMe = me; if (!$('#gmapsYou')) return; fillMapsYou(); fillAddress(me); });
  loadLeaflet().then(async () => { const me = locMe || await getPos(); locMe = me; if (!$('#locMap')) return; drawMap(me); fillMapsYou(); }).catch(() => { const m = $('#locAddr'); if (m) m.textContent = t("The map could not be loaded. The Google Maps buttons still open the app."); });
}
function renderLocation() {
  if (!isPremium()) {
    const body = `<div class="card lockcard" data-screen="location" data-role="locked"><div class="logo" style="width:64px;height:64px;border-radius:18px;margin:0 auto 12px">${ic('pin', 30)}</div>
      <h2 style="font-size:1.35rem">${esc(t("Location is part of Premium"))}</h2>
      <p class="muted">${esc(t("See where you are on a map. If you want, share that only with LifeHub Premium contacts you tick yourself. Sharing stays off until you start it."))}</p>
      <p class="small muted">${esc(t("On the Emergency screen, anyone can still show their location to read out to emergency services. That stays free."))}</p>
      <a class="btn primary full" href="#/plan">${ic('star', 18)} See Premium · ${esc(premiumPrice().label)}</a></div>`;
    return screen({ title: t('loc.title'), body });
  }
  const selected = shareNames();
  const modeBtn = (v, label) => `<button type="button" class="${S.loc.mode === v ? 'on' : ''}" data-act="locMode" data-v="${v}">${label}</button>`;
  const premiumContacts = S.contacts.filter(c => c.premium && !c.blocked);
  const skipped = S.contacts.filter(c => !c.blocked && !c.premium).length;
  const picks = selected.length ? selected.map(c => `<span class="pick">${esc(c.name)} <button type="button" data-act="locRemove" data-id="${c.id}" aria-label="Remove ${esc(c.name)}">${ic('x', 16)}</button></span>`).join('') : "<span class=\"muted\">" + esc(t("No one selected yet")) + "</span>";
  const list = premiumContacts.length ? premiumContacts.map(c => { const on = S.loc.ids.includes(c.id); return `<button class="li" data-act="locTick" data-id="${c.id}" aria-pressed="${on}">${on ? ic('check') : ic('plus')}<span class="grow"><b>${esc(c.name)}</b><span>${on ? 'Selected' : t("Tap to select")} · demo pin at ${esc(demoPlace(c).label)}</span></span></button>`; }).join('') : "<p class=\"empty\">" + esc(t("No Premium contacts yet. Edit a contact and turn on LifeHub Premium (demo) if you want to share with them.")) + "</p>";
  const untilTxt = S.loc.mode === '1h' && S.loc.until ? ' until ' + new Date(S.loc.until).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: TZ }) : '';
  const who = selected.map(c => c.name.split(' ')[0]).join(', ');
  const body = `<div data-screen="location">${S.loc.on ? `<div class="share-on" data-role="sharing">${ic('pin', 18)} Sharing is on${esc(untilTxt)} with ${esc(who)}</div>` : `<div class="notice blue">${ic('shield', 18)}<div>Sharing is off. Tick each person, choose how long, then start. There is no option to share with everyone.</div></div>`}
    <div id="locMap" role="region" aria-label="${esc(t('Map'))}"></div><p id="locAddr" class="small" style="margin:0 0 4px">${esc(t("Finding your position…"))}</p>
    <p class="demoline"><span class="tag amber">${esc(t("Demo"))}</span> ${esc(t("Other people's pins are simulated on this device, not their real location."))}</p>
    <p class="small muted">${esc(t("Map data © OpenStreetMap contributors, tiles © OpenStreetMap France."))}</p>
    <div class="card"><h3>${esc(t("Google Maps"))}</h3><p class="small muted">${esc(t("Opens the Google Maps app on a phone. There is no paid maps key. Coordinates go to Google only when you tap a button."))}</p><div id="gmapsYou"><p class="small muted">${esc(t("Finding your position…"))}</p></div>
      ${selected.map(c => { const p = demoPlace(c); return `<div class="gmap-who"><b>${esc(c.name)}</b> <span class="tag amber">Demo</span><div class="small muted">${esc(p.label)} · sample pin, not their real location</div>${mapActions(p.lat, p.lng)}</div>`; }).join('')}
      <div id="gmapsFrame"></div></div>
    <div class="card"><h3>${esc(t("Sharing with"))}</h3><div class="picks" id="sharePicks" data-role="share-picks">${picks}</div>
      <div class="seg" style="margin:12px 0" role="group" aria-label="${esc(t('How long to share'))}">${modeBtn('1h', '1 hour')}${modeBtn('until', t("Until I stop"))}${modeBtn('always', 'Always')}</div>
      <div class="list">${list}</div>
      ${skipped ? `<p class="small muted">${skipped} contact${skipped === 1 ? " isn't" : "s aren't"} on LifeHub Premium, so they can't be selected.</p>` : ''}
      ${S.loc.on ? "<button class=\"btn redb full\" data-act=\"locStop\">" + esc(t("Stop sharing now")) + "</button>" : `<button class="btn primary full" data-act="locStart" ${!S.loc.ids.length || !S.loc.mode ? 'disabled' : ''}>Start sharing</button>`}
      <p class="small muted" style="margin:8px 0 0">${esc(t("Only the people in the list above are included. Removing someone, or stopping, takes effect straight away."))}</p>
    </div></div>`;
  return { html: screen({ title: t('loc.title'), body }), after: mountLocation };
}

/* ---------- budget planner ---------- */
const FREE_GOALS = 3;
let budgetMonth = '';
function bMonth() { return budgetMonth || hobartToday().slice(0, 7); }
function shiftMonth(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}
function daysInMonth(ym) { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function ymLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(homeLocale(), { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function ensureBudget() {
  let changed = false;
  if (!S.budget || typeof S.budget !== 'object') {
    S.budget = { currency: homeCurrency(), alertAt: 80, rollover: false, extra: 0, strategy: 'snowball', categories: [], entries: [], goals: [], debts: [], bills: [], seen: {} };
    changed = true;
  }
  ['categories', 'entries', 'goals', 'debts', 'bills'].forEach(k => { if (!Array.isArray(S.budget[k])) { S.budget[k] = []; changed = true; } });
  if (!S.budget.seen || typeof S.budget.seen !== 'object') { S.budget.seen = {}; changed = true; }
  if (!S.budget.currency) { S.budget.currency = homeCurrency(); changed = true; }
  if (!S.budget.categories.length) {
    const defs = [['Pay', 'income', ''], [t("Other income"), 'income', ''], ['Housing', 'expense', 'needs'], ['Groceries', 'expense', 'needs'], ['Transport', 'expense', 'needs'], ['Bills & utilities', 'expense', 'needs'], ['Health', 'expense', 'needs'], [t("Eating out"), 'expense', 'wants'], ['Fun', 'expense', 'wants'], ['Shopping', 'expense', 'wants'], ['Savings', 'expense', 'save']];
    S.budget.categories = defs.map(([name, kind, group]) => ({ id: uid(), name, kind, group, limit: 0 }));
    changed = true;
  }
  return changed;
}
const catById = id => (S.budget.categories || []).find(c => c.id === id);
function bm(n, cur) { return money(n, cur || (S.budget && S.budget.currency) || homeCurrency()); }
function alertLevel() { return isPremium() ? Math.min(100, Math.max(50, Number(S.budget.alertAt) || 80)) : 80; }
function entriesIn(ym) { return (S.budget.entries || []).filter(e => String(e.date || '').slice(0, 7) === ym); }
function billsIn(ym) { const dim = daysInMonth(ym); return (S.budget.bills || []).filter(b => (Number(b.day) || 1) <= dim); }
function catAmount(cat, ym) {
  const fromE = entriesIn(ym).filter(e => e.catId === cat.id).reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const fromB = cat.kind === 'expense' ? billsIn(ym).filter(b => b.catId === cat.id).reduce((a, b) => a + (Number(b.amount) || 0), 0) : 0;
  return fromE + fromB;
}
function limitFor(cat, ym) {
  const base = Number(cat.limit) || 0;
  if (cat.kind !== 'expense' || !isPremium() || !S.budget.rollover || !(base > 0)) return base;
  const prev = shiftMonth(ym, -1);
  const spent = catAmount(cat, prev);
  return spent < base ? base + (base - spent) : base;
}
function spendDate(ym) { const t = hobartToday(); return t.slice(0, 7) === ym ? t : ym + '-01'; }
function budgetBar(pct, kind) {
  const p = Math.max(0, Math.min(pct, 100));
  const cls = kind === 'blue' ? 'blue' : pct >= 100 ? 'red' : pct >= alertLevel() ? 'amber' : 'green';
  return `<div class="bbar ${cls}" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>`;
}
function noteBudgetAlerts(ym) {
  const msgs = [];
  S.budget.categories.filter(c => c.kind === 'expense' && Number(c.limit) > 0).forEach(c => {
    const lim = limitFor(c, ym); if (!(lim > 0)) return;
    const pct = catAmount(c, ym) / lim * 100;
    if (pct < alertLevel()) return;
    const over = pct >= 100;
    const key = ym + ':' + c.id + ':' + (over ? 'over' : 'near');
    if (S.budget.seen[key]) return;
    S.budget.seen[key] = 1;
    msgs.push(c.name + (over ? t(" is over its limit") : t(" is near its limit")));
  });
  if (msgs.length) { save(); setTimeout(() => toast(msgs.slice(0, 2).join('. ')), 300); }
}
function premRow(title, sub) {
  return `<button class="li" data-act="premGo"><span class="grow"><b>${esc(title)} ${premBadge()}</b><span>${esc(sub)}</span></span>${ic('lock', 18)}</button>`;
}
function renderBudget() {
  ensureBudget();
  const ym = bMonth();
  noteBudgetAlerts(ym);
  const exp = S.budget.categories.filter(c => c.kind === 'expense');
  const inc = S.budget.categories.filter(c => c.kind === 'income');
  const spent = exp.reduce((a, c) => a + catAmount(c, ym), 0);
  const income = inc.reduce((a, c) => a + catAmount(c, ym), 0);
  const cap = exp.reduce((a, c) => a + limitFor(c, ym), 0);
  const left = cap > 0 ? cap - spent : income - spent;
  const goals = S.budget.goals;
  const shown = isPremium() ? goals : goals.slice(0, FREE_GOALS);
  const curOpts = currencyChoices().map(c => `<option value="${c}" ${c === S.budget.currency ? 'selected' : ''}>${c}</option>`).join('');
  const alerts = exp.filter(c => { const lim = limitFor(c, ym); return lim > 0 && catAmount(c, ym) / lim * 100 >= alertLevel(); });
  const body = `<div class="monthnav"><button class="iconbtn" data-act="budMonth" data-d="-1" aria-label="${esc(t('Previous month'))}">${ic('back')}</button><b>${esc(ymLabel(ym))}</b><button class="iconbtn" data-act="budMonth" data-d="1" aria-label="${esc(t('Next month'))}">${ic('chev')}</button></div>
    <label class="fld"><span>${esc(t('budget.currency'))}</span><select data-change="budCur" aria-label="${esc(t('budget.currency'))}">${curOpts}</select></label>
    <div class="bsum"><div><span>${esc(t('budget.income'))}</span><b class="green">${bm(income)}</b></div><div><span>${esc(t('budget.spent'))}</span><b>${bm(spent)}</b></div><div><span>${cap > 0 ? esc(t('budget.left')) : esc(t('budget.leftIncome'))}</span><b class="${left < 0 ? 'red' : ''}">${bm(left)}</b></div></div>
    ${alerts.length ? `<div class="notice">${ic('alert', 18)}<div>${alerts.map(c => esc(c.name)).join(', ')} ${alerts.length === 1 ? 'is' : 'are'} near or over the limit.</div></div>` : ''}
    <button class="btn primary full" data-act="budAdd">${ic('plus', 18)} ${esc(t("Add income or expense"))}</button>
    <div class="sec-h"><h2>${esc(t("Spending"))}</h2></div>
    <div class="list">${exp.map(c => catSpendRow(c, ym)).join('')}</div>
    <div class="sec-h"><h2>${esc(t("Income"))}</h2></div>
    <div class="list">${inc.map(c => catSpendRow(c, ym)).join('')}</div>
    <div class="sec-h"><h2>${esc(t("Savings goals"))}</h2><button class="btn sm" data-act="budGoal">${ic('plus', 16)} ${esc(t("Add"))}</button></div>
    <div class="list">${shown.length ? shown.map(goalRow).join('') : "<p class=\"empty\">" + esc(t("No goals yet. A holiday fund or an emergency buffer both fit here.")) + "</p>"}</div>
    ${!isPremium() && goals.length > FREE_GOALS ? `<p class="small muted">${goals.length - FREE_GOALS} more goal${goals.length - FREE_GOALS === 1 ? '' : 's'} saved. Premium shows the full list.</p>` : ''}
    ${!isPremium() && goals.length >= FREE_GOALS ? premRow(t("Unlimited goals"), t("Free includes ") + FREE_GOALS + t(" goals. Premium removes the cap.")) : ''}
    <div class="row gap" style="margin-top:8px"><a class="btn" href="#/banking/budget/cal">${ic('cal', 18)} ${esc(t('cal.budgetTitle'))}</a><a class="btn" href="#/banking/budget/tools">${esc(t('budget.more'))}</a></div>
    <p class="footnote">${esc(t("Your budget stays on this device. Recurring bills also show on the calendar. Alerts start at"))} ${alertLevel()}% of a limit.</p>`;
  return screen({ title: t('budget.title'), back: '#/banking', body });
}
function catSpendRow(c, ym) {
  const spent = catAmount(c, ym);
  const lim = c.kind === 'expense' ? limitFor(c, ym) : 0;
  const pct = lim > 0 ? spent / lim * 100 : 0;
  const sub = c.kind === 'income' ? t('budget.incomeMonth') : lim > 0 ? t('budget.ofBudget', { pct: pctText(pct) }) + (isPremium() && S.budget.rollover && lim > Number(c.limit) ? t('budget.rollover') : '') : t('budget.setLimit');
  const right = c.kind === 'income' ? bm(spent) : lim > 0 ? bm(spent) : bm(spent);
  return `<button class="li" data-act="budSpend" data-id="${c.id}"><span class="grow"><b>${esc(c.name)}</b><span>${sub}</span>${c.kind === 'expense' && lim > 0 ? budgetBar(pct) : ''}</span><span class="amt ${c.kind === 'income' ? 'green' : pct >= 100 ? 'red' : ''}">${right}</span></button>`;
}
function goalRow(g) {
  const pct = g.target > 0 ? g.saved / g.target * 100 : 0;
  const gc = g.currency || S.budget.currency;
  return `<button class="li" data-act="budGoal" data-id="${g.id}"><span class="grow"><b>${esc(g.name)}</b><span>${money(g.saved || 0, gc)} ${esc(t("saved of"))} ${money(g.target || 0, gc)}${g.due ? ' · by ' + esc(fmtDay(g.due)) : ''}</span>${budgetBar(pct, 'blue')}</span></button>`;
}
function renderBudgetTools() {
  ensureBudget();
  const ym = bMonth();
  const exp = S.budget.categories.filter(c => c.kind === 'expense');
  const max = Math.max(1, ...exp.map(c => catAmount(c, ym)));
  const chart = exp.filter(c => catAmount(c, ym) > 0).map(c => {
    const n = catAmount(c, ym);
    return `<div class="li" style="display:block"><b>${esc(c.name)}</b><span class="small muted">${bm(n)}</span>${budgetBar(n / max * 100, 'blue')}</div>`;
  }).join('') || "<p class=\"empty\">" + esc(t("Add spending and a simple chart shows up here.")) + "</p>";
  let trend = premRow(t("Multi-month trends and forecast"), t("See the last 6 months and whether this month is on pace."));
  if (isPremium()) {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const m = shiftMonth(ym, -i);
      const spent = exp.reduce((a, c) => a + catAmount(c, m), 0);
      months.push({ m, spent });
    }
    const peak = Math.max(1, ...months.map(x => x.spent));
    const today = hobartToday();
    const day = today.slice(0, 7) === ym ? Math.max(1, Number(today.slice(8))) : daysInMonth(ym);
    const spentNow = exp.reduce((a, c) => a + catAmount(c, ym), 0);
    const pace = spentNow / day * daysInMonth(ym);
    trend = `<div class="card"><h3>${esc(t("Forecast"))}</h3><p style="margin:0">${esc(t("On this pace you will spend about"))} <b>${bm(pace)}</b> in ${esc(ymLabel(ym))}.</p><p class="small muted" style="margin:6px 0 0">${esc(t("Based on"))} ${bm(spentNow)} over ${day} day${day === 1 ? '' : 's'}. A guide only.</p></div>
      <div class="sec-h"><h2>${esc(t("Last 6 months"))}</h2></div><div class="list">${months.map(x => `<div class="li" style="display:block"><b>${esc(ymLabel(x.m))}</b><span class="small muted">${bm(x.spent)}</span>${budgetBar(x.spent / peak * 100, 'blue')}</div>`).join('')}</div>`;
  }
  const bills = S.budget.bills.map(b => `<button class="li" data-act="budBill" data-id="${b.id}"><span class="grow"><b>${esc(b.name)}</b><span>${esc(t("Day"))} ${b.day} · ${esc((catById(b.catId) || {}).name || 'Category')}</span></span><span class="amt">${money(b.amount, b.currency || S.budget.currency)}</span></button>`).join('');
  const cats = S.budget.categories.map(c => `<button class="li" data-act="budCat" data-id="${c.id}">${ic('edit', 18)}<span class="grow"><b>${esc(c.name)}</b><span>${c.kind === 'income' ? 'Income' : 'Expense'}${c.kind === 'expense' && c.limit ? ' · ' + bm(c.limit) + ' / month' : ''}</span></span></button>`).join('');
  const roll = isPremium()
    ? `<label class="list li" style="border:1px solid var(--line)"><span class="grow"><b>${esc(t("Rollover leftover"))}</b><span>${esc(t("Add what you didn't spend last month onto this month's limit"))}</span></span><span class="switch"><input type="checkbox" data-change="budRoll" ${S.budget.rollover ? 'checked' : ''}><i></i></span></label>`
    : `<div class="list">${premRow('Rollover', t("Carry unspent budget into next month"))}</div>`;
  const alerts = isPremium()
    ? `<label class="fld"><span>Warn me when a category reaches (%)</span><input id="alertAt" type="number" min="50" max="100" inputmode="numeric" value="${alertLevel()}"></label><p class="small muted">${esc(t("Free always uses 80%. Premium can choose from 50 to 100. Going over the limit always warns you."))}</p>`
    : `<div class="list">${premRow(t("Custom alerts"), t("Free warns you at 80% and when you go over"))}</div>`;
  const csv = isPremium()
    ? `<div class="row gap"><button class="btn" data-act="budExport">${ic('download', 18)} ${esc(t("Export CSV"))}</button><button class="btn" data-act="budImport">${ic('upload', 18)} ${esc(t("Import CSV"))}</button></div>`
    : `<div class="list">${premRow(t("CSV import and export"), t("Move a spreadsheet in or out of LifeHub"))}</div>`;
  const debt = isPremium()
    ? `<a class="btn full" href="#/banking/budget/debt">${esc(t("Debt payoff planner"))}</a>`
    : `<div class="list">${premRow(t("Debt payoff planner"), t("See which debt to pay first, and how long it may take"))}</div>`;
  const body = `<a class="linkbtn" href="#/banking/budget">← This month</a>
    <div class="sec-h"><h2>${esc(t("Templates"))}</h2></div>
    <div class="row gap"><button class="btn" data-act="bud5030">50/30/20</button><button class="btn" data-act="budZero">${esc(t("Zero-based"))}</button></div>
    <p class="small muted">50/30/20 splits income into needs, wants and savings. Zero-based gives every dollar a job.</p>
    <div class="sec-h"><h2>${esc(t("Spending chart"))}</h2></div><div class="list">${chart}</div>
    ${trend}
    <div class="sec-h"><h2>${esc(t("Recurring bills"))}</h2><button class="btn sm" data-act="budBill">${ic('plus', 16)} ${esc(t("Add"))}</button></div>
    <div class="list">${bills || "<p class=\"empty\">" + esc(t("Add rent or a subscription. It is counted in the month and added to your calendar.")) + "</p>"}</div>
    <div class="sec-h"><h2>${esc(t("Categories"))}</h2><button class="btn sm" data-act="budNewCat">${ic('plus', 16)} ${esc(t("Add"))}</button></div>
    <div class="list">${cats}</div>
    <div class="sec-h"><h2>${esc(t("Advanced"))}</h2></div>
    ${roll}
    ${alerts}
    ${csv}
    <div style="height:8px"></div>${debt}
    <p class="footnote">${esc(t("Templates, categories, the monthly chart and recurring bills are included on Free. The items with a Premium badge stay visible so you know they exist."))}</p>`;
  return { html: screen({ title: t("Budget tools"), back: '#/banking/budget', body }), after: () => {
    const inp = $('#alertAt'); if (!inp) return;
    inp.onchange = () => { const n = Math.min(100, Math.max(50, parseInt(inp.value, 10) || 80)); S.budget.alertAt = n; save(); toast(t("Alert set to ") + n + '%'); };
  } };
}
function renderDebt() {
  if (!isPremium()) {
    const body = `<div class="card lockcard"><h2>${esc(t("Debt payoff planner"))} ${premBadge()}</h2><p class="muted">${esc(t("Line up what you owe, then see which balance to tackle first. This stays on your device and does not contact a lender."))}</p><a class="btn primary full" href="#/plan">${esc(t("See Premium"))}</a></div>`;
    return screen({ title: t("Debt planner"), back: '#/banking/budget/tools', body });
  }
  ensureBudget();
  const extra = Number(S.budget.extra) || 0;
  const list = S.budget.debts.map(d => ({ ...d, months: monthsToPay(d.balance, d.rate, (Number(d.minPay) || 0) + (d.id === focusDebtId() ? extra : 0)) }));
  const ordered = list.slice().sort((a, b) => S.budget.strategy === 'avalanche' ? (b.rate || 0) - (a.rate || 0) : (a.balance || 0) - (b.balance || 0));
  const rows = ordered.map(d => { const dc = d.currency || S.budget.currency; return `<button class="li" data-act="budDebt" data-id="${d.id}"><span class="grow"><b>${esc(d.name)}</b><span>${money(d.balance, dc)} · ${d.rate || 0}% · min ${money(d.minPay || 0, dc)}</span></span><span class="small">${d.months === Infinity ? t("Too small") : d.months + ' mo'}</span></button>`; }).join('');
  const seg = (v, label) => `<button type="button" class="${S.budget.strategy === v ? 'on' : ''}" data-act="budStrategy" data-v="${v}">${label}</button>`;
  const body = `<p class="muted" style="margin-top:0">A guide only. LifeHub does not contact a bank or move any money.</p>
    <div class="seg" style="margin-bottom:12px">${seg('snowball', t("Smallest first"))}${seg('avalanche', t("Highest rate"))}</div>
    <label class="fld"><span>Extra paid to the first debt each month (${S.budget.currency})</span><input id="debtExtra" type="number" min="0" step="0.01" inputmode="decimal" value="${extra || ''}"></label>
    <div class="list">${rows || "<p class=\"empty\">" + esc(t("Add a card, loan or buy-now-pay-later balance.")) + "</p>"}</div>
    <button class="btn primary full" data-act="budDebt">${ic('plus', 18)} ${esc(t("Add a debt"))}</button>
    <p class="footnote">${esc(t("\"Too small\" means the payment does not cover the monthly interest, so the balance would not fall."))}</p>`;
  return { html: screen({ title: t("Debt planner"), back: '#/banking/budget/tools', body }), after: () => {
    const inp = $('#debtExtra'); if (!inp) return;
    inp.onchange = () => { S.budget.extra = Math.abs(parseFloat(inp.value) || 0); save(); render(); };
  } };
}
function focusDebtId() {
  const rows = S.budget.debts.slice();
  if (!rows.length) return '';
  rows.sort((a, b) => S.budget.strategy === 'avalanche' ? (b.rate || 0) - (a.rate || 0) : (a.balance || 0) - (b.balance || 0));
  return rows[0].id;
}
function monthsToPay(balance, annual, payment) {
  balance = Number(balance) || 0; payment = Number(payment) || 0; const r = (Number(annual) || 0) / 100 / 12;
  if (!(balance > 0)) return 0;
  if (!(payment > 0)) return Infinity;
  if (r === 0) return Math.ceil(balance / payment);
  if (payment <= balance * r + 0.005) return Infinity;
  return Math.ceil(Math.log(payment / (payment - balance * r)) / Math.log(1 + r));
}
function budAdd() { addBudgetEntry(); }
function addBudgetEntry() {
  ensureBudget();
  const cats = S.budget.categories.map(c => [c.id, c.name + (c.kind === 'income' ? ' (income)' : '')]);
  formSheet({ title: t("Add to ") + ymLabel(bMonth()), fields: [
    { k: 'catId', label: 'Category', type: 'select', options: cats },
    { k: 'amount', label: 'Amount', type: 'number', step: '0.01', req: true, im: 'decimal' },
    { k: 'note', label: 'Note', ph: 'Optional' },
    { k: 'date', label: 'Date', type: 'date', req: true },
  ], values: { date: spendDate(bMonth()), catId: cats[0] && cats[0][0] }, onSave: v => {
    if (!(v.amount > 0) || !v.date) { toast(t("Enter an amount and a date")); return false; }
    S.budget.entries.push({ id: uid(), catId: v.catId, amount: Math.abs(v.amount), date: v.date, note: v.note || '', currency: S.budget.currency });
    toast(t("Saved on this device"));
  } });
}
function budSpend(id) {
  const c = catById(id); if (!c) return;
  formSheet({ title: c.name, fields: [
    { k: 'amount', label: t("Amount this time"), type: 'number', step: '0.01', im: 'decimal' },
    { k: 'note', label: 'Note' },
    { k: 'date', label: 'Date', type: 'date' },
    { k: 'limit', label: c.kind === 'expense' ? t("Monthly budget (optional)") : t("Ignore for income"), type: 'number', step: '0.01', im: 'decimal' },
  ], values: { date: spendDate(bMonth()), limit: c.limit || '' }, onSave: v => {
    if (c.kind === 'expense') c.limit = v.limit > 0 ? v.limit : 0;
    if (v.amount > 0) S.budget.entries.push({ id: uid(), catId: c.id, amount: Math.abs(v.amount), date: v.date || spendDate(bMonth()), note: v.note || '', currency: S.budget.currency });
    else if (!(v.amount > 0) && c.kind !== 'expense') { toast(t("Enter an amount")); return false; }
    toast(t('common.saved'));
  } });
}
function editCategory(id) {
  const c = catById(id); if (!c) return;
  formSheet({ title: t("Edit category"), fields: [{ k: 'name', label: 'Name', req: true }, { k: 'limit', label: t("Monthly budget"), type: 'number', step: '0.01', im: 'decimal' }], values: { name: c.name, limit: c.limit || '' },
    onSave: v => { c.name = v.name; if (c.kind === 'expense') c.limit = v.limit > 0 ? v.limit : 0; },
    danger: { label: t("Delete category"), fn: () => { S.budget.categories = S.budget.categories.filter(x => x.id !== id); S.budget.entries = S.budget.entries.filter(e => e.catId !== id); } } });
}
function newCategory() {
  formSheet({ title: t("New category"), fields: [
    { k: 'name', label: 'Name', req: true },
    { k: 'kind', label: 'Type', type: 'select', options: [['expense', 'Expense'], ['income', 'Income']] },
    { k: 'group', label: '50/30/20 group', type: 'select', options: [['needs', 'Needs'], ['wants', 'Wants'], ['save', 'Savings'], ['', 'Other']] },
    { k: 'limit', label: t("Monthly budget"), type: 'number', step: '0.01', im: 'decimal' },
  ], onSave: v => { S.budget.categories.push({ id: uid(), name: v.name, kind: v.kind || 'expense', group: v.group || '', limit: v.limit > 0 ? v.limit : 0 }); toast(t("Category added")); } });
}
function editGoal(id) {
  ensureBudget();
  const g = id && S.budget.goals.find(x => x.id === id);
  if (!g && !isPremium() && S.budget.goals.length >= FREE_GOALS) return premGo();
  formSheet({ title: g ? t("Edit goal") : t("New goal"), fields: [
    { k: 'name', label: t("What are you saving for?"), req: true },
    { k: 'target', label: t("Target amount"), type: 'number', step: '0.01', req: true, im: 'decimal' },
    { k: 'saved', label: t("Already saved"), type: 'number', step: '0.01', im: 'decimal' },
    { k: 'due', label: t("Target date"), type: 'date' },
  ], values: g || { saved: 0 }, onSave: v => {
    if (!(v.target > 0)) { toast(t("Enter a target")); return false; }
    v.saved = v.saved > 0 ? v.saved : 0;
    if (g) Object.assign(g, v); else S.budget.goals.push({ id: uid(), currency: S.budget.currency, ...v });
    toast(t("Goal saved"));
  }, danger: g ? { label: t("Delete goal"), fn: () => { S.budget.goals = S.budget.goals.filter(x => x.id !== id); } } : null });
}
function editBBill(id) {
  ensureBudget();
  const b = id && S.budget.bills.find(x => x.id === id);
  const cats = S.budget.categories.filter(c => c.kind === 'expense').map(c => [c.id, c.name]);
  if (!cats.length) return toast(t("Add a spending category first"));
  formSheet({ title: b ? t("Edit recurring bill") : t("Recurring bill"), intro: t("Counted in that category every month, and added to your calendar. Nothing is paid automatically."), fields: [
    { k: 'name', label: 'Name', req: true, ph: 'e.g. Rent' },
    { k: 'amount', label: 'Amount', type: 'number', step: '0.01', req: true, im: 'decimal' },
    { k: 'catId', label: 'Category', type: 'select', options: cats },
    { k: 'day', label: t("Day of the month"), type: 'number', min: 1, im: 'numeric' },
  ], values: b || { day: 1, catId: cats[0][0] }, onSave: v => {
    if (!(v.amount > 0)) { toast(t("Enter an amount")); return false; }
    v.amount = Math.abs(v.amount); v.day = Math.min(28, Math.max(1, parseInt(v.day, 10) || 1));
    if (b) Object.assign(b, v); else S.budget.bills.push({ id: uid(), currency: S.budget.currency, ...v });
    toast(t("It will show on your calendar"));
  }, danger: b ? { label: t("Delete bill"), fn: () => { S.budget.bills = S.budget.bills.filter(x => x.id !== id); } } : null });
}
function editDebt(id) {
  if (!isPremium()) return premGo();
  const d = id && S.budget.debts.find(x => x.id === id);
  formSheet({ title: d ? t("Edit debt") : t("Add a debt"), intro: t("A planner only. No payment is sent."), fields: [
    { k: 'name', label: 'Name', req: true, ph: t("e.g. Credit card") },
    { k: 'balance', label: t("Balance owing"), type: 'number', step: '0.01', req: true, im: 'decimal' },
    { k: 'rate', label: t("Interest rate per year (%)"), type: 'number', step: '0.01', im: 'decimal' },
    { k: 'minPay', label: t("Minimum payment each month"), type: 'number', step: '0.01', req: true, im: 'decimal' },
  ], values: d || { rate: 0 }, onSave: v => {
    if (!(v.balance > 0) || !(v.minPay > 0)) { toast(t("Enter the balance and a payment")); return false; }
    v.balance = Math.abs(v.balance); v.minPay = Math.abs(v.minPay); v.rate = v.rate > 0 ? v.rate : 0;
    if (d) Object.assign(d, v); else S.budget.debts.push({ id: uid(), currency: S.budget.currency, ...v });
    toast(t("Debt saved"));
  }, danger: d ? { label: t("Delete debt"), fn: () => { S.budget.debts = S.budget.debts.filter(x => x.id !== id); } } : null });
}
function apply5030() {
  formSheet({ title: '50/30/20', intro: t("Enter monthly income. Needs get 50%, wants 30% and savings 20%, split across those categories."), fields: [{ k: 'income', label: t("Monthly income"), type: 'number', step: '0.01', req: true, im: 'decimal' }],
    onSave: v => {
      if (!(v.income > 0)) { toast(t("Enter income")); return false; }
      const share = { needs: 0.5, wants: 0.3, save: 0.2 };
      Object.entries(share).forEach(([g, pct]) => {
        const cats = S.budget.categories.filter(c => c.kind === 'expense' && c.group === g);
        const each = Math.round(v.income * pct / (cats.length || 1) * 100) / 100;
        cats.forEach(c => { c.limit = each; });
      });
      toast(t("Monthly limits updated"));
    } });
}
function applyZero() {
  ensureBudget();
  const exp = S.budget.categories.filter(c => c.kind === 'expense');
  openSheet(`<h2>${esc(t("Zero-based budget"))}</h2><p class="muted small">${esc(t("Put your income into the categories until nothing is left over."))}</p>
    <label class="fld"><span>${esc(t("Monthly income"))}</span><input id="zInc" type="number" inputmode="decimal" step="0.01"></label>
    ${exp.map(c => `<label class="fld"><span>${esc(c.name)}</span><input data-z="${c.id}" type="number" inputmode="decimal" step="0.01" value="${c.limit || ''}"></label>`).join('')}
    <p id="zLeft" class="small" style="margin-top:0"></p>
    <button class="btn primary full" id="zSave" type="button">${esc(t("Save limits"))}</button>`, el => {
    const calc = () => {
      const inc = parseFloat($('#zInc', el).value) || 0; let sum = 0;
      $$('[data-z]', el).forEach(i => { sum += parseFloat(i.value) || 0; });
      const left = Math.round((inc - sum) * 100) / 100;
      $('#zLeft', el).textContent = (left === 0 ? t("Every dollar has a job.") : bm(left) + t(" still to assign"));
    };
    el.addEventListener('input', calc); calc();
    $('#zSave', el).onclick = () => { $$('[data-z]', el).forEach(i => { const c = catById(i.dataset.z); if (c) c.limit = parseFloat(i.value) || 0; }); closeSheet(true); save(); render(); toast(t("Limits saved")); };
  });
}
function csvCell(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function exportBudget() {
  if (!isPremium()) return premGo();
  const lines = ['date,category,kind,amount,note'];
  S.budget.entries.forEach(e => { const c = catById(e.catId); lines.push([e.date, csvCell(c ? c.name : ''), c ? c.kind : '', e.amount, csvCell(e.note || '')].join(',')); });
  download('lifehub-budget-' + bMonth() + '.csv', lines.join('\n'), 'text/csv');
  toast('Budget CSV downloaded');
}
async function importBudget() {
  if (!isPremium()) return premGo();
  const f = await pickFile('.csv,text/csv'); if (!f) return;
  const rows = parseCSV(await readText(f)); let n = 0;
  rows.forEach(r => {
    const amount = parseFloat(String(pick(r, 'amount', 'value')).replace(/[^\d.-]/g, ''));
    const name = pick(r, 'category', 'cat', 'name');
    if (!name || !(amount > 0)) return;
    const kind = /income/i.test(pick(r, 'kind', 'type')) ? 'income' : 'expense';
    let c = S.budget.categories.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!c) { c = { id: uid(), name, kind, group: '', limit: 0 }; S.budget.categories.push(c); }
    const dt = new Date(pick(r, 'date'));
    const code = String(pick(r, 'currency', 'ccy') || '').toUpperCase();
    S.budget.entries.push({ id: uid(), catId: c.id, amount: Math.abs(amount), currency: /^[A-Z]{3}$/.test(code) ? code : S.budget.currency, date: isNaN(dt) ? todayISO() : dt.toISOString().slice(0, 10), note: pick(r, 'note', 'desc', 'description') || '' });
    n++;
  });
  save(); render(); toast('Imported ' + n + ' row' + (n === 1 ? '' : 's'));
}
function premGo() { location.hash = '#/plan'; toast('That\'s part of Premium'); }

/* ---------- documents ---------- */
const DOC_ACCEPT = '.pdf,.txt,.csv,.md,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.png,.jpg,.jpeg,.gif,.webp,application/pdf,text/plain,text/csv,image/*';
let docQ = '', docFolder = '';
function ensureDocs() {
  let changed = false;
  if (!S.docs || typeof S.docs !== 'object') { S.docs = { folders: [], items: [] }; changed = true; }
  if (!Array.isArray(S.docs.folders)) { S.docs.folders = []; changed = true; }
  if (!Array.isArray(S.docs.items)) { S.docs.items = []; changed = true; }
  return changed;
}
async function putFile(id, blob) { return putStore('files', id, blob); }
async function getFile(id) { return getStore('files', id); }
async function delFile(id) { try { const db = await idb(); db.transaction('files', 'readwrite').objectStore('files').delete(id); } catch (e) {} }
async function inboxAll() { try { const db = await idb(); return await new Promise(res => { const q = db.transaction('inbox').objectStore('inbox').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); }); } catch (e) { return []; } }
async function inboxClear() { try { const db = await idb(); await new Promise(res => { const t = db.transaction('inbox', 'readwrite'); t.objectStore('inbox').clear(); t.oncomplete = res; t.onerror = res; }); } catch (e) {} }
function docKind(name, type) {
  const n = String(name || '').toLowerCase(); const t = type || '';
  if (t.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic)$/.test(n)) return 'image';
  if (t === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (n.endsWith('.csv') || t.includes('csv')) return 'csv';
  if (t.startsWith('text/') || /\.(txt|md|json)$/.test(n)) return 'text';
  if (/\.(docx?|rtf)$/.test(n) || t.includes('word')) return 'word';
  if (/\.xlsx?$/.test(n) || t.includes('sheet') || t.includes('excel')) return 'excel';
  if (/\.pptx?$/.test(n) || t.includes('presentation')) return 'ppt';
  return 'file';
}
function fmtBytes(n) { n = Number(n) || 0; if (n < 1024) return n + ' B'; if (n < 1048576) return Math.round(n / 1024) + ' KB'; return (n / 1048576).toFixed(1) + ' MB'; }
function reasonText(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (r.k) return t(r.k, r);
  return '';
}
function safetyTag(level) {
  if (level === 'safe') return '<span class="tag green">' + esc(t('safety.safe')) + '</span>';
  if (level === 'caution') return '<span class="tag amber">' + esc(t('safety.caution')) + '</span>';
  if (level === 'blocked') return '<span class="tag red">' + esc(t('safety.blocked')) + '</span>';
  return '';
}
function safetyStrict() { return !!(S && S.safety && S.safety.strict); }
function ensureSafety() {
  let changed = false;
  if (!S.safety || typeof S.safety !== 'object') { S.safety = { strict: false, log: [] }; changed = true; }
  if (typeof S.safety.strict !== 'boolean') { S.safety.strict = false; changed = true; }
  if (!Array.isArray(S.safety.log)) { S.safety.log = []; changed = true; }
  return changed;
}
function linkCheckContext() {
  const brands = [];
  const official = ['google.com', 'microsoft.com', 'apple.com', 'spotify.com', 'whatsapp.com', 'facebook.com', 'instagram.com', 'netflix.com', 'paypal.com', 'zoom.us', 'signal.org', 'youtube.com', 'uber.com', 'tiktok.com', 'x.com', 'twitter.com', 'live.com', 'office.com', 'icloud.com', 'commbank.com.au', 'westpac.com.au', 'nab.com.au', 'anz.com.au', 'my.gov.au', 'auspost.com.au', 'hotdoc.com.au', 'telegram.org', 'gmail.com'];
  APP_CATALOG.forEach(a => {
    normName(a.name).split(' ').forEach(w => { if (w.length >= 5 && !['calendar', 'messenger', 'australia'].includes(w)) brands.push(w); });
    const host = hostOf(a.url);
    if (!host) return;
    official.push(host);
    const parts = host.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join('.');
      if (!SHARED_HOSTS.has(parent)) official.push(parent);
    }
  });
  return { brands: [...new Set(brands)], official: [...new Set(official)] };
}
function logSafety(result, name) {
  ensureSafety();
  S.safety.log.unshift({ t: Date.now(), name: String(name || 'Check').slice(0, 80), level: result.level, reasons: (result.reasons || []).filter(r => r && r.k !== 'safety.ok' && r !== 'Nothing in this check stood out.'), reason: (result.reasons || []).map(reasonText).filter(s => s && s !== t('safety.ok')).join(' ') });
  if (S.safety.log.length > 30) S.safety.log.length = 30;
  save();
}
function presentSafety(result, name) {
  logSafety(result, name);
  if (result.level === 'safe') return Promise.resolve(true);
  const strict = safetyStrict();
  const blocked = result.level === 'blocked' || (result.level === 'caution' && strict);
    const label = blocked ? t('safety.blocked') : t('safety.caution');
  const why = strict && result.level === 'caution' ? '<p class="small muted">' + esc(t('safety.strictOn')) + '</p>' : '';
  return new Promise(res => {
    let done = false;
    const fin = v => { if (done) return; done = true; closeSheet(true); res(!!v); };
    const buttons = blocked ? '<button class="btn full" id="sNo">' + esc(t('safety.dont')) + '</button>' : '<div class="row gap"><button class="btn" id="sNo">' + esc(t('safety.dont')) + '</button><button class="btn primary" id="sYes">' + esc(t('safety.anyway')) + '</button></div>';
    openSheet(`<p class="safebadge ${blocked ? 'blocked' : 'caution'}">${esc(label)}</p><h2>${esc(t('safety.title'))}</h2><p class="muted">${esc(t('safety.lead'))}</p><ul class="safer">${(result.reasons || []).map(r => '<li>' + esc(reasonText(r)) + '</li>').join('')}</ul>${why}${buttons}`, el => {
      const no = $('#sNo', el); if (no) no.onclick = () => fin(false);
      const yes = $('#sYes', el); if (yes) yes.onclick = () => fin(true);
    }, () => fin(false));
  });
}
async function scanFile(file) {
  const size = file.size || 0;
  const cap = Math.min(size, 8 * 1024 * 1024);
  const bytes = new Uint8Array(await file.slice(0, cap).arrayBuffer());
  const result = LHSafety.scanBytes(file.name || 'file', bytes, size);
  if (size > cap && result.level === 'safe') return { level: 'caution', reasons: [{ k: 'safety.partial' }] };
  return result;
}
async function addDocFiles(list) {
  ensureDocs();
  const kept = [];
  for (const f of [...list].filter(Boolean)) {
    const result = await scanFile(f);
    const ok = result.level === 'safe' || await presentSafety(result, f.name);
    if (result.level === 'safe') logSafety(result, f.name);
    if (!ok) continue;
    const id = uid();
    try { await putFile(id, f); } catch (e) { toast('Could not store ' + (f.name || 'a file')); continue; }
    kept.push(result.level);
    S.docs.items.unshift({ id, name: f.name || 'Untitled', type: f.type || '', size: f.size || 0, added: Date.now(), folderId: docFolder || '', tags: [], safety: result.level, safetyReason: (result.reasons || []).join(' ') });
  }
  if (!kept.length) return;
  save();
  const n = kept.length;
  toast(kept.every(level => level === 'safe') ? `Safety check: Safe · saved ${n} file${n === 1 ? '' : 's'} on this device` : `Saved ${n} file${n === 1 ? '' : 's'} on this device`);
  render();
}
let inboxBusy = false;
async function absorbInbox() {
  if (inboxBusy || !S) return;
  inboxBusy = true;
  try {
    const pending = await inboxAll();
    if (pending.length) {
      const files = [];
      for (const m of pending) {
        const blob = m && m.id ? await getFile(m.id) : null;
        if (blob) files.push(new File([blob], m.name || 'Shared file', { type: m.type || blob.type || '' }));
        if (m && m.id) await delFile(m.id);
      }
      await inboxClear();
      if (files.length) await addDocFiles(files);
    }
  } catch (e) {}
  inboxBusy = false;
}
function renderDocuments() {
  ensureDocs();
  const q = docQ.trim().toLowerCase();
  let items = S.docs.items.slice().sort((a, b) => (b.added || 0) - (a.added || 0));
  if (docFolder) items = items.filter(d => d.folderId === docFolder);
  if (q) items = items.filter(d => (d.name + ' ' + (d.tags || []).join(' ')).toLowerCase().includes(q));
  const recent = !q && !docFolder ? items.slice(0, 5) : [];
  const row = d => {
    const folder = S.docs.folders.find(f => f.id === d.folderId);
    return `<a class="li" href="#/doc/${d.id}">${ic('file')}<span class="grow"><b>${esc(d.name)}</b><span>${esc(docKind(d.name, d.type))} · ${fmtBytes(d.size)}${folder ? ' · ' + esc(folder.name) : ''}${(d.tags || []).length ? ' · ' + esc(d.tags.join(', ')) : ''}</span></span>${safetyTag(d.safety)}</a>`;
  };
  const chips = `<div class="chips"><button class="btn sm ${docFolder ? '' : 'primary'}" data-act="docFolder" data-id="">All</button>${S.docs.folders.map(f => `<button class="btn sm ${docFolder === f.id ? 'primary' : ''}" data-act="docFolder" data-id="${f.id}">${esc(f.name)}</button>`).join('')}<button class="btn sm" data-act="docNewFolder">${ic('plus', 16)} Folder</button></div>`;
  const body = `<div class="searchbox">${ic('search', 20)}<input class="input" id="docQ" type="search" placeholder="Search files or tags" value="${esc(docQ)}" aria-label="Search documents"></div>
    ${chips}
    <div class="row gap" style="margin-bottom:12px"><button class="btn primary" data-act="docAdd">${ic('plus', 18)} Add files</button></div>
    ${recent.length ? `<div class="sec-h"><h2>Recent</h2></div><div class="list">${recent.map(row).join('')}</div>` : ''}
    <div class="sec-h"><h2>${q ? 'Results' : docFolder ? 'In this folder' : 'All files'}</h2></div>
    <div class="list">${items.length ? items.map(row).join('') : '<p class="empty">Nothing here yet. Add a PDF, photo, spreadsheet or text file from this device.</p>'}</div>
    <p class="footnote">Files stay in this browser's database. A safety check runs on this device when you add one. It is not an antivirus scan of your phone or computer.</p>`;
  return { html: screen({ title: t('docs.title'), body, right: `<button class="iconbtn" data-act="docAdd" aria-label="${esc(t('docs.add'))}">${ic('plus')}</button>` }), after: () => {
    const i = $('#docQ'); if (!i) return;
    i.oninput = () => { docQ = i.value; const p = i.selectionStart; render(); const j = $('#docQ'); if (j) { j.focus(); j.setSelectionRange(p, p); } };
  } };
}
function officeLinks(kind) {
  const map = {
    word: ['Microsoft 365', 'https://www.office.com/launch/word', 'Google Docs', 'https://docs.google.com/document/create'],
    excel: ['Microsoft 365', 'https://www.office.com/launch/excel', 'Google Sheets', 'https://docs.google.com/spreadsheets/create'],
    ppt: ['Microsoft 365', 'https://www.office.com/launch/powerpoint', 'Google Slides', 'https://docs.google.com/presentation/create'],
  };
  return map[kind] || null;
}
function renderDoc(id) {
  ensureDocs();
  const item = S.docs.items.find(x => x.id === id);
  if (!item) { location.hash = '#/documents'; return ''; }
  const kind = docKind(item.name, item.type);
  const L = officeLinks(kind);
  const body = `<p class="muted" style="margin-top:0">${esc(kind)} · ${fmtBytes(item.size)}${(item.tags || []).length ? ' · ' + esc(item.tags.join(', ')) : ''}</p>
    <div id="docHost"><p class="empty">Opening…</p></div>
    ${L ? `<div class="card"><h3>Open elsewhere</h3><p class="muted">This browser does not preview ${esc(kind)} files. Download the file, then upload it on the website. LifeHub does not send it for you.</p><div class="row gap wrap"><button class="btn primary" data-act="docDl" data-id="${id}">Download</button><a class="btn" href="${L[1]}" target="_blank" rel="noopener">${L[0]}</a><a class="btn" href="${L[3]}" target="_blank" rel="noopener">${L[2]}</a></div></div>` : `<button class="btn full" data-act="docDl" data-id="${id}">${ic('download', 18)} Download</button>`}
    <div class="list" style="margin-top:12px"><button class="li" data-act="docTags" data-id="${id}">${ic('edit')}<span class="grow"><b>Tags</b><span>${(item.tags || []).length ? esc(item.tags.join(', ')) : 'Add words so you can search'}</span></span></button>
    <button class="li" data-act="docMove" data-id="${id}">${ic('grid')}<span class="grow"><b>Folder</b><span>${esc((S.docs.folders.find(f => f.id === item.folderId) || {}).name || 'None')}</span></span></button>
    <button class="li" data-act="docDel" data-id="${id}" style="color:var(--red)">${ic('trash')}<span class="grow"><b>Remove from this device</b></span></button></div>`;
  return { html: screen({ title: item.name, back: '#/documents', body }), after: () => mountDoc(item) };
}
async function mountDoc(item) {
  const host = $('#docHost'); if (!host) return;
  const blob = await getFile(item.id);
  if (!blob || !$('#docHost')) { if ($('#docHost')) $('#docHost').innerHTML = '<p class="empty">This file is not in the on-device database any more.</p>'; return; }
  const kind = docKind(item.name, item.type || blob.type);
  if (kind === 'csv' || kind === 'text') {
    const text = await blob.text();
    host.innerHTML = kind === 'csv' ? csvPreview(text) : `<pre class="docpre">${esc(text.slice(0, 200000))}</pre>${text.length > 200000 ? '<p class="small muted">Showing the first part. Download the file for the rest.</p>' : ''}`;
    return;
  }
  const url = URL.createObjectURL(blob);
  const prev = cleanupFn; cleanupFn = () => { URL.revokeObjectURL(url); if (prev) prev(); };
  if (kind === 'image') host.innerHTML = `<img class="docpic" alt="${esc(item.name)}" src="${url}">`;
  else if (kind === 'pdf') host.innerHTML = `<iframe class="docframe" title="${esc(item.name)}" src="${url}"></iframe>`;
  else host.innerHTML = '<p class="empty">Use Download, or the Microsoft 365 and Google links below.</p>';
}
function csvPreview(text) {
  const rows = parseCSV(text).slice(0, 200);
  if (!rows.length) return '<p class="empty">No rows in this CSV.</p>';
  const keys = Object.keys(rows[0]);
  return `<div style="overflow:auto"><table class="doctable"><thead><tr>${keys.map(k => `<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${keys.map(k => `<td>${esc(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="small muted">Showing up to 200 rows.</p>`;
}
async function downloadDoc(id) {
  const item = (S.docs.items || []).find(x => x.id === id); const blob = await getFile(id);
  if (!item || !blob) return toast('That file is not on this device');
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = item.name || 'file'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
function editDocTags(id) {
  const item = S.docs.items.find(x => x.id === id); if (!item) return;
  formSheet({ title: 'Tags', fields: [{ k: 'tags', label: 'Words, separated by commas', ph: 'tax, 2026' }], values: { tags: (item.tags || []).join(', ') }, onSave: v => { item.tags = v.tags.split(',').map(s => s.trim()).filter(Boolean).slice(0, 12); } });
}
function moveDoc(id) {
  const item = S.docs.items.find(x => x.id === id); if (!item) return;
  const opts = [['', 'No folder'], ...S.docs.folders.map(f => [f.id, f.name])];
  formSheet({ title: 'Folder', fields: [{ k: 'folderId', label: 'Keep it in', type: 'select', options: opts }], values: { folderId: item.folderId || '' }, onSave: v => { item.folderId = v.folderId || ''; } });
}
async function deleteDoc(id) {
  const item = S.docs.items.find(x => x.id === id); if (!item) return;
  if (!(await confirmSheet('Remove this file?', esc(item.name) + ' will be deleted from this device.', 'Remove', true))) return;
  await delFile(id); S.docs.items = S.docs.items.filter(x => x.id !== id); save(); location.hash = '#/documents'; toast('Removed');
}
function newFolder() {
  formSheet({ title: 'New folder', fields: [{ k: 'name', label: 'Name', req: true }], onSave: v => { const id = uid(); S.docs.folders.push({ id, name: v.name }); docFolder = id; toast('Folder added'); } });
}

/* ---------- quick sync ---------- */
/* The popular-app list lives in data/apps.json and is fetched only when needed.
   android = Play package name. ios = URL scheme without ://. Unknown fields are left blank.
   This website does not use them to see what is installed. */
let APP_CATALOG = [];
let catalogReady = false;
let catalogP = null;
let catalogError = '';
function ensureCatalog() {
  if (catalogReady) return Promise.resolve(APP_CATALOG);
  if (!catalogP) {
    catalogError = '';
    catalogP = fetch('data/apps.json').then(r => { if (!r.ok) throw new Error('list'); return r.json(); }).then(list => {
      APP_CATALOG = (Array.isArray(list) ? list : []).map(a => ({ ...a, url: a.url || (a.domain ? 'https://' + a.domain + '/' : '') }));
      catalogReady = true;
      return APP_CATALOG;
    }).catch(err => { catalogP = null; catalogError = 'The app list could not be loaded. Check your connection and try again.'; throw err; });
  }
  return catalogP;
}
const CAT_ORDER = ['Banking', 'Finance', 'Utilities', 'Phone', 'Health', 'Government', 'Messages', 'Social', 'Transport', 'Shopping', 'Food', 'Streaming', 'Productivity', 'Travel', 'Fitness', 'Education'];
const CAT_EMOJI = { Banking: '🏦', Finance: '💳', Utilities: '💡', Phone: '📱', Health: '🩺', Government: '🏛️', Messages: '💬', Social: '📣', Transport: '🚌', Shopping: '🛍️', Food: '🍽️', Streaming: '🎬', Productivity: '📎', Travel: '✈️', Fitness: '🏃', Education: '🎓' };
let syncQ = '', syncPick = null, syncRelated = '', syncCat = '';

function bytesToText(buf) {
  const u8 = new Uint8Array(buf);
  let ascii = '', utf16 = '';
  for (let i = 0; i < u8.length; i++) ascii += (u8[i] >= 32 && u8[i] < 127) ? String.fromCharCode(u8[i]) : '\n';
  for (let i = 0; i + 1 < u8.length; i += 2) {
    const c = u8[i] | (u8[i + 1] << 8);
    utf16 += (c >= 32 && c < 127) ? String.fromCharCode(c) : '\n';
  }
  return ascii + '\n' + utf16;
}
function normName(s) {
  return String(s || '').toLowerCase().replace(/\.(lnk|url|desktop|webloc|png|jpe?g|svg|ico|html)$/i, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function nameHits(spec, label) {
  const n = normName(spec.name), h = normName(label);
  if (!n || !h) return false;
  if (n.length <= 2 || h.length <= 2) return h === n;
  return h === n || h.includes(n);
}
function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { return ''; } }
function rootHost(h) {
  const p = h.split('.');
  if (p.length >= 3 && p[p.length - 2] === 'com' && ['au', 'uk', 'nz'].includes(p[p.length - 1])) return p.slice(-3).join('.');
  return p.length >= 2 ? p.slice(-2).join('.') : h;
}
const SHARED_HOSTS = new Set(['google.com', 'live.com', 'microsoft.com', 'apple.com', 'icloud.com', 'office.com']);
function hostsRelated(dropped, catalog) {
  if (!dropped || !catalog) return false;
  const close = dropped === catalog || dropped.endsWith('.' + catalog) || catalog.endsWith('.' + dropped);
  if (!close) return false;
  if (SHARED_HOSTS.has(rootHost(dropped)) || SHARED_HOSTS.has(rootHost(catalog))) return dropped === catalog || dropped.endsWith('.' + catalog);
  return true;
}
function firstUrl(text) {
  const m = String(text || '').match(/[a-z][a-z0-9+.-]*:\/\/[^\s<>"')\]]+/i);
  return m ? m[0].replace(/[),.;]+$/, '') : '';
}
function matchAppLink(raw) {
  const text = String(raw || '');
  const url = firstUrl(text);
  const play = (text.match(/[?&]id=([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)/) || [])[1] || '';
  const apple = (text.match(/\/id(\d{6,})/) || [])[1] || '';
  let scheme = '';
  try { if (url) scheme = new URL(url).protocol.replace(':', '').toLowerCase(); } catch (e) {}
  if (scheme === 'http' || scheme === 'https') scheme = '';
  const fileLabel = text.split(/[\n\r]+/).map(s => s.trim().split(/[/\\]/).pop()).find(s => /\.(lnk|url|desktop|webloc|png|jpe?g|svg|ico)$/i.test(s || '')) || '';
  const byHost = url ? APP_CATALOG.filter(s => hostsRelated(hostOf(url), hostOf(s.url || s.domain))) : [];
  const spec = APP_CATALOG.find(s => play && s.android && s.android === play)
    || APP_CATALOG.find(s => apple && s.appleId && String(s.appleId) === apple)
    || APP_CATALOG.find(s => scheme && s.ios && s.ios.toLowerCase() === scheme)
    || (byHost.length === 1 ? byHost[0] : null)
    || APP_CATALOG.find(s => nameHits(s, fileLabel) || nameHits(s, text));
  if (spec) {
    const store = /play\.google\.com|apps\.apple\.com|itunes\.apple\.com/i.test(url);
    const useDropped = url && !store && (scheme || hostsRelated(hostOf(url), hostOf(spec.url)));
    const how = play ? 'the Play Store link' : apple ? 'the App Store link' : scheme ? 'the app link' : fileLabel ? 'the file name' : 'the link';
    return { matched: true, name: spec.name, url: useDropped ? url : spec.url, emoji: spec.emoji || '🔗', catalogId: spec.id, android: spec.android || '', ios: spec.ios || '', groupId: '', note: 'Matched ' + spec.name + ' from ' + how + '. Check it, then save. LifeHub has not checked whether it is installed.' };
  }
  let name = '';
  if (fileLabel) name = fileLabel.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  else if (url) { try { name = new URL(url).hostname.replace(/^www\./, '').split('.')[0]; } catch (e) {} }
  else { const line = text.split(/[\n\r]+/).map(s => s.trim()).find(Boolean) || ''; name = line.slice(0, 40); }
  name = name.replace(/\b\w/g, c => c.toUpperCase());
  if (!name && !url) return null;
  return { matched: false, name: name || 'App', url: (scheme ? url : url) || '', emoji: '🔗', catalogId: '', android: '', ios: '', groupId: '', note: 'No popular app matched. The name and link are filled in from what you dropped.' };
}
async function rawFromDrop(dt) {
  const chunks = [];
  try { ['text/uri-list', 'text/plain', 'text/html', 'URL'].forEach(t => { const v = dt.getData(t); if (v) chunks.push(v); }); } catch (e) {}
  for (const f of [...(dt.files || [])]) {
    chunks.push(f.name || '');
    if (f.size > 524288) continue;
    try { chunks.push(bytesToText(await f.arrayBuffer())); } catch (e) {}
  }
  return chunks.join('\n');
}
function openPreset(preset) {
  if (!preset) { toast('Nothing readable in that drop'); return; }
  sessionStorage.setItem('lh.addDraft', JSON.stringify(preset));
  if ((location.hash || '') !== '#/addnew') location.hash = '#/addnew';
  else openPendingDraft();
}
function openPendingDraft() {
  const raw = sessionStorage.getItem('lh.addDraft'); if (!raw || !unlocked) return;
  sessionStorage.removeItem('lh.addDraft');
  let preset = null; try { preset = JSON.parse(raw); } catch (e) { return; }
  editApp(null, '', preset);
}
function pasteLink() {
  formSheet({ title: 'Paste a link', intro: 'Paste a website, Play Store or App Store link. LifeHub cannot see which apps are installed.', submit: 'Continue', fields: [{ k: 'link', label: 'Link', req: true, ph: 'https://…' }],
    onSave: async v => { try { await ensureCatalog(); } catch (e) {} const preset = matchAppLink(v.link); setTimeout(() => openPreset(preset), 0); return false; } });
}
function dropTarget(e) {
  if (!e.target || !e.target.closest) return null;
  const zone = e.target.closest('[data-drop]');
  if (zone) return zone;
  if (document.documentElement.classList.contains('can-drop') && e.target.closest('[data-screen="home"]')) return document.querySelector('[data-drop="home"]');
  return null;
}
function syncDropMode() {
  let ok = false;
  try { ok = matchMedia('(min-width: 900px)').matches; } catch (e) {}
  document.documentElement.classList.toggle('can-drop', ok);
}
document.addEventListener('dragover', e => {
  const zone = dropTarget(e); if (!zone) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  zone.classList.add('over');
});
document.addEventListener('dragleave', e => { const zone = e.target.closest && e.target.closest('[data-drop]'); if (zone) zone.classList.remove('over'); });
document.addEventListener('drop', async e => {
  const zone = dropTarget(e); if (!zone) return;
  e.preventDefault();
  $$('[data-drop]').forEach(z => z.classList.remove('over'));
  const files = [...(e.dataTransfer.files || [])];
  for (const f of files) { if (!(await presentSafety(await scanFile(f), f.name))) return; }
  const raw = await rawFromDrop(e.dataTransfer);
  try { await ensureCatalog(); } catch (e) {}
  openPreset(matchAppLink(raw));
});
syncDropMode();
try { matchMedia('(min-width: 900px)').addEventListener('change', syncDropMode); } catch (e) {}
addEventListener('resize', syncDropMode);
async function absorbAddIntent() {
  let intent = null;
  try {
    const cache = await caches.open('lifehub-share');
    const key = new URL('./share-intent.json', document.baseURI);
    const res = await cache.match(key);
    if (!res) return;
    intent = await res.json();
    await cache.delete(key);
  } catch (e) { return; }
  try { await ensureCatalog(); } catch (e) {}
  const preset = matchAppLink([intent.title, intent.text, intent.url, intent.extra].filter(Boolean).join('\n'));
  if (!preset) return;
  sessionStorage.setItem('lh.addDraft', JSON.stringify(preset));
  if (!unlocked) return;
  if ((location.hash || '') !== '#/addnew') location.hash = '#/addnew';
  else openPendingDraft();
}
function catalogInHub(spec) { return S.apps.some(a => a.catalogId === spec.id || a.url === spec.url); }
function adoptCatalog() {
  (S.apps || []).forEach(a => {
    if (a.catalogId) return;
    const spec = APP_CATALOG.find(s => s.url && s.url === a.url);
    if (spec) a.catalogId = spec.id;
  });
}
function openQuickSync() {
  syncPick = null;
  syncQ = ''; syncRelated = ''; syncCat = '';
  location.hash = '#/addnew/sync';
  if (navigator.getInstalledRelatedApps) navigator.getInstalledRelatedApps().then(list => {
    if (!list || !list.length || (location.hash || '') !== '#/addnew/sync') return;
    syncRelated = t("This browser reported ") + list.length + t(" related app") + (list.length === 1 ? '' : 's') + t(" for LifeHub. It still cannot list everything installed on the device.");
    const el = $('#syncRelated'); if (el) el.textContent = syncRelated;
  }).catch(() => {});
}
function catalogIcon(a) {
  if (a.emoji) return `<span class="ai" style="font-size:1.3rem">${a.emoji}</span>`;
  return av(a.name);
}
function searchCatalog(q, cat) {
  const query = normName(q);
  const tokens = query.split(' ').filter(Boolean);
  let list = APP_CATALOG;
  if (cat) list = list.filter(a => a.cat === cat);
  if (!tokens.length) return list.slice();
  const scored = [];
  list.forEach(a => {
    const name = normName(a.name);
    const domain = String(a.domain || hostOf(a.url) || '').toLowerCase();
    const hay = name + ' ' + domain + ' ' + normName(a.cat);
    if (!tokens.every(t => hay.includes(t))) return;
    let score = 0;
    if (name === query) score += 100;
    else if (name.startsWith(query)) score += 60;
    else if (domain.startsWith(query) || domain.includes(query)) score += 40;
    else score += 10;
    scored.push([score, a]);
  });
  scored.sort((x, y) => y[0] - x[0] || x[1].name.localeCompare(y[1].name));
  return scored.map(x => x[1]);
}
function renderQuickSync() {
  if (!catalogReady) {
    if (!catalogP && !catalogError) ensureCatalog().then(() => { if ((location.hash || '') === '#/addnew/sync') render(); }).catch(() => { if ((location.hash || '') === '#/addnew/sync') render(); });
    const body = catalogError ? `<p class="empty">${esc(catalogError)}</p><button class="btn primary full" data-act="syncRetry">${esc(t("Try again"))}</button>` : "<p class=\"empty\">" + esc(t("Loading popular apps…")) + "</p>";
    return screen({ title: t("Quick sync"), back: '#/addnew', body });
  }
  adoptCatalog();
  if (!syncPick) syncPick = new Set(APP_CATALOG.filter(catalogInHub).map(a => a.id));
  const cats = CAT_ORDER.filter(c => APP_CATALOG.some(a => a.cat === c));
  const match = searchCatalog(syncQ, syncCat);
  const mine = !syncQ && !syncCat ? APP_CATALOG.filter(catalogInHub).sort((a, b) => a.name.localeCompare(b.name)) : match.filter(catalogInHub);
  const rest = match.filter(a => !catalogInHub(a));
  const limit = syncQ || syncCat ? 80 : 0;
  const shown = limit ? rest.slice(0, limit) : [];
  const row = a => {
    const on = syncPick.has(a.id);
    const domain = a.domain || hostOf(a.url);
    return `<button class="li" data-act="syncTick" data-id="${a.id}" aria-pressed="${on}">${on ? ic('check') : ic('plus')}${catalogIcon(a)}<span class="grow"><b>${esc(a.name)}</b><span>${esc(a.cat)}${domain ? ' · ' + esc(domain) : ''}${catalogInHub(a) ? t(" · already in LifeHub") : ''}</span></span>${a.cal ? "<span class=\"tag amber\">" + esc(t("Demo")) + "</span>" : ''}</button>`;
  };
  const chips = `<div class="chips" role="tablist">${['', ...cats].map(c => `<button type="button" class="btn sm ${syncCat === c ? 'primary' : ''}" data-act="syncCat" data-c="${esc(c)}">${c ? esc(c) : 'All'}</button>`).join('')}</div>`;
  let groups = '';
  if (!syncQ && !syncCat) groups = "<p class=\"empty\">" + esc(t("Search by name or website, or pick a category. This is a popular list, not a scan of your device.")) + "</p>";
  else if (!shown.length && !mine.length) groups = "<p class=\"empty\">" + esc(t("No matches. Try a shorter name or the website.")) + "</p>";
  else {
    const blocks = [];
    if (!syncQ) {
      const ordered = syncCat ? [syncCat] : cats;
      ordered.forEach(cat => {
        const rows = rest.filter(a => a.cat === cat).slice(0, 80);
        if (rows.length) blocks.push(`<div class="sec-h"><h2>${esc(cat)}</h2></div><div class="list">${rows.map(row).join('')}</div>`);
      });
    } else blocks.push(`<div class="sec-h"><h2>${shown.length} match${shown.length === 1 ? '' : 'es'}${match.length > shown.length ? ' · showing ' + shown.length : ''}</h2></div><div class="list">${shown.map(row).join('')}</div>`);
    groups = blocks.join('');
  }
  const body = `<div class="notice blue">${ic('shield', 18)}<div><b>${esc(t("Apps you might use."))}</b> A website cannot see the apps installed on your phone or computer. This is a popular list of ${APP_CATALOG.length} ${esc(t("apps, not a scan of your device. Tick several, then connect them in one step."))}</div></div>
    <p id="syncRelated" class="small muted">${esc(syncRelated)}</p>
    <div class="searchbox">${ic('search', 20)}<input class="input" id="syncQ" type="search" placeholder="Search name or website" value="${esc(syncQ)}" aria-label="Search popular apps"></div>
    ${chips}
    ${mine.length ? `<div class="sec-h"><h2>Already in LifeHub</h2></div><div class="list">${mine.map(row).join('')}</div>` : ''}
    ${groups}
    <p class="small">${esc(t("Calendar apps are marked"))} <span class="tag amber">${esc(t("Demo"))}</span>. Connecting one adds a sample event on this device. Nothing is read from Google, Outlook or Apple.</p>
    <button class="btn primary full" data-act="syncGo">${esc(t("Connect"))} ${syncPick.size} app${syncPick.size === 1 ? '' : 's'}</button>
    <button class="btn ghost full" data-act="addOne" style="margin-top:8px">${esc(t("Add one link instead"))}</button>`;
  return { html: screen({ title: t("Quick sync"), back: '#/addnew', body }), after: () => {
    const i = $('#syncQ'); if (!i) return;
    i.oninput = () => { syncQ = i.value; const p = i.selectionStart; render(); const j = $('#syncQ'); if (j) { j.focus(); j.setSelectionRange(p, p); } };
  } };
}
function syncTick(id) {
  if (!syncPick) syncPick = new Set();
  if (syncPick.has(id)) syncPick.delete(id); else syncPick.add(id);
  render();
}
function connectSync() {
  adoptCatalog();
  if (!syncPick) syncPick = new Set();
  let added = 0, removed = 0, calendars = 0;
  APP_CATALOG.forEach(spec => {
    const on = syncPick.has(spec.id);
    const existing = S.apps.find(a => a.catalogId === spec.id || a.url === spec.url);
    if (on && !existing) {
      let g = S.groups.find(x => x.name === spec.cat);
      if (!g) { g = { id: uid(), name: spec.cat, emoji: CAT_EMOJI[spec.cat] || '📁', onHome: false }; S.groups.push(g); }
      S.apps.push({ id: uid(), catalogId: spec.id, name: spec.name, url: spec.url, emoji: spec.emoji || String(spec.name || '?').trim().charAt(0).toUpperCase() || '🔗', groupId: g.id, android: spec.android || '', ios: spec.ios || '', nextLabel: '', nextOn: '', nextStart: '', nextEnd: '' });
      added++;
    }
    if (!on && existing && existing.catalogId === spec.id) { S.apps = S.apps.filter(a => a !== existing); removed++; }
    if (on && spec.cal && linkCalendarSilent(spec.cal)) calendars++;
  });
  save(); announceConflicts();
  location.hash = '#/addnew';
  const bits = [];
  if (added) bits.push('Added ' + added);
  if (removed) bits.push('removed ' + removed);
  if (calendars) bits.push(calendars + t(" sample calendar event") + (calendars === 1 ? '' : 's'));
  toast(bits.length ? bits.join(', ') : t("Nothing changed"));
}

/* ---------- maps links ---------- */
function mapsUrl(kind, lat, lng) {
  const q = Number(lat).toFixed(6) + ',' + Number(lng).toFixed(6);
  if (kind === 'search') return 'https://www.google.com/maps/search/?api=1&query=' + q;
  if (kind === 'dir') return 'https://www.google.com/maps/dir/?api=1&destination=' + q + '&travelmode=driving';
  return 'https://www.google.com/maps/dir/?api=1&destination=' + q + '&travelmode=driving&dir_action=navigate';
}
function mapActions(lat, lng) {
  return `<div class="row gap wrap mapacts"><a class="btn sm" href="${mapsUrl('search', lat, lng)}" target="_blank" rel="noopener">${esc(t("Open"))}</a><a class="btn sm" href="${mapsUrl('dir', lat, lng)}" target="_blank" rel="noopener">${esc(t("Directions"))}</a><a class="btn sm primary" href="${mapsUrl('nav', lat, lng)}" target="_blank" rel="noopener">${esc(t("Start driving"))}</a><button type="button" class="btn sm" data-act="gmapsHere" data-lat="${lat}" data-lng="${lng}">${esc(t("View here"))}</button></div>`;
}
function gmapsHere(el) {
  const box = $('#gmapsFrame'); if (!box) return;
  const lat = el.dataset.lat, lng = el.dataset.lng;
  box.innerHTML = `<p class="small muted" style="margin:8px 0 0">${esc(t("Google's map. If it stays blank, use Open. No API key is used."))}</p><iframe class="gframe" title="Google Maps" src="https://maps.google.com/maps?q=${encodeURIComponent(lat + ',' + lng)}&z=14&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}
function fillMapsYou() {
  const box = $('#gmapsYou'); if (!box || !locMe) return;
  const me = locMe;
  box.innerHTML = `<b>${me.demo ? t("Sample position") : 'You'}</b> ${me.demo ? "<span class=\"tag amber\">" + esc(t("Demo")) + "</span>" : ''}<div class="small muted">${me.demo ? t("Launceston sample, because location was not available.") : me.lat.toFixed(5) + ', ' + me.lng.toFixed(5)}</div>${mapActions(me.lat, me.lng)}`;
}

/* ---------- installed-copy updates ---------- */
const APP_VERSION = '1.6.8';
let updateReady = false, updateReloading = false;
function safeToReload() {
  if (document.querySelector('.sheet-wrap')) return false;
  const ae = document.activeElement;
  if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return false;
  if (document.querySelector('#payAmt,#setF,#obF,#lockPw')) return false;
  const hash = location.hash || '';
  if (/^#\/call/.test(hash) || /^#\/addnew\/sync/.test(hash)) return false;
  if (Date.now() - lastAct < 1500) return false;
  return true;
}
function showUpdateBanner() {
  if (document.getElementById('updBanner')) return;
  const b = document.createElement('div');
  b.id = 'updBanner'; b.className = 'update-banner'; b.setAttribute('role', 'status');
  b.innerHTML = '<span>' + esc(t('upd.ready')) + '</span><button type="button" id="updNow">' + esc(t('upd.now')) + '</button>';
  document.body.appendChild(b);
  $('#updNow', b).onclick = () => { sessionStorage.setItem('lh.updated', '1'); location.reload(); };
}
function maybeApplyUpdate() {
  if (!updateReady || updateReloading || !safeToReload()) return;
  updateReloading = true;
  sessionStorage.setItem('lh.updated', '1');
  location.reload();
}
function noteUpdate() {
  updateReady = true;
  if (safeToReload()) maybeApplyUpdate(); else showUpdateBanner();
}
let updateWatchArmed = false;
function armUpdateWatch() {
  if (updateWatchArmed || !('serviceWorker' in navigator)) return;
  updateWatchArmed = true;
  let had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had) { had = true; return; }
    noteUpdate();
  });
  navigator.serviceWorker.addEventListener('message', ev => {
    if (!ev.data) return;
    if (ev.data.type === 'lh-shared') absorbInbox();
    if (ev.data.type === 'lh-add-app') absorbAddIntent();
    if (ev.data.type === 'lh-refresh') refreshAll(false, true);
    if (ev.data.type === 'lh-open' && ev.data.url) { try { const u = new URL(ev.data.url); if (u.hash) location.hash = u.hash; } catch (err) {} }
    if (ev.data.type === 'lh-update') noteUpdate();
  });
}
async function checkForUpdate(manual) {
  if (!('serviceWorker' in navigator)) { if (manual) toast(t('set.upToDate')); return; }
  let reg = null;
  try { reg = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }); } catch (e) {
    try { reg = await navigator.serviceWorker.getRegistration('./'); } catch (e2) {}
  }
  let remote = '';
  try {
    const res = await fetch('./version.json', { cache: 'no-store' });
    if (res.ok) { const data = await res.json(); remote = data && data.version || ''; }
  } catch (e) {}
  if (reg) {
    try { await reg.update(); } catch (e) {}
    if (reg.waiting && navigator.serviceWorker.controller) reg.waiting.postMessage({ type: 'skipWaiting' });
  }
  if ((remote && remote !== APP_VERSION) || (reg && reg.waiting)) {
    noteUpdate();
    return;
  }
  if (manual) toast(t('set.upToDate'));
}
armUpdateWatch();
function setupUpdates() {
  armUpdateWatch();
  checkForUpdate(false);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkForUpdate(false); absorbInbox(); absorbAddIntent(); maybeApplyUpdate(); } });
  window.addEventListener('focus', () => checkForUpdate(false));
  setInterval(() => checkForUpdate(false), 60 * 1000);
  setInterval(maybeApplyUpdate, 3000);
  if ('launchQueue' in window) {
    try { launchQueue.setConsumer(async params => { const files = []; for (const h of params.files || []) { try { files.push(await h.getFile()); } catch (e) {} } if (files.length) { await addDocFiles(files); if (!(location.hash || '').startsWith('#/doc')) location.hash = '#/documents'; } }); } catch (e) {}
  }
  if (sessionStorage.getItem('lh.updated')) { sessionStorage.removeItem('lh.updated'); setTimeout(() => { try { toast('Updated'); } catch (e) {} }, 400); }
}

/* ---------- router & prefs ---------- */
const ROUTES = [[/^\/home$/, renderHome], [/^\/search$/, renderSearch], [/^\/emergency$/, renderEmergency], [/^\/medical$/, renderMedical], [/^\/medical-id$/, renderMedicalID],
  [/^\/banking$/, renderBanking], [/^\/banking\/budget\/tools$/, renderBudgetTools], [/^\/banking\/budget\/debt$/, renderDebt], [/^\/banking\/budget\/cal$/, renderBudgetCal], [/^\/banking\/budget$/, renderBudget], [/^\/banking\/pay$/, renderPay], [/^\/banking\/link$/, renderLink], [/^\/chat$/, renderChats], [/^\/chat\/(\w+)$/, renderThread], [/^\/call\/(\w+)(?:\/(video))?$/, renderCall],
  [/^\/contacts$/, renderContacts], [/^\/contacts\/(\w+)$/, renderContact], [/^\/social$/, renderSocial], [/^\/utilities$/, renderUtilities], [/^\/documents$/, renderDocuments], [/^\/doc\/(\w+)$/, renderDoc], [/^\/addnew$/, renderAddNew], [/^\/addnew\/sync$/, renderQuickSync], [/^\/group\/(\w+)$/, renderGroup], [/^\/calendar$/, renderCalendar], [/^\/calendar\/work$/, renderWork], [/^\/location$/, renderLocation], [/^\/settings$/, renderSettings], [/^\/plan$/, renderPlan]];
const PUBLIC = ['/emergency', '/medical-id'];
let lastPath = '';
function applyPrefs() {
  const s = S?.settings || {}; const root = document.documentElement;
  root.classList.toggle('ts-large', s.textSize === 'large'); root.classList.toggle('ts-xl', s.textSize === 'xl');
  const dark = s.theme === 'dark' || (s.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  const prem = isPremium(); const skin = prem && SKINS[s.skin] ? s.skin : '';
  root.dataset.theme = dark || skin ? 'dark' : 'light'; if (skin) root.dataset.skin = skin; else delete root.dataset.skin;
  const acc = prem && ACCENTS[s.accent] ? ACCENTS[s.accent][1] : ''; if (acc) root.style.setProperty('--primary', root.dataset.theme === 'dark' ? `color-mix(in srgb, ${acc} 65%, white)` : acc); else root.style.removeProperty('--primary');
  root.classList.toggle('fast', prem); root.classList.toggle('icons-glass', prem && s.iconStyle === 'glass');
}
let deletePrompted = '';
function maybeDelete() {
  const h = location.hash;
  if (h !== '#/delete-all' && h !== '#/delete-profile') return;
  if (S && S.auth && S.auth.method && !unlocked) return;
  if (deletePrompted === h) return;
  deletePrompted = h;
  const fn = h === '#/delete-all' ? wipeAllData : deleteProfileData;
  setTimeout(async () => {
    try { await fn(); } finally {
      deletePrompted = '';
      if (location.hash === h) location.replace((S && S.auth && S.auth.method) ? '#/settings' : '#/');
    }
  }, 40);
}
function render() {
  if (cleanupFn) { try { cleanupFn(); } catch (e) {} cleanupFn = null; }
  if (lockUnbind) { lockUnbind(); lockUnbind = null; }
  const app = $('#app');
  if (recoveryGate) { app.innerHTML = renderRecovery(); afterRecovery(); return; }
  if (pinReset && unlocked && S) { app.innerHTML = renderNewPin(); afterNewPin(); return; }
  if (creating || !activeId) { app.innerHTML = renderOnboarding(); afterOnboarding(); return; }
  const path = (location.hash || '#/home').slice(1) || '/home';
  if (profileLocked() && !(S && PUBLIC.includes(path))) { app.innerHTML = renderLock(); afterLock(); lastPath = '/lock'; return; }
  if (!S) { app.innerHTML = renderOnboarding(); afterOnboarding(); return; }
  ensurePlan(); if (S && S.auth) ensureHub(); applyPrefs();
  maybeDelete();
  if (path !== '/banking/pay' && pay && pay.step !== 'tap') pay = null;
  for (const [re, fn] of ROUTES) { const m = path.match(re); if (m) { const out = (isPremium() && routeCache.get(path)) || fn(...m.slice(1)); if (isPremium() && PRELOAD.includes(path)) routeCache.delete(path); if (out === '') return; app.innerHTML = typeof out === 'string' ? out : out.html; if (out.after) out.after(); if (path !== lastPath) { window.scrollTo(0, 0); lastPath = path; } if (path === '/home') { mountAds(); preloadSections(); } if (unlocked) announceConflicts(); return; } }
  location.replace('#/home');
}

function profileLabel() { return (S && S.profile && S.profile.name) || (metaOf(activeId) || {}).name || 'LifeHub'; }
function recoveryMail(code) {
  const subject = encodeURIComponent(t('rec.mailSubject'));
  const body = encodeURIComponent(t('rec.mailBody', { name: profileLabel(), key: code }));
  return 'mailto:?subject=' + subject + '&body=' + body;
}
function renderRecovery() {
  const code = recoveryGate.code;
  return `<div class="onb" data-screen="recovery"><h1>${esc(t('rec.title'))}</h1><p class="lead">${esc(t('rec.lead'))}</p>
    <p class="reckey" id="recCode">${esc(code)}</p>
    <div class="recactions"><button class="btn full" id="recCopy">${esc(t('rec.copy'))}</button><button class="btn full" id="recDl">${esc(t('rec.download'))}</button><a class="btn full" id="recMail" href="${recoveryMail(code)}">${esc(t('rec.email'))}</a></div>
    <label class="fld chk"><input type="checkbox" id="recOk"><span>${esc(t('rec.saved'))}</span></label>
    <button class="btn primary full" id="recGo" disabled>${esc(t('rec.continue'))}</button></div>`;
}
function afterRecovery() {
  const code = recoveryGate.code;
  const ok = $('#recOk'), go = $('#recGo');
  if (ok) ok.onchange = () => { go.disabled = !ok.checked; };
  const copy = $('#recCopy'); if (copy) copy.onclick = async () => { try { await navigator.clipboard.writeText(code); toast(t('rec.copied')); } catch (e) { toast(code); } };
  const dl = $('#recDl'); if (dl) dl.onclick = () => download('lifehub-recovery-key.txt', t('rec.mailBody', { name: profileLabel(), key: code }));
  if (go) go.onclick = () => { if (!ok.checked) return; recoveryGate = null; render(); };
}
function renderNewPin() {
  return `<div class="onb" data-screen="newpin"><h1>${esc(t('rec.newPin'))}</h1><p class="lead">${esc(t('rec.newPinLead'))}</p>
    <form id="setF"><label class="fld"><span>${esc(t('PIN'))}</span><input name="a" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></label>
    <label class="fld"><span>${esc(t('Confirm PIN'))}</span><input name="b" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></label>
    <button class="btn primary full">${esc(t('prof.pinSave'))}</button></form>
    <p class="small muted">${esc(t('rec.bothLost'))}</p></div>`;
}
function afterNewPin() {
  const s = $('#setF'); if (!s) return;
  s.onsubmit = async e => { e.preventDefault(); const a = s.a.value, b = s.b.value;
    if (!/^\d{4,6}$/.test(a)) return toast(t('onb.pinRule')); if (a !== b) return toast(t('onb.pinMatch'));
    pinReset = false; recoveryGate = { code: await installPin(a, profileKey) }; render(); };
}
function openRecovery() {
  openSheet(`<h2>${esc(t('rec.forgot'))}</h2><p>${esc(t('rec.enterLead'))}</p>
    <label class="fld"><span>${esc(t('rec.enter'))}</span><input id="recIn" autocomplete="off" autocapitalize="characters"></label>
    <button class="btn primary full" id="recGo">${esc(t('rec.unlock'))}</button>
    <p class="small muted">${esc(t('rec.bothLost'))}</p>`, async el => {
    $('#recGo', el).onclick = async () => {
      const result = await tryRecovery($('#recIn', el).value);
      if (result === 'none') return toast(t('rec.none'));
      if (result !== 'ok') return toast(t('rec.bad'));
      closeSheet(true); render();
    };
  });
}
function askPinThen(onPin) {
  openSheet(`<h2>${esc(t('prof.enterPin'))}</h2>${keypadHTML()}<button class="btn full" data-close>${esc(t('Cancel'))}</button>`, el => {
    bindKeypad(el, async (v, fail) => { if (await tryPin(v)) { closeSheet(true); onPin(v); } else fail(); });
  });
}
function leaveDemo() {
  openSheet(`<h2>${esc(t('demo.leaveTitle'))}</h2><p>${esc(t('demo.leaveLead'))}</p>
    <label class="fld chk"><input type="checkbox" id="keepDemo"><span>${esc(t('demo.keepDemo'))}</span></label>
    <p class="small muted">${esc(t('demo.keepNote'))}</p>
    <button class="btn primary full" id="freshHere">${esc(t('demo.freshHere'))}</button>
    <button class="btn full" id="newProfile" style="margin-top:8px">${esc(t('demo.newProfile'))}</button>`, el => {
    const keep = () => !!el.querySelector('#keepDemo').checked;
    el.querySelector('#freshHere').onclick = () => {
      if (!keep()) stripDemoData(S); else S.sample = false;
      closeSheet(true); save(); render(); toast(t('demo.started'));
    };
    el.querySelector('#newProfile').onclick = () => {
      const data = JSON.parse(JSON.stringify(S));
      const keepDemo = keep();
      if (!keepDemo) stripDemoData(data); else data.sample = false;
      delete data.auth;
      pendingKeep = { keepDemo, data };
      closeSheet(true);
      wipeForNewProfile();
    };
  });
}
async function deleteProfileData() {
  const ok = await confirmSheet(t('set.deleteProfileAsk'), t('set.deleteProfileBody'), t('set.deleteProfile'), true);
  if (!ok) return;
  const id = activeId;
  await eraseProfile(id);
  creating = false; pay = null; work = null; pendingKeep = null;
  closeSheet(true);
  if (!activeId && location.hash && location.hash !== '#/' && location.hash !== '#') location.hash = '#/';
  else render();
}
async function clearMediaDb() {
  await new Promise(res => {
    try {
      const req = indexedDB.deleteDatabase('lifehub-media');
      req.onsuccess = req.onerror = req.onblocked = () => res();
    } catch (e) { res(); }
  });
}
function wipeForNewProfile() {
  closeSheet(true);
  ob = { step: 0, name: '', region: ob.region || 'AU', currency: ob.currency || 'AUD', locale: ob.locale || 'en-AU', method: 'pin', sample: false, color: COLORS[0], adding: true };
  creating = true;
  render();
}
async function wipeAllData() {
  const ok = await confirmSheet(t('set.deleteDeviceAsk'), t('set.deleteDeviceBody'), t('set.deleteDevice'), true);
  if (!ok) return;
  try { localStorage.clear(); } catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
  try {
    if (typeof caches !== 'undefined' && caches.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) {}
  await new Promise(res => {
    const finish = names => {
      const left = names.slice();
      const next = () => {
        const name = left.shift();
        if (!name) return res();
        try {
          const req = indexedDB.deleteDatabase(name);
          req.onsuccess = req.onerror = req.onblocked = () => next();
        } catch (e) { next(); }
      };
      next();
    };
    if (indexedDB.databases) indexedDB.databases().then(list => finish([...new Set(['lifehub-media'].concat((list || []).map(d => d.name).filter(Boolean)))])).catch(() => finish(['lifehub-media']));
    else finish(['lifehub-media']);
  });
  S = null; unlocked = false; pay = null; work = null;
  ob = { step: 0, name: '', region: 'AU', currency: 'AUD', locale: 'en-AU', method: 'pin', sample: false };
  pendingKeep = null;
  closeSheet(true);
  if ((location.hash || '') && location.hash !== '#' && location.hash !== '#/') location.hash = '';
  else render();
}

/* ---------- actions ---------- */
const A = {
  obNext: () => { ob.step++; render(); }, obBack: () => { if (ob.step <= 0 && creating) { creating = false; render(); return; } ob.step = Math.max(0, ob.step - 1); render(); },
  obColor: el => { ob.color = el.dataset.c || ob.color; render(); },
  obSkipPin: () => finishOnboarding(''),
  profiles: () => openProfiles(),
  checkUpdates: () => checkForUpdate(true),
  useRecovery: () => openRecovery(),
  newRecovery: () => askPinThen(async pin => { recoveryGate = { code: await installPin(pin, (metaOf(activeId) || {}).lock && (metaOf(activeId) || {}).lock.pinWrap ? profileKey : null) }; render(); }),
  obDemo: () => { ob.sample = true; if (!ob.name) ob.name = demoPersona().full; ob.step = 1; render(); },
  obScratch: () => { ob.sample = false; ob.name = ''; ob.step = 1; render(); },
  leaveDemo: () => leaveDemo(),
  deleteProfile: () => deleteProfileData(),
  obMethod: el => { ob.method = el.dataset.m; render(); },
  obPasskey: async () => { let credId = null; if (passkeySupported()) { try { credId = await createPasskey(ob.name); } catch (e) { toast(t("Passkey not created: using simulated biometric")); } } finishOnboarding({ method: 'passkey', credId }); },
  obSSO: () => finishOnboarding({ method: ob.method }),
  lockAuth: async () => { if (await authorize(t("Unlock LifeHub"))) unlock(); },
  forgot: () => { if ((metaOf(activeId) || {}).lock) { confirmSheet(t('prof.forgot'), t('prof.forgotBody'), t('set.deleteProfile'), true).then(ok => { if (ok) eraseProfile(activeId).then(() => render()); }); return; } wipeAllData(); },
  wipeData: () => wipeAllData(),
  shareLoc: shareLocation,
  medAdd: el => editMedItem(el.dataset.k), medEdit: el => editMedItem(el.dataset.k, el.dataset.id), medBasics: editMedBasics,
  transfer, addAcct: () => addAccount(), acctMenu: el => acctMenu(el.dataset.id), importTx,
  payAuth, payTap: completePay, payCancel: () => { pay.step = 'setup'; render(); }, payDone: () => { pay = null; },
  linkBank: el => linkBank(el.dataset.b),
  newChat, endCall: () => history.length > 1 ? history.back() : (location.hash = '#/chat'),
  tgl: el => { el.classList.toggle('on'); if (el.dataset.k === 'mute') el.innerHTML = ic(el.classList.contains('on') ? 'micoff' : 'mic', 28); },
  addContact: () => editContact(), editContact: el => editContact(el.dataset.id), importContacts, pickContacts,
  msgContact: el => { const c = contactById(el.dataset.id); if (c.onLifeHub) openChatWith(c.id); else location.href = 'sms:' + c.phone.replace(/[^\d+]/g, ''); },
  toggleIce: el => { const c = contactById(el.dataset.id); c.ice = !c.ice; save(); render(); toast(c.ice ? t("Added to emergency contacts") : t("Removed from emergency contacts")); },
  toggleBlock: async el => { const c = contactById(el.dataset.id); if (!c.blocked && !(await confirmSheet(`${esc(t("Block"))} ${c.name}?`, t("They won't be able to message or call you in LifeHub. You can unblock at any time."), 'Block', true))) return; c.blocked = !c.blocked; save(); render(); toast(c.blocked ? t("Contact blocked") : t("Contact unblocked")); },
  reportContact: el => reportContact(el.dataset.id),
  addPlatform, platMenu: el => platMenu(el.dataset.id), camera: () => attachMedia(true), gallery: () => attachMedia(false), clearMedia: () => { const t = $('#postTxt').value; postMedia = null; render(); $('#postTxt').value = t; }, post: doPost,
  dismissNote: el => { S.notifications = S.notifications.filter(n => n.id !== el.dataset.id); save(); render(); }, clearNotes: () => { S.notifications = []; save(); render(); },
  addBill: () => editBill(), editBill: el => editBill(el.dataset.id), uploadBill, importBills, billSort: el => { billSort = el.dataset.s; render(); },
  payBill: el => { const b = S.bills.find(x => x.id === el.dataset.id); b.paid = true; save(); render(); toast(`${b.provider} ${esc(t("marked as paid"))}`); },
  addApp: el => { if (el.dataset.g) editApp(null, el.dataset.g); else openQuickSync(); }, addOne: () => editApp(), pasteLink: () => pasteLink(), quickSync: () => openQuickSync(),
  syncRetry: () => { catalogP = null; catalogError = ''; catalogReady = false; render(); },
  syncCat: el => { syncCat = el.dataset.c || ''; render(); },
  syncTick: el => syncTick(el.dataset.id), syncGo: () => connectSync(), addGroup: () => editGroup(), editGroup: el => editGroup(el.dataset.id),
  budMonth: el => { budgetMonth = shiftMonth(bMonth(), Number(el.dataset.d) || 0); render(); },
  budAdd: () => addBudgetEntry(), budSpend: el => budSpend(el.dataset.id), budGoal: el => editGoal(el.dataset.id), budBill: el => editBBill(el.dataset.id),
  budCat: el => editCategory(el.dataset.id), budNewCat: () => newCategory(), bud5030: () => apply5030(), budZero: () => applyZero(),
  budExport: () => exportBudget(), budImport: () => importBudget(), budDebt: el => editDebt(el.dataset.id),
  budStrategy: el => { if (!isPremium()) return premGo(); S.budget.strategy = el.dataset.v; save(); render(); }, premGo: () => premGo(),
  docAdd: async () => addDocFiles(await pickFiles(DOC_ACCEPT)), docFolder: el => { docFolder = el.dataset.id || ''; render(); }, docNewFolder: () => newFolder(),
  docDl: el => downloadDoc(el.dataset.id), docTags: el => editDocTags(el.dataset.id), docMove: el => moveDoc(el.dataset.id), docDel: el => deleteDoc(el.dataset.id),
  gmapsHere: el => gmapsHere(el),
  editProfile, editMoney, editLang, changeLogin, lockNow: lock,
  refreshNow: () => refreshAll(true),
  testNotify: () => testNotify(),
  hideAd: el => { sessionStorage.setItem('lh.adHidden', '1'); const a = el.closest('.adslot'); if (a) a.remove(); },
  upgrade, cancelSub, restore, resume: () => { S.plan.status = 'active'; localStorage.setItem(receiptKey(), JSON.stringify(S.plan)); save(); render(); toast(t("Subscription resumed")); },
  endNow: async () => { if (await confirmSheet(t("Switch to Free now?"), t("Testing helper: ends Premium immediately."), t("Switch to Free"), true)) { S.plan = { tier: 'free' }; localStorage.removeItem(receiptKey()); save(); scheduleRefresh(); render(); toast(t("Now on Free")); } },
  prem: el => { if (!isPremium()) { location.hash = '#/plan'; toast(t("That's a Premium perk")); return; } S.settings[el.dataset.k] = el.dataset.v; save(); render(); },
  setPref: el => { const k = el.dataset.k; S.settings[k] = k === 'lockMinutes' ? Number(el.dataset.v) : el.dataset.v; save(); render(); },
  mvBanner: el => { const i = +el.dataset.i, d = +el.dataset.d, b = S.settings.banners; [b[i], b[i + d]] = [b[i + d], b[i]]; save(); render(); },
  hideBanner: el => { const b = S.settings.banners[+el.dataset.i]; b.hidden = !b.hidden; save(); render(); },
  exportData: () => { const { auth, ...rest } = S; download(`lifehub-backup-${todayISO()}.json`, JSON.stringify(rest, null, 2)); toast(t("Backup downloaded")); },
  importData,
  loadSample: async () => { if (!(await confirmSheet(t("Load sample data?"), t("This replaces your current data with demo data."), 'Replace', true))) return; const auth = S.auth, settings = S.settings, cur = homeCurrency(), loc = homeLocale(); S = seed(S.profile.name, S.profile.region, true, { currency: cur, locale: loc }); S.auth = auth; S.settings = settings; ensureHub(); save(); render(); toast(t("Sample data loaded")); },
  addEvent: () => editManual(null), openEvent: el => openEvent(el.dataset.id),
  calView: el => { setCalView(el.dataset.v); render(); }, calNav, calDay: el => { calCursor = el.dataset.d; render(); },
  calType: el => { ensureHub(); const k = el.dataset.k; if (!KINDS[k]) return; S.cal.types[k] = !typeOn(k); save(); render(); },
  jumpClashes: () => { const n = document.getElementById('clashes'); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  setOverlap: el => { ensureHub(); S.cal.overlap = el.dataset.v; save(); render(); },
  hideAuto: el => { const e = S.events.find(x => x.id === el.dataset.id); if (e) { e.hidden = true; save(); render(); toast('Hidden'); } },
  showAuto: el => { const e = S.events.find(x => x.id === el.dataset.id); if (e) { e.hidden = false; save(); render(); } },
  convertAuto: el => convertAuto(el.dataset.id),
  ignorePair: el => ignorePair(el.dataset.a, el.dataset.b), unignorePair: el => unignorePair(el.dataset.a, el.dataset.b),
  editClash: el => openEvent(el.dataset.id),
  deleteEv: el => deleteEv(el.dataset.id), dismissNotice: el => { S.cal.notices = S.cal.notices.filter(n => n.id !== el.dataset.id); save(); render(); },
  askClashNotify: () => { askNotify(); toast(t("If you allow notifications, LifeHub will ping you about overlaps and reminders")); },
  importIcs, linkCal: el => linkExternal(el.dataset.name),
  addAppt: () => editAppt(), editAppt: el => editAppt(el.dataset.id),
  addSched: () => editSched(), editSched: el => editSched(el.dataset.id),
  workGo: el => { const w = workState(); w.mode = el.dataset.m; w.step = 'form'; render(); },
  workBack: () => { workState().step = 'menu'; render(); },
  workDay: el => workDay(Number(el.dataset.d)), workSave, workPreview: () => { readWorkFields(); render(); },
  copyWeek: copyLastWeek, newJob, pickJob: el => { workState().jobId = el.dataset.id; render(); }, importRoster,
  locMode: el => locMode(el.dataset.v), locTick: el => locTick(el.dataset.id), locRemove: el => locTick(el.dataset.id), locStart, locStop,
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return; invalidateCache();
  const fn = A[el.dataset.act]; if (!fn) return;
  if (el.tagName !== 'A' || el.dataset.act === 'payDone') { if (el.tagName !== 'A') e.preventDefault(); }
  fn(el, e);
});
document.addEventListener('contextmenu', e => { const a = e.target.closest('[data-app]'); if (a) { e.preventDefault(); editApp(a.dataset.app); } });
let pressT; document.addEventListener('touchstart', e => { const a = e.target.closest('[data-app]'); if (!a) return; pressT = setTimeout(() => { editApp(a.dataset.app); }, 550); }, { passive: true });
['touchend', 'touchmove'].forEach(ev => document.addEventListener(ev, () => clearTimeout(pressT), { passive: true }));
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]'); if (!el) return;
  invalidateCache();
  if (el.dataset.change === 'glass') { if (!isPremium()) { el.checked = false; location.hash = '#/plan'; toast(t("That's a Premium perk")); return; } S.settings.iconStyle = el.checked ? 'glass' : 'standard'; save(); render(); return; }
  if (el.dataset.change === 'setRegion') { S.profile.region = el.value; save(); render(); toast(t('emerg.regionToast', { name: regionLabel(el.value) })); }
  if (el.dataset.change === 'preferWifi') { S.settings.preferWifi = el.checked; save(); render(); toast(el.checked ? t("Wi‑Fi preferred, mobile data as backup") : t("Using any available network")); }
  if (el.dataset.change === 'notifyMessages') { setNotify('messages', el.checked); return; }
  if (el.dataset.change === 'notifyEmergency') { setNotify('emergency', el.checked); return; }
  if (el.dataset.change === 'safetyStrict') { ensureSafety(); S.safety.strict = el.checked; save(); render(); toast(el.checked ? t("Strict mode on. A caution is blocked.") : t("Strict mode off. You can still add a caution.")); }
  if (el.dataset.change === 'budCur') {
    ensureBudget();
    const prev = S.budget.currency;
    const next = el.value;
    if (prev !== next) {
      ['entries', 'bills', 'debts', 'goals'].forEach(k => (S.budget[k] || []).forEach(item => retagCurrency(item, prev, next)));
      S.budget.currency = next;
      toast(t("Budget currency updated. Amounts were not converted."));
    }
    save(); render();
  }
  if (el.dataset.change === 'budRoll') { if (!isPremium()) { el.checked = false; premGo(); return; } ensureBudget(); S.budget.rollover = !!el.checked; save(); render(); toast(el.checked ? t("Leftover budget rolls into next month") : t("Rollover is off")); }
  if (el.dataset.change === 'allDayOverlap') { ensureHub(); S.cal.allDayOverlap = !!el.checked; save(); render(); return; }
  if (el.dataset.change === 'ignorePair') { ensureHub(); const pair = el.dataset.pair; const list = S.cal.ignore; const i = list.indexOf(pair); if (el.checked && i < 0) list.push(pair); if (!el.checked && i >= 0) list.splice(i, 1); save(); render(); return; }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
window.addEventListener('hashchange', () => { closeSheet(true); render(); });
window.addEventListener('online', () => { render(); wakeRefresh(); }); window.addEventListener('offline', render); window.addEventListener('focus', () => wakeRefresh());
if (navigator.connection && navigator.connection.addEventListener) navigator.connection.addEventListener('change', () => { if (/^#\/chat/.test(location.hash)) render(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyPrefs);

/* idle lock */
['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(ev => addEventListener(ev, touchSession, { passive: true }));
setInterval(() => {
  if (unlocked && S && S.settings.lockMinutes > 0 && Date.now() - lastAct > S.settings.lockMinutes * 60000 && !/^#\/call/.test(location.hash)) lock();
  if (unlocked && S && S.loc && S.loc.on && S.loc.mode === '1h' && S.loc.until && Date.now() > S.loc.until) { S.loc.on = false; save(); toast(t("Location sharing has ended")); if ((location.hash || '') === '#/location') render(); }
  if (unlocked && S) checkEventReminders();
}, 10000);
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (unlocked && S && S.settings.lockMinutes > 0 && hiddenAt && Date.now() - hiddenAt > S.settings.lockMinutes * 60000) { lock(); return; }
  wakeRefresh();
});

function initialLang() {
  if (activeId) {
    try { const saved = localStorage.getItem(pkey('lang')); if (saved) return saved; } catch (e) {}
    if (S && S.profile && S.profile.lang) return S.profile.lang;
  }
  try { const saved = localStorage.getItem('lifehub.lang'); if (saved) return saved; } catch (e) {}
  return LH.matchLang(navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
}
async function boot() {
  try { await migrateLegacy(); registry = readReg() || { active: '', ids: [] }; } catch (e) { registry = readReg() || { active: '', ids: [] }; }
  const id = registry.active && (registry.ids || []).includes(registry.active) ? registry.active : ((registry.ids || [])[0] || '');
  if (id) { try { await hydrate(id); } catch (e) {} }
  let code = 'en';
  try { code = await LH.load(initialLang()); } catch (e) { try { code = await LH.load('en'); } catch (e2) {} }
  if (!activeId) { try { localStorage.setItem('lifehub.lang', code); } catch (e) {} }
  if (S && S.profile && !S.profile.lang) { S.profile.lang = code; save(); }
  setupUpdates();
  render();
  if (unlocked) {
    checkReminders(); absorbInbox(); absorbAddIntent(); openPendingDraft(); consumeBackgroundRefresh();
    if (notifyOn('messages') || notifyOn('emergency')) registerBackgroundRefresh().then(bg => { if (S && S.settings && S.settings.notify && bg && S.settings.notify.bg !== bg) { S.settings.notify.bg = bg; save(); } });
  }
}
boot();
document.addEventListener('input', invalidateCache, true);
scheduleRefresh();
window.LifeHub = { version: APP_VERSION, isPremium: () => isPremium(), showUpdateBanner, safeToReload, addDocFiles, matchAppLink, linkCheckContext, ensureCatalog, detectMoney, formatMoney, matchLang: LH.matchLang, t, push: { config: PUSH_CONFIG, enable: enableWebPush }, cal: { parseRoster, parseICS, rangesOverlap, onDay, weekStart } };
})();
