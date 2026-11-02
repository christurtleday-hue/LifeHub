/* LifeHub languages. One JSON file is fetched for the active language.
   English is fetched as well when it is not the active language, and fills any missing key. */
(function (global) {
  'use strict';
  const LANGS = [
    ['en', 'English'],
    ['es', 'Español'],
    ['fr', 'Français'],
    ['de', 'Deutsch'],
    ['it', 'Italiano'],
    ['pt-BR', 'Português (Brasil)'],
    ['pt-PT', 'Português (Portugal)'],
    ['nl', 'Nederlands'],
    ['ar', 'العربية'],
    ['he', 'עברית'],
    ['fa', 'فارسی'],
    ['ur', 'اردو'],
    ['hi', 'हिन्दी'],
    ['bn', 'বাংলা'],
    ['id', 'Bahasa Indonesia'],
    ['tr', 'Türkçe'],
    ['ru', 'Русский'],
    ['uk', 'Українська'],
    ['pl', 'Polski'],
    ['vi', 'Tiếng Việt'],
    ['th', 'ไทย'],
    ['zh-CN', '简体中文'],
    ['zh-TW', '繁體中文'],
    ['ja', '日本語'],
    ['ko', '한국어']
  ];
  const RTL = new Set(['ar', 'he', 'fa', 'ur']);
  const packs = {};
  let current = 'en';

  function baseOf(code) { return String(code || 'en').split('-')[0].toLowerCase(); }
  function isRtl(code) { return RTL.has(baseOf(code)) || RTL.has(code); }

  function matchLang(list) {
    const have = new Map(LANGS.map(([code]) => [code.toLowerCase(), code]));
    const tags = (list && list.length ? [...list] : ['en']).map(s => String(s || '').replace(/_/g, '-')).filter(Boolean);
    for (const raw of tags) {
      const tag = raw.trim();
      const lower = tag.toLowerCase();
      if (have.has(lower)) return have.get(lower);
      if (lower.startsWith('zh')) {
        if (/hant|tw|hk|mo/.test(lower)) return 'zh-TW';
        return 'zh-CN';
      }
      if (lower === 'pt' || lower.startsWith('pt-')) {
        if (lower === 'pt-br' || lower.startsWith('pt-br')) return 'pt-BR';
        if (lower === 'pt-pt' || lower === 'pt') return 'pt-PT';
        return 'pt-BR';
      }
      const base = lower.split('-')[0];
      if (have.has(base)) return have.get(base);
    }
    return 'en';
  }

  function pluralCategory(n) {
    const loc = current || 'en';
    try { return new Intl.PluralRules(loc).select(Number(n) || 0); }
    catch (e) { return (Number(n) === 1) ? 'one' : 'other'; }
  }

  function fill(str, vars) {
    return String(str).replace(/\{(\w+),\s*plural,\s*((?:[a-z]+\s*\{[^{}]*\}\s*)+)\}/g, function (_, name, body) {
      const n = vars && vars[name] != null ? Number(vars[name]) : 0;
      const cat = pluralCategory(n);
      const forms = {};
      const re = /([a-z]+)\s*\{([^{}]*)\}/g;
      let m;
      while ((m = re.exec(body))) forms[m[1]] = m[2];
      const chosen = forms[cat] || forms.other || forms.one || '';
      let shown = String(n);
      try { shown = new Intl.NumberFormat(current).format(n); } catch (e) {}
      return chosen.replace(/#/g, shown);
    }).replace(/\{(\w+)\}/g, function (_, k) {
      return vars && vars[k] != null ? String(vars[k]) : '';
    });
  }

  function apply(value, vars) {
    if (value && typeof value === 'object') {
      const n = vars && (vars.n != null ? vars.n : vars.count);
      const cat = pluralCategory(n);
      const str = value[cat] || value.other || value.one || '';
      return fill(str, vars || {});
    }
    if (typeof value !== 'string') return value == null ? '' : String(value);
    return fill(value, vars || {});
  }

  function t(key, vars) {
    const pack = packs[current] || {};
    const en = packs.en || {};
    let value;
    if (Object.prototype.hasOwnProperty.call(pack, key) && pack[key] != null && pack[key] !== '') value = pack[key];
    else if (Object.prototype.hasOwnProperty.call(en, key)) value = en[key];
    else value = key;
    return apply(value, vars);
  }

  async function fetchPack(code) {
    if (packs[code]) return packs[code];
    const res = await fetch('lang/' + code + '.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(code);
    packs[code] = await res.json();
    return packs[code];
  }

  function applyDoc() {
    const root = document.documentElement;
    root.lang = current;
    root.dir = isRtl(current) ? 'rtl' : 'ltr';
    const meta = document.querySelector('meta[name="description"]');
    if (meta && packs[current]) meta.setAttribute('content', t('meta.description'));
    if (document.title === 'LifeHub' || document.documentElement.dataset.lhTitle) {
      document.title = 'LifeHub';
      document.documentElement.dataset.lhTitle = '1';
    }
  }

  async function load(code) {
    const wanted = matchLang([code || 'en']);
    let use = wanted;
    try { await fetchPack(use); }
    catch (e) { use = 'en'; await fetchPack('en'); }
    if (use !== 'en') { try { await fetchPack('en'); } catch (e) {} }
    current = use;
    applyDoc();
    return use;
  }

  global.LH = { LANGS, RTL, matchLang, t, load, isRtl, applyDoc, get code() { return current; }, packs };
})(window);
