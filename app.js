/* LifeHub prototype. All data stays on this device (localStorage). */
'use strict';
(function () {
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
function fmtClock(hm) {
  if (!hm) return '';
  let [h, m] = hm.split(':').map(Number); if (Number.isNaN(h)) return hm;
  const ap = h >= 12 ? 'pm' : 'am'; h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m || 0).padStart(2, '0')}${ap}`;
}
function fmtDay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
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
const ic = (n, s = 22, w = 2) => `<svg class="ic" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

/* ---------- reference data ---------- */
const REGIONS = {
  AU: { name: 'Australia', flag: '🇦🇺', currency: 'AUD', locale: 'en-AU', primary: '000', services: [
    { name: 'Police, Fire, Ambulance', num: '000', desc: 'Life-threatening emergencies', urgent: true },
    { name: 'Emergency from a mobile', num: '112', desc: 'Works from any mobile network, even without credit' },
    { name: 'Text / TTY emergency', num: '106', desc: 'For people who are deaf or have a hearing or speech impairment' },
    { name: 'SES (storm, flood)', num: '132500', disp: '132 500', desc: 'State Emergency Service' },
    { name: 'Police Assistance Line', num: '131444', disp: '131 444', desc: 'Non-urgent police matters' },
    { name: 'Poisons Information', num: '131126', disp: '13 11 26', desc: '24/7 poisons advice' },
    { name: 'Lifeline', num: '131114', disp: '13 11 14', desc: '24/7 crisis support & suicide prevention' },
    { name: 'Healthdirect', num: '1800022222', disp: '1800 022 222', desc: '24/7 registered nurse advice' } ] },
  NZ: { name: 'New Zealand', flag: '🇳🇿', currency: 'NZD', locale: 'en-NZ', primary: '111', services: [
    { name: 'Police, Fire, Ambulance', num: '111', desc: 'Life-threatening emergencies', urgent: true },
    { name: 'Police non-emergency', num: '105', desc: 'Report things that have already happened' },
    { name: 'Healthline', num: '0800611116', disp: '0800 611 116', desc: '24/7 health advice' },
    { name: 'Need to talk?', num: '1737', desc: 'Free call or text, 24/7 counselling' },
    { name: 'Poisons Centre', num: '0800764766', disp: '0800 764 766', desc: '24/7 poisons advice' } ] },
  US: { name: 'United States', flag: '🇺🇸', currency: 'USD', locale: 'en-US', primary: '911', services: [
    { name: 'Police, Fire, EMS', num: '911', desc: 'Life-threatening emergencies', urgent: true },
    { name: '988 Suicide & Crisis Lifeline', num: '988', desc: 'Call or text, 24/7' },
    { name: 'Poison Control', num: '18002221222', disp: '1-800-222-1222', desc: '24/7 poison help' } ] },
  UK: { name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', locale: 'en-GB', primary: '999', services: [
    { name: 'Police, Fire, Ambulance, Coastguard', num: '999', desc: 'Life-threatening emergencies', urgent: true },
    { name: 'Emergency (EU standard)', num: '112', desc: 'Also connects to UK emergency services' },
    { name: 'NHS 111', num: '111', desc: 'Urgent medical help, not life-threatening' },
    { name: 'Police non-emergency', num: '101', desc: 'Non-urgent police matters' },
    { name: 'Samaritans', num: '116123', disp: '116 123', desc: '24/7 emotional support' } ] },
  EU: { name: 'European Union', flag: '🇪🇺', currency: 'EUR', locale: 'en-IE', primary: '112', services: [
    { name: 'Emergency services', num: '112', desc: 'Works across every EU country', urgent: true },
    { name: 'Medical on-call (where available)', num: '116117', disp: '116 117', desc: 'Non-emergency out-of-hours doctor' },
    { name: 'Emotional support (where available)', num: '116123', disp: '116 123', desc: 'Helpline for emotional support' },
    { name: 'Missing children', num: '116000', disp: '116 000', desc: 'Hotline for missing children' } ] },
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
  addnew: { title: 'Add New', icon: 'plus', color: '#475569', href: '#/addnew' },
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
const AU_BANKS = ['Bank of us', 'MyState Bank', 'Commonwealth Bank', 'Westpac', 'NAB', 'ANZ', 'Bendigo Bank', 'ING', 'Macquarie', 'Bank Australia', 'Suncorp', 'BOQ', 'Up', 'ubank', 'Heritage and People\'s Choice'];
const AV_COLORS = ['#2557d6', '#7c3aed', '#db2777', '#0f766e', '#d97706', '#0891b2', '#4f46e5', '#be123c'];
const METHODS = {
  pin: { label: 'PIN', desc: '4 to 6 digit code', icon: ic('grid') },
  password: { label: 'Password', desc: 'Letters, numbers and symbols', icon: ic('lock') },
  passkey: { label: 'Passkey or biometric', desc: 'Face, fingerprint or device screen lock', icon: ic('finger') },
  google: { label: 'Sign in with Google', desc: 'Demo only in this prototype', icon: '<b style="color:#4285f4">G</b>' },
  apple: { label: 'Sign in with Apple', desc: 'Demo only in this prototype', icon: ic('user') },
};

/* ---------- state ---------- */
let S = null;
try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
const save = () => { invalidateCache(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Storage full: export a backup'); } };
let unlocked = false;
try { const u = JSON.parse(sessionStorage.getItem('lh.session') || 'null'); if (u && S && Date.now() - u.t < (S.settings.lockMinutes || 60) * 60000) unlocked = true; } catch (e) {}
let lastAct = Date.now();
const touchSession = () => { lastAct = Date.now(); if (unlocked) sessionStorage.setItem('lh.session', JSON.stringify({ t: lastAct })); };

const region = () => REGIONS[S?.profile?.region] || REGIONS.AU;
const money = (n, cur) => new Intl.NumberFormat(region().locale, { style: 'currency', currency: cur || region().currency }).format(Number(n) || 0);
const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean).map(w => w[0].toUpperCase()).join('') || '?';
const avColor = s => AV_COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];
const av = (name, size) => `<span class="av" style="background:${avColor(name)}${size ? `;width:${size}px;height:${size}px` : ''}">${esc(initials(name))}</span>`;
const telHref = n => 'tel:' + String(n || '').replace(/[^\d+]/g, '');
const fmtTime = t => { const d = new Date(t); const now = new Date(); return d.toDateString() === now.toDateString() ? d.toLocaleTimeString(region().locale, { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(region().locale, { day: 'numeric', month: 'short' }); };
const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString(region().locale, { weekday: 'short', day: 'numeric', month: 'short' }) : '';
const daysUntil = s => Math.round((new Date(s + 'T00:00:00') - new Date(todayISO() + 'T00:00:00')) / 86400000);

function seed(name, regionCode, sample) {
  const st = {
    v: 1, created: Date.now(),
    profile: { name: name || 'Me', region: regionCode || 'AU', location: '' },
    auth: { method: null },
    settings: { theme: 'system', textSize: 'normal', lockMinutes: 5, preferWifi: true, banners: ['emergency', 'calendar', 'medical', 'banking', 'chat', 'contacts', 'social', 'utilities', 'documents', 'addnew'].map(id => ({ id, hidden: false })) },
    medical: { bloodType: '', organDonor: false, allergies: [], conditions: [], medications: [], appointments: [], family: [], doctor: { name: '', clinic: '', phone: '' }, medicare: { number: '', irn: '', expiry: '' }, notes: '', showOnLock: true },
    accounts: [], transactions: [], contacts: [], chats: [], platforms: [], notifications: [], posts: [], bills: [], apps: [], groups: [], reports: [], scheduled: [], events: [], jobs: [],
    cal: { dismissed: [], alerted: [], notices: [], skip: {}, linked: {}, fired: [] },
    loc: { on: false, mode: '', until: null, ids: [] },
  };
  if (!sample) return st;
  const c = (n, phone, extra = {}) => ({ id: uid(), name: n, phone, email: '', relation: '', ice: false, blocked: false, onLifeHub: true, notes: '', birthday: '', premium: false, ...extra });
  const thu = onWeekday(4), tue = onWeekday(2), fri = onWeekday(5), tomorrow = addDays(hobartToday(), 1);
  const sarah = c('Sarah Day', '0491 570 156', { relation: 'Partner', ice: true, email: 'sarah@example.com', premium: true, birthday: '1991-' + thu.slice(5) });
  const mum = c('Mum (Linda Day)', '0491 570 157', { relation: 'Mother', ice: true, birthday: '1964-03-12' });
  const jake = c('Jake Wilson', '0491 570 158', { relation: 'Friend', premium: true, birthday: '1990-06-15' });
  const emma = c('Emma Nguyen', '0491 570 159', { relation: 'Work' });
  const gp = c('Dr Anika Patel (GP)', '(03) 6000 0000', { relation: 'Doctor', onLifeHub: false });
  const tom = c('Tom Bennett', '0491 570 110', { relation: 'Neighbour', onLifeHub: false });
  st.contacts = [sarah, mum, jake, emma, gp, tom];
  st.medical = { bloodType: 'O+', organDonor: true,
    allergies: [{ id: uid(), name: 'Penicillin', severity: 'Severe', reaction: 'Hives, swelling' }, { id: uid(), name: 'Bee stings', severity: 'Moderate', reaction: 'Swelling' }],
    conditions: [{ id: uid(), name: 'Asthma (mild)', notes: 'Uses reliever when needed' }],
    medications: [{ id: uid(), name: 'Ventolin (salbutamol)', dose: '100mcg, 2 puffs as needed' }, { id: uid(), name: 'Vitamin D', dose: '1 tablet', time: '08:00' }],
    appointments: [{ id: uid(), title: 'GP checkup', start: tue + 'T10:30', end: tue + 'T11:15', place: 'Launceston Medical Centre (sample)', notes: 'Bring Medicare card' }],
    family: [{ id: uid(), condition: 'Type 2 diabetes', relative: 'Father', status: 'Likely inherited' }, { id: uid(), condition: 'High cholesterol', relative: 'Mother', status: 'Confirmed inherited' }],
    doctor: { name: 'Dr Anika Patel', clinic: 'Launceston Medical Centre (sample)', phone: '(03) 6000 0000' },
    medicare: { number: '2123 45670 1', irn: '1', expiry: '2029-06' }, notes: '', showOnLock: true };
  const a1 = { id: uid(), bank: 'Bank of us', name: 'Everyday', number: '807-009 •••• 4821', balance: 2341.56, type: 'transaction', color: 'linear-gradient(135deg,#0f766e,#115e59)' };
  const a2 = { id: uid(), bank: 'Bank of us', name: 'Savings', number: '807-009 •••• 9930', balance: 12480, type: 'savings', color: 'linear-gradient(135deg,#2557d6,#1e3a8a)' };
  const a3 = { id: uid(), bank: 'MyState Bank', name: 'Low Rate Visa', number: '•••• •••• •••• 5512', balance: -842.1, type: 'credit', color: 'linear-gradient(135deg,#334155,#0f172a)' };
  st.accounts = [a1, a2, a3];
  const t = (acc, days, desc, amount, cat) => ({ id: uid(), accountId: acc.id, date: dOff(-days), desc, amount, cat });
  st.transactions = [t(a1, 0, 'Banjo\'s Bakery Launceston', -8.9, 'Food'), t(a1, 1, 'Woolworths Launceston', -86.4, 'Groceries'), t(a1, 2, 'Salary', 2950, 'Income'),
    t(a3, 3, 'Ampol Kings Meadows', -72.15, 'Fuel'), t(a1, 4, 'Transfer to Savings', -500, 'Transfer'), t(a2, 4, 'Transfer from Everyday', 500, 'Transfer'), t(a1, 6, 'Aurora Energy', -212.3, 'Bills')];
  st.chats = [
    { id: uid(), contactId: sarah.id, unread: 2, messages: [{ id: uid(), me: false, text: 'Can you grab milk on the way home?', t: minsAgo(50) }, { id: uid(), me: true, text: 'Yep, anything else?', t: minsAgo(45) }, { id: uid(), me: false, text: 'Bread too please 🙂', t: minsAgo(12) }, { id: uid(), me: false, text: 'And the kids want pizza Friday', t: minsAgo(11) }] },
    { id: uid(), contactId: jake.id, unread: 1, messages: [{ id: uid(), me: false, text: 'Still on for the footy Saturday at UTAS Stadium?', t: minsAgo(180) }] },
    { id: uid(), contactId: mum.id, unread: 0, messages: [{ id: uid(), me: true, text: 'Call you tonight Mum', t: minsAgo(1500) }, { id: uid(), me: false, text: 'Lovely, talk then x', t: minsAgo(1490) }] },
  ];
  st.platforms = [{ id: uid(), key: 'facebook', handle: 'Chris Day', friendReq: 2, dms: 3 }, { id: uid(), key: 'instagram', handle: '@chrisday', friendReq: 0, dms: 5 }, { id: uid(), key: 'x', handle: '@chris_day', friendReq: 0, dms: 1 }, { id: uid(), key: 'linkedin', handle: 'Chris Day', friendReq: 1, dms: 0 }];
  st.notifications = [
    { id: uid(), key: 'facebook', text: 'Sarah Day tagged you in 3 photos from Cataract Gorge', t: minsAgo(25) },
    { id: uid(), key: 'instagram', text: 'Jake Wilson: "Mate, check your DMs about Saturday"', t: minsAgo(70) },
    { id: uid(), key: 'linkedin', text: 'Priya Shah wants to connect (1 new request)', t: minsAgo(240) },
    { id: uid(), key: 'facebook', text: 'Event reminder: Launceston Show is tomorrow', t: minsAgo(600), eventTitle: 'Launceston Show', eventStart: tomorrow + 'T10:00', eventEnd: tomorrow + 'T16:00' },
  ];
  const b = (provider, category, amount, due, type = 'owed', extra = {}) => ({ id: uid(), provider, category, amount, due, type, paid: false, reminder: true, remindDays: 3, ...extra });
  st.bills = [b('TasWater', 'Water', 182.75, dOff(-2)), b('Aurora Energy', 'Electricity', 286.4, dOff(4)), b('Launtel NBN', 'Internet', 89, dOff(9)), b('Telstra', 'Mobile', 65, dOff(12)), b('City of Launceston', 'Council rates', 420.5, dOff(26)), b('RACT Insurance', 'Insurance', 35.2, '', 'credit', { reminder: false })];
  const g1 = { id: uid(), name: 'Shopping', emoji: '🛒', onHome: false };
  const g2 = { id: uid(), name: 'Family', emoji: '🏡', onHome: true };
  st.groups = [g1, g2];
  st.apps = [{ id: uid(), name: 'Woolworths', url: 'https://www.woolworths.com.au/', emoji: '🥦', groupId: g1.id }, { id: uid(), name: 'Coles', url: 'https://www.coles.com.au/', emoji: '🍎', groupId: g1.id }, { id: uid(), name: 'eBay', url: 'https://www.ebay.com.au/', emoji: '🏷️', groupId: g1.id },
    { id: uid(), name: 'School app', url: 'https://www.education.tas.gov.au/', emoji: '🎒', groupId: g2.id, nextOn: tomorrow, nextLabel: 'School pickup', nextStart: '15:00', nextEnd: '15:20' }, { id: uid(), name: 'Family calendar', url: 'https://calendar.google.com/', emoji: '📅', groupId: g2.id }, { id: uid(), name: 'Metro Tas', url: 'https://www.metrotas.com.au/', emoji: '🚌', groupId: '' }];
  st.scheduled = [{ id: uid(), name: 'Rent', amount: 450, every: 'fortnight', next: fri }];
  const job = { id: uid(), name: 'Day job', color: '#0f766e' };
  st.jobs = [job];
  const weekMon = mondayOf(hobartToday());
  for (let i = 0; i < 5; i++) {
    const d = addDays(weekMon, i);
    const sp = span(d, '09:00', '17:00');
    st.events.push({ id: uid(), title: 'Day job', start: sp.start, end: sp.end, allDay: false, source: 'shift', sourceLabel: 'Work', auto: false, hidden: false, color: job.color, jobId: job.id, loc: 'Launceston', notes: '', reminderMin: 60 });
  }
  return st;
}

/* ---------- helpers: toast, sheets, files ---------- */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
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
    openSheet(`<h2>${esc(title)}</h2><p class="muted">${msg}</p><div class="row gap"><button class="btn" id="cNo">Cancel</button><button class="btn ${danger ? 'redb' : 'primary'}" id="cOk">${esc(okLabel)}</button></div>`,
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
    <div class="row gap" style="margin-top:6px"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary" type="submit">${esc(cfg.submit || 'Save')}</button></div>
    ${cfg.danger ? `<button type="button" class="btn ghost danger full" id="sheetDanger" style="margin-top:8px">${ic('trash', 18)} ${esc(cfg.danger.label)}</button>` : ''}</form>`, el => {
    $('#sheetForm', el).onsubmit = async e => {
      e.preventDefault(); const f = e.target; const out = {};
      for (const fl of cfg.fields) { const inp = f.elements[fl.k]; out[fl.k] = fl.type === 'checkbox' ? inp.checked : fl.type === 'number' ? parseFloat(inp.value) : inp.value.trim(); if (fl.req && (out[fl.k] === '' || (fl.type === 'number' && isNaN(out[fl.k])))) { inp.focus(); toast(`${fl.label} is required`); return; } }
      const r = await cfg.onSave(out); if (r !== false) { closeSheet(true); save(); render(); }
    };
    if (cfg.danger) $('#sheetDanger', el).onclick = async () => { closeSheet(true); if (await confirmSheet(cfg.danger.label + '?', 'This cannot be undone.', cfg.danger.label, true)) { cfg.danger.fn(); save(); render(); } };
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
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const passkeySupported = () => !!(window.PublicKeyCredential && navigator.credentials && window.isSecureContext);
async function createPasskey(name) {
  const cred = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'LifeHub' }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: name || 'lifehub-user', displayName: name || 'LifeHub user' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { userVerification: 'required', residentKey: 'preferred' }, timeout: 60000 } });
  return b64(cred.rawId);
}
async function verifyPasskey() {
  if (!S.auth.credId || !passkeySupported()) return false;
  try { await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(S.auth.credId) }], userVerification: 'required', timeout: 60000 } }); return true; } catch (e) { return false; }
}
function keypadHTML(btn = 'Unlock') { return `<div class="pin-dots" id="pinDots">${'<i></i>'.repeat(S?.auth?.pinLen || 4)}</div><div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button type="button" class="key" data-k="${k}" aria-label="${k === '⌫' ? 'Delete' : k}">${k}</button>`).join('')}</div>`; }
function bindKeypad(root, onDone) {
  let v = ''; const len = S.auth.pinLen || 4; const dots = $('#pinDots', root);
  const upd = () => $$('i', dots).forEach((d, i) => d.classList.toggle('on', i < v.length));
  const fail = () => { v = ''; upd(); dots.classList.add('shake'); setTimeout(() => dots.classList.remove('shake'), 400); if (navigator.vibrate) navigator.vibrate(120); };
  const press = x => { if (x === '⌫') v = v.slice(0, -1); else if (v.length < len) v += x; upd(); if (v.length === len) { const val = v; setTimeout(() => onDone(val, fail), 120); } };
  root.addEventListener('click', e => { const k = e.target.closest('[data-k]'); if (k) press(k.dataset.k); });
  const kh = e => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫'); };
  document.addEventListener('keydown', kh); return () => document.removeEventListener('keydown', kh);
}
function authorize(reason) {
  return new Promise(res => {
    let done = false; let unbind = null;
    const fin = v => { if (done) return; done = true; if (unbind) unbind(); closeSheet(true); res(v); };
    const m = S.auth.method; const head = `<h2>Confirm it's you</h2><p class="muted">${esc(reason)}</p>`;
    if (m === 'pin') openSheet(head + keypadHTML() + '<button class="btn full" data-close>Cancel</button>', el => { unbind = bindKeypad(el, async (v, fail) => { if (await hash(v) === S.auth.pinHash) fin(true); else fail(); }); }, () => fin(false));
    else if (m === 'password') openSheet(head + `<form id="pwF"><label class="fld"><span>Password</span><input type="password" name="pw" autocomplete="current-password"></label><div class="row gap"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Confirm</button></div></form>`, el => { $('#pwF', el).onsubmit = async e => { e.preventDefault(); if (await hash(e.target.pw.value) === S.auth.pwHash) fin(true); else { toast('Incorrect password'); e.target.pw.select(); } }; }, () => fin(false));
    else if (m === 'passkey') openSheet(head + `<button class="bigbio" id="bio">${ic('finger', 56, 1.6)}<span>${S.auth.credId ? 'Use passkey / biometric' : 'Touch to verify (simulated)'}</span></button>${S.auth.credId ? '<button class="linkbtn" id="bioSim" style="width:100%">Device not available? Simulate (demo)</button>' : ''}<button class="btn full" data-close style="margin-top:8px">Cancel</button>`, el => {
      $('#bio', el).onclick = async () => { if (!S.auth.credId) return fin(true); if (await verifyPasskey()) fin(true); else toast('Passkey not verified'); };
      const sim = $('#bioSim', el); if (sim) sim.onclick = () => fin(true); }, () => fin(false));
    else openSheet(head + `<button class="btn primary full" id="ssoOk">Continue as ${esc(S.profile.name)} with ${m === 'apple' ? 'Apple' : 'Google'}</button><p class="small muted" style="margin-top:10px">Demo: a real build would re-authenticate with your ${m === 'apple' ? 'Apple ID (Face ID / Touch ID)' : 'Google account'}.</p><button class="btn full" data-close>Cancel</button>`, el => { $('#ssoOk', el).onclick = () => fin(true); }, () => fin(false));
  });
}
function unlock() { unlocked = true; touchSession(); checkReminders(); if (!location.hash || location.hash === '#/' || location.hash === '#/lock') location.hash = '#/home'; else render(); }
function lock() { invalidateCache(); unlocked = false; sessionStorage.removeItem('lh.session'); closeSheet(true); render(); }

/* ---------- layout ---------- */
function legalFooter() {
  return `<footer class="legalfoot"><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="support.html">Support</a><a href="delete-account.html">Delete data</a></footer>`;
}
function screen({ title, back = '#/home', body, right = '', cls = '', demo = '' }) {
  const line = demo ? `<p class="demoline"><span class="tag amber">Demo</span> ${demo}</p>` : '';
  return `<header class="topbar ${cls}">${back ? `<a class="iconbtn" href="${back}" aria-label="Back">${ic('back')}</a>` : '<span class="iconbtn-sp"></span>'}<h1>${esc(title)}</h1><div class="tb-right">${right || '<span class="iconbtn-sp"></span>'}</div></header><main class="content">${line}${body}</main>${legalFooter()}`;
}
const demoNote = txt => `<div class="notice">${ic('alert', 18)}<div>${txt}</div></div>`;

/* ---------- onboarding ---------- */
let ob = { step: 0, name: '', region: 'AU', method: 'pin', sample: true };
function renderOnboarding() {
  const dots = `<div class="onb-dots">${[0, 1, 2, 3].map(i => `<i class="${i <= ob.step ? 'on' : ''}"></i>`).join('')}</div>`;
  let body = '';
  if (ob.step === 0) body = `<div class="logo">${ic('cross', 40, 2.4)}</div><h1>LifeHub</h1><p class="lead">Everything you need, in one place.</p>
    <div class="feat"><div>${ic('alert')}Emergency numbers & Medical ID</div><div>${ic('bank')}Money, bills & payments</div><div>${ic('msg')}Chat, calls, contacts & social</div><div>${ic('shield')}Private: your data stays on this device</div></div>
    <div class="spacer"></div><button class="btn primary full" data-act="obNext">Get started</button>
    <a class="btn ghost full red" style="margin-top:8px" href="tel:000">${ic('phone', 18)} Need help now? Call 000</a>`;
  if (ob.step === 1) body = `<h1>About you</h1><p class="lead">This sets your emergency numbers and currency.</p>
    <form id="obF"><label class="fld"><span>Your name</span><input name="name" value="${esc(ob.name)}" placeholder="e.g. Chris Day" autocomplete="name" required></label>
    <label class="fld"><span>Region</span><select name="region">${Object.entries(REGIONS).map(([k, r]) => `<option value="${k}" ${k === ob.region ? 'selected' : ''}>${r.flag} ${r.name}</option>`).join('')}</select></label>
    <label class="fld chk"><input type="checkbox" name="sample" ${ob.sample ? 'checked' : ''}><span>Start with sample data so I can explore</span></label>
    <div class="spacer"></div><div class="row gap"><button type="button" class="btn" data-act="obBack">Back</button><button class="btn primary">Continue</button></div></form>`;
  if (ob.step === 2) body = `<h1>How do you want to sign in?</h1><p class="lead">Pick what's easiest for you. You can change it later.</p>
    ${Object.entries(METHODS).map(([k, m]) => `<button class="method ${ob.method === k ? 'on' : ''}" data-act="obMethod" data-m="${k}" aria-pressed="${ob.method === k}"><span class="mi">${m.icon}</span><span><b>${m.label}</b><span>${m.desc}</span></span></button>`).join('')}
    <div class="spacer"></div><div class="row gap"><button class="btn" data-act="obBack">Back</button><button class="btn primary" data-act="obNext">Continue</button></div>`;
  if (ob.step === 3) {
    const m = ob.method;
    if (m === 'pin') body = `<h1>Create a PIN</h1><p class="lead">4 to 6 digits. Avoid birthdays or 1234.</p><form id="setF"><label class="fld"><span>PIN</span><input name="a" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password"></label><label class="fld"><span>Confirm PIN</span><input name="b" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></label><div class="spacer"></div><div class="row gap"><button type="button" class="btn" data-act="obBack">Back</button><button class="btn primary">Finish</button></div></form>`;
    else if (m === 'password') body = `<h1>Create a password</h1><p class="lead">At least 8 characters.</p><form id="setF"><label class="fld"><span>Password</span><input name="a" type="password" autocomplete="new-password"></label><label class="fld"><span>Confirm password</span><input name="b" type="password" autocomplete="new-password"></label><div class="row gap"><button type="button" class="btn" data-act="obBack">Back</button><button class="btn primary">Finish</button></div></form>`;
    else if (m === 'passkey') body = `<h1>Set up a passkey</h1><p class="lead">Use your face, fingerprint or screen lock to open LifeHub.</p><button class="bigbio" data-act="obPasskey">${ic('finger', 64, 1.6)}<span>${passkeySupported() ? 'Create passkey on this device' : 'Passkeys not available here: use simulated biometric'}</span></button><div class="spacer"></div><button class="btn" data-act="obBack">Back</button>`;
    else body = `<h1>${METHODS[m].label}</h1><p class="lead">Demo: no real account is contacted. A live build would use ${m === 'google' ? 'Google Identity Services (OAuth 2.0 / OpenID Connect)' : 'Sign in with Apple (OpenID Connect)'}.</p><button class="btn primary full" data-act="obSSO">Continue with ${m === 'google' ? 'Google' : 'Apple'} (demo)</button><div class="spacer"></div><button class="btn" data-act="obBack">Back</button>`;
  }
  return `<div class="onb">${dots}${body}</div>`;
}
async function finishOnboarding(auth) {
  S = seed(ob.name, ob.region, ob.sample); S.auth = auth; save(); unlocked = true; touchSession(); ob.step = 0; location.hash = '#/home'; render(); toast(`Welcome, ${S.profile.name.split(' ')[0]}!`);
}
function afterOnboarding() {
  const f = $('#obF'); if (f) f.onsubmit = e => { e.preventDefault(); const n = f.name.value.trim(); if (!n) { toast('Please enter your name'); f.name.focus(); return; } ob.name = n; ob.region = f.region.value; ob.sample = f.sample.checked; ob.step = 2; render(); };
  const s = $('#setF'); if (s) s.onsubmit = async e => { e.preventDefault(); const a = s.a.value, b = s.b.value;
    if (ob.method === 'pin') { if (!/^\d{4,6}$/.test(a)) return toast('PIN must be 4 to 6 digits'); if (a !== b) return toast('PINs do not match'); finishOnboarding({ method: 'pin', pinHash: await hash(a), pinLen: a.length }); }
    else { if (a.length < 8) return toast('Use at least 8 characters'); if (a !== b) return toast('Passwords do not match'); finishOnboarding({ method: 'password', pwHash: await hash(a) }); } };
}

/* ---------- lock screen ---------- */
let lockUnbind = null;
function renderLock() {
  const m = S.auth.method, first = esc(S.profile.name.split(' ')[0]);
  const unlockUI = m === 'pin' ? keypadHTML() : m === 'password' ? `<form id="lockPw"><label class="fld"><span>Password</span><input type="password" name="pw" autocomplete="current-password"></label><button class="btn primary full">Unlock</button></form>`
    : `<button class="btn primary full" data-act="lockAuth">${m === 'passkey' ? ic('finger', 20) + ' Unlock with passkey' : `Continue with ${m === 'apple' ? 'Apple' : 'Google'}`}</button>`;
  return `<div class="lock"><div class="logo" style="width:64px;height:64px;border-radius:18px">${ic('lock', 30, 2.2)}</div><h1>Hi ${first}</h1><p class="lead">${m === 'pin' ? 'Enter your PIN' : 'LifeHub is locked'}</p>${unlockUI}<div class="spacer"></div>
    <div class="lock-emerg"><a class="btn redb" href="#/emergency">${ic('alert', 18)} Emergency</a><a class="btn" href="#/medical-id" style="color:var(--red)">${ic('cross', 18)} Medical ID</a></div>
    <button class="linkbtn" style="margin-top:10px" data-act="forgot">Forgot? Reset LifeHub</button></div>`;
}
function afterLock() {
  if (S.auth.method === 'pin') lockUnbind = bindKeypad($('.lock'), async (v, fail) => { if (await hash(v) === S.auth.pinHash) unlock(); else fail(); });
  const f = $('#lockPw'); if (f) f.onsubmit = async e => { e.preventDefault(); if (await hash(f.pw.value) === S.auth.pwHash) unlock(); else { toast('Incorrect password'); f.pw.select(); } };
}

/* ---------- home ---------- */
function bannerInfo(id) {
  const r = region();
  switch (id) {
    case 'emergency': return { sub: `Tap to call ${r.primary} · Medical ID` };
    case 'calendar': { const today = hobartToday(); const n = (S.events || []).filter(e => !e.hidden && onDay(e, today)).length; const c = activePairs().length; return { sub: c ? `${c} overlap${c === 1 ? '' : 's'} · ${n} today` : n ? `${n} today` : 'Events, shifts and reminders', badge: c }; }
    case 'medical': return { sub: S.medical.bloodType ? `Blood ${S.medical.bloodType} · ${S.medical.allergies.length} allergies` : 'Add allergies, conditions, blood type' };
    case 'banking': return { sub: S.accounts.length ? `${money(S.accounts.reduce((a, x) => a + x.balance, 0))} net · ${S.accounts.length} accounts` : 'Link a bank or add an account' };
    case 'chat': { const u = S.chats.reduce((a, c) => a + (c.unread || 0), 0); return { sub: u ? `${u} unread message${u > 1 ? 's' : ''}` : 'Private messages & calls', badge: u }; }
    case 'contacts': return { sub: `${S.contacts.filter(c => !c.blocked).length} contacts` };
    case 'social': { const n = S.platforms.reduce((a, p) => a + p.friendReq + p.dms, 0); return { sub: S.platforms.length ? `${S.platforms.length} platforms · ${n} new` : 'Add your social accounts', badge: n }; }
    case 'utilities': { const { owed, overdue } = billTotals(); return { sub: owed ? `<em class="owe">${money(owed)} owed</em>${overdue ? ` · ${overdue} overdue` : ''}` : 'All bills paid', badge: overdue, raw: true }; }
    case 'documents': { const n = (S.docs && S.docs.items || []).length; return { sub: n ? `${n} file${n === 1 ? '' : 's'} on this device` : 'PDFs, Office files, text and images' }; }
    case 'addnew': return { sub: `${S.apps.length} apps · ${S.groups.length} groups` };
  }
  return { sub: '' };
}
function renderHome() {
  const h = new Date().getHours(); const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const items = S.settings.banners.filter(b => !b.hidden && BANNERS[b.id]);
  const html = items.map(b => { const B = BANNERS[b.id]; const i = bannerInfo(b.id);
    return `<a class="banner ${b.id === 'emergency' ? 'emergency' : ''}" href="${B.href}"><span class="chip" style="${b.id === 'emergency' ? '' : `background:${B.color}`}">${ic(B.icon, b.id === 'emergency' ? 30 : 26, 2.2)}</span><span class="txt"><b>${B.title}</b><span>${i.raw ? i.sub : esc(i.sub)}</span></span>${i.badge ? `<span class="badge">${i.badge}</span>` : ''}<span class="chev">${ic('chev')}</span></a>`; }).join('');
  const groups = S.groups.filter(g => g.onHome).map(g => { const n = S.apps.filter(a => a.groupId === g.id).length; return `<a class="banner" href="#/group/${g.id}"><span class="chip" style="background:var(--card2);border:1px solid var(--line)">${esc(g.emoji || '📁')}</span><span class="txt"><b>${esc(g.name)}</b><span>${n} app${n === 1 ? '' : 's'}</span></span><span class="chev">${ic('chev')}</span></a>`; }).join('');
  return `<header class="home-head"><div class="hello"><small>${greet}</small><b>${esc(S.profile.name.split(' ')[0])}</b>${isPremium() ? ' ' + premBadge() : ''}</div><a class="iconbtn" href="#/search" aria-label="Search">${ic('search')}</a><a class="iconbtn" href="#/settings" aria-label="Settings">${ic('settings')}</a></header>
  <nav class="banners" data-screen="home" aria-label="Main sections">${html}${groups}</nav>
  <div class="dropzone home-drop" data-drop="home"><b>Drop an app, shortcut or link here</b><span>On this computer you can drop a browser link, a store link, or a shortcut file. LifeHub only reads what you drop.</span></div>
  ${AdSlot('home-bottom')}`;
}

/* ---------- search ---------- */
let searchQ = '';
function searchResults(q) {
  q = q.trim().toLowerCase(); if (!q) return '<p class="empty">Search contacts, events, bills, apps, chats, medical info and emergency numbers.</p>';
  const R = [];
  Object.entries(BANNERS).forEach(([id, b]) => { if (b.title.toLowerCase().includes(q)) R.push([b.href, ic(b.icon), b.title, 'Section']); });
  region().services.forEach(s => { if ((s.name + s.num + s.desc).toLowerCase().includes(q)) R.push([telHref(s.num), ic('phone'), s.name, s.disp || s.num]); });
  S.contacts.forEach(c => { if ((c.name + c.phone + c.email).toLowerCase().includes(q)) R.push(['#/contacts/' + c.id, ic('user'), c.name, c.phone]); });
  S.bills.forEach(b => { if ((b.provider + b.category).toLowerCase().includes(q)) R.push(['#/utilities', ic('zap'), b.provider, `${b.category} · ${money(b.amount)}`]); });
  S.apps.forEach(a => { if (a.name.toLowerCase().includes(q)) R.push([a.url, `<span style="font-size:1.3rem">${esc(a.emoji)}</span>`, a.name, 'App link']); });
  S.chats.forEach(c => { const ct = contactById(c.contactId); c.messages.forEach(m => { if (m.text.toLowerCase().includes(q)) R.push(['#/chat/' + c.id, ic('msg'), ct ? ct.name : 'Chat', m.text]); }); });
  ['allergies', 'conditions', 'medications'].forEach(k => S.medical[k].forEach(x => { if (x.name.toLowerCase().includes(q)) R.push(['#/medical', ic('cross'), x.name, k[0].toUpperCase() + k.slice(1)]); }));
  (S.medical.appointments || []).forEach(a => { if ((a.title + (a.place || '')).toLowerCase().includes(q)) R.push(['#/calendar', ic('cross'), a.title, 'Appointment']); });
  (S.events || []).forEach(e => { if (!e.hidden && (e.title + (e.loc || '') + (e.notes || '')).toLowerCase().includes(q)) R.push(['#/calendar', ic(SRC_ICON[e.source] || 'cal'), e.title, fmtWhen(e)]); });
  (S.docs && S.docs.items || []).forEach(d => { if ((d.name + ' ' + (d.tags || []).join(' ')).toLowerCase().includes(q)) R.push(['#/doc/' + d.id, ic('file'), d.name, 'Document']); });
  if (!R.length) return '<p class="empty">No results</p>';
  return `<div class="list">${R.slice(0, 40).map(([h, i, t, s]) => `<a class="li" href="${esc(h)}" ${/^https?:/.test(h) ? 'target="_blank" rel="noopener"' : ''}>${i}<span class="grow"><b>${esc(t)}</b><span>${esc(s)}</span></span></a>`).join('')}</div>`;
}
function renderSearch() {
  return { html: screen({ title: 'Search', body: `<div class="searchbox">${ic('search', 20)}<input class="input" id="sq" type="search" placeholder="Search everything" value="${esc(searchQ)}" aria-label="Search everything"></div><div id="sr">${searchResults(searchQ)}</div>` }),
    after: () => { const i = $('#sq'); i.focus(); i.oninput = () => { searchQ = i.value; $('#sr').innerHTML = searchResults(searchQ); }; } };
}

/* ---------- emergency ---------- */
function renderEmergency() {
  const r = region(); const ice = S.contacts.filter(c => c.ice && !c.blocked);
  const [main, ...rest] = r.services;
  const body = `
  <label class="fld" style="margin-bottom:12px"><span>Region</span><select data-change="setRegion" aria-label="Region">${Object.entries(REGIONS).map(([k, x]) => `<option value="${k}" ${k === S.profile.region ? 'selected' : ''}>${x.flag} ${x.name}</option>`).join('')}</select></label>
  <a class="sos" href="${telHref(main.num)}" aria-label="Call ${main.num} ${main.name}"><span class="grow"><span class="num">${main.num}</span><small>${esc(main.name)}<br>${esc(main.desc)}</small></span><span class="callbtn">${ic('phone', 30, 2.4)}</span></a>
  <div class="qgrid"><button class="qbtn" data-act="shareLoc">${ic('pin', 26)}Share my location<span>Send a maps link</span></button><a class="qbtn" href="#/medical-id">${ic('cross', 26)}Medical ID<span>Allergies, blood type, meds</span></a></div>
  <div id="locBox"></div>
  <div class="sec-h"><h2>Emergency contacts (ICE)</h2><a class="linkbtn" href="#/contacts">Manage</a></div>
  <div class="list">${ice.length ? ice.map(c => `<div class="li">${av(c.name)}<span class="grow"><b>${esc(c.name)}</b><span>${esc(c.relation || '')} · ${esc(c.phone)}</span></span><a class="callbtn sm" href="${telHref(c.phone)}" aria-label="Call ${esc(c.name)}">${ic('phone', 20)}</a></div>`).join('') : '<p class="empty">No emergency contacts yet. Open a contact and turn on "Emergency contact".</p>'}</div>
  <div class="sec-h"><h2>Other services · ${r.flag} ${r.name}</h2></div>
  <div class="list">${rest.map(s => `<div class="li"><span class="grow"><b>${esc(s.name)}</b><span>${esc(s.desc)}</span></span><span class="num-pill">${esc(s.disp || s.num)}</span><a class="callbtn sm" href="${telHref(s.num)}" aria-label="Call ${esc(s.name)}">${ic('phone', 20)}</a></div>`).join('')}</div>
  <p class="footnote">In a life-threatening emergency always call ${r.primary} directly. Numbers verified for ${r.name}; check local numbers when travelling.</p>`;
  return screen({ title: 'Emergency', back: unlocked ? '#/home' : '#/lock', body, cls: 'red' });
}
function shareLocation() {
  const box = $('#locBox'); if (!navigator.geolocation) { toast('Location not available on this device'); return; }
  box.innerHTML = `<div class="card">${ic('pin', 18)} Finding your location…</div>`;
  navigator.geolocation.getCurrentPosition(async p => {
    const { latitude: la, longitude: lo, accuracy } = p.coords; const url = `https://maps.google.com/?q=${la.toFixed(6)},${lo.toFixed(6)}`;
    const text = `I need help. My location (±${Math.round(accuracy)}m): ${url}`;
    box.innerHTML = `<div class="card"><h3>${ic('pin', 18)} Your location</h3><p class="small muted" style="margin:0 0 10px">${la.toFixed(5)}, ${lo.toFixed(5)} (±${Math.round(accuracy)} m)</p><div class="row gap wrap"><a class="btn sm" href="${url}" target="_blank" rel="noopener">Open map</a><button class="btn sm primary" id="shareNow">Share</button><a class="btn sm" href="sms:?&body=${encodeURIComponent(text)}">Text</a></div></div>`;
    $('#shareNow').onclick = async () => { if (navigator.share) { try { await navigator.share({ title: 'My location', text, url }); } catch (e) {} } else { try { await navigator.clipboard.writeText(text); toast('Location link copied'); } catch (e) { toast(url); } } };
  }, err => { box.innerHTML = `<div class="card small">${ic('alert', 18)} Couldn't get location (${esc(err.message || 'permission denied')}). Tell the operator your address or nearest landmark.</div>`; }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
}

/* ---------- medical ---------- */
const MED_SECTIONS = {
  allergies: { title: 'Allergies', fields: [{ k: 'name', label: 'Allergy', req: true, ph: 'e.g. Penicillin' }, { k: 'severity', label: 'Severity', type: 'select', options: ['Mild', 'Moderate', 'Severe', 'Anaphylaxis'] }, { k: 'reaction', label: 'Reaction', ph: 'e.g. hives' }], line: x => [x.name, `${x.severity || ''}${x.reaction ? ' · ' + x.reaction : ''}`], tag: x => /severe|anaph/i.test(x.severity) ? '<span class="tag red">' + esc(x.severity) + '</span>' : '' },
  conditions: { title: 'Medical conditions', fields: [{ k: 'name', label: 'Condition', req: true }, { k: 'notes', label: 'Notes' }], line: x => [x.name, x.notes] },
  medications: { title: 'Medications', fields: [{ k: 'name', label: 'Medication', req: true }, { k: 'dose', label: 'Dose & frequency' }, { k: 'time', label: 'Daily time (optional)', type: 'time' }], line: x => [x.name, [x.dose, x.time ? 'daily ' + fmtClock(x.time) : ''].filter(Boolean).join(' · ')] },
  family: { title: 'Family history', fields: [{ k: 'condition', label: 'Condition', req: true, ph: 'e.g. Heart disease' }, { k: 'relative', label: 'Relative', ph: 'e.g. Father' }, { k: 'status', label: 'Inheritance', type: 'select', options: ['Confirmed inherited', 'Likely inherited', 'Family history only'] }], line: x => [x.condition, x.relative], tag: x => `<span class="tag ${/Confirmed/.test(x.status) ? 'red' : /Likely/.test(x.status) ? 'amber' : ''}">${esc(x.status)}</span>` },
};
function medList(key) {
  const sec = MED_SECTIONS[key], arr = S.medical[key];
  return `<div class="sec-h"><h2>${sec.title}</h2><button class="btn sm" data-act="medAdd" data-k="${key}">${ic('plus', 16)} Add</button></div><div class="list">${arr.length ? arr.map(x => { const [a, b] = sec.line(x); return `<button class="li" data-act="medEdit" data-k="${key}" data-id="${x.id}"><span class="grow"><b>${esc(a)}</b>${b ? `<span>${esc(b)}</span>` : ''}</span>${sec.tag ? sec.tag(x) : ''}<span class="muted">${ic('edit', 18)}</span></button>`; }).join('') : `<p class="empty">None recorded</p>`}</div>`;
}
function renderMedical() {
  const m = S.medical;
  const body = `<div class="medhead"><button class="stat redbg" data-act="medBasics" style="text-align:left;border:0"><small>Blood type</small><b>${esc(m.bloodType || '—')}</b></button><button class="stat" data-act="medBasics" style="text-align:left"><small>Organ donor</small><b style="font-size:1.25rem">${m.organDonor ? '✅ Yes' : 'No'}</b></button></div>
  <a class="btn full" href="#/medical-id" style="margin-bottom:6px;color:var(--red)">${ic('cross', 18)} View Medical ID</a>
  ${medList('allergies')}${medList('conditions')}${apptSection()}${medList('medications')}${medList('family')}
  <div class="sec-h"><h2>Doctor & Medicare</h2><button class="btn sm" data-act="medBasics">${ic('edit', 16)} Edit</button></div>
  <div class="list"><div class="li">${ic('user')}<span class="grow"><b>${esc(m.doctor.name || 'No doctor added')}</b><span>${esc(m.doctor.clinic)}</span></span>${m.doctor.phone ? `<a class="callbtn sm" href="${telHref(m.doctor.phone)}" aria-label="Call doctor">${ic('phone', 20)}</a>` : ''}</div>
  <div class="li">${ic('card')}<span class="grow"><b>Medicare ${m.medicare.number ? esc(m.medicare.number) : 'not added'}</b><span>${m.medicare.number ? `IRN ${esc(m.medicare.irn)} · Exp ${esc(m.medicare.expiry)}` : 'Tap Edit to add'}</span></span></div></div>
  ${m.notes ? `<div class="card"><h3>Notes</h3>${esc(m.notes)}</div>` : ''}
  <p class="footnote">Medical details are stored only on this device. Keep them up to date; first responders may use your Medical ID.</p>`;
  return screen({ title: 'Medical', body });
}
function editMedBasics() {
  const m = S.medical;
  formSheet({ title: 'Medical details', values: { bloodType: m.bloodType, organDonor: m.organDonor, docName: m.doctor.name, docClinic: m.doctor.clinic, docPhone: m.doctor.phone, mc: m.medicare.number, irn: m.medicare.irn, exp: m.medicare.expiry, notes: m.notes, showOnLock: m.showOnLock },
    fields: [{ k: 'bloodType', label: 'Blood type', type: 'select', options: ['', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Unknown'] }, { k: 'organDonor', label: 'Registered organ donor', type: 'checkbox' },
      { k: 'docName', label: 'Doctor / GP' }, { k: 'docClinic', label: 'Clinic' }, { k: 'docPhone', label: 'Doctor phone', type: 'tel' },
      { k: 'mc', label: S.profile.region === 'AU' ? 'Medicare number' : 'Health insurance / ID number', im: 'numeric' }, { k: 'irn', label: 'IRN (position on card)', im: 'numeric' }, { k: 'exp', label: 'Card expiry', type: 'month' },
      { k: 'notes', label: 'Notes for first responders', type: 'textarea', ph: 'e.g. Wears contact lenses; pacemaker' }, { k: 'showOnLock', label: 'Show Medical ID on lock screen', type: 'checkbox' }],
    onSave: v => { Object.assign(m, { bloodType: v.bloodType, organDonor: v.organDonor, notes: v.notes, showOnLock: v.showOnLock }); m.doctor = { name: v.docName, clinic: v.docClinic, phone: v.docPhone }; m.medicare = { number: v.mc, irn: v.irn, expiry: v.exp }; } });
}
function editMedItem(key, id) {
  const sec = MED_SECTIONS[key]; const arr = S.medical[key]; const x = arr.find(i => i.id === id);
  formSheet({ title: (x ? 'Edit ' : 'Add ') + sec.title.toLowerCase().replace(/s$/, ''), fields: sec.fields, values: x || {},
    onSave: v => { if (x) Object.assign(x, v); else arr.push({ id: uid(), ...v }); }, danger: x ? { label: 'Delete', fn: () => S.medical[key] = arr.filter(i => i.id !== id) } : null });
}
function renderMedicalID() {
  const m = S.medical, locked = !unlocked;
  if (locked && !m.showOnLock) return screen({ title: 'Medical ID', back: '#/lock', cls: 'red', body: '<p class="empty">Medical ID is hidden on the lock screen. Unlock to view.</p>' });
  const ice = S.contacts.filter(c => c.ice && !c.blocked);
  const mc = m.medicare.number ? (locked ? '•••• ' + m.medicare.number.replace(/\s/g, '').slice(-4) : m.medicare.number) : '';
  const body = `<div class="mid-hero"><small>Medical ID</small><h2>${esc(S.profile.name)}</h2><div class="row"><div><small>Blood</small><b>${esc(m.bloodType || '—')}</b></div><div><small>Organ donor</small><b>${m.organDonor ? 'Yes' : 'No'}</b></div>${mc ? `<div><small>${S.profile.region === 'AU' ? 'Medicare' : 'Health ID'}</small><b style="font-size:1rem">${esc(mc)}</b></div>` : ''}</div></div>
  <div class="card"><h3 class="red">${ic('alert', 18)} Allergies</h3>${m.allergies.length ? m.allergies.map(a => `<div style="margin:4px 0"><b>${esc(a.name)}</b> <span class="tag ${/severe|anaph/i.test(a.severity) ? 'red' : ''}">${esc(a.severity)}</span><div class="small muted">${esc(a.reaction)}</div></div>`).join('') : '<span class="muted">None recorded</span>'}</div>
  <div class="card"><h3>Conditions</h3>${m.conditions.length ? m.conditions.map(a => `<div><b>${esc(a.name)}</b> <span class="small muted">${esc(a.notes)}</span></div>`).join('') : '<span class="muted">None recorded</span>'}</div>
  <div class="card"><h3>Medications</h3>${m.medications.length ? m.medications.map(a => `<div><b>${esc(a.name)}</b> <span class="small muted">${esc(a.dose)}</span></div>`).join('') : '<span class="muted">None recorded</span>'}</div>
  ${m.notes ? `<div class="card"><h3>Notes</h3>${esc(m.notes)}</div>` : ''}
  <div class="sec-h"><h2>Emergency contacts</h2></div><div class="list">${ice.length ? ice.map(c => `<div class="li">${av(c.name)}<span class="grow"><b>${esc(c.name)}</b><span>${esc(c.relation)}</span></span><a class="callbtn sm" href="${telHref(c.phone)}" aria-label="Call ${esc(c.name)}">${ic('phone', 20)}</a></div>`).join('') : '<p class="empty">None</p>'}
  ${m.doctor.name ? `<div class="li">${ic('cross')}<span class="grow"><b>${esc(m.doctor.name)}</b><span>Doctor</span></span>${m.doctor.phone ? `<a class="callbtn sm" href="${telHref(m.doctor.phone)}">${ic('phone', 20)}</a>` : ''}</div>` : ''}</div>
  ${unlocked ? '<a class="btn full" href="#/medical">' + ic('edit', 18) + ' Edit medical details</a>' : ''}`;
  return screen({ title: 'Medical ID', back: unlocked ? '#/medical' : '#/lock', cls: 'red', body });
}

/* ---------- banking ---------- */
const acctById = id => S.accounts.find(a => a.id === id);
function renderBanking() {
  const net = S.accounts.reduce((a, x) => a + x.balance, 0);
  const tx = [...S.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25);
  const body = `<div class="total"><span class="muted">Net balance</span><b>${money(net)}</b></div>
  <div class="bcards">${S.accounts.map(a => `<button class="bcard" style="background:${a.color}" data-act="acctMenu" data-id="${a.id}"><div class="row between"><small>${esc(a.bank)}</small><small>${esc(a.type)}</small></div><div><small>${esc(a.name)}</small><div class="bal">${money(a.balance)}</div><small>${esc(a.number)}</small></div></button>`).join('') || '<p class="empty">No accounts yet</p>'}</div>
  <div class="actions"><button class="act" data-act="transfer">${ic('swap', 26)}Transfer</button><a class="act" href="#/banking/pay">${ic('nfc', 26)}Tap to pay</a><a class="act" href="#/banking/link">${ic('link', 26)}Link a bank</a></div>
  <a class="card" href="#/banking/budget" style="display:flex;align-items:center;gap:12px"><span style="flex:1"><b>Budget planner</b><span class="small muted" style="display:block">Categories, goals and what you have left this month</span></span>${ic('chev')}</a>
  ${updatedLine()}<div class="sec-h"><h2>Recent transactions</h2><button class="btn sm" data-act="importTx">${ic('upload', 16)} Import CSV</button></div>
  <div class="list">${tx.length ? tx.map(t => { const a = acctById(t.accountId); return `<div class="li"><span class="av" style="background:var(--card2);color:var(--text);border:1px solid var(--line)">${t.amount > 0 ? '↓' : t.cat === 'App fee' ? '¢' : '↑'}</span><span class="grow"><b>${esc(t.desc)}</b><span>${fmtDate(t.date)} · ${esc(a ? a.name : 'Account')}${t.cat ? ' · ' + esc(t.cat) : ''}</span></span><span class="amt ${t.amount > 0 ? 'green' : ''}">${t.amount > 0 ? '+' : ''}${money(t.amount)}</span></div>`; }).join('') : '<p class="empty">No transactions</p>'}</div>
  ${schedSection()}
  <p class="footnote">To go live in Australia, bank linking would use the Consumer Data Right (Open Banking) via an accredited data recipient, and payments via the New Payments Platform (PayTo / Osko). Scheduled payments are a reminder on your calendar, not a real debit.</p>`;
  return screen({ title: 'Banking', demo: 'No real bank is connected. Balances, transfers and payments are simulated on this device.', body, right: `<button class="iconbtn" data-act="addAcct" aria-label="Add account">${ic('plus')}</button>` });
}
function addAccount(bank) {
  formSheet({ title: 'Add account manually', fields: [{ k: 'bank', label: 'Bank', req: true }, { k: 'name', label: 'Account name', req: true, ph: 'e.g. Everyday' }, { k: 'type', label: 'Type', type: 'select', options: ['transaction', 'savings', 'credit', 'loan'] }, { k: 'number', label: 'BSB / account (last 4 is enough)' }, { k: 'balance', label: 'Current balance', type: 'number', step: '0.01', req: true, im: 'decimal' }],
    values: { bank: bank || '' }, onSave: v => { S.accounts.push({ id: uid(), ...v, balance: v.type === 'credit' || v.type === 'loan' ? -Math.abs(v.balance) : v.balance, color: `linear-gradient(135deg,${avColor(v.bank + v.name)},#0f172a)` }); toast('Account added'); } });
}
function acctMenu(id) {
  const a = acctById(id); if (!a) return;
  formSheet({ title: `${a.bank} · ${a.name}`, intro: 'Edit or remove this account (demo).', fields: [{ k: 'name', label: 'Account name' }, { k: 'balance', label: 'Balance', type: 'number', step: '0.01' }], values: a,
    onSave: v => { a.name = v.name; if (!isNaN(v.balance)) a.balance = v.balance; }, danger: { label: 'Unlink account', fn: () => { S.accounts = S.accounts.filter(x => x.id !== id); S.transactions = S.transactions.filter(t => t.accountId !== id); } } });
}
function transfer() {
  if (S.accounts.length < 1) return toast('Add an account first');
  const opts = S.accounts.map(a => [a.id, `${a.name} (${money(a.balance)})`]);
  formSheet({ title: 'Transfer money', intro: '<span class="tag amber">Demo</span> No money moves. This transfer stays on this device.', submit: 'Review & authorise',
    fields: [{ k: 'from', label: 'From', type: 'select', options: opts }, { k: 'to', label: 'To', type: 'select', options: [...opts, ['payee', 'Someone else (payee / PayID)']] }, { k: 'payee', label: 'Payee name, BSB & account, or PayID', ph: 'Only if paying someone else' }, { k: 'amount', label: 'Amount', type: 'number', step: '0.01', min: 0, req: true, im: 'decimal' }, { k: 'desc', label: 'Description', ph: 'e.g. Rent' }],
    onSave: async v => {
      if (!(v.amount > 0)) { toast('Enter an amount'); return false; } if (v.from === v.to) { toast('Choose different accounts'); return false; } if (v.to === 'payee' && !v.payee) { toast('Enter payee details'); return false; }
      const from = acctById(v.from); const toA = v.to === 'payee' ? null : acctById(v.to);
      closeSheet(true); const ok = await authorize(`Transfer ${money(v.amount)} from ${from.name} to ${toA ? toA.name : v.payee}`); if (!ok) { toast('Transfer cancelled'); return false; }
      from.balance -= v.amount; S.transactions.push({ id: uid(), accountId: from.id, date: todayISO(), desc: `Transfer to ${toA ? toA.name : v.payee}${v.desc ? ' · ' + v.desc : ''}`, amount: -v.amount, cat: 'Transfer' });
      if (toA) { toA.balance += v.amount; S.transactions.push({ id: uid(), accountId: toA.id, date: todayISO(), desc: `Transfer from ${from.name}`, amount: v.amount, cat: 'Transfer' }); }
      toast(`Sent ${money(v.amount)} (demo)`);
    } });
}
async function importTx() {
  const f = await pickFile('.csv,text/csv'); if (!f) return; if (!S.accounts.length) return toast('Add an account first');
  const rows = parseCSV(await readText(f)); let n = 0;
  rows.forEach(r => { const amt = parseFloat(String(pick(r, 'amount', 'value', 'debit')).replace(/[^\d.-]/g, '')); if (isNaN(amt)) return; const dt = new Date(pick(r, 'date')); S.transactions.push({ id: uid(), accountId: S.accounts[0].id, date: isNaN(dt) ? todayISO() : dt.toISOString().slice(0, 10), desc: pick(r, 'desc', 'narrative', 'detail', 'payee') || 'Imported', amount: amt, cat: pick(r, 'cat') || 'Imported' }); n++; });
  save(); render(); toast(`Imported ${n} transactions into ${S.accounts[0].name}`);
}
let pay = null;
function renderPay() {
  const cards = S.accounts.filter(a => a.type !== 'savings' && a.type !== 'loan');
  if (!pay) pay = { step: 'setup', amount: 12.5, merchant: 'Demo Café, Launceston', accountId: (cards[0] || {}).id };
  const a = acctById(pay.accountId) || cards[0]; const fee = 0.01;
  let body;
  if (!a) body = `<p class="empty">Add a transaction or credit account to use Tap to pay.</p><a class="btn primary full" href="#/banking/link">Link a bank</a>`;
  else if (pay.step === 'setup') body = `<div class="paycard" style="background:${a.color}"><div class="row between"><b>${esc(a.bank)}</b>${ic('nfc', 30)}</div><div><small style="opacity:.85">${esc(a.name)} · ${esc(a.number)}</small><div style="font-size:1.4rem;font-weight:800;margin-top:4px">${money(a.balance)}</div></div></div>
    ${cards.length > 1 ? `<label class="fld"><span>Pay with</span><select id="payAcct">${cards.map(c => `<option value="${c.id}" ${c.id === a.id ? 'selected' : ''}>${esc(c.bank)} · ${esc(c.name)}</option>`).join('')}</select></label>` : ''}
    <label class="fld"><span>Amount (${region().currency})</span><input id="payAmt" class="amount-in" type="number" step="0.01" min="0.01" inputmode="decimal" value="${pay.amount.toFixed(2)}"></label>
    <div class="feebox"><div><span>Merchant</span><b>${esc(pay.merchant)}</b></div><div><span>Purchase</span><span id="fPur">${money(pay.amount)}</span></div><div><span>LifeHub app fee</span><span>${money(fee)}</span></div><div class="tot"><span>Total</span><span id="fTot">${money(pay.amount + fee)}</span></div></div>
    <button class="btn primary full" data-act="payAuth">${ic('lock', 18)} Authorise & pay</button>
    <p class="footnote">The ${money(fee)} line is part of the demo. No money is taken.</p>`;
  else if (pay.step === 'tap') body = `<div class="nfc">${ic('nfc', 80, 1.6)}</div><h2 style="text-align:center">Hold near the reader</h2><p class="muted" style="text-align:center">${money(pay.amount + fee)} to ${esc(pay.merchant)}</p><button class="btn primary full" data-act="payTap" style="margin-top:20px">Simulate tap</button><button class="btn ghost full" data-act="payCancel" style="margin-top:8px">Cancel</button>`;
  else body = `<div class="okc">${ic('check', 60, 3)}</div><h2 style="text-align:center">Payment approved</h2><p class="muted" style="text-align:center">${money(pay.amount)} + ${money(fee)} app fee<br>${esc(pay.merchant)} · ${esc(a.name)}</p><a class="btn primary full" href="#/banking" data-act="payDone">Done</a>`;
  return { html: screen({ title: 'Tap to pay', back: '#/banking', demo: 'No real payment is made. This does not use NFC or charge a card.', body }), after: () => {
    const amt = $('#payAmt'); if (amt) amt.oninput = () => { const v = parseFloat(amt.value) || 0; pay.amount = v; $('#fPur').textContent = money(v); $('#fTot').textContent = money(v + fee); };
    const sel = $('#payAcct'); if (sel) sel.onchange = () => { pay.accountId = sel.value; render(); };
    if (pay.step === 'tap') { const t = setTimeout(() => { if (pay && pay.step === 'tap') completePay(); }, 3500); cleanupFn = () => clearTimeout(t); }
  } };
}
async function payAuth() {
  if (!(pay.amount > 0)) return toast('Enter an amount');
  const ok = await authorize(`Pay ${money(pay.amount + 0.01)} to ${pay.merchant} (includes ${money(0.01)} app fee)`);
  if (!ok) return toast('Payment cancelled');
  pay.step = 'tap'; render();
}
function completePay() {
  const a = acctById(pay.accountId); if (!a) return;
  a.balance -= pay.amount + 0.01;
  S.transactions.push({ id: uid(), accountId: a.id, date: todayISO(), desc: pay.merchant + ' (tap to pay)', amount: -pay.amount, cat: 'Purchase' }, { id: uid(), accountId: a.id, date: todayISO(), desc: 'LifeHub app fee', amount: -0.01, cat: 'App fee' });
  save(); pay.step = 'done'; if (navigator.vibrate) navigator.vibrate([60, 40, 60]); render();
}
let linkQ = '';
function renderLink() {
  const list = AU_BANKS.filter(b => b.toLowerCase().includes(linkQ.toLowerCase()));
  const body = `<div class="notice blue">${ic('shield', 18)}<div>In Australia, banks share data securely under the <b>Consumer Data Right (Open Banking)</b>. You choose what to share and for how long, and you can stop at any time. This prototype simulates that flow.</div></div>
  <div class="searchbox">${ic('search', 20)}<input class="input" id="lq" type="search" placeholder="Find your bank" value="${esc(linkQ)}"></div>
  <div class="list" id="bankList">${list.map(b => `<button class="li" data-act="linkBank" data-b="${esc(b)}">${av(b)}<span class="grow"><b>${esc(b)}</b><span>Open Banking (CDR) · demo</span></span>${ic('chev')}</button>`).join('')}</div>
  <button class="btn full" data-act="addAcct">${ic('plus', 18)} Add an account manually</button>`;
  return { html: screen({ title: 'Link a bank', back: '#/banking', demo: 'This does not connect to a real bank. The sign-in step is simulated.', body }), after: () => { const i = $('#lq'); i.oninput = () => { linkQ = i.value; const p = i.selectionStart; render(); const j = $('#lq'); j.focus(); j.setSelectionRange(p, p); }; } };
}
function linkBank(b) {
  openSheet(`<h2>Connect ${esc(b)}</h2><p class="muted small">LifeHub is requesting access to:</p>
  <div class="list"><div class="li">${ic('card')}<span class="grow"><b>Account name, type & balance</b></span></div><div class="li">${ic('file')}<span class="grow"><b>Transaction details</b></span></div><div class="li">${ic('clock')}<span class="grow"><b>For 12 months</b><span>You can withdraw consent at any time</span></span></div></div>
  <p class="small muted">Next you'd be sent to ${esc(b)} to log in. LifeHub never sees your banking password.</p>
  <div class="row gap"><button class="btn" data-close>Cancel</button><button class="btn primary" id="lbOk">Connect (demo)</button></div>`, el => {
    $('#lbOk', el).onclick = () => { const bal = Math.round(Math.random() * 500000) / 100; S.accounts.push({ id: uid(), bank: b, name: 'Everyday', number: '•••• ' + String(Math.floor(1000 + Math.random() * 9000)), balance: bal, type: 'transaction', color: `linear-gradient(135deg,${avColor(b)},#0f172a)` }); save(); closeSheet(true); toast(`${b} linked (demo)`); location.hash = '#/banking'; };
  });
}

/* ---------- chat ---------- */
const contactById = id => S.contacts.find(c => c.id === id);
function netStatus() {
  const c = navigator.connection;
  if (!navigator.onLine) return { label: 'Offline: messages will send when connected', cls: 'bad', icon: 'off' };
  if (c && c.type) { if (c.type === 'wifi' || c.type === 'ethernet') return { label: 'Using Wi‑Fi', cls: '', icon: 'wifi' }; if (c.type === 'cellular') return { label: S.settings.preferWifi ? 'Wi‑Fi unavailable: using mobile data' : 'Using mobile data', cls: 'warn', icon: 'signal' }; }
  return { label: `Online${c && c.effectiveType ? ' · ' + c.effectiveType.toUpperCase() : ''} · Wi‑Fi preferred`, cls: '', icon: 'wifi' };
}
const netChip = () => { const n = netStatus(); return `<span class="netchip ${n.cls}">${ic(n.icon, 15, 2.4)} ${esc(n.label)}</span>`; };
function renderChats() {
  const threads = [...S.chats].filter(t => { const c = contactById(t.contactId); return c && !c.blocked; }).sort((a, b) => (b.messages.at(-1)?.t || 0) - (a.messages.at(-1)?.t || 0));
  const body = `<div class="row between" style="margin-bottom:6px">${netChip()}</div>${updatedLine()}
  <label class="card row between" style="padding:12px 14px"><span><b>Prefer Wi‑Fi</b><br><span class="small muted">Fall back to mobile data when Wi‑Fi isn't available</span></span><span class="switch"><input type="checkbox" data-change="preferWifi" ${S.settings.preferWifi ? 'checked' : ''}><i></i></span></label>
  <div class="list">${threads.length ? threads.map(t => { const c = contactById(t.contactId); const last = t.messages.at(-1); return `<a class="li" href="#/chat/${t.id}">${av(c.name)}<span class="grow"><b>${esc(c.name)}</b><span>${last ? (last.me ? 'You: ' : '') + esc(last.text) : 'No messages yet'}</span></span><span style="text-align:right"><span class="small muted">${last ? fmtTime(last.t) : ''}</span><br>${t.unread ? `<span class="badge">${t.unread}</span>` : ''}</span></a>`; }).join('') : '<p class="empty">No conversations yet</p>'}</div>
  <p class="footnote">A live version would use end-to-end encryption. This one does not contact a chat server.</p>`;
  return screen({ title: 'Chat', demo: 'Messages stay on this device. Replies and calls are simulated.', body, right: `<button class="iconbtn" data-act="newChat" aria-label="New chat">${ic('edit')}</button>` });
}
function openChatWith(cid) { let t = S.chats.find(x => x.contactId === cid); if (!t) { t = { id: uid(), contactId: cid, unread: 0, messages: [] }; S.chats.push(t); save(); } location.hash = '#/chat/' + t.id; }
function newChat() {
  const cs = S.contacts.filter(c => !c.blocked);
  openSheet(`<h2>New conversation</h2><div class="list">${cs.map(c => `<button class="li" data-cid="${c.id}">${av(c.name)}<span class="grow"><b>${esc(c.name)}</b><span>${c.onLifeHub ? 'On LifeHub' : 'Will invite by SMS'}</span></span></button>`).join('')}</div>`, el => { el.addEventListener('click', e => { const b = e.target.closest('[data-cid]'); if (b) { closeSheet(true); openChatWith(b.dataset.cid); } }); });
}
const REPLIES = ['Sounds good 👍', 'Haha yes!', 'On my way', 'Can I call you in 5?', 'Thanks!', 'No worries', 'Love it ❤️'];
function renderThread(id) {
  const t = S.chats.find(x => x.id === id); if (!t) { location.hash = '#/chat'; return ''; }
  const c = contactById(t.contactId); if (t.unread) { t.unread = 0; save(); }
  const html = `<div class="thread"><header class="topbar"><a class="iconbtn" href="#/chat" aria-label="Back">${ic('back')}</a>${av(c.name, 38)}<h1 style="font-size:1.1rem">${esc(c.name)}<br><span class="small muted" style="font-weight:500">${c.onLifeHub ? 'LifeHub · private chat' : 'SMS contact'}</span></h1><div class="tb-right"><a class="iconbtn" href="#/call/${c.id}" aria-label="Voice call">${ic('phone')}</a><a class="iconbtn" href="#/call/${c.id}/video" aria-label="Video call">${ic('video')}</a></div></header>
  <div class="msgs" id="msgs"><div style="align-self:center;margin:4px 0 8px">${netChip()}</div><p class="demoline" style="align-self:stretch"><span class="tag amber">Demo</span> Replies are simulated on this device.</p>${t.messages.map(m => `<div class="bub ${m.me ? 'me' : 'them'}">${esc(m.text)}<time>${fmtTime(m.t)}</time></div>`).join('')}</div>
  ${legalFooter()}
  <form class="composer" id="cmp"><input name="m" placeholder="Message" autocomplete="off" aria-label="Message"><button aria-label="Send">${ic('send', 20)}</button></form></div>`;
  return { html, after: () => {
    const ms = $('#msgs'); ms.scrollTop = ms.scrollHeight;
    $('#cmp').onsubmit = e => { e.preventDefault(); const v = e.target.m.value.trim(); if (!v) return;
      if (!c.onLifeHub) { location.href = `sms:${c.phone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(v)}`; }
      t.messages.push({ id: uid(), me: true, text: v, t: Date.now() }); save(); render(); $('#cmp input').focus();
      if (c.onLifeHub) setTimeout(() => { t.messages.push({ id: uid(), me: false, text: REPLIES[Math.floor(Math.random() * REPLIES.length)], t: Date.now() }); if (!location.hash.endsWith(t.id)) t.unread++; save(); if (location.hash.endsWith(t.id)) { const val = $('#cmp input')?.value; render(); const i = $('#cmp input'); if (i) { i.value = val || ''; i.focus(); } } }, 1600); };
  } };
}
let cleanupFn = null;
function renderCall(cid, video) {
  const c = contactById(cid); if (!c) { location.hash = '#/chat'; return ''; }
  const n = netStatus();
  const html = `<div class="call">${video ? '<video id="selfv" autoplay playsinline muted></video>' : ''}<div class="over">${av(c.name)}<h1>${esc(c.name)}</h1><p id="cst" style="opacity:.85">${video ? 'Video calling' : 'Calling'} over ${n.cls === 'warn' ? 'mobile data' : 'Wi‑Fi'}…</p><p class="demoline" style="color:#fff"><span class="tag amber">Demo</span> No audio or video is sent to the other person.</p>
  <div class="call-ctrls"><button data-act="tgl" aria-label="Mute">${ic('mic', 28)}</button><button class="end" data-act="endCall" aria-label="End call">${ic('phone', 30)}</button><button data-act="tgl" aria-label="Speaker">${ic('speaker', 28)}</button></div>
  <a class="btn" style="margin-top:18px;background:transparent;color:#fff;border-color:rgba(255,255,255,.3)" href="${telHref(c.phone)}">Call ${esc(c.phone)} by phone instead</a>${legalFooter()}</div></div>`;
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
  const row = c => `<div class="li"><a href="#/contacts/${c.id}" class="row gap grow" style="min-width:0">${av(c.name)}<span class="grow"><b>${esc(c.name)} ${c.ice ? '<span class="tag red">ICE</span>' : ''}</b><span>${esc(c.phone)}${c.relation ? ' · ' + esc(c.relation) : ''}</span></span></a>${c.blocked ? '<span class="tag">Blocked</span>' : `<a class="callbtn sm" href="${telHref(c.phone)}" aria-label="Call ${esc(c.name)}">${ic('phone', 20)}</a>`}</div>`;
  return `<div class="list">${act.length ? act.map(row).join('') : '<p class="empty">No contacts found</p>'}</div>${bl.length ? `<div class="sec-h"><h2>Blocked</h2></div><div class="list">${bl.map(row).join('')}</div>` : ''}`;
}
function renderContacts() {
  const body = `<div class="searchbox">${ic('search', 20)}<input class="input" id="cq" type="search" placeholder="Search ${S.contacts.length} contacts" value="${esc(contactQ)}"></div>
  <div class="row gap" style="margin-bottom:12px"><button class="btn sm" data-act="importContacts">${ic('upload', 16)} Import</button>${'contacts' in navigator && 'ContactsManager' in window ? `<button class="btn sm" data-act="pickContacts">${ic('users', 16)} From phone</button>` : ''}<button class="btn sm primary" data-act="addContact">${ic('plus', 16)} Add</button></div>
  <div id="clist">${contactRows(contactQ)}</div><p class="footnote">Import a vCard (.vcf) or CSV exported from Google Contacts, iCloud or Outlook.</p>`;
  return { html: screen({ title: 'Contacts', body }), after: () => { const i = $('#cq'); i.oninput = () => { contactQ = i.value; $('#clist').innerHTML = contactRows(contactQ); }; } };
}
const CONTACT_FIELDS = [{ k: 'name', label: 'Name', req: true }, { k: 'phone', label: 'Phone', type: 'tel', im: 'tel' }, { k: 'email', label: 'Email', type: 'email' }, { k: 'relation', label: 'Relationship', ph: 'e.g. Partner, Friend' }, { k: 'birthday', label: 'Birthday', type: 'date' }, { k: 'notes', label: 'Notes', type: 'textarea' }, { k: 'ice', label: 'Emergency contact (ICE)', type: 'checkbox' }, { k: 'onLifeHub', label: 'Uses LifeHub (in-app chat & calls)', type: 'checkbox' }, { k: 'premium', label: 'LifeHub Premium (demo). Only Premium contacts can be picked for location sharing', type: 'checkbox' }];
function editContact(id) {
  const c = id && contactById(id);
  formSheet({ title: c ? 'Edit contact' : 'New contact', fields: CONTACT_FIELDS, values: c || { onLifeHub: false }, onSave: v => { if (c) Object.assign(c, v); else S.contacts.push({ id: uid(), blocked: false, ...v }); toast('Saved'); },
    danger: c ? { label: 'Delete contact', fn: () => { S.contacts = S.contacts.filter(x => x.id !== id); S.chats = S.chats.filter(t => t.contactId !== id); if (S.loc) { S.loc.ids = (S.loc.ids || []).filter(x => x !== id); if (!S.loc.ids.length) S.loc.on = false; } location.hash = '#/contacts'; } } : null });
}
function renderContact(id) {
  const c = contactById(id); if (!c) { location.hash = '#/contacts'; return ''; }
  const body = `<div style="text-align:center;margin:8px 0 16px"><span class="av" style="margin:0 auto;font-size:2rem;width:96px;height:96px;background:${avColor(c.name)}">${esc(initials(c.name))}</span><h2 style="margin-top:10px;font-size:1.5rem">${esc(c.name)}${c.premium ? ' ' + premBadge('Premium') : ''}</h2><p class="muted" style="margin:4px 0">${esc(c.relation || '')}${c.ice ? ' <span class="tag red">Emergency contact</span>' : ''}${c.blocked ? ' <span class="tag">Blocked</span>' : ''}</p></div>
  ${c.blocked ? '' : `<div class="actions"><a class="act" href="${telHref(c.phone)}">${ic('phone', 26)}Call</a><button class="act" data-act="msgContact" data-id="${c.id}">${ic('msg', 26)}Message</button>${c.onLifeHub ? `<a class="act" href="#/call/${c.id}/video">${ic('video', 26)}Video</a>` : `<a class="act" href="sms:${esc(c.phone.replace(/[^\d+]/g, ''))}">${ic('msg', 26)}SMS</a>`}</div>`}
  <div class="list"><div class="li">${ic('phone')}<span class="grow"><b>${esc(c.phone || '—')}</b><span>Phone</span></span></div>${c.email ? `<a class="li" href="mailto:${esc(c.email)}">${ic('msg')}<span class="grow"><b>${esc(c.email)}</b><span>Email</span></span></a>` : ''}${c.birthday ? `<div class="li">${ic('star')}<span class="grow"><b>${esc(fmtDay(nextBday(c.birthday)))}</b><span>Birthday</span></span></div>` : ''}${c.notes ? `<div class="li">${ic('file')}<span class="grow"><b>Notes</b><span>${esc(c.notes)}</span></span></div>` : ''}</div>
  <div class="list"><button class="li" data-act="editContact" data-id="${c.id}">${ic('edit')}<span class="grow"><b>Edit contact</b></span></button><button class="li" data-act="toggleIce" data-id="${c.id}">${ic('alert')}<span class="grow"><b>${c.ice ? 'Remove from' : 'Add to'} emergency contacts</b></span></button>
  <button class="li" data-act="toggleBlock" data-id="${c.id}" style="color:var(--red)">${ic('block')}<span class="grow"><b>${c.blocked ? 'Unblock' : 'Block'} ${esc(c.name.split(' ')[0])}</b></span></button><button class="li" data-act="reportContact" data-id="${c.id}" style="color:var(--red)">${ic('flag')}<span class="grow"><b>Report</b></span></button></div>`;
  return screen({ title: 'Contact', back: '#/contacts', body });
}
function reportContact(id) {
  const c = contactById(id);
  formSheet({ title: `Report ${c.name}`, intro: 'Reports help keep LifeHub safe. In this prototype reports are stored on your device only.', submit: 'Submit report',
    fields: [{ k: 'reason', label: 'Reason', type: 'select', options: ['Spam or scam', 'Harassment or bullying', 'Impersonation', 'Inappropriate content', 'Other'] }, { k: 'details', label: 'Details (optional)', type: 'textarea' }, { k: 'block', label: `Also block ${c.name.split(' ')[0]}`, type: 'checkbox', default: true }],
    onSave: v => { S.reports.push({ id: uid(), contactId: id, ...v, t: Date.now() }); if (v.block) c.blocked = true; toast('Report submitted (demo)'); } });
}
async function importContacts() {
  const f = await pickFile('.vcf,.csv,.json,text/vcard,text/csv,application/json'); if (!f) return;
  const txt = await readText(f); let rows = [];
  try { if (/\.vcf$/i.test(f.name) || txt.includes('BEGIN:VCARD')) rows = parseVCard(txt);
    else if (/\.json$/i.test(f.name)) { const j = JSON.parse(txt); rows = (Array.isArray(j) ? j : j.contacts || []).map(o => ({ name: o.name || o.fullName, phone: o.phone || o.tel, email: o.email })); }
    else rows = parseCSV(txt).map(r => ({ name: r.name || [pick(r, 'first name', 'given'), pick(r, 'last name', 'family')].filter(Boolean).join(' ') || pick(r, 'name'), phone: pick(r, 'phone', 'mobile', 'tel'), email: pick(r, 'mail') }));
  } catch (e) { return toast('Could not read that file'); }
  addImported(rows);
}
function addImported(rows) {
  let n = 0; rows.forEach(r => { if (!r || !(r.name || r.phone)) return; if (S.contacts.some(c => c.name === r.name && c.phone === r.phone)) return; S.contacts.push({ id: uid(), name: r.name || r.phone, phone: r.phone || '', email: r.email || '', relation: r.org || '', ice: false, blocked: false, onLifeHub: false, notes: '', birthday: r.birthday || '', premium: false }); n++; });
  save(); render(); toast(`Imported ${n} contact${n === 1 ? '' : 's'}`);
}
async function pickContacts() {
  try { const res = await navigator.contacts.select(['name', 'tel', 'email'], { multiple: true }); addImported(res.map(r => ({ name: (r.name || [])[0], phone: (r.tel || [])[0], email: (r.email || [])[0] }))); } catch (e) { toast('Contact picker cancelled'); }
}

/* ---------- plans: Free vs Premium ---------- */
const PRICE = 0.99; // AUD per month, GST inclusive
const RECEIPT_KEY = 'lifehub.receipt';
const ACCENTS = { blue: ['Blue', '#2557d6', false], ocean: ['Ocean', '#0e7490', true], emerald: ['Emerald', '#047857', true], sunset: ['Sunset', '#c2410c', true], grape: ['Grape', '#7c3aed', true], rose: ['Rose', '#be185d', true] };
const SKINS = { midnight: 'Midnight (OLED)', forest: 'Tassie Forest' };
function ensurePlan() {
  if (!S) return;
  if (!S.plan) S.plan = { tier: 'free' };
  const p = S.plan;
  if (p.tier === 'premium' && p.status === 'cancelled' && p.renews && Date.now() > p.renews) { S.plan = { tier: 'free', lapsed: Date.now() }; save(); if (typeof refreshTimer !== 'undefined') scheduleRefresh(); }
  else if (p.tier === 'premium' && p.status === 'active' && p.renews && Date.now() > p.renews) { p.renews += 30 * 86400000; save(); } // demo auto-renew
}
const isPremium = () => !!(S && S.plan && S.plan.tier === 'premium');
const premBadge = (txt = 'Premium') => `<span class="pbadge" title="LifeHub Premium">★ ${txt}</span>`;
const fmtLong = t => new Date(t).toLocaleDateString(region().locale, { day: 'numeric', month: 'long', year: 'numeric' });

/* Ad slot: one component. Only Home's bottom placement is allowed. Never rendered for Premium
   or on Emergency, Medical ID, lock, payment/authorisation or call screens. To use a real network,
   set AD_CONFIG.provider = 'adsense' (web) with your client/slot ids; mountAds() injects the tag. */
const AD_CONFIG = { provider: 'house', adsense: { client: 'ca-pub-XXXXXXXXXXXXXXXX', slot: '0000000000' } };
const AD_PLACEMENTS = ['home-bottom'];
const HOUSE_ADS = [
  { title: 'LifeHub Premium: no ads', body: `Sharper photos, live refresh · ${'$'}0.99/mo`, cta: 'Go Premium', href: '#/plan' },
  { title: 'Example ad: Tamar Bike Hire', body: 'Sample only, not a real offer', cta: null },
  { title: 'Example ad: Farmers Market', body: 'Sample only, not a real offer', cta: null },
];
function AdSlot(placement) {
  if (!AD_PLACEMENTS.includes(placement) || isPremium() || sessionStorage.getItem('lh.adHidden')) return '';
  const ad = HOUSE_ADS[new Date().getDate() % HOUSE_ADS.length];
  const inner = AD_CONFIG.provider === 'adsense' ? '<div class="ad-net" data-ad-net></div>'
    : `<span class="ad-txt"><b>${esc(ad.title)}</b><span>${esc(ad.body)}</span></span>`;
  return `<aside class="adslot" data-placement="${placement}" aria-label="Advertisement"><span class="ad-lbl">Ad</span>${inner}<a class="ad-go" href="#/plan">Go Premium</a><button class="ad-x" data-act="hideAd" aria-label="Hide ad for this session">${ic('x', 16)}</button></aside>`;
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
  const rows = [['All sections & imports', '✓', '✓'], ['Emergency & Medical ID', 'Always free', 'Always free'], ['Calendar, reminders & work schedule', '✓', '✓'], ['Budget planner', 'Categories, month, 3 goals, chart', 'Unlimited goals, debt plan, CSV, trends'], ['Share live location with contacts', '–', 'Only people you tick'], ['Ads', '1 small ad on Home', 'No ads'],
    ['Themes', 'Light, Dark, Auto', '+ Midnight & Tassie Forest'], ['Accent colours', 'Blue', '+ 5 premium accents'], ['Icon style', 'Standard', '+ Glass icons'],
    ['Photo & image quality', 'Standard (up to 1080px)', 'Full resolution, sharper'], ['Auto-refresh (feeds, balances, chat)', 'Manual, every 15 or 5 min', '+ every 1 min & Live'], ['Pull to refresh', '✓', '✓'],
    ['Animations', 'Smooth', 'Extra snappy'], ['Opening sections', 'Fast', 'Instant (preloaded)'], ['Priority features & early access', '–', '★']];
  const status = !prem ? `<p class="muted" style="margin:6px 0 0">You're on the <b>Free</b> plan.</p>`
    : p.status === 'cancelled' ? `<p style="margin:6px 0 0">Cancelled. Premium stays on until <b>${fmtLong(p.renews)}</b>, then you'll move to Free.</p>`
    : `<p style="margin:6px 0 0">Active since ${fmtLong(p.since)} · renews <b>${fmtLong(p.renews)}</b></p>`;
  const body = `${demoNote('<b>Demo billing.</b> No money is charged in this prototype.')}
  <div class="plan-hero ${prem ? 'on' : ''}"><div class="row between"><b style="font-size:1.25rem">${prem ? 'LifeHub Premium' : 'LifeHub Free'}</b>${prem ? premBadge(p.status === 'cancelled' ? 'Ends soon' : 'Active') : ''}</div>${status}</div>
  <div class="cmp"><div class="cmp-h"><span></span><b>Free</b><b class="pc">Premium</b></div>${rows.map(r => `<div class="cmp-r"><span>${r[0]}</span><span>${r[1]}</span><span class="pc">${r[2]}</span></div>`).join('')}</div>
  <div class="price"><b>${money(PRICE, 'AUD')}</b><span>/month · AUD incl. GST · cancel anytime</span></div>
  ${!prem ? `<button class="btn primary full" data-act="upgrade">★ Upgrade to Premium</button>`
    : p.status === 'cancelled' ? `<button class="btn primary full" data-act="resume">Resume subscription</button>`
    : `<button class="btn full danger" data-act="cancelSub">Cancel subscription</button>`}
  <button class="btn ghost full" style="margin-top:8px" data-act="restore">Restore purchase</button>
  ${prem ? '<button class="linkbtn" style="width:100%" data-act="endNow">Switch to Free now (demo/testing)</button>' : ''}
  <p class="footnote">Free is never slowed down on purpose. Emergency numbers, the Emergency screen location readout and Medical ID are never behind a paywall and never show ads. Sharing your live location with contacts is part of Premium.</p>`;
  return screen({ title: 'Your plan', back: '#/settings', body });
}
function upgrade() {
  openSheet(`<h2>Checkout</h2><div class="notice">${ic('alert', 18)}<div><b>Demo checkout.</b> No card is charged and no real subscription is created.</div></div>
  <div class="feebox"><div><span>LifeHub Premium (monthly)</span><b>${money(PRICE, 'AUD')}</b></div><div><span>Includes GST</span><span>${money(PRICE / 11, 'AUD')}</span></div><div class="tot"><span>Due today</span><span>${money(PRICE, 'AUD')}</span></div></div>
  <label class="fld"><span>Pay with</span><select id="coPm"><option>Demo card •••• 4242</option><option>Apple Pay (demo)</option><option>Google Pay (demo)</option></select></label>
  <label class="fld chk"><input type="checkbox" id="coOk"><span>I understand this is a demo and renews monthly until cancelled</span></label>
  <div class="row gap"><button class="btn" data-close>Cancel</button><button class="btn primary" id="coGo" disabled>Continue</button></div>`, el => {
    const ok = $('#coOk', el), go = $('#coGo', el); ok.onchange = () => go.disabled = !ok.checked;
    go.onclick = async () => { closeSheet(true); if (!(await authorize(`Subscribe to LifeHub Premium for ${money(PRICE, 'AUD')}/month (demo)`))) return toast('Checkout cancelled');
      const now = Date.now(); S.plan = { tier: 'premium', status: 'active', since: now, renews: now + 30 * 86400000, receipt: 'demo_' + uid() };
      localStorage.setItem(RECEIPT_KEY, JSON.stringify(S.plan)); save(); invalidateCache(); scheduleRefresh(); render(); toast('Welcome to Premium ★ Ads removed');
    };
  });
}
async function cancelSub() {
  if (!(await confirmSheet('Cancel Premium?', `You'll keep Premium until ${fmtLong(S.plan.renews)}. After that, LifeHub moves to Free and shows one small ad on Home.`, 'Cancel subscription', true))) return;
  S.plan.status = 'cancelled'; localStorage.setItem(RECEIPT_KEY, JSON.stringify(S.plan)); save(); render(); toast('Subscription cancelled');
}
function restore() {
  let r = null; try { r = JSON.parse(localStorage.getItem(RECEIPT_KEY) || 'null'); } catch (e) {}
  if (r && r.tier === 'premium' && (r.status === 'active' || Date.now() < r.renews)) { S.plan = r; save(); invalidateCache(); scheduleRefresh(); render(); toast('Premium restored'); }
  else toast('No active subscription found on this device');
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
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('lifehub-media', 2); r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('images')) db.createObjectStore('images'); if (!db.objectStoreNames.contains('files')) db.createObjectStore('files'); if (!db.objectStoreNames.contains('inbox')) db.createObjectStore('inbox'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function putImage(id, blob) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('images', 'readwrite'); t.objectStore('images').put(blob, id); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
async function getImage(id) { const db = await idb(); return new Promise(res => { const q = db.transaction('images').objectStore('images').get(id); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }
async function delImage(id) { try { const db = await idb(); db.transaction('images', 'readwrite').objectStore('images').delete(id); } catch (e) {} }

/* Refresh rate for feeds, balances, notifications and chat. Free: Manual, 15 min, 5 min. Premium adds 1 min and Live. */
const REFRESH = [['manual', 'Manual', false], ['15', '15 min', false], ['5', '5 min', false], ['1', '1 min', true], ['live', 'Live', true]];
const refreshSetting = () => { const v = String(S?.settings?.refresh ?? '15'); const o = REFRESH.find(r => r[0] === v); return o && (!o[2] || isPremium()) ? v : '5'; };
const refreshMs = () => { const v = refreshSetting(); return v === 'manual' ? 0 : v === 'live' ? 10000 : Number(v) * 60000; };
let refreshTimer = null;
function scheduleRefresh() { clearInterval(refreshTimer); const ms = refreshMs(); if (ms) refreshTimer = setInterval(() => { if (unlocked && !document.hidden) refreshAll(false); }, ms); }
const DEMO_NEW = [['instagram', 'Emma Nguyen liked your photo'], ['facebook', 'Jake Wilson commented: "Great game!"'], ['x', 'You have a new follower'], ['linkedin', 'Your post was viewed 24 times']];
function refreshAll(manual) {
  /* Demo: a live build would call each provider (CDR bank feed, social APIs, chat server / push). */
  S.lastRefresh = Date.now();
  if (Math.random() < 0.35 && S.platforms.length) { const [k, t] = DEMO_NEW[Math.floor(Math.random() * DEMO_NEW.length)]; const p = S.platforms.find(x => x.key === k); if (p) { S.notifications.push({ id: uid(), key: k, text: t, t: Date.now() }); p.dms += k === 'x' ? 0 : 1; } }
  save();
  const h = location.hash; if (/^#\/(home|social|banking|chat|utilities|calendar|location)?$/.test(h) || h === '') { const y = scrollY; render(); scrollTo(0, y); }
  if (manual) toast('Refreshed');
}
const updatedLine = () => { const t = S.lastRefresh; const v = refreshSetting(); const ago = !t ? 'not yet' : Date.now() - t < 60000 ? 'just now' : `${Math.round((Date.now() - t) / 60000)} min ago`;
  return `<div class="updated small muted">${ic('clock', 14)} Updated ${ago} · ${v === 'manual' ? 'Manual refresh' : v === 'live' ? '<b class="green">Live</b>' : `Every ${v} min`}<button class="linkbtn small" data-act="refreshNow">Refresh</button></div>`; };
/* pull-to-refresh (everyone) */
(function () {
  let y0 = null, pulled = false; const ind = document.createElement('div'); ind.className = 'ptr'; ind.innerHTML = '↓ Pull to refresh'; document.body.appendChild(ind);
  addEventListener('touchstart', e => { y0 = (scrollY <= 0 && !$('.sheet-wrap') && unlocked && !/^#\/(call|chat\/)/.test(location.hash)) ? e.touches[0].clientY : null; pulled = false; }, { passive: true });
  addEventListener('touchmove', e => { if (y0 == null) return; const d = e.touches[0].clientY - y0; if (d > 10) { ind.style.transform = `translate(-50%,${Math.min(d, 90) - 50}px)`; ind.classList.add('show'); pulled = d > 70; ind.textContent = pulled ? '↻ Release to refresh' : '↓ Pull to refresh'; } }, { passive: true });
  addEventListener('touchend', () => { if (y0 == null) return; ind.classList.remove('show'); ind.style.transform = ''; if (pulled) refreshAll(true); y0 = null; });
})();

/* ---------- social ---------- */
let postMedia = null;
function platBadge(p, sz = 42) { const P0 = PLATFORMS[p.key] || PLATFORMS.custom; return `<span class="pl" style="width:${sz}px;height:${sz}px;border-radius:${Math.round(sz * .28)}px;font-size:${(sz / 42).toFixed(2)}rem;background:${p.color || P0.color};${p.key === 'snapchat' ? 'color:#111' : ''}">${esc(p.key === 'custom' ? initials(p.name) : P0.l)}</span>`; }
const platName = p => p.key === 'custom' ? p.name : (PLATFORMS[p.key] || {}).name;
function renderSocial() {
  const notes = [...S.notifications].sort((a, b) => b.t - a.t);
  const body = `<div class="plats">${S.platforms.map(p => `<button class="plat" data-act="platMenu" data-id="${p.id}">${platBadge(p)}<span style="min-width:0"><b>${esc(platName(p))}</b><span class="counts"><span class="cnt ${p.friendReq ? '' : 'zero'}" title="Friend requests">${ic('user', 12, 2.6)}${p.friendReq}</span><span class="cnt ${p.dms ? '' : 'zero'}" title="Direct messages">${ic('msg', 12, 2.6)}${p.dms}</span></span></span></button>`).join('')}
  <button class="plat" data-act="addPlatform" style="border-style:dashed;box-shadow:none;justify-content:center">${ic('plus')}<b>Add platform</b></button></div>
  <div class="card compose"><h3>${ic('edit', 18)} Create a post</h3><textarea id="postTxt" placeholder="What's on your mind, ${esc(S.profile.name.split(' ')[0])}?" aria-label="Post text"></textarea>
  <div id="pmedia">${postMedia ? `<div class="preview">${postMedia.type.startsWith('video') ? `<video src="${postMedia.url}" controls></video>` : `<img src="${postMedia.url}" alt="Attached photo">`}${postMedia.note ? `<div class="small muted">${esc(postMedia.note)}${isPremium() ? '' : ' · <a class="linkbtn small" href="#/plan">Full quality with Premium</a>'}</div>` : ''}<button class="iconbtn" style="position:absolute;top:8px;right:8px" data-act="clearMedia" aria-label="Remove">${ic('x')}</button></div>` : ''}</div>
  <div class="row gap" style="margin:6px 0"><button class="btn sm" data-act="camera">${ic('camera', 18)} Camera</button><button class="btn sm" data-act="gallery">${ic('image', 18)} Photo / video</button></div>
  <div class="small muted" style="margin-top:8px">Post to:</div><div class="chkrow">${S.platforms.map(p => `<label class="chkp"><input type="checkbox" name="pp" value="${p.id}" checked>${esc(platName(p))}</label>`).join('') || '<span class="small muted">Add a platform first</span>'}</div>
  <button class="btn primary full" data-act="post">${ic('send', 18)} Post</button></div>
  ${updatedLine()}<div class="sec-h"><h2>Important notifications</h2>${notes.length ? '<button class="linkbtn" data-act="clearNotes">Clear all</button>' : ''}</div>
  <div class="list">${notes.length ? notes.map(n => { const p = S.platforms.find(x => x.key === n.key) || { key: n.key }; return `<div class="li">${platBadge(p, 36)}<span class="grow"><b style="font-weight:600;font-size:.95rem">${esc(n.text)}</b><span>${esc((PLATFORMS[n.key] || {}).name || '')} · ${fmtTime(n.t)}</span></span><button class="iconbtn" style="box-shadow:none;width:36px;height:36px" data-act="dismissNote" data-id="${n.id}" aria-label="Dismiss">${ic('x', 18)}</button></div>`; }).join('') : '<p class="empty">You\'re all caught up 🎉</p>'}</div>
  ${S.posts.length ? `<div class="sec-h"><h2>Your recent posts</h2></div><div class="list">${S.posts.slice(-5).reverse().map(p => `<div class="li"><span class="grow"><b style="font-weight:550">${esc(p.text || '(media)')}</b><span>${fmtTime(p.t)} · ${esc(p.to.join(', '))}${p.media ? ' · 📷' : ''}</span></span><span class="tag green">Posted</span></div>`).join('')}</div>` : ''}`;
  return screen({ title: 'Social', demo: 'Feeds, counts and posts are samples. No social network is connected.', body });
}
function addPlatform() {
  formSheet({ title: 'Add a platform', intro: 'Demo: a live version would sign in with the platform (OAuth) to read notifications and post on your behalf.', submit: 'Add',
    fields: [{ k: 'key', label: 'Platform', type: 'select', options: Object.entries(PLATFORMS).map(([k, p]) => [k, p.name]) }, { k: 'name', label: 'Name (for Custom)', ph: 'e.g. Discord, Strava' }, { k: 'handle', label: 'Your username / handle' }, { k: 'url', label: 'Link to open (optional)', type: 'url', ph: 'https://' }],
    onSave: v => { if (v.key === 'custom' && !v.name) { toast('Give your custom platform a name'); return false; } S.platforms.push({ id: uid(), key: v.key, name: v.name, handle: v.handle, url: v.url, friendReq: 0, dms: 0, color: v.key === 'custom' ? avColor(v.name) : undefined }); toast('Platform added'); } });
}
function platMenu(id) {
  const p = S.platforms.find(x => x.id === id); const url = p.url || (PLATFORMS[p.key] || {}).url;
  openSheet(`<div class="row gap" style="margin-bottom:12px">${platBadge(p, 52)}<div><h2 style="margin:0">${esc(platName(p))}</h2><span class="muted">${esc(p.handle || '')}</span></div></div>
  <div class="list"><div class="li">${ic('user')}<span class="grow"><b>${p.friendReq} friend request${p.friendReq === 1 ? '' : 's'}</b></span></div><div class="li">${ic('msg')}<span class="grow"><b>${p.dms} direct message${p.dms === 1 ? '' : 's'}</b></span></div></div>
  ${url ? `<a class="btn primary full" href="${esc(url)}" target="_blank" rel="noopener" style="margin-bottom:8px">${ic('ext', 18)} Open ${esc(platName(p))}</a>` : ''}
  <div class="row gap"><button class="btn" id="pmRead">Mark all seen</button><button class="btn danger" id="pmDel">Remove</button></div>`, el => {
    $('#pmRead', el).onclick = () => { p.friendReq = 0; p.dms = 0; save(); closeSheet(true); render(); };
    $('#pmDel', el).onclick = () => { S.platforms = S.platforms.filter(x => x.id !== id); save(); closeSheet(true); render(); toast('Platform removed'); }; });
}
async function attachMedia(capture) {
  const f = await pickFile('image/*,video/*', capture ? 'environment' : null); if (!f) return;
  const img = f.type.startsWith('video') ? { blob: f, note: '' } : await processImage(f);
  if (postMedia) URL.revokeObjectURL(postMedia.url); postMedia = { url: URL.createObjectURL(img.blob), type: img.blob.type || f.type || 'image/jpeg', name: f.name, note: img.note };
  const txt = $('#postTxt').value; render(); $('#postTxt').value = txt;
}
function doPost() {
  const text = $('#postTxt').value.trim(); const ids = $$('input[name=pp]:checked').map(i => i.value);
  if (!text && !postMedia) return toast('Write something or add a photo');
  if (!ids.length) return toast('Choose at least one platform');
  const to = ids.map(id => platName(S.platforms.find(p => p.id === id)));
  S.posts.push({ id: uid(), text, to, media: !!postMedia, t: Date.now() }); if (postMedia) URL.revokeObjectURL(postMedia.url); postMedia = null; save(); render(); toast(`Posted to ${to.join(', ')} (demo)`);
}

/* ---------- utilities ---------- */
function billTotals() {
  let owed = 0, credit = 0, overdue = 0;
  S.bills.forEach(b => { if (b.type === 'credit') credit += b.amount; else if (!b.paid) { owed += b.amount; if (b.due && daysUntil(b.due) < 0) overdue++; } });
  return { owed, credit, overdue };
}
let billSort = 'due';
function renderUtilities() {
  const { owed, credit, overdue } = billTotals();
  const arr = [...S.bills].sort((a, b) => billSort === 'amount' ? b.amount - a.amount : (a.paid - b.paid) || ((a.type === 'credit') - (b.type === 'credit')) || (a.due || '9').localeCompare(b.due || '9'));
  const row = b => { const d = b.due ? daysUntil(b.due) : null; const od = !b.paid && b.type !== 'credit' && d != null && d < 0;
    const dueTxt = b.type === 'credit' ? '<span class="green">In credit</span>' : b.paid ? '<span class="green">Paid ✓</span>' : d == null ? 'No due date' : d < 0 ? `<span class="red">Overdue by ${-d} day${d === -1 ? '' : 's'}</span>` : d === 0 ? '<span class="amber">Due today</span>' : d <= 7 ? `<span class="amber">Due in ${d} day${d === 1 ? '' : 's'} · ${fmtDate(b.due)}</span>` : `Due ${fmtDate(b.due)}`;
    return `<div class="li bill ${od ? 'overdue' : ''} ${b.paid ? 'paid' : ''}"><button style="flex:1;min-width:0;background:none;border:0;padding:0;text-align:left" data-act="editBill" data-id="${b.id}"><span class="grow" style="display:block"><b>${esc(b.provider)}</b><span>${esc(b.category)}</span><div class="due">${dueTxt}${b.reminder && !b.paid && b.type !== 'credit' ? ' · 🔔' : ''}${b.file || b.imageId ? ' · 📎' : ''}</div></span></button><span style="text-align:right"><span class="amt ${b.type === 'credit' ? 'green' : b.paid ? '' : 'red'}">${b.type === 'credit' ? '+' : ''}${money(b.amount)}</span><br>${!b.paid && b.type !== 'credit' ? `<button class="btn sm" style="margin-top:4px" data-act="payBill" data-id="${b.id}">Mark paid</button>` : ''}</span></div>`; };
  const body = `<div class="sumgrid"><div class="sum owed"><small>Total owed</small><b>${money(owed)}</b><div class="small">${overdue ? `${overdue} overdue` : 'Nothing overdue'}</div></div><div class="sum cred"><small>Total in credit</small><b>${money(credit)}</b><div class="small">${S.bills.filter(b => b.type === 'credit').length} account(s)</div></div></div>
  <div class="row gap" style="margin-bottom:12px"><button class="btn sm primary" data-act="addBill">${ic('plus', 16)} Add bill</button><button class="btn sm" data-act="uploadBill">${ic('camera', 16)} Upload</button><button class="btn sm" data-act="importBills">${ic('upload', 16)} Import</button></div>
  <div class="seg" style="margin-bottom:12px" role="tablist"><button class="${billSort === 'due' ? 'on' : ''}" data-act="billSort" data-s="due">By due date</button><button class="${billSort === 'amount' ? 'on' : ''}" data-act="billSort" data-s="amount">By amount</button></div>
  <div class="list">${arr.length ? arr.map(row).join('') : '<p class="empty">No bills yet. Add one manually, upload a photo/PDF, or import a CSV.</p>'}</div>
  <p class="footnote">Tap a bill to edit, set reminders or delete. CSV columns: provider, category, amount, due, type (owed/credit).</p>`;
  return screen({ title: 'Utilities & bills', body });
}
const BILL_FIELDS = [{ k: 'provider', label: 'Provider', req: true, ph: 'e.g. Aurora Energy' }, { k: 'category', label: 'Category', type: 'select', options: ['Electricity', 'Gas', 'Water', 'Internet', 'Mobile', 'Council rates', 'Insurance', 'Rent / mortgage', 'Subscription', 'Car / rego', 'Other'] },
  { k: 'amount', label: 'Amount', type: 'number', step: '0.01', req: true, im: 'decimal' }, { k: 'type', label: 'Balance', type: 'select', options: [['owed', 'Amount owed'], ['credit', 'In credit']] }, { k: 'due', label: 'Due date', type: 'date' },
  { k: 'reminder', label: 'Remind me before it\'s due', type: 'checkbox', default: true }, { k: 'remindDays', label: 'Days before', type: 'number', min: 0, default: 3, im: 'numeric' }, { k: 'paid', label: 'Paid', type: 'checkbox' }];
function editBill(id, preset) {
  const b = id && S.bills.find(x => x.id === id);
  formSheet({ title: b ? 'Edit bill' : 'Add bill', intro: preset?.file ? `Attached: ${esc(preset.file)}. Demo: a live version would read the amount and due date automatically (OCR).` : '', fields: BILL_FIELDS, values: b || preset || {},
    onSave: v => { v.amount = Math.abs(v.amount); v.remindDays = isNaN(v.remindDays) ? 3 : v.remindDays; if (v.reminder) askNotify(); if (b) Object.assign(b, v); else S.bills.push({ id: uid(), file: preset?.file, imageId: preset?.imageId || null, ...v }); toast('Bill saved'); },
    danger: b ? { label: 'Delete bill', fn: () => { if (b.imageId) delImage(b.imageId); S.bills = S.bills.filter(x => x.id !== id); } } : null });
  const imgId = b?.imageId || preset?.imageId; if (imgId) getImage(imgId).then(bl => { const f = $('#sheetForm'); if (!bl || !f) return; const d = document.createElement('div'); d.className = 'preview'; d.innerHTML = `<img alt="Bill image" src="${URL.createObjectURL(bl)}"><div class="small muted">${esc(preset?.note || (isPremium() ? 'Full quality' : 'Standard quality'))}</div>`; f.prepend(d); });
}
async function uploadBill() { const f = await pickFile('image/*,application/pdf', null); if (!f) return; const guess = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  let imageId = null, note = ''; if (/^image\//.test(f.type)) { const img = await processImage(f); imageId = 'bill_' + uid(); try { await putImage(imageId, img.blob); note = img.note; } catch (e) { imageId = null; } }
  editBill(null, { provider: guess.slice(0, 40), file: f.name, imageId, note, reminder: true, remindDays: 3 }); }
async function importBills() {
  const f = await pickFile('.csv,.json,text/csv,application/json'); if (!f) return; const txt = await readText(f); let rows;
  try { rows = /\.json$/i.test(f.name) ? JSON.parse(txt) : parseCSV(txt); if (!Array.isArray(rows)) rows = rows.bills || []; } catch (e) { return toast('Could not read that file'); }
  let n = 0; rows.forEach(r => { const amt = parseFloat(String(r.amount ?? pick(r, 'amount', 'total')).replace(/[^\d.-]/g, '')); const prov = r.provider || pick(r, 'provider', 'biller', 'name'); if (!prov || isNaN(amt)) return;
    const due = r.due || pick(r, 'due'); const dd = due ? new Date(due) : null; const type = /credit/i.test(r.type || pick(r, 'type', 'status')) || amt < 0 ? 'credit' : 'owed';
    S.bills.push({ id: uid(), provider: prov, category: r.category || pick(r, 'categ') || 'Other', amount: Math.abs(amt), due: dd && !isNaN(dd) ? dd.toISOString().slice(0, 10) : '', type, paid: /paid/i.test(r.status || ''), reminder: true, remindDays: 3 }); n++; });
  save(); render(); toast(`Imported ${n} bill${n === 1 ? '' : 's'}`);
}
function askNotify() { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); }
function checkReminders() {
  if (!S) return; checkEventReminders(); const due = S.bills.filter(b => b.reminder && !b.paid && b.type !== 'credit' && b.due && daysUntil(b.due) <= (b.remindDays ?? 3));
  if (!due.length) return; const od = due.filter(b => daysUntil(b.due) < 0).length;
  const msg = `${due.length} bill${due.length > 1 ? 's' : ''} due soon${od ? ` (${od} overdue)` : ''}`;
  setTimeout(() => toast('🔔 ' + msg), 600);
  try { if ('Notification' in window && Notification.permission === 'granted' && !sessionStorage.getItem('lh.notified')) { new Notification('LifeHub bill reminder', { body: due.map(b => `${b.provider}: ${money(b.amount)}`).join('\n'), icon: 'icons/icon-192.png' }); sessionStorage.setItem('lh.notified', '1'); } } catch (e) {}
}

/* ---------- add new / groups ---------- */
const appTile = a => `<a class="app" href="${esc(a.url)}" target="_blank" rel="noopener" data-app="${a.id}"><span class="ai">${esc(a.emoji || '🔗')}</span>${esc(a.name)}</a>`;
function renderAddNew() {
  const ung = S.apps.filter(a => !a.groupId || !S.groups.some(g => g.id === a.groupId));
  const body = `<div class="card"><b>Quick sync</b><p class="muted" style="margin:6px 0 10px">Tick apps you might already use and add them in one step. LifeHub cannot see what is installed on this device.</p><button class="btn primary full" data-act="quickSync">${ic('grid', 18)} Apps you might use</button></div>
  <div class="dropzone" data-drop="add"><b>Drop an app, shortcut or link here</b><span>A browser link, a Play Store or App Store link, or a shortcut (.lnk, .url, .desktop, .webloc). LifeHub only reads what you drop.</span></div>
  <button class="btn full" data-act="pasteLink" style="margin-bottom:12px">Paste a link</button>
  <div class="row gap" style="margin-bottom:14px"><button class="btn" data-act="addOne">${ic('plus', 18)} Add one link</button><button class="btn" data-act="addGroup">${ic('grid', 18)} New group</button></div>
  <div class="sec-h"><h2>Your groups</h2></div>
  <div class="list">${S.groups.length ? S.groups.map(g => { const n = S.apps.filter(a => a.groupId === g.id).length; return `<a class="li" href="#/group/${g.id}"><span class="ai" style="width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--card2);border:1px solid var(--line);font-size:1.4rem">${esc(g.emoji || '📁')}</span><span class="grow"><b>${esc(g.name)}</b><span>${n} app${n === 1 ? '' : 's'}${g.onHome ? ' · on Home' : ''}</span></span>${ic('chev')}</a>`; }).join('') : '<p class="empty">No groups yet</p>'}</div>
  <div class="sec-h"><h2>Other apps</h2></div><div class="appgrid">${ung.map(appTile).join('')}<button class="app add" data-act="addApp"><span class="ai">${ic('plus', 26)}</span>Add</button></div>
  <p class="footnote">Tip: long-press (or right-click) an app to edit it. Deep links like spotify: or whatsapp: also work. On a phone, use Share and choose LifeHub.</p>`;
  return { html: screen({ title: 'Add New', body }), after: () => openPendingDraft() };
}
function renderGroup(id) {
  const g = S.groups.find(x => x.id === id); if (!g) { location.hash = '#/addnew'; return ''; }
  const apps = S.apps.filter(a => a.groupId === id);
  const body = `<div class="appgrid">${apps.map(appTile).join('')}<button class="app add" data-act="addApp" data-g="${id}"><span class="ai">${ic('plus', 26)}</span>Add</button></div>
  <button class="btn full" data-act="editGroup" data-id="${id}">${ic('edit', 18)} Edit group</button><p class="footnote">Long-press (or right-click) an app to edit or move it.</p>`;
  return screen({ title: `${g.emoji || ''} ${g.name}`.trim(), back: '#/addnew', body });
}
function editApp(id, groupId, preset) {
  const a = id && S.apps.find(x => x.id === id);
  const base = a || { groupId: groupId || '', emoji: '🔗', name: '', url: '', ...(preset || {}) };
  const intro = !a && preset && preset.note ? preset.note : '';
  formSheet({ title: a ? 'Edit app' : 'Add app or link', intro, fields: [{ k: 'name', label: 'Name', req: true }, { k: 'url', label: 'Web address or app link', req: true, ph: 'https://… or app-name://' }, { k: 'emoji', label: 'Icon (emoji)', ph: '🔗' }, { k: 'groupId', label: 'Group', type: 'select', options: [['', 'No group'], ...S.groups.map(g => [g.id, `${g.emoji || ''} ${g.name}`])] }, { k: 'nextLabel', label: 'Calendar label (optional)', ph: 'e.g. School pickup' }, { k: 'nextOn', label: 'Next date', type: 'date' }, { k: 'nextStart', label: 'Starts', type: 'time' }, { k: 'nextEnd', label: 'Ends', type: 'time' }],
    values: base, onSave: v => { if (!/^[a-z][\w+.-]*:/i.test(v.url)) v.url = 'https://' + v.url; v.emoji = v.emoji || '🔗'; if (a) Object.assign(a, v); else S.apps.push({ id: uid(), catalogId: (preset && preset.catalogId) || '', android: (preset && preset.android) || '', ios: (preset && preset.ios) || '', ...v }); toast('Saved'); },
    danger: a ? { label: 'Remove app', fn: () => S.apps = S.apps.filter(x => x.id !== id) } : null });
}
function editGroup(id) {
  const g = id && S.groups.find(x => x.id === id);
  formSheet({ title: g ? 'Edit group' : 'New group', fields: [{ k: 'name', label: 'Group name', req: true, ph: 'e.g. Travel, Kids, Work' }, { k: 'emoji', label: 'Icon (emoji)', ph: '📁' }, { k: 'onHome', label: 'Show as a banner on Home', type: 'checkbox' }],
    values: g || {}, onSave: v => { if (g) Object.assign(g, v); else { const ng = { id: uid(), ...v }; S.groups.push(ng); setTimeout(() => location.hash = '#/group/' + ng.id, 0); } toast('Group saved'); },
    danger: g ? { label: 'Delete group', fn: () => { S.groups = S.groups.filter(x => x.id !== id); S.apps.forEach(a => { if (a.groupId === id) a.groupId = ''; }); location.hash = '#/addnew'; } } : null });
}

/* ---------- settings ---------- */
function renderSettings() {
  const s = S.settings; const bs = s.banners;
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(s[key]) === String(v) ? 'on' : ''}" data-act="setPref" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const body = `<div class="list"><button class="li" data-act="editProfile">${av(S.profile.name)}<span class="grow"><b>${esc(S.profile.name)}</b><span>${region().flag} ${region().name} · ${region().currency}</span></span>${ic('edit', 18)}</button>
  <a class="li" href="#/plan">${ic('star')}<span class="grow"><b>Plan: ${isPremium() ? 'Premium ' + premBadge(S.plan.status === 'cancelled' ? 'Ends soon' : 'Active') : 'Free'}</b><span>${isPremium() ? 'No ads · location · budget tools · themes' : `Go ad-free for ${money(PRICE, 'AUD')}/month`}</span></span>${ic('chev')}</a>
  <a class="li" href="#/location">${ic('pin')}<span class="grow"><b>Location ${isPremium() ? premBadge() : '<span class="tag">Premium</span>'}</b><span>${S.loc && S.loc.on ? 'Sharing is on' : 'Off until you pick people'}</span></span>${ic('chev')}</a></div>
  <div class="sec-h"><h2>Security</h2></div>
  <div class="list"><button class="li" data-act="changeLogin">${ic('lock')}<span class="grow"><b>Sign-in method</b><span>${METHODS[S.auth.method].label}</span></span>${ic('chev')}</button>
  <div class="li" style="display:block">${ic('clock')} <b>Auto-lock when idle</b><div style="margin-top:8px">${seg('lockMinutes', [[1, '1 min'], [5, '5 min'], [15, '15 min'], [0, 'Never']])}</div></div>
  <button class="li" data-act="lockNow">${ic('lock')}<span class="grow"><b>Lock now</b></span></button></div>
  <div class="sec-h"><h2>Display</h2></div>
  <div class="list"><div class="li" style="display:block">${ic('type')} <b>Text size</b><div style="margin-top:8px">${seg('textSize', [['normal', 'Standard'], ['large', 'Large'], ['xl', 'Extra large']])}</div></div>
  <div class="li" style="display:block">${ic('sun')} <b>Theme</b><div style="margin-top:8px">${seg('theme', [['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']])}</div></div>
  <div class="li" style="display:block"><b>Premium looks</b> ${isPremium() ? premBadge() : '<span class="tag">Premium</span>'}
   <div class="swatches">${Object.entries(SKINS).map(([k, l]) => `<button class="skin skin-${k} ${s.skin === k && isPremium() ? 'on' : ''}" data-act="prem" data-k="skin" data-v="${k}">${isPremium() ? '' : ic('lock', 14) + ' '}${l}</button>`).join('')}${isPremium() && s.skin ? '<button class="skin" data-act="prem" data-k="skin" data-v="">Off</button>' : ''}</div>
   <div class="swatches">${Object.entries(ACCENTS).map(([k, [l, c, pr]]) => `<button class="sw ${(s.accent || 'blue') === k ? 'on' : ''}" style="background:${c}" data-act="prem" data-k="accent" data-v="${k}" aria-label="${l} accent${pr && !isPremium() ? ' (Premium)' : ''}">${pr && !isPremium() ? ic('lock', 14) : (s.accent || 'blue') === k ? ic('check', 16, 3) : ''}</button>`).join('')}</div>
   <label class="row between" style="margin-top:10px"><span>Glass icons ${isPremium() ? '' : ic('lock', 14)}</span><span class="switch"><input type="checkbox" data-change="glass" ${s.iconStyle === 'glass' && isPremium() ? 'checked' : ''}><i></i></span></label></div></div>
  <div class="sec-h"><h2>Home banners</h2></div><p class="small muted" style="margin:-4px 2px 8px">Reorder or hide banners to keep Home tidy. Emergency always stays visible.</p>
  <div class="list reorder">${bs.map((b, i) => `<div class="li"><span class="chip" style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;color:#fff;background:${BANNERS[b.id].color}">${ic(BANNERS[b.id].icon, 18)}</span><span class="grow"><b style="${b.hidden ? 'opacity:.45' : ''}">${BANNERS[b.id].title}</b></span>
    <button class="mv" data-act="mvBanner" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${ic('up', 18)}</button><button class="mv" data-act="mvBanner" data-i="${i}" data-d="1" ${i === bs.length - 1 ? 'disabled' : ''} aria-label="Move down">${ic('down', 18)}</button>
    ${b.id === 'emergency' ? '<span class="mv" style="border:0;background:none"></span>' : `<button class="mv" data-act="hideBanner" data-i="${i}" aria-label="${b.hidden ? 'Show' : 'Hide'}">${ic(b.hidden ? 'eyeoff' : 'eye', 18)}</button>`}</div>`).join('')}</div>
  <div class="sec-h"><h2>Refresh</h2></div>
  <div class="list"><div class="li" style="display:block">${ic('clock')} <b>Auto-refresh feeds, balances & chat</b><div class="seg" style="margin-top:8px">${REFRESH.map(([v, l, pr]) => `<button class="${refreshSetting() === v ? 'on' : ''}" data-act="setRefresh" data-v="${v}">${pr && !isPremium() ? ic('lock', 12) + ' ' : ''}${l}</button>`).join('')}</div><div class="small muted" style="margin-top:6px">Pull down on any screen to refresh now.${isPremium() ? '' : ' 1 min and Live come with Premium.'}</div></div></div>
  <div class="sec-h"><h2>Network</h2></div>
  <label class="list li" style="border:1px solid var(--line)"><span class="grow"><b>Prefer Wi‑Fi for chat & calls</b><span>Use mobile data only when Wi‑Fi isn't available</span></span><span class="switch"><input type="checkbox" data-change="preferWifi" ${s.preferWifi ? 'checked' : ''}><i></i></span></label>
  <div class="sec-h"><h2>Your data</h2></div>
  <div class="list"><button class="li" data-act="exportData">${ic('download')}<span class="grow"><b>Export backup</b><span>Download everything as a JSON file</span></span></button>
  <button class="li" data-act="importData">${ic('upload')}<span class="grow"><b>Import backup or data</b><span>LifeHub backup (.json), contacts (.vcf/.csv)</span></span></button>
  <button class="li" data-act="loadSample">${ic('grid')}<span class="grow"><b>Reload sample data</b><span>Replace current data with demo data</span></span></button>
  <button class="li" data-act="wipeData" style="color:var(--red)">${ic('trash')}<span class="grow"><b>Delete all my data</b><span>Clears local storage, caches and the on-device database</span></span></button></div>
  <div class="sec-h"><h2>Policies</h2></div>
  <div class="list"><a class="li" href="privacy.html">${ic('shield')}<span class="grow"><b>Privacy Policy</b><span>What stays on this device</span></span>${ic('chev')}</a>
  <a class="li" href="terms.html">${ic('file')}<span class="grow"><b>Terms of Use</b></span>${ic('chev')}</a>
  <a class="li" href="support.html">${ic('msg')}<span class="grow"><b>Support</b><span>support@lifehubapp.app</span></span>${ic('chev')}</a>
  <a class="li" href="delete-account.html">${ic('trash')}<span class="grow"><b>Delete your data</b><span>How account deletion works</span></span>${ic('chev')}</a></div>
  <div class="card small"><h3>${ic('shield', 18)} Privacy</h3>What you enter stays in this browser on this device. LifeHub has no server and no analytics. The Home ad is a sample placeholder, not a tracking network. Banking, chat, social feeds and other people's map pins are demos. Export a backup before you delete your data.</div>
  <p class="footnote">LifeHub prototype v1.4.1 · ${navigator.onLine ? 'Online' : 'Offline'} · Installed copies update themselves. Dates use Australia/Hobart time.</p>`;
  return screen({ title: 'Settings', body });
}
function editProfile() {
  formSheet({ title: 'Profile', fields: [{ k: 'name', label: 'Name', req: true }, { k: 'region', label: 'Region', type: 'select', options: Object.entries(REGIONS).map(([k, r]) => [k, `${r.flag} ${r.name}`]) }], values: S.profile, onSave: v => { Object.assign(S.profile, v); } });
}
function changeLogin() {
  openSheet(`<h2>Sign-in method</h2><p class="muted small">Confirm with your current method, then choose a new one.</p>${Object.entries(METHODS).map(([k, m]) => `<button class="method ${S.auth.method === k ? 'on' : ''}" data-m="${k}"><span class="mi">${m.icon}</span><span><b>${m.label}</b><span>${m.desc}</span></span></button>`).join('')}`, el => {
    el.addEventListener('click', async e => { const b = e.target.closest('[data-m]'); if (!b) return; const nm = b.dataset.m; closeSheet(true);
      if (!(await authorize('Confirm to change your sign-in method'))) return;
      if (nm === 'pin' || nm === 'password') formSheet({ title: nm === 'pin' ? 'New PIN' : 'New password', fields: [{ k: 'a', label: nm === 'pin' ? 'PIN (4–6 digits)' : 'Password (8+ characters)', type: 'password', im: nm === 'pin' ? 'numeric' : '' }, { k: 'b', label: 'Confirm', type: 'password', im: nm === 'pin' ? 'numeric' : '' }],
        onSave: async v => { if (nm === 'pin' && !/^\d{4,6}$/.test(v.a)) { toast('PIN must be 4–6 digits'); return false; } if (nm === 'password' && v.a.length < 8) { toast('Use at least 8 characters'); return false; } if (v.a !== v.b) { toast("Those don't match"); return false; }
          S.auth = nm === 'pin' ? { method: 'pin', pinHash: await hash(v.a), pinLen: v.a.length } : { method: 'password', pwHash: await hash(v.a) }; toast('Sign-in method updated'); } });
      else if (nm === 'passkey') { let credId = null; if (passkeySupported()) { try { credId = await createPasskey(S.profile.name); } catch (err) { toast('Passkey not created: using simulated biometric'); } } S.auth = { method: 'passkey', credId }; save(); render(); toast('Sign-in method updated'); }
      else { S.auth = { method: nm }; save(); render(); toast('Sign-in method updated (demo)'); } });
  });
}
async function importData() {
  const f = await pickFile('.json,.vcf,.csv,application/json,text/vcard,text/csv'); if (!f) return;
  if (!/\.json$/i.test(f.name)) { const txt = await readText(f); const rows = txt.includes('BEGIN:VCARD') ? parseVCard(txt) : parseCSV(txt).map(r => ({ name: r.name || pick(r, 'name'), phone: pick(r, 'phone', 'mobile', 'tel'), email: pick(r, 'mail') })); return addImported(rows); }
  try { const j = JSON.parse(await readText(f)); if (!j || !j.profile) throw 0; if (!(await confirmSheet('Restore backup?', 'This replaces your current LifeHub data (your sign-in method stays the same).', 'Restore', true))) return; const auth = S.auth; S = { ...seed(j.profile.name, j.profile.region, false), ...j, auth }; save(); render(); toast('Backup restored'); }
  catch (e) { toast('That file is not a LifeHub backup'); }
}

/* ---------- calendar, work schedule, location ---------- */
const SRC_ICON = { bill: 'zap', medical: 'cross', banking: 'bank', budget: 'bank', birthday: 'star', social: 'share', app: 'grid', shift: 'clock', manual: 'cal', import: 'download' };
const REMIND = [['', 'No reminder'], ['0', 'At the time'], ['15', '15 minutes before'], ['30', '30 minutes before'], ['60', '1 hour before'], ['1440', '1 day before']];
const JOB_COLORS = ['#1d4ed8', '#0f766e', '#d97706', '#7c3aed', '#be123c', '#0891b2'];
const WDAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 0]];
const DAYNAMES = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
const DEMO_PLACES = [
  { label: 'Cataract Gorge', lat: -41.4462, lng: 147.1186 },
  { label: 'UTAS Stadium', lat: -41.4258, lng: 147.1386 },
  { label: 'Civic Square', lat: -41.4352, lng: 147.1374 },
  { label: 'Kings Meadows', lat: -41.4694, lng: 147.1622 },
  { label: 'Invermay', lat: -41.4185, lng: 147.1468 },
];
let calView = 'month';
let calCursor = '';
let work = null;
let locMap = null;
let leafletP = null;
let locMe = null;

function fmtWhen(ev) {
  const day = fmtDay(ev.start.slice(0, 10));
  if (ev.allDay) return day + ' · all day';
  const endExtra = ev.end.slice(0, 10) !== ev.start.slice(0, 10) ? ' +1' : '';
  return `${day} · ${fmtClock(ev.start.slice(11, 16))}–${fmtClock(ev.end.slice(11, 16))}${endExtra}`;
}
function rangesOverlap(a, b) { return !!(a && b && a.start < b.end && b.start < a.end); }
function onDay(ev, day) { const a = day + 'T00:00', b = addDays(day, 1) + 'T00:00'; return ev.start < b && ev.end > a; }
function pairKey(a, b) { const ka = a.id + '@' + a.start, kb = b.id + '@' + b.start; return ka < kb ? ka + '|' + kb : kb + '|' + ka; }
function findConflicts() {
  const ev = (S.events || []).filter(e => !e.hidden);
  const pairs = [];
  for (let i = 0; i < ev.length; i++) for (let j = i + 1; j < ev.length; j++) if (rangesOverlap(ev[i], ev[j])) pairs.push([ev[i], ev[j]]);
  return pairs;
}
function activePairs() {
  const gone = new Set((S && S.cal && S.cal.dismissed) || []);
  return findConflicts().filter(([a, b]) => !gone.has(pairKey(a, b)));
}
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
  out.push({ id: autoId(key), sourceKey: key, auto: true, hidden: false, allDay: false, loc: '', notes: '', color: '#1d4ed8', reminderMin: null, ...ev });
}
function socialTextEvent(n) {
  const text = n.text || '';
  const m = text.match(/event reminder:\s*(.+)$/i);
  if (!m) return null;
  const title = m[1].replace(/\s+is\s+(tomorrow|today)\s*$/i, '').trim() || 'Social event';
  const today = hobartToday();
  const day = /tomorrow/i.test(text) ? addDays(today, 1) : today;
  return { title, start: day + 'T10:00', end: day + 'T16:00' };
}
function syncAutoEvents() {
  const out = [];
  const today = hobartToday();
  (S.bills || []).forEach(b => {
    if (!b.due || b.paid || b.type === 'credit') return;
    pushAuto(out, 'bill_' + b.id, { title: 'Bill due: ' + b.provider, start: b.due + 'T00:00', end: addDays(b.due, 1) + 'T00:00', allDay: true, source: 'bill', sourceLabel: 'Utilities', color: '#d97706', reminderMin: (Number(b.remindDays) || 0) * 1440 });
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
      pushAuto(out, 'pay_' + p.id + '_' + d, { title: `${p.name} · ${money(p.amount)}`, start: d + 'T00:00', end: addDays(d, 1) + 'T00:00', allDay: true, source: 'banking', sourceLabel: 'Banking', color: '#0f766e', reminderMin: 1440 });
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
    pushAuto(out, 'social_' + n.id, { title: title || n.text || 'Social event', start, end, source: 'social', sourceLabel: 'Social', color: '#db2777', reminderMin: 60 });
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
      pushAuto(out, 'bbill_' + b.id + '_' + ym, { title: 'Budget bill: ' + b.name, start: date + 'T00:00', end: addDays(date, 1) + 'T00:00', allDay: true, source: 'budget', sourceLabel: 'Budget', color: '#0f766e', reminderMin: 1440, notes: money(b.amount, S.budget.currency) });
      ym = shiftMonth(ym, 1);
    }
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
function ensureHub() {
  if (!S.medical) return;
  if (!Array.isArray(S.medical.appointments)) S.medical.appointments = [];
  if (!Array.isArray(S.events)) S.events = [];
  if (!Array.isArray(S.jobs)) S.jobs = [];
  if (!Array.isArray(S.scheduled)) S.scheduled = [];
  if (!S.cal || typeof S.cal !== 'object') S.cal = {};
  ['dismissed', 'alerted', 'notices', 'fired'].forEach(k => { if (!Array.isArray(S.cal[k])) S.cal[k] = []; });
  if (!S.cal.skip || typeof S.cal.skip !== 'object') S.cal.skip = {};
  if (!S.cal.linked || typeof S.cal.linked !== 'object') S.cal.linked = {};
  (S.contacts || []).forEach(c => { if (c.birthday == null) c.birthday = ''; if (typeof c.premium !== 'boolean') c.premium = false; });
  (S.apps || []).forEach(a => { if (a.nextOn == null) a.nextOn = ''; });
  const bannersChanged = ensureBanners();
  const budgetChanged = ensureBudget();
  const docsChanged = ensureDocs();
  const before = eventSig(S.events);
  syncAutoEvents();
  if (bannersChanged || budgetChanged || docsChanged || eventSig(S.events) !== before || tidyLoc()) save();
}
function announceConflicts() {
  if (!unlocked || !S || !S.cal) return;
  let changed = false;
  activePairs().forEach(([a, b]) => {
    const k = pairKey(a, b);
    if (S.cal.alerted.includes(k)) return;
    S.cal.alerted.push(k);
    S.cal.notices.unshift({ id: uid(), text: `${a.title} overlaps ${b.title}`, t: Date.now(), k });
    changed = true;
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('LifeHub: schedule overlap', { body: `${a.title} overlaps ${b.title}`, icon: 'icons/icon-192.png' }); } catch (e) {}
  });
  if (S.cal.notices.length > 30) S.cal.notices.length = 30;
  if (changed) { save(); setTimeout(() => toast('Schedule overlap. Open Calendar to sort it out.'), 350); }
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
    S.cal.fired.push(key); changed = true;
    setTimeout(() => toast('Reminder: ' + e.title), 400);
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('LifeHub reminder', { body: e.title + '\n' + fmtWhen(e), icon: 'icons/icon-192.png' }); } catch (err) {}
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
    out.push({ title: val('SUMMARY') || 'Imported event', start, end, allDay, loc: val('LOCATION') });
  });
  return out;
}
function cursor() { if (!calCursor) calCursor = hobartToday(); return calCursor; }
function eventRow(e) {
  return `<button class="li" data-act="openEvent" data-id="${e.id}"><span class="evdot" style="background:${esc(e.color || '#1d4ed8')}"></span><span class="grow"><b>${esc(e.title)}</b><span>${esc(fmtWhen(e))}${e.loc ? ' · ' + esc(e.loc) : ''}</span></span><span class="tag">${ic(SRC_ICON[e.source] || 'cal', 14)} ${esc(e.sourceLabel || 'Event')}</span></button>`;
}
function dayEvents(day) { return S.events.filter(e => !e.hidden && onDay(e, day)).sort((a, b) => a.start.localeCompare(b.start)); }
function clashBlock(pairs) {
  if (!pairs.length) return '';
  const victim = (a, b) => (a.auto ? 2 : a.source === 'shift' ? 0 : 1) <= (b.auto ? 2 : b.source === 'shift' ? 0 : 1) ? a : b;
  return `<section class="clash" id="clashes" data-role="clash"><h3>${ic('alert', 18)} ${pairs.length} overlap${pairs.length === 1 ? '' : 's'}</h3>
    ${pairs.slice(0, 8).map(([a, b]) => { const del = victim(a, b); return `<div class="clash-row"><b>${esc(a.title)}</b> overlaps <b>${esc(b.title)}</b><div class="small">${esc(fmtWhen(a))}</div>
      <div class="row gap wrap" style="margin-top:8px"><button class="btn sm" data-act="keepPair" data-a="${a.id}" data-b="${b.id}">Keep both</button><button class="btn sm" data-act="movePair" data-a="${a.id}" data-b="${b.id}">Move</button><button class="btn sm danger" data-act="deleteEv" data-id="${del.id}">${del.auto ? 'Hide' : 'Delete'} ${esc(del.title)}</button></div></div>`; }).join('')}
    ${pairs.length > 8 ? `<p class="small">And ${pairs.length - 8} more. Resolve these and the rest will show.</p>` : ''}
    <button class="btn sm" data-act="askClashNotify" style="margin-top:8px">${ic('bell', 16)} Notify me about overlaps</button></section>`;
}
function noticesBlock() {
  const notes = (S.cal.notices || []).slice(0, 5);
  if (!notes.length) return '';
  return `<div class="sec-h"><h2>Notifications</h2></div><div class="list">${notes.map(n => `<div class="li">${ic('bell')}<span class="grow"><b>${esc(n.text)}</b><span>${fmtTime(n.t)}</span></span><button class="iconbtn" style="box-shadow:none;width:36px;height:36px" data-act="dismissNotice" data-id="${n.id}" aria-label="Dismiss notification">${ic('x', 16)}</button></div>`).join('')}</div>`;
}
function monthCells(iso) {
  const [y, m] = iso.split('-').map(Number);
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const lead = (wdIndex(first) + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('');
  for (let d = 1; d <= days; d++) cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7) cells.push('');
  return cells;
}
function monthLabel(iso) { const [y, m] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }); }
function navRow(label, mode) {
  const prev = mode === 'month' ? 'data-m="-1"' : 'data-d="-7"';
  const next = mode === 'month' ? 'data-m="1"' : 'data-d="7"';
  return `<div class="cal-nav"><button class="iconbtn" data-act="calNav" ${prev} aria-label="Previous">${ic('back')}</button><b>${esc(label)}</b><button class="iconbtn" data-act="calNav" data-today="1" aria-label="Today">${ic('cal', 18)}</button><button class="iconbtn" data-act="calNav" ${next} aria-label="Next">${ic('chev')}</button></div>`;
}
function monthView(day) {
  const cells = monthCells(day);
  const today = hobartToday();
  const grid = cells.map(d => {
    if (!d) return '<span class="cal-day" style="visibility:hidden"></span>';
    const ev = dayEvents(d).slice(0, 3);
    return `<button class="cal-day ${d === today ? 'today' : ''} ${d === day ? 'on' : ''}" data-act="calDay" data-d="${d}" aria-current="${d === today ? 'date' : 'false'}" aria-label="${esc(fmtDay(d))}"><span class="n">${Number(d.slice(8))}</span><span class="dots">${ev.map(e => `<i class="dot" style="background:${esc(e.color || '#1d4ed8')}"></i>`).join('')}</span></button>`;
  }).join('');
  const list = dayEvents(day);
  return `${navRow(monthLabel(day), 'month')}<div class="cal-grid cal-dow">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<span>${d}</span>`).join('')}</div><div class="cal-grid">${grid}</div>
    <div class="sec-h"><h2>${esc(fmtDay(day))}${day === today ? ' · today' : ''}</h2></div><div class="list">${list.length ? list.map(eventRow).join('') : '<p class="empty">Nothing on this day</p>'}</div>`;
}
function weekView(day) {
  const start = mondayOf(day);
  const today = hobartToday();
  const rows = WDAYS.map(([name, i], idx) => {
    const d = addDays(start, idx);
    const list = dayEvents(d);
    return `<div class="sec-h"><h2>${name} ${Number(d.slice(8))}${d === today ? ' · today' : ''}</h2></div><div class="list">${list.length ? list.map(eventRow).join('') : '<p class="empty">Nothing scheduled</p>'}</div>`;
  }).join('');
  return navRow('Week of ' + fmtDay(start), 'week') + rows;
}
function agendaView(day) {
  const end = addDays(day, 45);
  const items = S.events.filter(e => !e.hidden && e.end > day + 'T00:00' && e.start < end + 'T00:00').sort((a, b) => a.start.localeCompare(b.start));
  if (!items.length) return '<p class="empty">Nothing coming up. Add an event or set up your work schedule.</p>';
  let html = '', last = '';
  items.forEach(e => {
    const d = e.start.slice(0, 10);
    if (d !== last) { if (last) html += '</div>'; html += `<div class="sec-h"><h2>${esc(fmtDay(d))}${d === hobartToday() ? ' · today' : ''}</h2></div><div class="list">`; last = d; }
    html += eventRow(e);
  });
  return html + '</div>';
}
function importBlock() {
  const linked = S.cal.linked || {};
  return `<div class="row gap wrap" style="margin:4px 0 12px"><a class="btn" href="#/calendar/work">${ic('clock', 18)} Work schedule</a><a class="btn" href="#/location">${ic('pin', 18)} Location</a><button class="btn" data-act="importIcs">${ic('upload', 16)} Import .ics</button></div>
    <div class="sec-h"><h2>Link a calendar</h2></div><p class="demoline"><span class="tag amber">Demo</span> Nothing is read from Google, Outlook or Apple.</p><div class="list">${['Google', 'Outlook', 'Apple'].map(n => `<button class="li" data-act="linkCal" data-name="${n}">${ic('link')}<span class="grow"><b>${n} Calendar</b><span>${linked[n] ? 'Sample event added on this device' : 'Nothing is read from ' + n}</span></span><span class="tag amber">Demo</span></button>`).join('')}</div>
    <p class="footnote">Bills, budget bills, appointments, medication times, scheduled payments, birthdays, social events and dated apps appear here automatically. Hide one, or turn it into a normal event.</p>`;
}
function renderCalendar() {
  const day = cursor();
  const pairs = activePairs();
  const btn = (v, label) => `<button type="button" class="${calView === v ? 'on' : ''}" data-act="calView" data-v="${v}">${label}</button>`;
  const hidden = S.events.filter(e => e.hidden);
  const body = `<div data-screen="calendar"><div class="seg" style="margin-bottom:12px" role="tablist" aria-label="Calendar view">${btn('month', 'Month')}${btn('week', 'Week')}${btn('agenda', 'Agenda')}</div>
    ${clashBlock(pairs)}${noticesBlock()}${calView === 'month' ? monthView(day) : calView === 'week' ? weekView(day) : agendaView(day)}
    ${importBlock()}${hidden.length ? `<div class="sec-h"><h2>Hidden</h2></div><div class="list">${hidden.map(e => `<div class="li"><span class="grow"><b>${esc(e.title)}</b><span>${esc(e.sourceLabel || '')}</span></span><button class="btn sm" data-act="showAuto" data-id="${e.id}">Show</button></div>`).join('')}</div>` : ''}</div>`;
  return screen({ title: 'Calendar', body, right: `<button class="iconbtn" data-act="addEvent" aria-label="Add event">${ic('plus')}</button>` });
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
  save(); announceConflicts(); render(); toast('Saved');
}
function deleteEv(id) {
  const e = S.events.find(x => x.id === id); if (!e) return;
  if (e.auto) { e.hidden = true; toast('Hidden from the calendar'); } else { S.events = S.events.filter(x => x.id !== id); toast('Deleted'); }
  save(); render();
}
function keepPair(aId, bId) {
  const a = S.events.find(x => x.id === aId), b = S.events.find(x => x.id === bId); if (!a || !b) return;
  const k = pairKey(a, b); if (!S.cal.dismissed.includes(k)) S.cal.dismissed.push(k);
  save(); render(); toast('Kept both');
}
function movePair(aId, bId) {
  const a = S.events.find(x => x.id === aId), b = S.events.find(x => x.id === bId);
  const manual = [a, b].find(e => e && !e.auto);
  if (manual) editManual(manual); else toast('Edit that item in Medical, Utilities, Banking or Contacts, or hide one of them.');
}
function convertAuto(id) {
  const e = S.events.find(x => x.id === id); if (!e) return;
  if (e.sourceKey) S.cal.skip[e.sourceKey] = true;
  S.events.push({ ...e, id: uid(), auto: false, source: 'manual', sourceLabel: 'Calendar', converted: true, hidden: false });
  syncAutoEvents(); save(); render(); toast('Kept as a normal event');
}
function openEvent(id) { const e = S.events.find(x => x.id === id); if (!e) return; if (e.auto) autoSheet(e); else editManual(e); }
function autoSheet(e) {
  openSheet(`<h2>${esc(e.title)}</h2><p class="muted">${esc(fmtWhen(e))}</p><p class="small">From ${esc(e.sourceLabel || 'LifeHub')}. This stays in step when that information changes.</p>
    <label class="fld"><span>Reminder</span><select id="rem">${REMIND.map(([v, l]) => `<option value="${v}" ${String(e.reminderMin ?? '') === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <button class="btn primary full" id="remSave">Save reminder</button>
    <button class="btn full" id="toManual" style="margin-top:8px">Make this a normal event</button>
    <button class="btn ghost danger full" id="hideEv" style="margin-top:8px">Hide</button>`, el => {
    $('#remSave', el).onclick = () => { const v = $('#rem', el).value; e.reminderMin = v === '' ? null : Number(v); e.reminderTouched = true; if (e.reminderMin != null) askNotify(); save(); closeSheet(true); render(); toast('Reminder saved'); };
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
  openSheet(`<h2>${existing ? 'Edit event' : 'New event'}</h2><form id="evForm">
    <label class="fld"><span>Title</span><input name="title" required value="${esc(base.title || '')}" placeholder="e.g. Dentist"></label>
    <label class="fld"><span>Date</span><input name="date" type="date" required value="${esc(date)}"></label>
    <label class="fld chk"><input name="allDay" type="checkbox" ${allDay ? 'checked' : ''}><span>All day</span></label>
    <div class="row gap"><label class="fld" style="flex:1"><span>Start</span><input name="startTime" type="time" value="${esc(startTime)}"></label><label class="fld" style="flex:1"><span>End</span><input name="endTime" type="time" value="${esc(endTime)}"></label></div>
    <label class="fld"><span>Place</span><input name="loc" value="${esc(base.loc || '')}" placeholder="Optional"></label>
    <label class="fld"><span>Notes</span><textarea name="notes">${esc(base.notes || '')}</textarea></label>
    <label class="fld"><span>Reminder</span><select name="reminderMin">${REMIND.map(([v, l]) => `<option value="${v}" ${reminder === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <div class="row gap"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary" type="submit">Save</button></div>
    ${existing ? '<button type="button" class="btn ghost danger full" id="evDel" style="margin-top:8px">Delete</button>' : ''}</form>`, el => {
    const form = $('#evForm', el);
    const syncDis = () => { form.startTime.disabled = form.allDay.checked; form.endTime.disabled = form.allDay.checked; };
    form.allDay.onchange = syncDis; syncDis();
    form.onsubmit = e => {
      e.preventDefault();
      const title = form.title.value.trim(); if (!title) return toast('Add a title');
      const day = form.date.value; if (!day) return toast('Choose a date');
      const isAll = form.allDay.checked;
      let start, end;
      if (isAll) { start = day + 'T00:00'; end = addDays(day, 1) + 'T00:00'; }
      else { if (!form.startTime.value || !form.endTime.value) return toast('Add a start and end'); const sp = span(day, form.startTime.value, form.endTime.value); start = sp.start; end = sp.end; }
      const ev = { id: existing ? existing.id : uid(), title, start, end, allDay: isAll, loc: form.loc.value.trim(), notes: form.notes.value.trim(), reminderMin: form.reminderMin.value === '' ? null : Number(form.reminderMin.value), source: existing && existing.source === 'shift' ? 'shift' : 'manual', sourceLabel: existing && existing.source === 'shift' ? 'Work' : 'Calendar', auto: false, hidden: false, color: (existing && existing.color) || '#1d4ed8', jobId: (existing && existing.jobId) || '' };
      const back = { title, date: day, startTime: form.startTime.value, endTime: form.endTime.value, allDay: isAll, loc: ev.loc, notes: ev.notes, reminderMin: ev.reminderMin };
      const hits = S.events.filter(o => o.id !== ev.id && !o.hidden && rangesOverlap(ev, o));
      if (!hits.length) { closeSheet(true); commitEvent(ev); return; }
      openSheet(`<h2>These overlap</h2><p><b>${esc(ev.title)}</b> overlaps something already on your calendar.</p><div class="list">${hits.slice(0, 6).map(h => `<div class="li"><span class="grow"><b>${esc(h.title)}</b><span>${esc(fmtWhen(h))}</span></span></div>`).join('')}</div>
        <button class="btn primary full" id="keepBoth">Keep both</button><button class="btn full" id="changeTime" style="margin-top:8px">Change the time</button><button class="btn ghost full" id="dropEv" style="margin-top:8px">Don't save</button>`, el2 => {
        $('#keepBoth', el2).onclick = () => { closeSheet(true); commitEvent(ev); };
        $('#changeTime', el2).onclick = () => { closeSheet(true); editManual(existing, back); };
        $('#dropEv', el2).onclick = () => closeSheet();
      });
    };
    const del = $('#evDel', el); if (del) del.onclick = () => { closeSheet(true); deleteEv(existing.id); };
  });
}
async function importIcs() {
  const f = await pickFile('.ics,text/calendar'); if (!f) return;
  const evs = parseICS(await readText(f));
  if (!evs.length) return toast('No events found in that file');
  evs.forEach(e => S.events.push({ ...e, id: uid(), source: 'import', sourceLabel: 'Imported', auto: false, hidden: false, color: '#475569', reminderMin: 30, notes: '', loc: e.loc || '' }));
  save(); announceConflicts(); render(); toast(`Imported ${evs.length} event${evs.length === 1 ? '' : 's'}`);
}
function linkCalendarSilent(name) {
  if (!S.cal.linked) S.cal.linked = {};
  if (S.cal.linked[name]) return false;
  S.cal.linked[name] = true;
  const day = addDays(hobartToday(), 3);
  S.events.push({ id: uid(), title: name + ' sample: Team catch-up', start: day + 'T14:00', end: day + 'T14:45', allDay: false, source: 'import', sourceLabel: name, auto: false, hidden: false, color: '#64748b', reminderMin: 15, loc: '', notes: 'Demo event. Nothing was read from ' + name + '.' });
  return true;
}
function linkExternal(name) {
  if (!linkCalendarSilent(name)) return toast(name + ' is already linked (demo)');
  save(); announceConflicts(); render(); toast(name + ' linked (demo)');
}
function apptSection() {
  const arr = S.medical.appointments || [];
  return `<div class="sec-h"><h2>Appointments</h2><button class="btn sm" data-act="addAppt">${ic('plus', 16)} Add</button></div><div class="list">${arr.length ? arr.map(a => `<button class="li" data-act="editAppt" data-id="${a.id}"><span class="grow"><b>${esc(a.title)}</b><span>${esc(fmtWhen(a))}${a.place ? ' · ' + esc(a.place) : ''}</span></span>${ic('edit', 18)}</button>`).join('') : '<p class="empty">No appointments yet. Add one and it shows on your calendar.</p>'}</div>`;
}
function editAppt(id) {
  const a = id && (S.medical.appointments || []).find(x => x.id === id);
  const date = a ? a.start.slice(0, 10) : hobartToday();
  const start = a ? a.start.slice(11, 16) : '10:00';
  const end = a ? a.end.slice(11, 16) : '10:30';
  formSheet({ title: a ? 'Edit appointment' : 'Add appointment', fields: [{ k: 'title', label: 'Appointment', req: true, ph: 'e.g. GP checkup' }, { k: 'date', label: 'Date', type: 'date', req: true }, { k: 'start', label: 'Start', type: 'time', req: true }, { k: 'end', label: 'End', type: 'time', req: true }, { k: 'place', label: 'Place' }, { k: 'notes', label: 'Notes', type: 'textarea' }],
    values: { title: a ? a.title : '', date, start, end, place: a ? a.place || '' : '', notes: a ? a.notes || '' : '' },
    onSave: v => { if (!v.date || !v.start || !v.end) { toast('Add a date and times'); return false; } const sp = span(v.date, v.start, v.end); const row = { title: v.title, start: sp.start, end: sp.end, place: v.place, notes: v.notes }; if (a) Object.assign(a, row); else S.medical.appointments.push({ id: uid(), ...row }); toast('Appointment saved'); },
    danger: a ? { label: 'Delete appointment', fn: () => { S.medical.appointments = S.medical.appointments.filter(x => x.id !== id); } } : null });
}
function schedSection() {
  const rows = (S.scheduled || []).map(p => `<button class="li" data-act="editSched" data-id="${p.id}"><span class="grow"><b>${esc(p.name)}</b><span>${esc(p.every)} · next ${esc(fmtDay(p.next))}</span></span><span class="amt">${money(p.amount)}</span></button>`).join('');
  return `<div class="sec-h"><h2>Scheduled payments</h2><button class="btn sm" data-act="addSched">${ic('plus', 16)} Add</button></div><div class="list">${rows || '<p class="empty">Add rent, a loan or a transfer and it appears on your calendar. This does not move any money.</p>'}</div>`;
}
function editSched(id) {
  const p = id && (S.scheduled || []).find(x => x.id === id);
  formSheet({ title: p ? 'Edit scheduled payment' : 'Scheduled payment', intro: 'Demo reminder only. No money leaves your account.', fields: [{ k: 'name', label: 'What is it?', req: true, ph: 'e.g. Rent' }, { k: 'amount', label: 'Amount', type: 'number', step: '0.01', req: true, im: 'decimal' }, { k: 'every', label: 'Repeats', type: 'select', options: [['weekly', 'Every week'], ['fortnight', 'Every fortnight'], ['monthly', 'Every month']] }, { k: 'next', label: 'Next date', type: 'date', req: true }],
    values: p || { every: 'fortnight', next: hobartToday() },
    onSave: v => { if (!(v.amount > 0) || !v.next) { toast('Add an amount and a date'); return false; } v.amount = Math.abs(v.amount); if (p) Object.assign(p, v); else S.scheduled.push({ id: uid(), ...v }); toast('Saved to your calendar'); },
    danger: p ? { label: 'Delete schedule', fn: () => { S.scheduled = S.scheduled.filter(x => x.id !== id); } } : null });
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
  return { id: uid(), title: title || job.name, start: sp.start, end: sp.end, allDay: false, source: 'shift', sourceLabel: 'Work', auto: false, hidden: false, color: job.color, jobId: job.id, loc: '', notes: '', reminderMin: 60 };
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
  if (!drafts.length) return toast('Nothing to add. Check the days and times.');
  const clashes = drafts.map(d => ({ d, hits: S.events.filter(e => !e.hidden && rangesOverlap(d, e)) })).filter(x => x.hits.length);
  const go = () => { drafts.forEach(d => S.events.push(d)); save(); announceConflicts(); workState().step = 'menu'; location.hash = '#/calendar'; toast(`Added ${drafts.length} shift${drafts.length === 1 ? '' : 's'}`); };
  if (!clashes.length) return go();
  openSheet(`<h2>Some shifts overlap</h2><p>${clashes.length} of ${drafts.length} overlap something already on your calendar.</p><div class="list">${clashes.slice(0, 6).map(c => `<div class="li"><span class="grow"><b>${esc(c.d.title)}</b><span>${esc(fmtWhen(c.d))} overlaps ${esc(c.hits[0].title)}</span></span></div>`).join('')}</div>
    <div class="row gap"><button class="btn" id="noAdd">Go back</button><button class="btn primary" id="yesAdd">Keep both</button></div>`, el => {
    $('#noAdd', el).onclick = () => closeSheet();
    $('#yesAdd', el).onclick = () => { closeSheet(true); go(); };
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
  if (!shifts.length) return toast('No shifts last week to copy');
  const drafts = shifts.map(s => { const j = S.jobs.find(x => x.id === s.jobId) || selectedJob() || { id: s.jobId || uid(), name: s.title, color: s.color || '#0f766e' }; return shiftEvent(j, addDays(s.start.slice(0, 10), 7), s.start.slice(11, 16), s.end.slice(11, 16), s.title); });
  confirmDrafts(drafts);
}
function newJob() {
  openSheet(`<h2>New job</h2><label class="fld"><span>Job name</span><input id="jn" placeholder="e.g. Warehouse, Office"></label><div class="swatches" id="jcols">${JOB_COLORS.map((c, i) => `<button type="button" class="sw ${i === 0 ? 'on' : ''}" style="background:${c}" data-c="${c}" aria-label="Colour ${i + 1}"></button>`).join('')}</div><button class="btn primary full" id="jok">Add job</button>`, el => {
    let col = JOB_COLORS[0];
    $$('.sw', el).forEach(b => b.onclick = () => { col = b.dataset.c; $$('.sw', el).forEach(x => x.classList.remove('on')); b.classList.add('on'); });
    $('#jok', el).onclick = () => { const name = $('#jn', el).value.trim(); if (!name) return toast('Add a job name'); const j = { id: uid(), name, color: col }; S.jobs.push(j); workState().jobId = j.id; save(); closeSheet(true); render(); toast('Job added'); };
  });
}
async function importRoster() {
  const f = await pickFile('.ics,.csv,.txt,text/calendar,text/csv,text/plain'); if (!f) return;
  const txt = await readText(f); const job = selectedJob();
  if (/BEGIN:VCALENDAR/i.test(txt)) {
    if (!job) return toast('Add a job first');
    const evs = parseICS(txt).map(e => ({ id: uid(), title: e.title || job.name, start: e.start, end: e.end, allDay: !!e.allDay, source: 'shift', sourceLabel: 'Work', auto: false, hidden: false, color: job.color, jobId: job.id, loc: e.loc || '', notes: '', reminderMin: 60 }));
    return confirmDrafts(evs);
  }
  workState().text = ((workState().text ? workState().text + '\n' : '') + txt).trim();
  workState().mode = 'paste'; workState().step = 'form'; render();
}
function renderWork() {
  const w = workState();
  if (!S.jobs.length) {
    const body = `<div data-screen="work"><h2 style="font-size:1.3rem;margin-bottom:6px">Add my work schedule</h2><p class="muted">Start with the job, then pick an easy pattern.</p><button class="btn primary full" data-act="newJob">${ic('plus', 18)} Add a job</button></div>`;
    return screen({ title: 'Work schedule', back: '#/calendar', body });
  }
  if (!w.jobId || !S.jobs.some(j => j.id === w.jobId)) w.jobId = S.jobs[0].id;
  const job = S.jobs.find(j => j.id === w.jobId);
  if (w.step !== 'form') {
    const body = `<div data-screen="work"><h2 style="font-size:1.3rem;margin-bottom:6px">Add my work schedule</h2><p class="muted">Choose the job, then a pattern you can live with. Shifts are checked against the rest of your calendar.</p>
      <div class="sec-h"><h2>Job</h2><button class="linkbtn" data-act="newJob">New job</button></div>
      <div class="list">${S.jobs.map(j => `<button class="li" data-act="pickJob" data-id="${j.id}"><span class="evdot" style="background:${j.color}"></span><span class="grow"><b>${esc(j.name)}</b><span>${j.id === job.id ? 'Selected' : 'Tap to use this job'}</span></span>${j.id === job.id ? ic('check') : ''}</button>`).join('')}</div>
      <button class="btn primary full" data-act="workGo" data-m="95">9–5, Monday to Friday</button>
      <button class="btn full" style="margin-top:8px" data-act="workGo" data-m="rotate">Rotating roster</button>
      <button class="btn full" style="margin-top:8px" data-act="workGo" data-m="night">Night shift, Monday to Friday</button>
      <button class="btn full" style="margin-top:8px" data-act="workGo" data-m="build">Build my own week</button>
      <button class="btn full" style="margin-top:8px" data-act="workGo" data-m="quick">Add one shift</button>
      <button class="btn full" style="margin-top:8px" data-act="workGo" data-m="paste">Paste or import a roster</button>
      <button class="btn ghost full" style="margin-top:8px" data-act="copyWeek">${ic('download', 18)} Copy last week</button>
      <p class="footnote">Paste lines such as Mon 7:00-15:30, or a CSV of date, start, end, title. .ics files work too.</p></div>`;
    return screen({ title: 'Work schedule', back: '#/calendar', body });
  }
  const help = { '95': 'Weekdays, 9:00am to 5:00pm, from today until the date you pick.', rotate: 'Weekdays alternate: one week 7:00am–3:30pm, the next 3:00pm–11:00pm.', night: 'Weekdays 10:00pm to 6:00am the next morning.', build: 'Tap the days you work and set one start and finish.', quick: 'Just this one shift.', paste: 'One shift per line. Examples: Mon 7:00-15:30 or 2026-11-02,09:00,17:30,Office.' }[w.mode] || '';
  const drafts = buildDrafts();
  const hits = drafts.filter(d => S.events.some(e => !e.hidden && rangesOverlap(d, e))).length;
  const body = `<div data-screen="work"><button class="btn sm" data-act="workBack">${ic('back', 16)} Patterns</button>
    <h2 style="font-size:1.25rem;margin:12px 0 6px">${esc(job.name)}</h2><p class="muted">${esc(help)}</p>
    ${w.mode === 'build' ? `<div class="days" role="group" aria-label="Days worked">${WDAYS.map(([n, i]) => `<button type="button" class="${w.days.includes(i) ? 'on' : ''}" data-act="workDay" data-d="${i}" aria-pressed="${w.days.includes(i)}">${n}</button>`).join('')}</div>` : ''}
    ${w.mode === 'build' || w.mode === 'quick' ? `<div class="row gap"><label class="fld" style="flex:1"><span>Start</span><input id="workStart" type="time" value="${esc(w.start)}"></label><label class="fld" style="flex:1"><span>End</span><input id="workEnd" type="time" value="${esc(w.end)}"></label></div>` : ''}
    ${w.mode === 'quick' ? `<label class="fld"><span>Date</span><input id="workDate" type="date" value="${esc(w.date)}"></label>` : ''}
    ${w.mode !== 'quick' ? `<label class="fld"><span>Repeat until</span><input id="workUntil" type="date" value="${esc(w.until)}"></label>` : ''}
    ${w.mode === 'paste' ? `<label class="fld"><span>Roster</span><textarea id="workText" placeholder="Mon 7:00-15:30&#10;Tue 7:00-15:30">${esc(w.text)}</textarea></label><button class="btn sm" data-act="importRoster">${ic('upload', 16)} Import file</button><button class="btn sm" data-act="workPreview">Preview</button>` : ''}
    <div class="card"><h3>${drafts.length} shift${drafts.length === 1 ? '' : 's'}${hits ? ` · ${hits} overlap` : ''}</h3>${drafts.slice(0, 6).map(d => `<div class="small" style="margin:4px 0">${esc(fmtWhen(d))}</div>`).join('') || '<p class="small muted">Nothing matches yet.</p>'}${drafts.length > 6 ? `<div class="small muted">And ${drafts.length - 6} more.</div>` : ''}</div>
    <button class="btn primary full" data-act="workSave">Add these shifts</button></div>`;
  return { html: screen({ title: 'Work schedule', back: '#/calendar', body }), after: () => {} };
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
  if (!S.loc.ids.length) return toast('Tick at least one Premium contact');
  if (!S.loc.mode) return toast('Choose how long to share');
  S.loc.on = true; S.loc.until = S.loc.mode === '1h' ? Date.now() + 3600000 : null; save(); render();
  toast('Sharing with ' + shareNames().map(c => c.name.split(' ')[0]).join(', '));
}
function locStop() { S.loc.on = false; S.loc.until = null; save(); render(); toast('Sharing stopped'); }
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
  L.circleMarker([me.lat, me.lng], { radius: 11, color: '#fff', weight: 2, fillColor: '#d61f1f', fillOpacity: 1 }).addTo(locMap).bindPopup(me.demo ? 'Sample pin · Launceston' : 'You');
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
  if (me.demo) { el.textContent = 'Showing a sample pin in Launceston. Allow location to use where you actually are.'; return; }
  el.textContent = `${me.lat.toFixed(5)}, ${me.lng.toFixed(5)}${me.acc ? ' (±' + Math.round(me.acc) + ' m)' : ''}`;
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + me.lat + '&lon=' + me.lng, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    clearTimeout(t); if (!r.ok) return; const j = await r.json(); if (j.display_name && $('#locAddr')) $('#locAddr').textContent = j.display_name;
  } catch (e) {}
}
function mountLocation() {
  getPos().then(me => { locMe = me; if (!$('#gmapsYou')) return; fillMapsYou(); fillAddress(me); });
  loadLeaflet().then(async () => { const me = locMe || await getPos(); locMe = me; if (!$('#locMap')) return; drawMap(me); fillMapsYou(); }).catch(() => { const m = $('#locAddr'); if (m) m.textContent = 'The map could not be loaded. The Google Maps buttons still open the app.'; });
}
function renderLocation() {
  if (!isPremium()) {
    const body = `<div class="card lockcard" data-screen="location" data-role="locked"><div class="logo" style="width:64px;height:64px;border-radius:18px;margin:0 auto 12px">${ic('pin', 30)}</div>
      <h2 style="font-size:1.35rem">Location is part of Premium</h2>
      <p class="muted">See where you are on a map. If you want, share that only with LifeHub Premium contacts you tick yourself. Sharing stays off until you start it.</p>
      <p class="small muted">On the Emergency screen, anyone can still show their location to read out to emergency services. That stays free.</p>
      <a class="btn primary full" href="#/plan">${ic('star', 18)} See Premium · ${money(PRICE, 'AUD')}/month</a></div>`;
    return screen({ title: 'Location', body });
  }
  const selected = shareNames();
  const modeBtn = (v, label) => `<button type="button" class="${S.loc.mode === v ? 'on' : ''}" data-act="locMode" data-v="${v}">${label}</button>`;
  const premiumContacts = S.contacts.filter(c => c.premium && !c.blocked);
  const skipped = S.contacts.filter(c => !c.blocked && !c.premium).length;
  const picks = selected.length ? selected.map(c => `<span class="pick">${esc(c.name)} <button type="button" data-act="locRemove" data-id="${c.id}" aria-label="Remove ${esc(c.name)}">${ic('x', 16)}</button></span>`).join('') : '<span class="muted">No one selected yet</span>';
  const list = premiumContacts.length ? premiumContacts.map(c => { const on = S.loc.ids.includes(c.id); return `<button class="li" data-act="locTick" data-id="${c.id}" aria-pressed="${on}">${on ? ic('check') : ic('plus')}<span class="grow"><b>${esc(c.name)}</b><span>${on ? 'Selected' : 'Tap to select'} · demo pin at ${esc(demoPlace(c).label)}</span></span></button>`; }).join('') : '<p class="empty">No Premium contacts yet. Edit a contact and turn on LifeHub Premium (demo) if you want to share with them.</p>';
  const untilTxt = S.loc.mode === '1h' && S.loc.until ? ' until ' + new Date(S.loc.until).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: TZ }) : '';
  const who = selected.map(c => c.name.split(' ')[0]).join(', ');
  const body = `<div data-screen="location">${S.loc.on ? `<div class="share-on" data-role="sharing">${ic('pin', 18)} Sharing is on${esc(untilTxt)} with ${esc(who)}</div>` : `<div class="notice blue">${ic('shield', 18)}<div>Sharing is off. Tick each person, choose how long, then start. There is no option to share with everyone.</div></div>`}
    <div id="locMap" role="region" aria-label="Map"></div><p id="locAddr" class="small" style="margin:0 0 4px">Finding your position…</p>
    <p class="demoline"><span class="tag amber">Demo</span> Other people's pins are simulated on this device, not their real location.</p>
    <p class="small muted">Map data © OpenStreetMap contributors, tiles © OpenStreetMap France.</p>
    <div class="card"><h3>Google Maps</h3><p class="small muted">Opens the Google Maps app on a phone. There is no paid maps key. Coordinates go to Google only when you tap a button.</p><div id="gmapsYou"><p class="small muted">Finding your position…</p></div>
      ${selected.map(c => { const p = demoPlace(c); return `<div class="gmap-who"><b>${esc(c.name)}</b> <span class="tag amber">Demo</span><div class="small muted">${esc(p.label)} · sample pin, not their real location</div>${mapActions(p.lat, p.lng)}</div>`; }).join('')}
      <div id="gmapsFrame"></div></div>
    <div class="card"><h3>Sharing with</h3><div class="picks" id="sharePicks" data-role="share-picks">${picks}</div>
      <div class="seg" style="margin:12px 0" role="group" aria-label="How long to share">${modeBtn('1h', '1 hour')}${modeBtn('until', 'Until I stop')}${modeBtn('always', 'Always')}</div>
      <div class="list">${list}</div>
      ${skipped ? `<p class="small muted">${skipped} contact${skipped === 1 ? " isn't" : "s aren't"} on LifeHub Premium, so they can't be selected.</p>` : ''}
      ${S.loc.on ? '<button class="btn redb full" data-act="locStop">Stop sharing now</button>' : `<button class="btn primary full" data-act="locStart" ${!S.loc.ids.length || !S.loc.mode ? 'disabled' : ''}>Start sharing</button>`}
      <p class="small muted" style="margin:8px 0 0">Only the people in the list above are included. Removing someone, or stopping, takes effect straight away.</p>
    </div></div>`;
  return { html: screen({ title: 'Location', body }), after: mountLocation };
}

/* ---------- budget planner ---------- */
const BUDGET_CURRENCIES = ['AUD', 'USD', 'EUR', 'GBP', 'NZD', 'CAD', 'SGD', 'INR', 'JPY'];
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
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function ensureBudget() {
  let changed = false;
  if (!S.budget || typeof S.budget !== 'object') {
    S.budget = { currency: 'AUD', alertAt: 80, rollover: false, extra: 0, strategy: 'snowball', categories: [], entries: [], goals: [], debts: [], bills: [], seen: {} };
    changed = true;
  }
  ['categories', 'entries', 'goals', 'debts', 'bills'].forEach(k => { if (!Array.isArray(S.budget[k])) { S.budget[k] = []; changed = true; } });
  if (!S.budget.seen || typeof S.budget.seen !== 'object') { S.budget.seen = {}; changed = true; }
  if (!S.budget.currency) { S.budget.currency = 'AUD'; changed = true; }
  if (!S.budget.categories.length) {
    const defs = [['Pay', 'income', ''], ['Other income', 'income', ''], ['Housing', 'expense', 'needs'], ['Groceries', 'expense', 'needs'], ['Transport', 'expense', 'needs'], ['Bills & utilities', 'expense', 'needs'], ['Health', 'expense', 'needs'], ['Eating out', 'expense', 'wants'], ['Fun', 'expense', 'wants'], ['Shopping', 'expense', 'wants'], ['Savings', 'expense', 'save']];
    S.budget.categories = defs.map(([name, kind, group]) => ({ id: uid(), name, kind, group, limit: 0 }));
    changed = true;
  }
  return changed;
}
const catById = id => (S.budget.categories || []).find(c => c.id === id);
function bm(n) { return money(n, (S.budget && S.budget.currency) || 'AUD'); }
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
    msgs.push(c.name + (over ? ' is over its limit' : ' is near its limit'));
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
  const curOpts = BUDGET_CURRENCIES.map(c => `<option value="${c}" ${c === S.budget.currency ? 'selected' : ''}>${c}</option>`).join('');
  const alerts = exp.filter(c => { const lim = limitFor(c, ym); return lim > 0 && catAmount(c, ym) / lim * 100 >= alertLevel(); });
  const body = `<div class="monthnav"><button class="iconbtn" data-act="budMonth" data-d="-1" aria-label="Previous month">${ic('back')}</button><b>${esc(ymLabel(ym))}</b><button class="iconbtn" data-act="budMonth" data-d="1" aria-label="Next month">${ic('chev')}</button></div>
    <label class="fld"><span>Currency</span><select data-change="budCur" aria-label="Budget currency">${curOpts}</select></label>
    <div class="bsum"><div><span>Income</span><b class="green">${bm(income)}</b></div><div><span>Spent</span><b>${bm(spent)}</b></div><div><span>${cap > 0 ? 'Left in budget' : 'Left after income'}</span><b class="${left < 0 ? 'red' : ''}">${bm(left)}</b></div></div>
    ${alerts.length ? `<div class="notice">${ic('alert', 18)}<div>${alerts.map(c => esc(c.name)).join(', ')} ${alerts.length === 1 ? 'is' : 'are'} near or over the limit.</div></div>` : ''}
    <button class="btn primary full" data-act="budAdd">${ic('plus', 18)} Add income or expense</button>
    <div class="sec-h"><h2>Spending</h2></div>
    <div class="list">${exp.map(c => catSpendRow(c, ym)).join('')}</div>
    <div class="sec-h"><h2>Income</h2></div>
    <div class="list">${inc.map(c => catSpendRow(c, ym)).join('')}</div>
    <div class="sec-h"><h2>Savings goals</h2><button class="btn sm" data-act="budGoal">${ic('plus', 16)} Add</button></div>
    <div class="list">${shown.length ? shown.map(goalRow).join('') : '<p class="empty">No goals yet. A holiday fund or an emergency buffer both fit here.</p>'}</div>
    ${!isPremium() && goals.length > FREE_GOALS ? `<p class="small muted">${goals.length - FREE_GOALS} more goal${goals.length - FREE_GOALS === 1 ? '' : 's'} saved. Premium shows the full list.</p>` : ''}
    ${!isPremium() && goals.length >= FREE_GOALS ? premRow('Unlimited goals', 'Free includes ' + FREE_GOALS + ' goals. Premium removes the cap.') : ''}
    <a class="btn full" href="#/banking/budget/tools" style="margin-top:8px">More tools</a>
    <p class="footnote">Your budget stays on this device. Recurring bills also show on the calendar. Alerts start at ${alertLevel()}% of a limit.</p>`;
  return screen({ title: 'Budget', back: '#/banking', body });
}
function catSpendRow(c, ym) {
  const spent = catAmount(c, ym);
  const lim = c.kind === 'expense' ? limitFor(c, ym) : 0;
  const pct = lim > 0 ? spent / lim * 100 : 0;
  const sub = c.kind === 'income' ? 'Income this month' : lim > 0 ? Math.round(pct) + '% of the monthly budget' + (isPremium() && S.budget.rollover && lim > Number(c.limit) ? ' · includes rollover' : '') : 'Tap to set a monthly limit';
  const right = c.kind === 'income' ? bm(spent) : lim > 0 ? bm(spent) : bm(spent);
  return `<button class="li" data-act="budSpend" data-id="${c.id}"><span class="grow"><b>${esc(c.name)}</b><span>${sub}</span>${c.kind === 'expense' && lim > 0 ? budgetBar(pct) : ''}</span><span class="amt ${c.kind === 'income' ? 'green' : pct >= 100 ? 'red' : ''}">${right}</span></button>`;
}
function goalRow(g) {
  const pct = g.target > 0 ? g.saved / g.target * 100 : 0;
  return `<button class="li" data-act="budGoal" data-id="${g.id}"><span class="grow"><b>${esc(g.name)}</b><span>${bm(g.saved || 0)} saved of ${bm(g.target || 0)}${g.due ? ' · by ' + esc(fmtDay(g.due)) : ''}</span>${budgetBar(pct, 'blue')}</span></button>`;
}
function renderBudgetTools() {
  ensureBudget();
  const ym = bMonth();
  const exp = S.budget.categories.filter(c => c.kind === 'expense');
  const max = Math.max(1, ...exp.map(c => catAmount(c, ym)));
  const chart = exp.filter(c => catAmount(c, ym) > 0).map(c => {
    const n = catAmount(c, ym);
    return `<div class="li" style="display:block"><b>${esc(c.name)}</b><span class="small muted">${bm(n)}</span>${budgetBar(n / max * 100, 'blue')}</div>`;
  }).join('') || '<p class="empty">Add spending and a simple chart shows up here.</p>';
  let trend = premRow('Multi-month trends and forecast', 'See the last 6 months and whether this month is on pace.');
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
    trend = `<div class="card"><h3>Forecast</h3><p style="margin:0">On this pace you will spend about <b>${bm(pace)}</b> in ${esc(ymLabel(ym))}.</p><p class="small muted" style="margin:6px 0 0">Based on ${bm(spentNow)} over ${day} day${day === 1 ? '' : 's'}. A guide only.</p></div>
      <div class="sec-h"><h2>Last 6 months</h2></div><div class="list">${months.map(x => `<div class="li" style="display:block"><b>${esc(ymLabel(x.m))}</b><span class="small muted">${bm(x.spent)}</span>${budgetBar(x.spent / peak * 100, 'blue')}</div>`).join('')}</div>`;
  }
  const bills = S.budget.bills.map(b => `<button class="li" data-act="budBill" data-id="${b.id}"><span class="grow"><b>${esc(b.name)}</b><span>Day ${b.day} · ${esc((catById(b.catId) || {}).name || 'Category')}</span></span><span class="amt">${bm(b.amount)}</span></button>`).join('');
  const cats = S.budget.categories.map(c => `<button class="li" data-act="budCat" data-id="${c.id}">${ic('edit', 18)}<span class="grow"><b>${esc(c.name)}</b><span>${c.kind === 'income' ? 'Income' : 'Expense'}${c.kind === 'expense' && c.limit ? ' · ' + bm(c.limit) + ' / month' : ''}</span></span></button>`).join('');
  const roll = isPremium()
    ? `<label class="list li" style="border:1px solid var(--line)"><span class="grow"><b>Rollover leftover</b><span>Add what you didn't spend last month onto this month's limit</span></span><span class="switch"><input type="checkbox" data-change="budRoll" ${S.budget.rollover ? 'checked' : ''}><i></i></span></label>`
    : `<div class="list">${premRow('Rollover', 'Carry unspent budget into next month')}</div>`;
  const alerts = isPremium()
    ? `<label class="fld"><span>Warn me when a category reaches (%)</span><input id="alertAt" type="number" min="50" max="100" inputmode="numeric" value="${alertLevel()}"></label><p class="small muted">Free always uses 80%. Premium can choose from 50 to 100. Going over the limit always warns you.</p>`
    : `<div class="list">${premRow('Custom alerts', 'Free warns you at 80% and when you go over')}</div>`;
  const csv = isPremium()
    ? `<div class="row gap"><button class="btn" data-act="budExport">${ic('download', 18)} Export CSV</button><button class="btn" data-act="budImport">${ic('upload', 18)} Import CSV</button></div>`
    : `<div class="list">${premRow('CSV import and export', 'Move a spreadsheet in or out of LifeHub')}</div>`;
  const debt = isPremium()
    ? `<a class="btn full" href="#/banking/budget/debt">Debt payoff planner</a>`
    : `<div class="list">${premRow('Debt payoff planner', 'See which debt to pay first, and how long it may take')}</div>`;
  const body = `<a class="linkbtn" href="#/banking/budget">← This month</a>
    <div class="sec-h"><h2>Templates</h2></div>
    <div class="row gap"><button class="btn" data-act="bud5030">50/30/20</button><button class="btn" data-act="budZero">Zero-based</button></div>
    <p class="small muted">50/30/20 splits income into needs, wants and savings. Zero-based gives every dollar a job.</p>
    <div class="sec-h"><h2>Spending chart</h2></div><div class="list">${chart}</div>
    ${trend}
    <div class="sec-h"><h2>Recurring bills</h2><button class="btn sm" data-act="budBill">${ic('plus', 16)} Add</button></div>
    <div class="list">${bills || '<p class="empty">Add rent or a subscription. It is counted in the month and added to your calendar.</p>'}</div>
    <div class="sec-h"><h2>Categories</h2><button class="btn sm" data-act="budNewCat">${ic('plus', 16)} Add</button></div>
    <div class="list">${cats}</div>
    <div class="sec-h"><h2>Advanced</h2></div>
    ${roll}
    ${alerts}
    ${csv}
    <div style="height:8px"></div>${debt}
    <p class="footnote">Templates, categories, the monthly chart and recurring bills are included on Free. The items with a Premium badge stay visible so you know they exist.</p>`;
  return { html: screen({ title: 'Budget tools', back: '#/banking/budget', body }), after: () => {
    const inp = $('#alertAt'); if (!inp) return;
    inp.onchange = () => { const n = Math.min(100, Math.max(50, parseInt(inp.value, 10) || 80)); S.budget.alertAt = n; save(); toast('Alert set to ' + n + '%'); };
  } };
}
function renderDebt() {
  if (!isPremium()) {
    const body = `<div class="card lockcard"><h2>Debt payoff planner ${premBadge()}</h2><p class="muted">Line up what you owe, then see which balance to tackle first. This stays on your device and does not contact a lender.</p><a class="btn primary full" href="#/plan">See Premium</a></div>`;
    return screen({ title: 'Debt planner', back: '#/banking/budget/tools', body });
  }
  ensureBudget();
  const extra = Number(S.budget.extra) || 0;
  const list = S.budget.debts.map(d => ({ ...d, months: monthsToPay(d.balance, d.rate, (Number(d.minPay) || 0) + (d.id === focusDebtId() ? extra : 0)) }));
  const ordered = list.slice().sort((a, b) => S.budget.strategy === 'avalanche' ? (b.rate || 0) - (a.rate || 0) : (a.balance || 0) - (b.balance || 0));
  const rows = ordered.map(d => `<button class="li" data-act="budDebt" data-id="${d.id}"><span class="grow"><b>${esc(d.name)}</b><span>${bm(d.balance)} · ${d.rate || 0}% · min ${bm(d.minPay || 0)}</span></span><span class="small">${d.months === Infinity ? 'Too small' : d.months + ' mo'}</span></button>`).join('');
  const seg = (v, label) => `<button type="button" class="${S.budget.strategy === v ? 'on' : ''}" data-act="budStrategy" data-v="${v}">${label}</button>`;
  const body = `<p class="muted" style="margin-top:0">A guide only. LifeHub does not contact a bank or move any money.</p>
    <div class="seg" style="margin-bottom:12px">${seg('snowball', 'Smallest first')}${seg('avalanche', 'Highest rate')}</div>
    <label class="fld"><span>Extra paid to the first debt each month (${S.budget.currency})</span><input id="debtExtra" type="number" min="0" step="0.01" inputmode="decimal" value="${extra || ''}"></label>
    <div class="list">${rows || '<p class="empty">Add a card, loan or buy-now-pay-later balance.</p>'}</div>
    <button class="btn primary full" data-act="budDebt">${ic('plus', 18)} Add a debt</button>
    <p class="footnote">"Too small" means the payment does not cover the monthly interest, so the balance would not fall.</p>`;
  return { html: screen({ title: 'Debt planner', back: '#/banking/budget/tools', body }), after: () => {
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
  formSheet({ title: 'Add to ' + ymLabel(bMonth()), fields: [
    { k: 'catId', label: 'Category', type: 'select', options: cats },
    { k: 'amount', label: 'Amount', type: 'number', step: '0.01', req: true, im: 'decimal' },
    { k: 'note', label: 'Note', ph: 'Optional' },
    { k: 'date', label: 'Date', type: 'date', req: true },
  ], values: { date: spendDate(bMonth()), catId: cats[0] && cats[0][0] }, onSave: v => {
    if (!(v.amount > 0) || !v.date) { toast('Enter an amount and a date'); return false; }
    S.budget.entries.push({ id: uid(), catId: v.catId, amount: Math.abs(v.amount), date: v.date, note: v.note || '' });
    toast('Saved on this device');
  } });
}
function budSpend(id) {
  const c = catById(id); if (!c) return;
  formSheet({ title: c.name, fields: [
    { k: 'amount', label: 'Amount this time', type: 'number', step: '0.01', im: 'decimal' },
    { k: 'note', label: 'Note' },
    { k: 'date', label: 'Date', type: 'date' },
    { k: 'limit', label: c.kind === 'expense' ? 'Monthly budget (optional)' : 'Ignore for income', type: 'number', step: '0.01', im: 'decimal' },
  ], values: { date: spendDate(bMonth()), limit: c.limit || '' }, onSave: v => {
    if (c.kind === 'expense') c.limit = v.limit > 0 ? v.limit : 0;
    if (v.amount > 0) S.budget.entries.push({ id: uid(), catId: c.id, amount: Math.abs(v.amount), date: v.date || spendDate(bMonth()), note: v.note || '' });
    else if (!(v.amount > 0) && c.kind !== 'expense') { toast('Enter an amount'); return false; }
    toast('Saved');
  } });
}
function editCategory(id) {
  const c = catById(id); if (!c) return;
  formSheet({ title: 'Edit category', fields: [{ k: 'name', label: 'Name', req: true }, { k: 'limit', label: 'Monthly budget', type: 'number', step: '0.01', im: 'decimal' }], values: { name: c.name, limit: c.limit || '' },
    onSave: v => { c.name = v.name; if (c.kind === 'expense') c.limit = v.limit > 0 ? v.limit : 0; },
    danger: { label: 'Delete category', fn: () => { S.budget.categories = S.budget.categories.filter(x => x.id !== id); S.budget.entries = S.budget.entries.filter(e => e.catId !== id); } } });
}
function newCategory() {
  formSheet({ title: 'New category', fields: [
    { k: 'name', label: 'Name', req: true },
    { k: 'kind', label: 'Type', type: 'select', options: [['expense', 'Expense'], ['income', 'Income']] },
    { k: 'group', label: '50/30/20 group', type: 'select', options: [['needs', 'Needs'], ['wants', 'Wants'], ['save', 'Savings'], ['', 'Other']] },
    { k: 'limit', label: 'Monthly budget', type: 'number', step: '0.01', im: 'decimal' },
  ], onSave: v => { S.budget.categories.push({ id: uid(), name: v.name, kind: v.kind || 'expense', group: v.group || '', limit: v.limit > 0 ? v.limit : 0 }); toast('Category added'); } });
}
function editGoal(id) {
  ensureBudget();
  const g = id && S.budget.goals.find(x => x.id === id);
  if (!g && !isPremium() && S.budget.goals.length >= FREE_GOALS) return premGo();
  formSheet({ title: g ? 'Edit goal' : 'New goal', fields: [
    { k: 'name', label: 'What are you saving for?', req: true },
    { k: 'target', label: 'Target amount', type: 'number', step: '0.01', req: true, im: 'decimal' },
    { k: 'saved', label: 'Already saved', type: 'number', step: '0.01', im: 'decimal' },
    { k: 'due', label: 'Target date', type: 'date' },
  ], values: g || { saved: 0 }, onSave: v => {
    if (!(v.target > 0)) { toast('Enter a target'); return false; }
    v.saved = v.saved > 0 ? v.saved : 0;
    if (g) Object.assign(g, v); else S.budget.goals.push({ id: uid(), ...v });
    toast('Goal saved');
  }, danger: g ? { label: 'Delete goal', fn: () => { S.budget.goals = S.budget.goals.filter(x => x.id !== id); } } : null });
}
function editBBill(id) {
  ensureBudget();
  const b = id && S.budget.bills.find(x => x.id === id);
  const cats = S.budget.categories.filter(c => c.kind === 'expense').map(c => [c.id, c.name]);
  if (!cats.length) return toast('Add a spending category first');
  formSheet({ title: b ? 'Edit recurring bill' : 'Recurring bill', intro: 'Counted in that category every month, and added to your calendar. Nothing is paid automatically.', fields: [
    { k: 'name', label: 'Name', req: true, ph: 'e.g. Rent' },
    { k: 'amount', label: 'Amount', type: 'number', step: '0.01', req: true, im: 'decimal' },
    { k: 'catId', label: 'Category', type: 'select', options: cats },
    { k: 'day', label: 'Day of the month', type: 'number', min: 1, im: 'numeric' },
  ], values: b || { day: 1, catId: cats[0][0] }, onSave: v => {
    if (!(v.amount > 0)) { toast('Enter an amount'); return false; }
    v.amount = Math.abs(v.amount); v.day = Math.min(28, Math.max(1, parseInt(v.day, 10) || 1));
    if (b) Object.assign(b, v); else S.budget.bills.push({ id: uid(), ...v });
    toast('It will show on your calendar');
  }, danger: b ? { label: 'Delete bill', fn: () => { S.budget.bills = S.budget.bills.filter(x => x.id !== id); } } : null });
}
function editDebt(id) {
  if (!isPremium()) return premGo();
  const d = id && S.budget.debts.find(x => x.id === id);
  formSheet({ title: d ? 'Edit debt' : 'Add a debt', intro: 'A planner only. No payment is sent.', fields: [
    { k: 'name', label: 'Name', req: true, ph: 'e.g. Credit card' },
    { k: 'balance', label: 'Balance owing', type: 'number', step: '0.01', req: true, im: 'decimal' },
    { k: 'rate', label: 'Interest rate per year (%)', type: 'number', step: '0.01', im: 'decimal' },
    { k: 'minPay', label: 'Minimum payment each month', type: 'number', step: '0.01', req: true, im: 'decimal' },
  ], values: d || { rate: 0 }, onSave: v => {
    if (!(v.balance > 0) || !(v.minPay > 0)) { toast('Enter the balance and a payment'); return false; }
    v.balance = Math.abs(v.balance); v.minPay = Math.abs(v.minPay); v.rate = v.rate > 0 ? v.rate : 0;
    if (d) Object.assign(d, v); else S.budget.debts.push({ id: uid(), ...v });
    toast('Debt saved');
  }, danger: d ? { label: 'Delete debt', fn: () => { S.budget.debts = S.budget.debts.filter(x => x.id !== id); } } : null });
}
function apply5030() {
  formSheet({ title: '50/30/20', intro: 'Enter monthly income. Needs get 50%, wants 30% and savings 20%, split across those categories.', fields: [{ k: 'income', label: 'Monthly income', type: 'number', step: '0.01', req: true, im: 'decimal' }],
    onSave: v => {
      if (!(v.income > 0)) { toast('Enter income'); return false; }
      const share = { needs: 0.5, wants: 0.3, save: 0.2 };
      Object.entries(share).forEach(([g, pct]) => {
        const cats = S.budget.categories.filter(c => c.kind === 'expense' && c.group === g);
        const each = Math.round(v.income * pct / (cats.length || 1) * 100) / 100;
        cats.forEach(c => { c.limit = each; });
      });
      toast('Monthly limits updated');
    } });
}
function applyZero() {
  ensureBudget();
  const exp = S.budget.categories.filter(c => c.kind === 'expense');
  openSheet(`<h2>Zero-based budget</h2><p class="muted small">Put your income into the categories until nothing is left over.</p>
    <label class="fld"><span>Monthly income</span><input id="zInc" type="number" inputmode="decimal" step="0.01"></label>
    ${exp.map(c => `<label class="fld"><span>${esc(c.name)}</span><input data-z="${c.id}" type="number" inputmode="decimal" step="0.01" value="${c.limit || ''}"></label>`).join('')}
    <p id="zLeft" class="small" style="margin-top:0"></p>
    <button class="btn primary full" id="zSave" type="button">Save limits</button>`, el => {
    const calc = () => {
      const inc = parseFloat($('#zInc', el).value) || 0; let sum = 0;
      $$('[data-z]', el).forEach(i => { sum += parseFloat(i.value) || 0; });
      const left = Math.round((inc - sum) * 100) / 100;
      $('#zLeft', el).textContent = (left === 0 ? 'Every dollar has a job.' : bm(left) + ' still to assign');
    };
    el.addEventListener('input', calc); calc();
    $('#zSave', el).onclick = () => { $$('[data-z]', el).forEach(i => { const c = catById(i.dataset.z); if (c) c.limit = parseFloat(i.value) || 0; }); closeSheet(true); save(); render(); toast('Limits saved'); };
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
    S.budget.entries.push({ id: uid(), catId: c.id, amount: Math.abs(amount), date: isNaN(dt) ? todayISO() : dt.toISOString().slice(0, 10), note: pick(r, 'note', 'desc', 'description') || '' });
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
async function putFile(id, blob) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('files', 'readwrite'); t.objectStore('files').put(blob, id); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
async function getFile(id) { const db = await idb(); return new Promise(res => { const q = db.transaction('files').objectStore('files').get(id); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }
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
async function addDocFiles(list) {
  ensureDocs();
  let n = 0;
  for (const f of list) {
    if (!f) continue;
    const id = uid();
    try { await putFile(id, f); } catch (e) { toast('Could not store ' + (f.name || 'a file')); continue; }
    S.docs.items.unshift({ id, name: f.name || 'Untitled', type: f.type || '', size: f.size || 0, added: Date.now(), folderId: docFolder || '', tags: [] });
    n++;
  }
  if (n) { save(); toast('Saved ' + n + ' file' + (n === 1 ? '' : 's') + ' on this device'); render(); }
}
let inboxBusy = false;
async function absorbInbox() {
  if (inboxBusy || !S) return;
  inboxBusy = true;
  try {
    const pending = await inboxAll();
    if (pending.length) {
      ensureDocs();
      pending.forEach(m => { if (m && m.id && !S.docs.items.some(x => x.id === m.id)) S.docs.items.unshift({ id: m.id, name: m.name || 'Shared file', type: m.type || '', size: m.size || 0, added: m.added || Date.now(), folderId: '', tags: [] }); });
      await inboxClear();
      save();
      toast('Added ' + pending.length + ' shared file' + (pending.length === 1 ? '' : 's'));
      if ((location.hash || '').startsWith('#/doc')) render();
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
    return `<a class="li" href="#/doc/${d.id}">${ic('file')}<span class="grow"><b>${esc(d.name)}</b><span>${esc(docKind(d.name, d.type))} · ${fmtBytes(d.size)}${folder ? ' · ' + esc(folder.name) : ''}${(d.tags || []).length ? ' · ' + esc(d.tags.join(', ')) : ''}</span></span></a>`;
  };
  const chips = `<div class="chips"><button class="btn sm ${docFolder ? '' : 'primary'}" data-act="docFolder" data-id="">All</button>${S.docs.folders.map(f => `<button class="btn sm ${docFolder === f.id ? 'primary' : ''}" data-act="docFolder" data-id="${f.id}">${esc(f.name)}</button>`).join('')}<button class="btn sm" data-act="docNewFolder">${ic('plus', 16)} Folder</button></div>`;
  const body = `<div class="searchbox">${ic('search', 20)}<input class="input" id="docQ" type="search" placeholder="Search files or tags" value="${esc(docQ)}" aria-label="Search documents"></div>
    ${chips}
    <div class="row gap" style="margin-bottom:12px"><button class="btn primary" data-act="docAdd">${ic('plus', 18)} Add files</button></div>
    ${recent.length ? `<div class="sec-h"><h2>Recent</h2></div><div class="list">${recent.map(row).join('')}</div>` : ''}
    <div class="sec-h"><h2>${q ? 'Results' : docFolder ? 'In this folder' : 'All files'}</h2></div>
    <div class="list">${items.length ? items.map(row).join('') : '<p class="empty">Nothing here yet. Add a PDF, photo, spreadsheet or text file from this device.</p>'}</div>
    <p class="footnote">Files stay in this browser's database. You can also share a file into LifeHub, or open LifeHub from a PDF or Office file where the device allows it.</p>`;
  return { html: screen({ title: 'Documents', body, right: `<button class="iconbtn" data-act="docAdd" aria-label="Add files">${ic('plus')}</button>` }), after: () => {
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
/* android = Play package name. ios = URL scheme without ://. appleId = App Store id.
   These are for a future Capacitor build that may check installed apps with a
   <queries> list. This website does not use them to detect what is installed. */
const APP_CATALOG = [
  { id: 'gcal', name: 'Google Calendar', emoji: '📅', cat: 'Calendar', url: 'https://calendar.google.com/', cal: 'Google', android: 'com.google.android.calendar', ios: 'googlecalendar', appleId: '909319292' },
  { id: 'outlook', name: 'Outlook', emoji: '📧', cat: 'Calendar', url: 'https://outlook.live.com/calendar/', cal: 'Outlook', android: 'com.microsoft.office.outlook', ios: 'ms-outlook', appleId: '951937596' },
  { id: 'applecal', name: 'Apple Calendar', emoji: '🗓️', cat: 'Calendar', url: 'https://www.icloud.com/calendar/', cal: 'Apple' },
  { id: 'teams', name: 'Microsoft Teams', emoji: '👥', cat: 'Work', url: 'https://teams.microsoft.com/', android: 'com.microsoft.teams', ios: 'msteams', appleId: '1113153706' },
  { id: 'zoom', name: 'Zoom', emoji: '🎥', cat: 'Work', url: 'https://zoom.us/', android: 'us.zoom.videomeetings', ios: 'zoomus', appleId: '546505307' },
  { id: 'gmail', name: 'Gmail', emoji: '✉️', cat: 'Messages', url: 'https://mail.google.com/', android: 'com.google.android.gm', ios: 'googlegmail', appleId: '422689480' },
  { id: 'whatsapp', name: 'WhatsApp', emoji: '💬', cat: 'Messages', url: 'https://web.whatsapp.com/', android: 'com.whatsapp', ios: 'whatsapp', appleId: '310633997' },
  { id: 'messenger', name: 'Messenger', emoji: '💬', cat: 'Messages', url: 'https://www.messenger.com/', android: 'com.facebook.orca', ios: 'fb-messenger', appleId: '454638411' },
  { id: 'telegram', name: 'Telegram', emoji: '✈️', cat: 'Messages', url: 'https://web.telegram.org/', android: 'org.telegram.messenger', ios: 'tg', appleId: '686449807' },
  { id: 'signal', name: 'Signal', emoji: '🔒', cat: 'Messages', url: 'https://signal.org/', android: 'org.thoughtcrime.securesms', ios: 'sgnl', appleId: '874139669' },
  { id: 'facebook', name: 'Facebook', emoji: '📘', cat: 'Social', url: 'https://www.facebook.com/', android: 'com.facebook.katana', ios: 'fb', appleId: '284882215' },
  { id: 'instagram', name: 'Instagram', emoji: '📷', cat: 'Social', url: 'https://www.instagram.com/', android: 'com.instagram.android', ios: 'instagram', appleId: '389801252' },
  { id: 'tiktok', name: 'TikTok', emoji: '🎵', cat: 'Social', url: 'https://www.tiktok.com/', android: 'com.zhiliaoapp.musically', ios: 'tiktok', appleId: '835599320' },
  { id: 'youtube', name: 'YouTube', emoji: '▶️', cat: 'Social', url: 'https://www.youtube.com/', android: 'com.google.android.youtube', ios: 'youtube', appleId: '544007664' },
  { id: 'x', name: 'X', emoji: '𝕏', cat: 'Social', url: 'https://x.com/', android: 'com.twitter.android', ios: 'twitter', appleId: '333903271' },
  { id: 'commbank', name: 'CommBank', emoji: '🏦', cat: 'Money', url: 'https://www.commbank.com.au/', android: 'com.commbank.netbank', ios: 'commbank' },
  { id: 'westpac', name: 'Westpac', emoji: '🏦', cat: 'Money', url: 'https://www.westpac.com.au/', android: 'org.westpac.bank' },
  { id: 'nab', name: 'NAB', emoji: '🏦', cat: 'Money', url: 'https://www.nab.com.au/', android: 'au.com.nab.mobile' },
  { id: 'anz', name: 'ANZ', emoji: '🏦', cat: 'Money', url: 'https://www.anz.com.au/', android: 'com.anz.android.gomoney' },
  { id: 'paypal', name: 'PayPal', emoji: '💳', cat: 'Money', url: 'https://www.paypal.com/', android: 'com.paypal.android.p2pmobile', ios: 'paypal', appleId: '283646709' },
  { id: 'gmaps', name: 'Google Maps', emoji: '📍', cat: 'Travel', url: 'https://maps.google.com/', android: 'com.google.android.apps.maps', ios: 'comgooglemaps', appleId: '585027354' },
  { id: 'uber', name: 'Uber', emoji: '🚗', cat: 'Travel', url: 'https://m.uber.com/', android: 'com.ubercab', ios: 'uber', appleId: '368677368' },
  { id: 'medicare', name: 'Medicare', emoji: '🩺', cat: 'Health', url: 'https://www.servicesaustralia.gov.au/medicare' },
  { id: 'hotdoc', name: 'HotDoc', emoji: '🩺', cat: 'Health', url: 'https://www.hotdoc.com.au/' },
  { id: 'mygov', name: 'myGov', emoji: '🇦🇺', cat: 'Health', url: 'https://my.gov.au/' },
  { id: 'spotify', name: 'Spotify', emoji: '🎧', cat: 'Everyday', url: 'https://open.spotify.com/', android: 'com.spotify.music', ios: 'spotify', appleId: '324684580' },
  { id: 'netflix', name: 'Netflix', emoji: '🎬', cat: 'Everyday', url: 'https://www.netflix.com/', android: 'com.netflix.mediaclient', ios: 'nflx', appleId: '363590051' },
  { id: 'auspost', name: 'Australia Post', emoji: '📦', cat: 'Everyday', url: 'https://auspost.com.au/' },
];
const CAT_EMOJI = { Calendar: '📅', Work: '💼', Messages: '💬', Social: '📣', Money: '🏦', Travel: '✈️', Health: '🩺', Everyday: '⭐' };
let syncQ = '', syncPick = null, syncRelated = '';

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
  const spec = APP_CATALOG.find(s => play && s.android && s.android === play)
    || APP_CATALOG.find(s => apple && s.appleId && String(s.appleId) === apple)
    || APP_CATALOG.find(s => scheme && s.ios && s.ios.toLowerCase() === scheme)
    || APP_CATALOG.find(s => url && hostsRelated(hostOf(url), hostOf(s.url)))
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
    onSave: v => { const preset = matchAppLink(v.link); setTimeout(() => openPreset(preset), 0); return false; } });
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
  const raw = await rawFromDrop(e.dataTransfer);
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
  syncPick = new Set(APP_CATALOG.filter(catalogInHub).map(a => a.id));
  syncQ = ''; syncRelated = '';
  location.hash = '#/addnew/sync';
  if (navigator.getInstalledRelatedApps) navigator.getInstalledRelatedApps().then(list => {
    if (!list || !list.length || (location.hash || '') !== '#/addnew/sync') return;
    syncRelated = 'This browser reported ' + list.length + ' related app' + (list.length === 1 ? '' : 's') + ' for LifeHub. It still cannot list everything installed on the device.';
    const el = $('#syncRelated'); if (el) el.textContent = syncRelated;
  }).catch(() => {});
}
function renderQuickSync() {
  adoptCatalog();
  if (!syncPick) syncPick = new Set(APP_CATALOG.filter(catalogInHub).map(a => a.id));
  const q = syncQ.trim().toLowerCase();
  const match = APP_CATALOG.filter(a => !q || (a.name + ' ' + a.cat).toLowerCase().includes(q));
  const mine = match.filter(a => catalogInHub(a)).sort((a, b) => a.name.localeCompare(b.name));
  const rest = match.filter(a => !catalogInHub(a));
  const row = a => {
    const on = syncPick.has(a.id);
    return `<button class="li" data-act="syncTick" data-id="${a.id}" aria-pressed="${on}">${on ? ic('check') : ic('plus')}<span class="ai" style="font-size:1.3rem">${a.emoji}</span><span class="grow"><b>${esc(a.name)}</b><span>${esc(a.cat)}${catalogInHub(a) ? ' · already in LifeHub' : ''}</span></span>${a.cal ? '<span class="tag amber">Demo</span>' : ''}</button>`;
  };
  let groups = '';
  const cats = [...new Set(rest.map(a => a.cat))];
  cats.forEach(cat => { groups += `<div class="sec-h"><h2>${esc(cat)}</h2></div><div class="list">${rest.filter(a => a.cat === cat).map(row).join('')}</div>`; });
  const body = `<div class="notice blue">${ic('shield', 18)}<div><b>Apps you might use.</b> A website cannot see the apps installed on your phone or computer. This is a popular list, not a scan of your device. Tick several, then connect them in one step.</div></div>
    <p id="syncRelated" class="small muted">${esc(syncRelated)}</p>
    <div class="searchbox">${ic('search', 20)}<input class="input" id="syncQ" type="search" placeholder="Search popular apps" value="${esc(syncQ)}" aria-label="Search popular apps"></div>
    ${mine.length ? `<div class="sec-h"><h2>Already in LifeHub</h2></div><div class="list">${mine.map(row).join('')}</div>` : ''}
    ${groups || '<p class="empty">No matches.</p>'}
    <p class="small">Calendar apps are marked <span class="tag amber">Demo</span>. Connecting one adds a sample event on this device. Nothing is read from Google, Outlook or Apple.</p>
    <button class="btn primary full" data-act="syncGo">Connect ${syncPick.size} app${syncPick.size === 1 ? '' : 's'}</button>
    <button class="btn ghost full" data-act="addOne" style="margin-top:8px">Add one link instead</button>`;
  return { html: screen({ title: 'Quick sync', back: '#/addnew', body }), after: () => {
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
      S.apps.push({ id: uid(), catalogId: spec.id, name: spec.name, url: spec.url, emoji: spec.emoji, groupId: g.id, android: spec.android || '', ios: spec.ios || '', nextLabel: '', nextOn: '', nextStart: '', nextEnd: '' });
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
  if (calendars) bits.push(calendars + ' sample calendar event' + (calendars === 1 ? '' : 's'));
  toast(bits.length ? bits.join(', ') : 'Nothing changed');
}

/* ---------- maps links ---------- */
function mapsUrl(kind, lat, lng) {
  const q = Number(lat).toFixed(6) + ',' + Number(lng).toFixed(6);
  if (kind === 'search') return 'https://www.google.com/maps/search/?api=1&query=' + q;
  if (kind === 'dir') return 'https://www.google.com/maps/dir/?api=1&destination=' + q + '&travelmode=driving';
  return 'https://www.google.com/maps/dir/?api=1&destination=' + q + '&travelmode=driving&dir_action=navigate';
}
function mapActions(lat, lng) {
  return `<div class="row gap wrap mapacts"><a class="btn sm" href="${mapsUrl('search', lat, lng)}" target="_blank" rel="noopener">Open</a><a class="btn sm" href="${mapsUrl('dir', lat, lng)}" target="_blank" rel="noopener">Directions</a><a class="btn sm primary" href="${mapsUrl('nav', lat, lng)}" target="_blank" rel="noopener">Start driving</a><button type="button" class="btn sm" data-act="gmapsHere" data-lat="${lat}" data-lng="${lng}">View here</button></div>`;
}
function gmapsHere(el) {
  const box = $('#gmapsFrame'); if (!box) return;
  const lat = el.dataset.lat, lng = el.dataset.lng;
  box.innerHTML = `<p class="small muted" style="margin:8px 0 0">Google's map. If it stays blank, use Open. No API key is used.</p><iframe class="gframe" title="Google Maps" src="https://maps.google.com/maps?q=${encodeURIComponent(lat + ',' + lng)}&z=14&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}
function fillMapsYou() {
  const box = $('#gmapsYou'); if (!box || !locMe) return;
  const me = locMe;
  box.innerHTML = `<b>${me.demo ? 'Sample position' : 'You'}</b> ${me.demo ? '<span class="tag amber">Demo</span>' : ''}<div class="small muted">${me.demo ? 'Launceston sample, because location was not available.' : me.lat.toFixed(5) + ', ' + me.lng.toFixed(5)}</div>${mapActions(me.lat, me.lng)}`;
}

/* ---------- installed-copy updates ---------- */
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
  b.innerHTML = '<span>A new version of LifeHub is ready.</span><button type="button" id="updNow">Update now</button>';
  document.body.appendChild(b);
  $('#updNow', b).onclick = () => { sessionStorage.setItem('lh.updated', '1'); location.reload(); };
}
function maybeApplyUpdate() {
  if (!updateReady || updateReloading || !safeToReload()) return;
  updateReloading = true;
  sessionStorage.setItem('lh.updated', '1');
  location.reload();
}
function setupUpdates() {
  if (!('serviceWorker' in navigator)) return;
  let had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had) { had = true; return; }
    updateReady = true;
    if (safeToReload()) maybeApplyUpdate(); else showUpdateBanner();
  });
  navigator.serviceWorker.addEventListener('message', ev => {
    if (!ev.data) return;
    if (ev.data.type === 'lh-shared') absorbInbox();
    if (ev.data.type === 'lh-add-app') absorbAddIntent();
  });
  const tick = () => navigator.serviceWorker.getRegistration().then(reg => {
    if (!reg) return;
    reg.update().catch(() => {});
    if (reg.waiting && navigator.serviceWorker.controller) reg.waiting.postMessage({ type: 'skipWaiting' });
  }).catch(() => {});
  tick();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); absorbInbox(); absorbAddIntent(); maybeApplyUpdate(); } });
  setInterval(tick, 30 * 60 * 1000);
  setInterval(maybeApplyUpdate, 3000);
  if ('launchQueue' in window) {
    try { launchQueue.setConsumer(async params => { const files = []; for (const h of params.files || []) { try { files.push(await h.getFile()); } catch (e) {} } if (files.length) { await addDocFiles(files); if (!(location.hash || '').startsWith('#/doc')) location.hash = '#/documents'; } }); } catch (e) {}
  }
  if (sessionStorage.getItem('lh.updated')) { sessionStorage.removeItem('lh.updated'); setTimeout(() => { try { toast('Updated'); } catch (e) {} }, 400); }
}

/* ---------- router & prefs ---------- */
const ROUTES = [[/^\/home$/, renderHome], [/^\/search$/, renderSearch], [/^\/emergency$/, renderEmergency], [/^\/medical$/, renderMedical], [/^\/medical-id$/, renderMedicalID],
  [/^\/banking$/, renderBanking], [/^\/banking\/budget\/tools$/, renderBudgetTools], [/^\/banking\/budget\/debt$/, renderDebt], [/^\/banking\/budget$/, renderBudget], [/^\/banking\/pay$/, renderPay], [/^\/banking\/link$/, renderLink], [/^\/chat$/, renderChats], [/^\/chat\/(\w+)$/, renderThread], [/^\/call\/(\w+)(?:\/(video))?$/, renderCall],
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
function render() {
  if (cleanupFn) { try { cleanupFn(); } catch (e) {} cleanupFn = null; }
  if (lockUnbind) { lockUnbind(); lockUnbind = null; }
  ensurePlan(); if (S && S.auth && S.auth.method) ensureHub(); applyPrefs(); const app = $('#app');
  if (!S || !S.auth || !S.auth.method) { app.innerHTML = renderOnboarding(); afterOnboarding(); return; }
  const path = (location.hash || '#/home').slice(1) || '/home';
  if (path !== '/banking/pay' && pay && pay.step !== 'tap') pay = null;
  if (!unlocked && !PUBLIC.includes(path)) { app.innerHTML = renderLock(); afterLock(); lastPath = '/lock'; return; }
  for (const [re, fn] of ROUTES) { const m = path.match(re); if (m) { const out = (isPremium() && routeCache.get(path)) || fn(...m.slice(1)); if (isPremium() && PRELOAD.includes(path)) routeCache.delete(path); if (out === '') return; app.innerHTML = typeof out === 'string' ? out : out.html; if (out.after) out.after(); if (path !== lastPath) { window.scrollTo(0, 0); lastPath = path; } if (path === '/home') { mountAds(); preloadSections(); } if (unlocked) announceConflicts(); return; } }
  location.replace('#/home');
}

async function wipeAllData() {
  const ok = await confirmSheet('Delete all my data?', 'This permanently erases LifeHub on this device: your profile, medical details, contacts, calendar, photos and settings. It clears this site\'s local storage, caches and on-device database. This cannot be undone. You will return to the welcome screen.', 'Delete all my data', true);
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
  ob = { step: 0, name: '', region: 'AU', method: 'pin', sample: true };
  closeSheet(true);
  if ((location.hash || '') && location.hash !== '#' && location.hash !== '#/') location.hash = '';
  else render();
}

/* ---------- actions ---------- */
const A = {
  obNext: () => { ob.step++; render(); }, obBack: () => { ob.step = Math.max(0, ob.step - 1); render(); },
  obMethod: el => { ob.method = el.dataset.m; render(); },
  obPasskey: async () => { let credId = null; if (passkeySupported()) { try { credId = await createPasskey(ob.name); } catch (e) { toast('Passkey not created: using simulated biometric'); } } finishOnboarding({ method: 'passkey', credId }); },
  obSSO: () => finishOnboarding({ method: ob.method }),
  lockAuth: async () => { if (await authorize('Unlock LifeHub')) unlock(); },
  forgot: () => wipeAllData(),
  wipeData: () => wipeAllData(),
  shareLoc: shareLocation,
  medAdd: el => editMedItem(el.dataset.k), medEdit: el => editMedItem(el.dataset.k, el.dataset.id), medBasics: editMedBasics,
  transfer, addAcct: () => addAccount(), acctMenu: el => acctMenu(el.dataset.id), importTx,
  payAuth, payTap: completePay, payCancel: () => { pay.step = 'setup'; render(); }, payDone: () => { pay = null; },
  linkBank: el => linkBank(el.dataset.b),
  newChat, endCall: () => history.length > 1 ? history.back() : (location.hash = '#/chat'),
  tgl: el => { el.classList.toggle('on'); if (el.getAttribute('aria-label') === 'Mute') el.innerHTML = ic(el.classList.contains('on') ? 'micoff' : 'mic', 28); },
  addContact: () => editContact(), editContact: el => editContact(el.dataset.id), importContacts, pickContacts,
  msgContact: el => { const c = contactById(el.dataset.id); if (c.onLifeHub) openChatWith(c.id); else location.href = 'sms:' + c.phone.replace(/[^\d+]/g, ''); },
  toggleIce: el => { const c = contactById(el.dataset.id); c.ice = !c.ice; save(); render(); toast(c.ice ? 'Added to emergency contacts' : 'Removed from emergency contacts'); },
  toggleBlock: async el => { const c = contactById(el.dataset.id); if (!c.blocked && !(await confirmSheet(`Block ${c.name}?`, 'They won\'t be able to message or call you in LifeHub. You can unblock at any time.', 'Block', true))) return; c.blocked = !c.blocked; save(); render(); toast(c.blocked ? 'Contact blocked' : 'Contact unblocked'); },
  reportContact: el => reportContact(el.dataset.id),
  addPlatform, platMenu: el => platMenu(el.dataset.id), camera: () => attachMedia(true), gallery: () => attachMedia(false), clearMedia: () => { const t = $('#postTxt').value; postMedia = null; render(); $('#postTxt').value = t; }, post: doPost,
  dismissNote: el => { S.notifications = S.notifications.filter(n => n.id !== el.dataset.id); save(); render(); }, clearNotes: () => { S.notifications = []; save(); render(); },
  addBill: () => editBill(), editBill: el => editBill(el.dataset.id), uploadBill, importBills, billSort: el => { billSort = el.dataset.s; render(); },
  payBill: el => { const b = S.bills.find(x => x.id === el.dataset.id); b.paid = true; save(); render(); toast(`${b.provider} marked as paid`); },
  addApp: el => { if (el.dataset.g) editApp(null, el.dataset.g); else openQuickSync(); }, addOne: () => editApp(), pasteLink: () => pasteLink(), quickSync: () => openQuickSync(),
  syncTick: el => syncTick(el.dataset.id), syncGo: () => connectSync(), addGroup: () => editGroup(), editGroup: el => editGroup(el.dataset.id),
  budMonth: el => { budgetMonth = shiftMonth(bMonth(), Number(el.dataset.d) || 0); render(); },
  budAdd: () => addBudgetEntry(), budSpend: el => budSpend(el.dataset.id), budGoal: el => editGoal(el.dataset.id), budBill: el => editBBill(el.dataset.id),
  budCat: el => editCategory(el.dataset.id), budNewCat: () => newCategory(), bud5030: () => apply5030(), budZero: () => applyZero(),
  budExport: () => exportBudget(), budImport: () => importBudget(), budDebt: el => editDebt(el.dataset.id),
  budStrategy: el => { if (!isPremium()) return premGo(); S.budget.strategy = el.dataset.v; save(); render(); }, premGo: () => premGo(),
  docAdd: async () => addDocFiles(await pickFiles(DOC_ACCEPT)), docFolder: el => { docFolder = el.dataset.id || ''; render(); }, docNewFolder: () => newFolder(),
  docDl: el => downloadDoc(el.dataset.id), docTags: el => editDocTags(el.dataset.id), docMove: el => moveDoc(el.dataset.id), docDel: el => deleteDoc(el.dataset.id),
  gmapsHere: el => gmapsHere(el),
  editProfile, changeLogin, lockNow: lock,
  refreshNow: () => refreshAll(true),
  setRefresh: el => { const o = REFRESH.find(r => r[0] === el.dataset.v); if (o[2] && !isPremium()) { location.hash = '#/plan'; toast('That\'s a Premium perk'); return; } S.settings.refresh = o[0]; save(); scheduleRefresh(); render(); toast(o[0] === 'manual' ? 'Manual refresh only' : `Refreshing ${o[0] === 'live' ? 'live' : 'every ' + o[1]}`); },
  hideAd: el => { sessionStorage.setItem('lh.adHidden', '1'); const a = el.closest('.adslot'); if (a) a.remove(); },
  upgrade, cancelSub, restore, resume: () => { S.plan.status = 'active'; localStorage.setItem(RECEIPT_KEY, JSON.stringify(S.plan)); save(); render(); toast('Subscription resumed'); },
  endNow: async () => { if (await confirmSheet('Switch to Free now?', 'Testing helper: ends Premium immediately.', 'Switch to Free', true)) { S.plan = { tier: 'free' }; localStorage.removeItem(RECEIPT_KEY); save(); scheduleRefresh(); render(); toast('Now on Free'); } },
  prem: el => { if (!isPremium()) { location.hash = '#/plan'; toast('That\'s a Premium perk'); return; } S.settings[el.dataset.k] = el.dataset.v; save(); render(); },
  setPref: el => { const k = el.dataset.k; S.settings[k] = k === 'lockMinutes' ? Number(el.dataset.v) : el.dataset.v; save(); render(); },
  mvBanner: el => { const i = +el.dataset.i, d = +el.dataset.d, b = S.settings.banners; [b[i], b[i + d]] = [b[i + d], b[i]]; save(); render(); },
  hideBanner: el => { const b = S.settings.banners[+el.dataset.i]; b.hidden = !b.hidden; save(); render(); },
  exportData: () => { const { auth, ...rest } = S; download(`lifehub-backup-${todayISO()}.json`, JSON.stringify(rest, null, 2)); toast('Backup downloaded'); },
  importData,
  loadSample: async () => { if (!(await confirmSheet('Load sample data?', 'This replaces your current data with demo data.', 'Replace', true))) return; const auth = S.auth, settings = S.settings; S = seed(S.profile.name, S.profile.region, true); S.auth = auth; S.settings = settings; ensureHub(); save(); render(); toast('Sample data loaded'); },
  addEvent: () => editManual(null), openEvent: el => openEvent(el.dataset.id),
  calView: el => { calView = el.dataset.v; render(); }, calNav, calDay: el => { calCursor = el.dataset.d; render(); },
  hideAuto: el => { const e = S.events.find(x => x.id === el.dataset.id); if (e) { e.hidden = true; save(); render(); toast('Hidden'); } },
  showAuto: el => { const e = S.events.find(x => x.id === el.dataset.id); if (e) { e.hidden = false; save(); render(); } },
  convertAuto: el => convertAuto(el.dataset.id),
  keepPair: el => keepPair(el.dataset.a, el.dataset.b), movePair: el => movePair(el.dataset.a, el.dataset.b),
  deleteEv: el => deleteEv(el.dataset.id), dismissNotice: el => { S.cal.notices = S.cal.notices.filter(n => n.id !== el.dataset.id); save(); render(); },
  askClashNotify: () => { askNotify(); toast('If you allow notifications, LifeHub will ping you about overlaps and reminders'); },
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
  if (el.dataset.change === 'glass') { if (!isPremium()) { el.checked = false; location.hash = '#/plan'; toast('That\'s a Premium perk'); return; } S.settings.iconStyle = el.checked ? 'glass' : 'standard'; save(); render(); return; }
  if (el.dataset.change === 'setRegion') { S.profile.region = el.value; save(); render(); toast(`Showing ${region().name} emergency numbers`); }
  if (el.dataset.change === 'preferWifi') { S.settings.preferWifi = el.checked; save(); render(); toast(el.checked ? 'Wi‑Fi preferred, mobile data as backup' : 'Using any available network'); }
  if (el.dataset.change === 'budCur') { ensureBudget(); S.budget.currency = el.value; save(); render(); }
  if (el.dataset.change === 'budRoll') { if (!isPremium()) { el.checked = false; premGo(); return; } ensureBudget(); S.budget.rollover = !!el.checked; save(); render(); toast(el.checked ? 'Leftover budget rolls into next month' : 'Rollover is off'); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
window.addEventListener('hashchange', () => { closeSheet(true); render(); });
window.addEventListener('online', render); window.addEventListener('offline', render);
if (navigator.connection && navigator.connection.addEventListener) navigator.connection.addEventListener('change', () => { if (/^#\/chat/.test(location.hash)) render(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyPrefs);

/* idle lock */
['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(ev => addEventListener(ev, touchSession, { passive: true }));
setInterval(() => {
  if (unlocked && S && S.settings.lockMinutes > 0 && Date.now() - lastAct > S.settings.lockMinutes * 60000 && !/^#\/call/.test(location.hash)) lock();
  if (unlocked && S && S.loc && S.loc.on && S.loc.mode === '1h' && S.loc.until && Date.now() > S.loc.until) { S.loc.on = false; save(); toast('Location sharing has ended'); if ((location.hash || '') === '#/location') render(); }
  if (unlocked && S) checkEventReminders();
}, 10000);
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = Date.now(); else if (unlocked && S && S.settings.lockMinutes > 0 && hiddenAt && Date.now() - hiddenAt > S.settings.lockMinutes * 60000) lock(); });

setupUpdates();
render();
if (unlocked) { checkReminders(); absorbInbox(); absorbAddIntent(); openPendingDraft(); }
document.addEventListener('input', invalidateCache, true);
scheduleRefresh();
window.LifeHub = { version: '1.4.1', isPremium: () => isPremium(), showUpdateBanner, safeToReload, addDocFiles, matchAppLink, cal: { parseRoster, parseICS, rangesOverlap, onDay } };
})();
