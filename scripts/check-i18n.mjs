#!/usr/bin/env node
/* Fail when app.js or safety.js still shows a user-facing phrase outside t(),
   or when a language file is missing a key from lang/en.json.
   Legal pages, the manifest, and the noscript line stay English on purpose. */
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function phrase(text) { return /[A-Za-z]{2,}\s+\S*[A-Za-z]/.test(text); }
function bad(text) {
  if (!text || text.length > 420) return true;
  if (text === 'use strict') return true;
  if (/[\n\r;]|=>|\b(return|const|let|function|match)\b/.test(text)) return true;
  if (/[<>{}\\`]/.test(text)) return true;
  if (/gradient|rgba\(|var\(--|https?:|color-mix|translate\(/.test(text)) return true;
  if (/^[.#/]/.test(text)) return true;
  if (/^[a-z0-9_.]+$/.test(text)) return true;
  return false;
}
function keep(inner) {
  if (!inner || inner.length < 2 || inner.length > 240) return false;
  if (!/[A-Za-z]{2,}/.test(inner)) return false;
  if (/[=<>{}`\\]/.test(inner)) return false;
  if (/gradient|color-mix|translate\(|linear-|rgba\(|var\(--|px\)/.test(inner)) return false;
  const words = inner.split(/\s+/);
  if (words.length >= 2) return /[A-Za-z]{2,}/.test(words[0]) && /[A-Za-z]/.test(words[words.length - 1]);
  if (/^[A-Z]/.test(inner) && inner.length >= 3 && !/^(The|And|For|With)$/.test(inner)) return true;
  return false;
}
function wrappedAt(s, i) { return /(?:^|[^A-Za-z0-9_$])[tL]\($/.test(s.slice(Math.max(0, i - 8), i)); }
function lineOf(src, i) { return src.slice(0, i).split('\n').length; }

function scan(file) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const hits = [];
  const stack = ['c'];
  const braces = [0];
  let i = 0, parts = null;
  const finish = (p) => {
    let inTag = false;
    for (let k = 0; k < p.length - 1; k += 2) {
      const a = p[k], b = p[k + 1];
      const seg = src.slice(a, b);
      let j = 0;
      if (inTag) { const gt = seg.indexOf('>'); if (gt < 0) continue; j = gt + 1; inTag = false; }
      let text = '', at = 0;
      const flush = () => { const inner = text.trim(); if (keep(inner)) hits.push(`${file}:${lineOf(src, a + at)}: ${inner.slice(0, 90)}`); text = ''; };
      for (; j < seg.length; j++) {
        const ch = seg[j];
        if (!inTag) { if (ch === '<') { flush(); inTag = true; } else { if (!text) at = j; text += ch; } }
        else if (ch === '>') {
          inTag = false;
          const tag = seg.slice(seg.lastIndexOf('<', j), j + 1);
          const attrs = /(?:aria-label|alt|title|placeholder)="([^"${]+)"/g;
          let m; while ((m = attrs.exec(tag))) if (keep(m[1].trim())) hits.push(`${file}:${lineOf(src, a)}: [${m[1].trim().slice(0, 80)}]`);
        }
      }
      flush();
    }
  };
  while (i < src.length) {
    const c = src[i], n = src[i + 1], top = stack[stack.length - 1];
    if (top === 'c') {
      if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
      if ((c === "'" || c === '"') && !wrappedAt(src, i)) {
        const q = c, start = i; let j = i + 1, text = '';
        while (j < src.length && src[j] !== q) { if (src[j] === '\\') { text += src[j + 1]; j += 2; continue; } text += src[j++]; }
        if (src[j] === q) {
          if (phrase(text) && !bad(text)) hits.push(`${file}:${lineOf(src, start)}: ${text.slice(0, 90)}`);
          else { const m = text.match(/^<([a-z0-9]+)(\s[^<>]*)?>([^<>]+)<\/\1>$/i); if (m && keep(m[3].trim())) hits.push(`${file}:${lineOf(src, start)}: ${m[3].trim().slice(0, 90)}`); }
          i = j + 1; continue;
        }
      }
      if (c === "'" || c === '"') { stack.push(c === "'" ? 's' : 'd'); i++; continue; }
      if (c === '`') { if (stack.length === 1) parts = [i + 1]; stack.push('t'); i++; continue; }
      if (c === '/' && /[(,=:[!&|?{};~+\-*%^]/.test(src.slice(0, i).trimEnd().slice(-1))) {
        i++; while (i < src.length) { if (src[i] === '\\') { i += 2; continue; } if (src[i] === '/' && src[i - 1] !== '\\') { i++; break; } i++; }
        while (i < src.length && /[a-z]/i.test(src[i])) i++; continue;
      }
      if (c === '{') braces[braces.length - 1]++;
      if (c === '}') { if (braces[braces.length - 1] > 0) braces[braces.length - 1]--; else if (stack.length > 1) { stack.pop(); braces.pop(); if (stack.length === 2 && stack[stack.length - 1] === 't' && parts) parts.push(i + 1); } }
      i++; continue;
    }
    if (c === '\\') { i += 2; continue; }
    if (top === 's' && c === "'") { stack.pop(); i++; continue; }
    if (top === 'd' && c === '"') { stack.pop(); i++; continue; }
    if (top === 't' && c === '`') { stack.pop(); if (stack.length === 1 && parts) { parts.push(i); finish(parts); parts = null; } i++; continue; }
    if (top === 't' && c === '$' && n === '{') { if (stack.length === 2 && parts) parts.push(i); i += 2; stack.push('c'); braces.push(0); continue; }
    i++;
  }
  return hits;
}

function usedKeys() {
  const keys = [];
  for (const file of ['app.js', 'safety.js']) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    const re = /(?<![A-Za-z0-9_$])[tL]\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1/g;
    let m;
    while ((m = re.exec(src))) keys.push(m[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
  }
  return keys;
}
function placeholders(s) {
  const names = new Set();
  const re = /\{(\w+)\}/g; let m;
  while ((m = re.exec(String(s)))) names.add(m[1]);
  return names;
}
function checkKeys(used) {
  const en = JSON.parse(fs.readFileSync(path.join(root, 'lang/en.json'), 'utf8'));
  const badHits = [];
  const missingUsed = [...new Set(used)].filter(k => !Object.prototype.hasOwnProperty.call(en, k));
  if (missingUsed.length) badHits.push(`en.json is missing ${missingUsed.length} keys used in source: ${missingUsed.slice(0, 8).join(' | ')}`);
  const enKeys = Object.keys(en);
  for (const file of fs.readdirSync(path.join(root, 'lang')).filter(f => f.endsWith('.json') && f !== 'en.json')) {
    const pack = JSON.parse(fs.readFileSync(path.join(root, 'lang', file), 'utf8'));
    const missing = enKeys.filter(k => pack[k] == null || pack[k] === '');
    if (missing.length) badHits.push(`${file} missing ${missing.length}: ${missing.slice(0, 5).join(' | ')}`);
    const holes = [];
    for (const k of enKeys) {
      if (typeof en[k] !== 'string' || typeof pack[k] !== 'string') continue;
      for (const name of placeholders(en[k])) if (!placeholders(pack[k]).has(name)) { holes.push(k); break; }
    }
    if (holes.length) badHits.push(`${file} dropped placeholders in ${holes.length}: ${holes.slice(0, 4).join(' | ')}`);
  }
  return badHits;
}

const literals = [...scan('app.js'), ...scan('safety.js')];
const keys = checkKeys(usedKeys());
if (literals.length) {
  console.error('User-facing strings not passed through t() or L():');
  literals.slice(0, 60).forEach(l => console.error('  ' + l));
}
if (keys.length) {
  console.error('Language key check:');
  keys.forEach(l => console.error('  ' + l));
}
if (literals.length || keys.length) {
  console.error(`FAILED literals=${literals.length} key-issues=${keys.length}`);
  process.exit(1);
}
console.log('i18n checks passed');
