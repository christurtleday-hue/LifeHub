/* On-device checks for files and links added to LifeHub.
   This is not an antivirus scan of the device, and it does not upload anything. */
(function (global) {
  'use strict';
  const BLOCKED_EXT = new Set(['exe', 'msi', 'msix', 'appx', 'bat', 'cmd', 'ps1', 'vbs', 'vbe', 'js', 'jse', 'jar', 'apk', 'scr', 'dll', 'com', 'cpl', 'hta', 'pif', 'wsf', 'wsh', 'msc', 'reg', 'iso', 'img', 'dmg', 'elf', 'sh', 'command', 'deb', 'rpm', 'pkg']);
  const MACRO_EXT = new Set(['docm', 'xlsm', 'pptm', 'dotm', 'xltm', 'potm', 'ppsm', 'xlam', 'xlsb']);
  const ZIP_EXT = new Set(['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'zip', 'docm', 'xlsm', 'pptm', 'dotm', 'xltm', 'potm', 'ppsm']);
  const OLE_EXT = new Set(['doc', 'xls', 'ppt', 'dot', 'xlt', 'pot']);
  const MEDIA_EXT = { png: 'png', jpg: 'jpeg', jpeg: 'jpeg', gif: 'gif', pdf: 'pdf' };
  const DOC_EXT = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'csv', 'rtf']);
  const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'tiny.cc', 'rb.gy', 'shorturl.at', 's.id']);
  const RISKY_TLDS = new Set(['zip', 'mov', 'xyz', 'top', 'click', 'gq', 'tk', 'ml', 'ga', 'cf', 'buzz', 'rest', 'cam', 'quest', 'country']);
  const SECRET_KEYS = new Set(['password', 'passwd', 'pwd', 'pass', 'secret', 'token', 'apikey', 'api_key', 'access_token', 'auth', 'credential', 'credentials', 'pin', 'ssn']);

  function extOf(name) {
    const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  }
  function result(level, reasons) {
    return { level: level, reasons: reasons.length ? reasons : (level === 'safe' ? ['Nothing in this check stood out.'] : reasons) };
  }
  function magicOf(b) {
    if (!b || b.length < 2) return '';
    if (b[0] === 0x4d && b[1] === 0x5a) return 'pe';
    if (b.length >= 4 && b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46) return 'elf';
    if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) return 'zip';
    if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf';
    if (b.length >= 8 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return 'ole';
    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
    if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
    if (b.length >= 3 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'gif';
    if (b[0] === 0x23 && b[1] === 0x21) return 'script';
    return '';
  }
  function hasAscii(bytes, str) {
    const n = str.length;
    if (!bytes || bytes.length < n) return false;
    outer: for (let i = 0; i + n <= bytes.length; i++) {
      for (let j = 0; j < n; j++) if (bytes[i + j] !== str.charCodeAt(j)) continue outer;
      return true;
    }
    return false;
  }
  function hasPdfName(bytes, name) {
    const n = name.length;
    for (let i = 0; i + n < bytes.length; i++) {
      let ok = true;
      for (let j = 0; j < n; j++) if (bytes[i + j] !== name.charCodeAt(j)) { ok = false; break; }
      if (!ok) continue;
      const next = bytes[i + n];
      if (next === 32 || next === 10 || next === 13 || next === 9 || next === 47 || next === 60 || next === 40 || next === 91 || next === 62) return true;
    }
    return false;
  }
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function zipInfo(bytes) {
    if (!bytes || bytes.length < 22) return null;
    let eocd = -1;
    const start = Math.max(0, bytes.length - 66000);
    for (let i = bytes.length - 22; i >= start; i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) { eocd = i; break; }
    }
    if (eocd < 0) return null;
    const count = u16(bytes, eocd + 10);
    let p = u32(bytes, eocd + 16);
    const entries = [];
    let uncomp = 0, comp = 0;
    if (count > 5000 || p > bytes.length) return { bomb: true, entries: [], uncomp: 0, comp: 0 };
    for (let n = 0; n < count && p + 46 <= bytes.length; n++) {
      if (bytes[p] !== 0x50 || bytes[p + 1] !== 0x4b || bytes[p + 2] !== 0x01 || bytes[p + 3] !== 0x02) break;
      const cSize = u32(bytes, p + 20);
      const uSize = u32(bytes, p + 24);
      const nameLen = u16(bytes, p + 28);
      const extra = u16(bytes, p + 30);
      const comment = u16(bytes, p + 32);
      let name = '';
      for (let i = 0; i < nameLen && p + 46 + i < bytes.length; i++) name += String.fromCharCode(bytes[p + 46 + i]);
      entries.push(name);
      comp += cSize; uncomp += uSize;
      p += 46 + nameLen + extra + comment;
    }
    const ratio = comp > 0 ? uncomp / comp : 0;
    const bomb = uncomp > 200 * 1024 * 1024 || (ratio > 100 && uncomp > 20 * 1024 * 1024) || count > 3000;
    return { bomb: bomb, entries: entries, uncomp: uncomp, comp: comp };
  }
  function oleHasMacro(bytes) {
    return hasAscii(bytes, '_VBA_PROJECT') || hasAscii(bytes, 'VBAProject');
  }

  function scanBytes(name, bytes, fileSize) {
    const reasons = [];
    let blocked = false, caution = false;
    const size = fileSize || (bytes ? bytes.length : 0);
    const ext = extOf(name);
    const parts = String(name || '').toLowerCase().split('.');
    const magic = magicOf(bytes || new Uint8Array());
    if (parts.length >= 3 && DOC_EXT.has(parts[parts.length - 2]) && parts[parts.length - 1] !== parts[parts.length - 2]) {
      reasons.push('The name has two extensions (' + parts[parts.length - 2] + ' and ' + ext + '). The last one is the type that would open.');
      if (BLOCKED_EXT.has(ext)) blocked = true; else caution = true;
    }
    if (BLOCKED_EXT.has(ext)) {
      blocked = true;
      reasons.push('This is a program or script (.' + ext + '). LifeHub will not store it.');
    }
    if ((magic === 'pe' || magic === 'elf' || magic === 'script') && !BLOCKED_EXT.has(ext)) {
      blocked = true;
      reasons.push('The contents are a program, but the name does not say so.');
    }
    if (MEDIA_EXT[ext] && magic && magic !== MEDIA_EXT[ext] && magic !== 'script') {
      if (magic === 'pe' || magic === 'elf') blocked = true;
      else caution = true;
      reasons.push('The contents (' + magic + ') do not match the .' + ext + ' name.');
    }
    if (MACRO_EXT.has(ext)) {
      caution = true;
      reasons.push('This Office file is a macro-enabled type (.' + ext + ').');
    }
    if (magic === 'zip' || ZIP_EXT.has(ext)) {
      const info = zipInfo(bytes);
      if (info && info.bomb) {
        blocked = true;
        reasons.push('This archive is unusually large when opened, which can be a zip bomb.');
      }
      if (info && info.entries) {
        info.entries.forEach(entry => {
          const e = extOf(entry);
          if (BLOCKED_EXT.has(e)) {
            blocked = true;
            reasons.push('The archive contains a program or script (' + entry.split('/').pop() + ').');
          }
          if (/vbaproject\.bin$/i.test(entry)) {
            caution = true;
            reasons.push('This Office file contains macros (vbaProject.bin).');
          }
        });
      }
    }
    if (magic === 'ole' && (OLE_EXT.has(ext) || !ext)) {
      if (oleHasMacro(bytes)) {
        caution = true;
        reasons.push('This older Office file looks like it contains macros.');
      }
    }
    if (magic === 'pdf' || ext === 'pdf') {
      ['/JavaScript', '/JS', '/OpenAction', '/Launch', '/EmbeddedFile'].forEach(token => {
        if (hasPdfName(bytes, token)) {
          caution = true;
          reasons.push('This PDF contains ' + token + ', which can run or open something when the file is opened.');
        }
      });
    }
    if (size > 80 * 1024 * 1024) {
      blocked = true;
      reasons.push('This file is over 80 MB, which is too large to keep in the browser.');
    }
    const uniq = [...new Set(reasons)];
    if (blocked) return result('blocked', uniq);
    if (caution) return result('caution', uniq);
    return result('safe', []);
  }

  function fold(s) {
    return String(s || '').toLowerCase().replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/5/g, 's').replace(/\$/g, 's').replace(/rn/g, 'm');
  }
  function distance(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 2;
    const dp = Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) dp[j] = j;
    for (let i = 1; i <= a.length; i++) {
      let prev = i - 1;
      dp[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cur = dp[j];
        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        dp[j] = cost === 0 ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
        prev = cur;
      }
    }
    return dp[b.length];
  }
  function hostOf(url) {
    try { return new URL(url).hostname.replace(/\.$/, '').replace(/^www\./, '').toLowerCase(); } catch (e) { return ''; }
  }
  function official(host, list) {
    return (list || []).some(o => host === o || host.endsWith('.' + o));
  }

  function scanLink(raw, ctx) {
    const reasons = [];
    let blocked = false, caution = false;
    let url = String(raw || '').trim();
    if (!url) return result('safe', []);
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
    let parsed;
    try { parsed = new URL(url); } catch (e) { return result('caution', ['This does not look like a usable link.']); }
    const scheme = parsed.protocol.replace(':', '').toLowerCase();
    if (scheme === 'javascript' || scheme === 'data' || scheme === 'vbscript' || scheme === 'file') {
      return result('blocked', ['This kind of link (' + scheme + ') can run or open a local file. LifeHub will not save it.']);
    }
    if (scheme === 'http') { caution = true; reasons.push('This link is not encrypted (http, not https).'); }
    const host = hostOf(parsed.href);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':') || /^\[[0-9a-f:]+\]$/i.test(parsed.hostname)) {
      caution = true; reasons.push('The address is a raw IP address, not a normal site name.');
    }
    if (host.includes('xn--')) { caution = true; reasons.push('The address uses punycode, which can imitate another name.'); }
    const tld = host.split('.').pop();
    if (RISKY_TLDS.has(tld)) { caution = true; reasons.push('The ending .' + tld + ' is often used in trick links.'); }
    if (SHORTENERS.has(host)) { caution = true; reasons.push('This is a shortened link, so the real destination is hidden.'); }
    if (parsed.username) { caution = true; reasons.push('The link hides the real site behind a username.'); }
    const keys = [];
    parsed.searchParams.forEach((val, key) => { if (SECRET_KEYS.has(key.toLowerCase()) && val) keys.push(key); });
    if (keys.length) { caution = true; reasons.push('The link includes something that looks like a password or token (' + keys.slice(0, 3).join(', ') + ').'); }
    const brands = (ctx && ctx.brands) || [];
    const officialHosts = (ctx && ctx.official) || [];
    if (host && brands.length && !official(host, officialHosts)) {
      const label = fold(host.split('.')[0]);
      const hit = brands.find(b => {
        const brand = fold(b);
        if (!brand || brand.length < 5) return false;
        return label === brand || (brand.length >= 6 && distance(label, brand) <= 1);
      });
      if (hit) { caution = true; reasons.push('This address looks like ' + hit + ', but it is not the usual site.'); }
    }
    const uniq = [...new Set(reasons)];
    if (blocked) return result('blocked', uniq);
    if (caution) return result('caution', uniq);
    return result('safe', []);
  }

  global.LHSafety = { scanBytes: scanBytes, scanLink: scanLink, extOf: extOf };
})(typeof window !== 'undefined' ? window : globalThis);
