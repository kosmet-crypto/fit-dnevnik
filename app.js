'use strict';
/* ================= основно ================= */
const KEY = 'fitdnevnik.v1';
// Оброци, дани и месеци се чувају на српском; t() их преводи при приказу.
const SLOTS = ['Доручак', 'Ужина', 'Ручак', 'Пре тренинга', 'Вечера', 'Касна ужина', 'Кафа / пиће'];
const DAY_SHORT = ['Пон', 'Уто', 'Сре', 'Чет', 'Пет', 'Суб', 'Нед'];
const DAY_LONG = ['Понедељак', 'Уторак', 'Среда', 'Четвртак', 'Петак', 'Субота', 'Недеља'];
const MONTHS = ['јануар', 'фебруар', 'март', 'април', 'мај', 'јун', 'јул', 'август', 'септембар', 'октобар', 'новембар', 'децембар'];
const MOODS = ['😫', '😕', '😐', '🙂', '🤩'];
// Назив „Српски“ је у HTML ентитетима да га латиница не пресловљава.
const LANGS = [['sr', '&#1057;&#1088;&#1087;&#1089;&#1082;&#1080;'], ['sr-lat', 'Srpski (latinica)'], ['en', 'English'], ['no', 'Norsk']];

const ICON = {
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v8M4.5 3v5a2.5 2.5 0 005 0V3M7 11v10M17 21V3c-2.5 1.5-3.5 4.5-3.5 8h3.5"/></svg>',
  stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 20V11M10 20V5M15 20v-7M20 20V9"/></svg>',
  cog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>'
};

function defaultLang() {
  const l = (navigator.language || '').toLowerCase();
  return /^(nb|nn|no)\b/.test(l) ? 'no' : 'sr';
}
function defaults() {
  return {
    v: 1,
    profile: { sex: 'f', age: null, height: null, weight: null, level: 1.2, target: null, protMin: null, protMax: null, water: 2250, glass: 250 },
    settings: { lang: defaultLang(), theme: 'auto', showWeight: false, lastBackup: 0, onboarded: false },
    foods: {}, routines: [], days: {}, recent: [], usage: {}
  };
}
function normalize(s) {
  const d = defaults();
  const out = {
    ...d, ...s,
    profile: { ...d.profile, ...(s.profile || {}) },
    settings: { ...d.settings, ...(s.settings || {}) },
    foods: s.foods || {}, routines: s.routines || [], days: s.days || {}, recent: s.recent || [], usage: s.usage || {}
  };
  // Прва верзија је имала само избор писма.
  if (!(s.settings || {}).lang) out.settings.lang = (s.settings || {}).script === 'lat' ? 'sr-lat' : 'sr';
  delete out.settings.script;
  return out;
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.days) return normalize(s);
  } catch (e) { }
  return defaults();
}
let S = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast(t('Грешка при чувању података!')); }
}

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.').replace(/\s/g, '')); return isFinite(n) ? n : NaN; };
const decStr = v => { const s = String(Math.round(v * 100) / 100); return lang() === 'en' ? s : s.replace('.', ','); };

/* ================= језик ================= */
const lang = () => S.settings.lang || 'sr';
const TR = window.TR || {};
/** Преводи српски текст (кључ) на изабрани језик; {x} се замењује вредностима. */
function t(s, v) {
  const l = lang();
  let r = s;
  if (l === 'en' || l === 'no') { const e = TR[s]; if (e) r = e[l === 'en' ? 0 : 1]; }
  if (v) r = r.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
  return r;
}
const LAT = { а:'a',б:'b',в:'v',г:'g',д:'d',ђ:'đ',е:'e',ж:'ž',з:'z',и:'i',ј:'j',к:'k',л:'l',љ:'lj',м:'m',н:'n',њ:'nj',о:'o',п:'p',р:'r',с:'s',т:'t',ћ:'ć',у:'u',ф:'f',х:'h',ц:'c',ч:'č',џ:'dž',ш:'š',
  А:'A',Б:'B',В:'V',Г:'G',Д:'D',Ђ:'Đ',Е:'E',Ж:'Ž',З:'Z',И:'I',Ј:'J',К:'K',Л:'L',Љ:'Lj',М:'M',Н:'N',Њ:'Nj',О:'O',П:'P',Р:'R',С:'S',Т:'T',Ћ:'Ć',У:'U',Ф:'F',Х:'H',Ц:'C',Ч:'Č',Џ:'Dž',Ш:'Š' };
const toLat = s => String(s).replace(/[Ѐ-ӿ]/g, c => LAT[c] ?? c);
// Латиница се добија пресловљавањем целог приказа.
const L = s => lang() === 'sr-lat' ? toLat(s) : s;
const norm = s => toLat(s).toLowerCase().replace(/đ/g, 'dj').replace(/[æ]/g, 'ae').replace(/[ø]/g, 'o').replace(/[å]/g, 'a').normalize('NFD').replace(/[̀-ͯ]/g, '');

function fmt(n, dec = 0) {
  if (n == null || !isFinite(n)) return '—';
  const neg = n < 0; n = Math.abs(n);
  let [i, f] = n.toFixed(dec).split('.');
  const l = lang(), th = l === 'en' ? ',' : l === 'no' ? ' ' : '.', dp = l === 'en' ? '.' : ',';
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, th);
  if (f && /^0+$/.test(f)) f = '';
  return (neg ? '−' : '') + i + (f ? dp + f : '');
}
const signed = n => (n > 0 ? '+' : '') + fmt(n);

/* датуми */
const pad2 = n => String(n).padStart(2, '0');
const keyOf = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const todayKey = () => keyOf(new Date());
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const wd = k => (parseKey(k).getDay() + 6) % 7;
const nowTime = () => { const d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
const dayShort = i => t(DAY_SHORT[i]);
function dateLabel(k) {
  const td = todayKey();
  if (k === td) return t('Данас');
  if (k === addDays(td, -1)) return t('Јуче');
  return t(DAY_LONG[wd(k)]);
}
function dateLong(d) {
  if (typeof d === 'string') d = parseKey(d);
  const m = t(MONTHS[d.getMonth()]);
  if (lang() === 'en') return d.getDate() + ' ' + m + ' ' + d.getFullYear();
  if (lang() === 'no') return d.getDate() + '. ' + m + ' ' + d.getFullYear();
  return d.getDate() + '. ' + m + ' ' + d.getFullYear() + '.';
}
const dateShort = k => { const d = parseKey(k); return lang() === 'en' ? (d.getMonth() + 1) + '/' + d.getDate() : d.getDate() + '.' + (d.getMonth() + 1) + '.'; };

/* ================= база хране ================= */
// Додатне речи за претрагу (нпр. „јаја“ налази и кајгану).
const ALIASES = { 'Кајгана': 'јаја eggs egg', 'Омлет (мало уља)': 'јаја eggs egg' };
// Порције које се природно броје: за њих се подразумевано уноси број комада/јаја.
const COUNT_PORTIONS = ['јаје', 'комад'];
const BASE = [];
const BASE_MAP = {};
for (const [cat, list] of Object.entries(window.FOOD_BASE || {})) {
  for (const [name, kcal, p, unit, portion] of list) {
    const tr = TR[name] || [];
    const f = { id: 'b:' + name, name, kcal, p, unit, portion, cat, src: 'base', key: norm([name, ...tr, ALIASES[name] || ''].join(' ')) };
    BASE.push(f); BASE_MAP[f.id] = f;
  }
}
const ACTS = (window.ACTIVITY_BASE || []).map(([name, met]) => ({ name, met }));
const getFood = id => S.foods[id] || BASE_MAP[id] || null;
const allFoods = () => [...Object.values(S.foods), ...BASE];
const unitOf = f => f.unit === 'ml' ? 'ml' : 'g';
// Називи из уграђене базе, порције и активности се преводе; оно што је она унела остаје како је написано.
const foodName = f => f.src === 'base' ? t(f.name) : f.name;
const itemName = it => it.fid && BASE_MAP[it.fid] ? t(BASE_MAP[it.fid].name) : it.name;
const porName = p => t(p);
const actName = a => a.rid ? a.name : t(a.name);

function searchFoods(q, limit = 40) {
  // Скраћивање дужих речи за једно слово покрива падеже и множину (јаја/јаје, eggs/egg).
  const words = norm(q).split(/\s+/).filter(Boolean).map(w => w.length >= 4 ? w.slice(0, -1) : w);
  if (!words.length) return [];
  const out = [];
  for (const f of allFoods()) {
    const n = f.key || norm(f.name + ' ' + (f.brand || ''));
    if (!words.every(w => n.includes(w))) continue;
    const shown = norm(foodName(f));
    let score = (S.usage[f.id] || 0) * 3 + (f.src !== 'base' ? 20 : 0);
    if (shown.startsWith(words[0])) score += 15;
    if (shown.split(/[\s/(),]+/).some(x => x.startsWith(words[0]))) score += 5;
    out.push([score, f]);
  }
  out.sort((a, b) => b[0] - a[0] || foodName(a[1]).length - foodName(b[1]).length);
  return out.slice(0, limit).map(x => x[1]);
}
function makeItem(f, g) {
  return { fid: f.id, name: f.name, g: Math.round(g * 10) / 10, unit: unitOf(f), kcal: Math.round(f.kcal * g / 10) / 10, p: Math.round(f.p * g / 10) / 10 };
}
function noteUse(items) {
  for (const it of items) {
    if (!it.fid) continue;
    S.usage[it.fid] = (S.usage[it.fid] || 0) + 1;
    S.recent = [it.fid, ...S.recent.filter(x => x !== it.fid)].slice(0, 40);
  }
}
const itemLine = it => !it.fid ? t('ручно')
  : it.pc ? fmt(it.pc[1], 1) + ' × ' + porName(it.pc[0]) + ' (' + fmt(it.g) + ' ' + (it.unit || 'g') + ')'
  : fmt(it.g) + ' ' + (it.unit || 'g');
const PA = () => t('g П');

/* ================= математика ================= */
function peek(k) { return S.days[k] || null; }
function day(k) {
  if (!S.days[k]) S.days[k] = { meals: [], acts: [], skip: [], steps: null, water: 0, weight: null, mood: null, note: '' };
  const d = S.days[k]; d.meals ||= []; d.acts ||= []; d.skip ||= [];
  return d;
}
function estWeight() { const h = (S.profile.height || 168) / 100; return Math.round(23 * h * h); }
function weightOn(k) {
  let best = null, bk = '';
  for (const [dk, d] of Object.entries(S.days)) if (d.weight && dk <= k && dk > bk) { bk = dk; best = d.weight; }
  return best || S.profile.weight || estWeight();
}
function bmr(w) {
  const p = S.profile, a = p.age || 40, h = p.height || 168;
  return 10 * w + 6.25 * h - 5 * a + (p.sex === 'm' ? 5 : -161);
}
// Корак ≈ 0,00044 kcal по кг изнад мировања (ходање ~100 корака/мин, MET 3,5).
const stepsKcal = (steps, w) => (steps || 0) * w * 0.00044;
// Потрошња вежбе изнад мировања (мировање се рачуна посебно, па се не броји двапут).
const actKcal = (met, min, w, int = 1) => Math.max(0, met * int - 1) * 3.5 * w / 200 * min;
function suggestTarget(w) { return Math.max(1200, Math.round((bmr(w) * 1.5 - 500) / 50) * 50); }
function target() { return S.profile.target || suggestTarget(weightOn(todayKey())); }
function protRange() {
  const w = weightOn(todayKey());
  const lo = S.profile.protMin || Math.round(w * 1.3 / 5) * 5;
  const hi = S.profile.protMax || Math.max(lo, Math.round(w * 1.5 / 5) * 5);
  return [lo, hi];
}
function calc(k) {
  const d = peek(k) || { meals: [], acts: [], skip: [] };
  const w = weightOn(k);
  let kcal = 0, p = 0;
  for (const m of d.meals || []) for (const it of m.items) { kcal += it.kcal || 0; p += it.p || 0; }
  const rest = bmr(w) * (S.profile.level || 1.2);
  const st = stepsKcal(d.steps, w);
  let ak = 0, amin = 0;
  for (const a of d.acts || []) { ak += a.kcal || 0; amin += a.min || 0; }
  const exp = rest + st + ak;
  return { k, d, w, kcal, p, rest, st, ak, amin, exp, bal: kcal - exp, logged: (d.meals || []).length > 0, steps: d.steps || 0, water: d.water || 0 };
}
function lastDays(endK, n) { const out = []; for (let i = n - 1; i >= 0; i--) out.push(addDays(endK, -i)); return out; }
function weekBalance(endK) {
  let sum = 0, n = 0;
  for (const k of lastDays(endK, 7)) { const c = calc(k); if (c.logged) { sum += c.bal; n++; } }
  return { sum, n };
}
const routinesOn = k => S.routines.filter(r => (r.days || []).includes(wd(k)));
function routineState(k, r) {
  const d = peek(k);
  if (!d) return 'pending';
  if ((d.acts || []).some(a => a.rid === r.id)) return 'done';
  if ((d.skip || []).includes(r.id)) return 'skip';
  return 'pending';
}
const inTarget = c => c.logged && c.kcal <= target() + 50;
function fatText(kcal) { const g = kcal / 7.7; return g >= 1000 ? fmt(g / 1000, 1) + ' kg' : fmt(Math.round(g / 10) * 10) + ' g'; }

/* ================= UI стање и навигација ================= */
const ui = { tab: 'today', date: todayKey(), statN: 7, foodQ: '', foodSeg: 'mine' };

function applyTheme() {
  const th = S.settings.theme;
  if (th === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', th);
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  $('meta[name=theme-color]').setAttribute('content', bg || '#111014');
  document.documentElement.lang = lang() === 'no' ? 'nb' : lang() === 'en' ? 'en' : 'sr';
  document.title = t('Фит дневник');
}

function toast(msg) {
  const el = $('#toast'); el.textContent = L(msg); el.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('show'), 2200);
}

function render() {
  applyTheme();
  renderTabs();
  const fab = $('#fab');
  fab.classList.toggle('hidden', ui.tab !== 'today');
  fab.innerHTML = ICON.plus + L(t('Оброк'));
  fab.setAttribute('aria-label', L(t('Додај оброк')));
  if (ui.tab === 'today') renderToday();
  else if (ui.tab === 'food') renderFood();
  else if (ui.tab === 'stats') renderStats();
  else renderSettings();
}
function renderTabs() {
  const tabs = [['today', t('Дан'), ICON.today], ['food', t('Храна'), ICON.food], ['stats', t('Статистика'), ICON.stats], ['settings', t('Подешавања'), ICON.cog]];
  $('#tabsin').innerHTML = L(tabs.map(([id, l, ic]) => `<button data-tab="${id}" class="${ui.tab === id ? 'on' : ''}">${ic}${l}</button>`).join(''));
}
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  if (ui.tab === b.dataset.tab && b.dataset.tab === 'today') ui.date = todayKey();
  ui.tab = b.dataset.tab; render(); window.scrollTo(0, 0);
});
$('#fab').addEventListener('click', () => mealSheet(ui.date));

/* ================= екран „Дан“ ================= */
function ring(frac, color, over) {
  const r = 52, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--surface2)" stroke-width="11"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="${over ? 'var(--warn)' : color}" stroke-width="11" stroke-linecap="round"
    stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/></svg>`;
}

function tipsFor(c) {
  const k = c.k, isToday = k === todayKey(), tg = target(), [pmin] = protRange();
  const hour = new Date().getHours();
  const rem = tg - c.kcal, prem = pmin - c.p;
  const out = [];
  // Само потврђене активности: план (нпр. плес) се не рачуна док она не каже „Да“.
  const heavy = c.ak >= 300;
  const short = (c.d.acts || []).some(a => a.short);
  if (!isToday) {
    if (!c.logged) return [['📝', t('За овај дан нема уноса хране. Можеш да га допуниш кад год хоћеш.')]];
    out.push(c.bal <= 0
      ? ['✅', t('Тог дана си била у дефициту {a} kcal, протеин {b} g.', { a: fmt(-c.bal), b: fmt(c.p) })]
      : ['💛', t('Тог дана је био мали вишак од {a} kcal. Рачуна се недеља, не један дан.', { a: fmt(c.bal) })]);
    if (c.p >= pmin) out.push(['💪', t('Протеин је био испуњен.')]);
    return out;
  }
  if (!c.logged) {
    out.push(hour < 11
      ? ['☀️', t('Добро јутро! Доручак са протеинима (јаја, туњевина, јогурт, скир) држи ситост до ручка.')]
      : ['🍽️', t('Још ниси унела ниједан оброк данас. Тапни „+ Оброк“ кад будеш јела.')]);
  } else if (rem < -50) {
    const wb = weekBalance(k);
    out.push(['💛', t('Данас си {a} kcal преко циља. Није страшно, рачуна се недеља, не један дан.', { a: fmt(-rem) }) + ' ' +
      (wb.sum < 0 ? t('Последњих 7 дана си и даље у дефициту {a} kcal.', { a: fmt(-wb.sum) }) : t('Сутра само настави по плану.'))]);
  } else if (rem <= 60 && c.p >= pmin) {
    out.push(['🎉', t('Одлично! Циљ калорија и протеина за данас је испуњен.')]);
  } else if (prem > 5 && rem > 0) {
    const tight = rem < prem * 6;
    out.push(['💪', t('Остало ти је {a} kcal и још ~{b} g протеина.', { a: fmt(rem), b: fmt(prem) }) + ' ' +
      (tight ? t('Бирај нешто баш протеинско: протеински пудинг, скир, посни сир, беланца, туњевина.') : t('Добар избор: јаја, пилетина, туњевина, скир или протеински пудинг.'))]);
  } else if (rem > 0) {
    out.push(['🍽️', t('Остало ти је још {a} kcal за данас.', { a: fmt(rem) }) + (c.p >= pmin ? ' ' + t('Протеин је већ испуњен 👏') : '')]);
  }
  if (heavy && rem > -150) out.push(['💃', t('Данас трошиш више због тренинга/плеса. Слободно додај 150–200 kcal, најбоље протеин пре или после.')]);
  if (short) out.push(['👏', t('Скраћен тренинг је и даље тренинг. Доследност је важнија од савршенства.')]);
  if (hour >= 20 && c.logged && c.kcal < 1200) out.push(['⚠️', t('До сада само {a} kcal. Превелики дефицит умара и топи мишиће. Поједи још нешто лагано и протеинско.', { a: fmt(c.kcal) })]);
  const wgoal = S.profile.water || 2250;
  if (hour >= 15 && c.water < wgoal / 2) out.push(['💧', t('Попила си {a} L од {b} L. Чаша воде сада?', { a: fmt(c.water / 1000, 2), b: fmt(wgoal / 1000, 2) })]);
  if (hour >= 17 && c.steps && c.steps < 7000) {
    const more = 8000 - c.steps;
    out.push(['🚶‍♀️', t('Још {a} корака ≈ {b} kcal. Кратка шетња после вечере?', { a: fmt(more), b: fmt(stepsKcal(more, c.w)) })]);
  }
  return out.slice(0, 3);
}

function renderToday() {
  const k = ui.date, t0 = todayKey(), isToday = k === t0;
  const c = calc(k), tg = target(), [pmin, pmax] = protRange();
  const monday = addDays(k, -wd(k));
  const week = lastDays(addDays(monday, 6), 7).map(dk => {
    const cc = calc(dk), fut = dk > t0;
    const dot = cc.logged ? (inTarget(cc) ? 'ok' : 'over') : '';
    return `<button class="wd ${dk === k ? 'sel' : ''}" data-date="${dk}" ${fut ? 'disabled' : ''}>${dayShort(wd(dk))}<b>${parseKey(dk).getDate()}</b><i class="${dot}"></i></button>`;
  }).join('');
  $('#topin').innerHTML = L(`<div class="topbar datenav">
      <button class="iconbtn" data-nav="-1" aria-label="${t('Претходни дан')}">${ICON.left}</button>
      <button class="dt" data-nav="pick"><b>${dateLabel(k)}</b><span>${dateLong(k)}</span></button>
      <button class="iconbtn" data-nav="1" aria-label="${t('Следећи дан')}" ${isToday ? 'disabled' : ''}>${ICON.right}</button>
    </div><div class="week">${week}</div>`);

  let h = '';
  const hasData = Object.keys(S.days).length > 0;
  const since = S.settings.lastBackup ? Math.floor((Date.now() - S.settings.lastBackup) / 864e5) : null;
  if (hasData && isToday && (since === null || since >= 7)) {
    h += `<div class="banner"><span>💾</span><div class="grow">${since === null ? t('Још ниси направила бекап.') : t('Последњи бекап пре {a} дана.', { a: since })}</div><button class="btn sm" data-act="backup">${t('Сачувај')}</button></div>`;
  }

  const rem = tg - c.kcal, over = rem < 0;
  h += `<div class="card"><div class="hero">
    <div><div class="ringbox">${ring(c.kcal / tg, 'var(--accent)', over)}
      <div class="rc"><b class="num">${fmt(c.kcal)}</b><span>${t('од {a} kcal', { a: fmt(tg) })}</span>
      <em class="${over ? 'warn' : ''}">${over ? t('+{a} преко', { a: fmt(-rem) }) : t('још {a}', { a: fmt(rem) })}</em></div></div>
      <div class="ringlabel">${t('Калорије')}</div></div>
    <div><div class="ringbox">${ring(c.p / pmin, 'var(--prot)', false)}
      <div class="rc"><b class="num">${fmt(c.p)} g</b><span>${t('циљ {a}–{b} g', { a: pmin, b: pmax })}</span>
      <em class="${c.p >= pmin ? 'pos' : 'prot'}">${c.p >= pmin ? t('испуњено ✓') : t('још {a} g', { a: fmt(pmin - c.p) })}</em></div></div>
      <div class="ringlabel">${t('Протеин')}</div></div>
  </div></div>`;

  const wb = weekBalance(k), bal = c.bal;
  h += `<div class="card">
    <div class="balance"><div>
      <div class="muted small">${c.logged ? (bal <= 0 ? t('Дефицит') : t('Суфицит')) : t('Биланс')}${isToday && c.logged ? ' ' + t('(ако више не једеш)') : ''}</div>
      <div class="bigval num ${c.logged ? (bal <= 0 ? 'pos' : 'warn') : 'faint'}">${c.logged ? signed(Math.round(bal)) + ' kcal' : '—'}</div>
    </div>
    <div style="text-align:right"><div class="muted small">${t('Потрошња')}</div><div class="num" style="font-size:20px;font-weight:750">≈ ${fmt(c.exp)} kcal</div></div></div>
    <div class="breakdown">
      <span class="pill">${t('основно')} ${fmt(c.rest)}</span>
      <span class="pill">${t('кораци')} ${fmt(c.st)}</span>
      <span class="pill">${t('вежбе')} ${fmt(c.ak)}</span>
    </div>
    ${wb.n ? `<div class="weekline">${t('Последњих 7 дана:')} <b class="${wb.sum <= 0 ? 'pos' : 'warn'} num">${signed(Math.round(wb.sum))} kcal</b>
      <span class="muted">${wb.sum < 0 ? ' ≈ ' + t('{a} масти мање', { a: fatText(-wb.sum) }) : ''} · ${t('{a}/7 дана унето', { a: wb.n })}</span></div>` : ''}
  </div>`;

  for (const [em, txt] of tipsFor(c)) h += `<div class="tip"><div class="em">${em}</div><p>${txt}</p></div>`;

  for (const r of routinesOn(k)) {
    const st = routineState(k, r);
    if (st === 'done') continue;
    if (st === 'skip') {
      h += `<div class="row"><div class="grow"><b class="faint">${esc(r.name)}</b><span>${t('прескочено')}</span></div><button class="btn sm ghost" data-unskip="${r.id}">${t('Врати назад')}</button></div>`;
      continue;
    }
    // Ништа се не уписује само: она потврди „Да“ (па упише минуте) или „Не“.
    h += `<div class="routine"><div class="rt"><div><b>${esc(r.name)}</b><div class="muted small">${t('план: {a} мин', { a: r.min })} · ≈ ${fmt(actKcal(r.met, r.min, c.w))} kcal</div></div></div>
      <div>${t('Да ли си одрадила ову вежбу?')}</div>
      <div class="btnrow"><button class="btn pos" data-ryes="${r.id}">${t('Да')}</button><button class="btn" data-rno="${r.id}">${t('Не')}</button></div></div>`;
  }

  // Тренинзи који нису у плану за данас (нпр. плес померен на други дан) могу да се додају једним тапом.
  const extra = S.routines.filter(r => !routinesOn(k).includes(r) && routineState(k, r) !== 'done');
  if (extra.length) h += `<div class="chips" style="margin:4px 0 12px;align-items:center"><span class="muted small">${t('Још данас:')}</span>${extra.map(r => `<button class="chip" data-ryes="${r.id}">+ ${esc(r.name)}</button>`).join('')}</div>`;

  const wgoal = S.profile.water || 2250;
  h += `<div class="tiles">
    <button class="tile" data-act="steps"><span class="tl">👟 ${t('Кораци')}</span><span class="tv num">${c.d.steps ? fmt(c.d.steps) : '—'}</span>
      <span class="ts">${c.d.steps ? (c.d.stepsSrc === 'hc' ? '📱 ' : '') + '≈ ' + fmt(c.st) + ' kcal' : t('тапни да упишеш')}</span></button>
    <div class="tile"><span class="tl">💧 ${t('Вода')}</span><span class="tv num">${fmt(c.water / 1000, 2)} L</span>
      <div class="bar"><i style="width:${Math.min(100, c.water / wgoal * 100)}%;background:var(--water)"></i></div>
      <div class="water-ctrl"><button data-water="-1" aria-label="${t('Мање')}">−</button><span class="ts" style="flex:1;text-align:center">${S.profile.glass || 250} ml</span><button data-water="1" aria-label="${t('Више')}">+</button></div></div>
  </div>`;

  const meals = [...(c.d.meals || [])].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  h += `<div class="sec"><h2>${t('Оброци')}</h2><span class="muted small num">${fmt(c.kcal)} kcal · ${t('{a} g протеина', { a: fmt(c.p) })}</span></div>`;
  if (!meals.length) h += `<div class="empty">${t('Нема унетих оброка.')}<br>${t('Тапни „+ Оброк“ доле десно.')}</div>`;
  for (const m of meals) {
    const mk = m.items.reduce((s, i) => s + i.kcal, 0), mp = m.items.reduce((s, i) => s + i.p, 0);
    h += `<div class="meal"><button class="meal-h" data-meal="${m.id}"><div><b>${esc(t(m.slot))}</b> <span class="mt">${esc(m.time || '')}</span></div>
      <span class="num small"><b>${fmt(mk)}</b> kcal · <span class="prot">${fmt(mp)} g</span></span></button>
      <ul>${m.items.map(i => `<li><span>${esc(itemName(i))} <span class="faint">${esc(itemLine(i))}</span></span><span class="num">${fmt(i.kcal)}</span></li>`).join('')}</ul>
      ${!isToday ? `<div class="meal-actions"><button data-copymeal="${m.id}">${t('Понови данас')}</button></div>` : ''}</div>`;
  }

  h += `<div class="sec"><h2>${t('Активности')}</h2><button class="linkbtn" data-act="addact">+ ${t('Додај')}</button></div>`;
  const acts = c.d.acts || [];
  if (!acts.length && !c.d.steps) h += `<div class="empty">${t('Нема унетих активности.')}</div>`;
  for (const a of acts) {
    h += `<button class="row" data-editact="${a.id}"><div class="grow"><b>${esc(actName(a))}${a.short ? `<span class="badge">${t('скраћено')}</span>` : ''}</b><span>${t('{a} мин', { a: a.min })}${a.int && a.int !== 1 ? ' · ' + (a.int < 1 ? t('лагано') : t('јако')) : ''}</span></div>
      <div class="end num">${fmt(a.kcal)} kcal</div></button>`;
  }

  h += `<div class="sec"><h2>${t('Како је било')}</h2></div><div class="card">
    <div class="moods">${MOODS.map((m, i) => `<button data-mood="${i + 1}" class="${c.d.mood === i + 1 ? 'on' : ''}" aria-label="${t('Расположење')} ${i + 1}">${m}</button>`).join('')}</div>
    <label class="f">${t('Белешка за дан')}</label>
    <textarea id="daynote" placeholder="${t('нпр. уморна после посла, одлична енергија на плесу…')}">${esc(c.d.note || '')}</textarea>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
      <span class="muted small">⚖️ ${t('Тежина (није обавезно)')}</span>
      <button class="btn sm" data-act="weight">${c.d.weight ? fmt(c.d.weight, 1) + ' kg' : t('Упиши')}</button>
    </div></div>`;

  $('#view').innerHTML = L(h);
}

$('#top').addEventListener('click', e => {
  const n = e.target.closest('[data-nav]');
  if (n) {
    if (n.dataset.nav === 'pick') return datePick();
    const nk = addDays(ui.date, +n.dataset.nav);
    if (nk <= todayKey()) { ui.date = nk; render(); }
    return;
  }
  const d = e.target.closest('[data-date]');
  if (d && !d.disabled) { ui.date = d.dataset.date; render(); }
});
function datePick() {
  const sh = openSheet(t('Изабери дан'), `<input type="date" id="dp" value="${ui.date}" max="${todayKey()}"><div style="height:10px"></div>
    <button class="btn block" id="dpt">${t('Данас')}</button>`, `<button class="btn primary" id="dpo">${t('Иди')}</button>`);
  $('#dpt', sh).onclick = () => { ui.date = todayKey(); closeSheet(); render(); };
  $('#dpo', sh).onclick = () => { const v = $('#dp', sh).value; if (v && v <= todayKey()) { ui.date = v; closeSheet(); render(); } };
}

$('#view').addEventListener('click', e => {
  if (ui.tab !== 'today') return;
  const b = e.target.closest('button'); if (!b) return;
  const ds = b.dataset, k = ui.date;
  if (ds.meal) return mealSheet(k, ds.meal);
  if (ds.copymeal) {
    const m = peek(k).meals.find(x => x.id === ds.copymeal);
    day(todayKey()).meals.push({ ...JSON.parse(JSON.stringify(m)), id: uid(), time: nowTime() });
    save(); toast(t('Оброк је додат у данашњи дан')); return;
  }
  if (ds.ryes) { const r = S.routines.find(x => x.id === ds.ryes); return actSheet(k, null, r); }
  if (ds.rno) { day(k).skip.push(ds.rno); save(); render(); return; }
  if (ds.unskip) { const d = day(k); d.skip = d.skip.filter(x => x !== ds.unskip); save(); render(); return; }
  if (ds.water) {
    const d = day(k); d.water = Math.max(0, (d.water || 0) + (+ds.water) * (S.profile.glass || 250));
    save(); render(); return;
  }
  if (ds.editact) return actSheet(k, ds.editact);
  if (ds.mood) { const d = day(k); d.mood = d.mood === +ds.mood ? null : +ds.mood; save(); render(); return; }
  switch (ds.act) {
    case 'steps': return stepsSheet(k);
    case 'addact': return actSheet(k);
    case 'weight': return weightSheet(k);
    case 'backup': return exportBackup();
  }
});
$('#view').addEventListener('change', e => {
  if (e.target.id === 'daynote') { day(ui.date).note = e.target.value; save(); }
});


/* ================= листови (sheets) ================= */
const stack = [];
// У APK-у дугме „назад“ иде преко window.fitBack (MainActivity); у прегледачу преко историје.
const NATIVE = !!window.FitAndroid;
function openSheet(title, body, foot = '', opts = {}) {
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.innerHTML = L(`<div class="sheet" role="dialog" aria-modal="true">
    <div class="sheet-h"><h3>${title}</h3><button class="iconbtn" data-close aria-label="${t('Затвори')}">${ICON.close}</button></div>
    <div class="sheet-b">${body}</div>${foot ? `<div class="sheet-f">${foot}</div>` : ''}</div>`);
  bd.addEventListener('click', e => { if (e.target === bd || e.target.closest('[data-close]')) closeSheet(); });
  document.body.appendChild(bd);
  document.body.style.overflow = 'hidden';
  bd.onClose = opts.onClose;
  stack.push(bd);
  if (!NATIVE && stack.length === 1) {
    // Поново користи ставку историје која је остала од претходно затвореног листа.
    if (history.state && history.state.sheet === 0) history.replaceState({ sheet: 1 }, '');
    else history.pushState({ sheet: 1 }, '');
  }
  return bd;
}
function removeTop() {
  const bd = stack.pop(); if (!bd) return;
  bd.remove();
  if (bd.onClose) bd.onClose();
  if (!stack.length) document.body.style.overflow = '';
}
function closeSheet(n = 1) {
  for (let i = 0; i < n && stack.length; i++) removeTop();
  if (!NATIVE && !stack.length && history.state && history.state.sheet === 1) history.replaceState({ sheet: 0 }, '');
}
window.addEventListener('popstate', () => {
  if (!stack.length) return;
  removeTop();
  if (stack.length) history.pushState({ sheet: 1 }, '');
});
/** Android „назад“: затвори лист или се врати на „Дан“; false значи да апликација може да се затвори. */
window.fitBack = () => {
  if (stack.length) { closeSheet(); return true; }
  if (ui.tab !== 'today') { ui.tab = 'today'; ui.date = todayKey(); render(); window.scrollTo(0, 0); return true; }
  return false;
};
function ask(text, okLabel, cb, danger = true) {
  const sh = openSheet(t('Потврда'), `<p>${text}</p>`, `<button class="btn" data-close>${t('Одустани')}</button><button class="btn ${danger ? 'warn' : 'primary'}" id="okb">${okLabel}</button>`);
  $('#okb', sh).onclick = () => { closeSheet(); cb(); };
}

/* ---------- оброк ---------- */
function defaultSlot() {
  const h = new Date().getHours();
  return h < 10 ? 'Доручак' : h < 12 ? 'Ужина' : h < 15 ? 'Ручак' : h < 19 ? 'Ужина' : 'Вечера';
}
function mealSheet(k, mealId) {
  const d = peek(k);
  const existing = mealId && d ? d.meals.find(m => m.id === mealId) : null;
  const draft = existing ? JSON.parse(JSON.stringify(existing))
    : { id: uid(), slot: defaultSlot(), time: k === todayKey() ? nowTime() : '12:00', items: [] };
  const sh = openSheet(existing ? t('Измени оброк') : t('Нови оброк'), `
    <div class="chips" id="slots"></div>
    <label class="f">${t('Време')}</label><input type="time" id="mtime" value="${draft.time}">
    <div id="mitems"></div>
    <button class="btn block" id="madd" style="margin-top:8px">${ICON.plus.replace('<svg', '<svg width="18" height="18"')} ${t('Додај намирницу')}</button>
    <div class="grid2" style="margin-top:8px">
      <button class="btn sm ghost" id="mrec">${t('Сачувај као рецепт')}</button>
      ${existing ? `<button class="btn sm danger" id="mdel">${t('Обриши оброк')}</button>` : '<span></span>'}
    </div>`,
    `<button class="btn" data-close>${t('Откажи')}</button><button class="btn primary" id="msave">${t('Сачувај')}</button>`);
  const draw = () => {
    $('#slots', sh).innerHTML = L(SLOTS.map(s => `<button class="chip ${s === draft.slot ? 'on' : ''}" data-slot="${esc(s)}">${esc(t(s))}</button>`).join(''));
    const tk = draft.items.reduce((s, i) => s + i.kcal, 0), tp = draft.items.reduce((s, i) => s + i.p, 0);
    $('#mitems', sh).innerHTML = L((draft.items.length ? draft.items.map((it, i) => `<div class="item"><button class="grow" style="text-align:left" data-edit="${i}"><b>${esc(itemName(it))}</b>
      <span class="num">${esc(itemLine(it))} · ${fmt(it.kcal)} kcal · ${fmt(it.p, 1)} ${PA()}</span></button><button class="x" data-rm="${i}" aria-label="${t('Уклони')}">×</button></div>`).join('')
      : `<div class="empty">${t('Још нема намирница у оброку.')}</div>`) +
      (draft.items.length ? `<div class="sumline"><span>${t('Укупно')}</span><span class="num">${fmt(tk)} kcal · <span class="prot">${t('{a} g протеина', { a: fmt(tp, 1) })}</span></span></div>` : ''));
  };
  draw();
  sh.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.slot) { draft.slot = b.dataset.slot; draw(); }
    else if (b.dataset.rm) { draft.items.splice(+b.dataset.rm, 1); draw(); }
    else if (b.dataset.edit) {
      const i = +b.dataset.edit, it = draft.items[i], f = it.fid && getFood(it.fid);
      if (f) qtySheet(f, items => { draft.items.splice(i, 1, ...items); draw(); }, it.pc ? null : it.g, it.pc ? it.pc[1] : undefined);
      else quickSheet(it, nit => { draft.items[i] = nit; draw(); });
    }
  });
  $('#mtime', sh).onchange = e => { draft.time = e.target.value; };
  $('#madd', sh).onclick = () => pickFood({ meals: true }, items => { draft.items.push(...items); draw(); });
  $('#mrec', sh).onclick = () => {
    if (draft.items.length < 1) return toast(t('Прво додај намирнице'));
    recipeSheet(null, draft.items.map(i => ({ ...i })));
  };
  if (existing) $('#mdel', sh).onclick = () => ask(t('Обрисати овај оброк?'), t('Обриши'), () => {
    const dd = day(k); dd.meals = dd.meals.filter(m => m.id !== draft.id); save(); closeSheet(); render();
  });
  $('#msave', sh).onclick = () => {
    const dd = day(k);
    if (!draft.items.length) {
      if (existing) dd.meals = dd.meals.filter(m => m.id !== draft.id);
      save(); closeSheet(); render(); return;
    }
    const i = dd.meals.findIndex(m => m.id === draft.id);
    if (i >= 0) dd.meals[i] = draft; else dd.meals.push(draft);
    noteUse(draft.items);
    save(); closeSheet(); render();
    toast(t('Оброк је сачуван'));
  };
  if (!existing) pickFood({ meals: true }, items => { draft.items.push(...items); draw(); });
}

/* ---------- бирање намирнице ---------- */
function recentMeals() {
  const out = [], seen = new Set();
  const keys = Object.keys(S.days).sort().reverse().slice(0, 30);
  for (const k of keys) for (const m of [...S.days[k].meals || []].reverse()) {
    const sig = m.items.map(i => i.name).join('|');
    if (!m.items.length || seen.has(sig)) continue;
    seen.add(sig); out.push({ k, m });
    if (out.length >= 8) return out;
  }
  return out;
}
function foodRes(f) {
  const tag = f.src === 'recipe' ? `<span class="badge">${t('рецепт')}</span>` : f.src === 'off' ? `<span class="badge">${t('нет')}</span>` : f.src === 'user' ? `<span class="badge">${t('моје')}</span>` : '';
  const por = f.portion ? ` · ${esc(porName(f.portion[0]))} ${fmt(f.portion[1])} ${unitOf(f)}` : '';
  return `<button class="res" data-fid="${esc(f.id)}"><div class="grow"><b>${esc(foodName(f))}${tag}</b><span>${f.brand ? esc(f.brand) + ' · ' : ''}${t('{a} kcal · {b} g П на 100 {u}', { a: fmt(f.kcal), b: fmt(f.p, 1), u: unitOf(f) })}${por}</span></div></button>`;
}
function pickFood(opts, cb) {
  const sh = openSheet(t('Додај намирницу'), `
    <input type="search" id="pq" placeholder="${t('Тражи, нпр. „2 јаја“ или „туњевина“')}" autocomplete="off">
    <div class="actions3">
      <button class="btn" id="pscan"><span>📷</span>${t('Бар-код')}</button>
      <button class="btn" id="pnet"><span>🌐</span>${t('Интернет')}</button>
      <button class="btn" id="pman"><span>✍️</span>${t('Ручно')}</button>
    </div>
    <div id="pres"></div>`);
  const input = $('#pq', sh), res = $('#pres', sh);
  const done = items => { closeSheet(); cb(items); };
  const draw = () => {
    // Број у претрази („2 јаја“, „кајгана 3“) постаје количина.
    const m = input.value.match(/(^|\s)(\d+(?:[.,]\d+)?)(?=\s|$)/);
    draw.n = m ? num(m[2]) : null;
    const q = (m ? input.value.replace(m[0], ' ') : input.value).trim();
    let h = '';
    if (!q) {
      if (opts.meals) {
        const rm = recentMeals();
        if (rm.length) h += `<div class="gh">${t('Понови оброк')}</div>` + rm.map(({ m }, i) => {
          const tk = m.items.reduce((s, x) => s + x.kcal, 0);
          return `<button class="res" data-rmeal="${i}"><div class="grow"><b>${esc(t(m.slot))}</b><span>${esc(m.items.map(itemName).join(', '))}</span></div><div class="end num">${fmt(tk)} kcal</div></button>`;
        }).join('');
        draw.rm = rm;
      }
      const rec = S.recent.map(getFood).filter(Boolean).slice(0, 20);
      if (rec.length) h += `<div class="gh">${t('Скорашње')}</div>` + rec.map(foodRes).join('');
      if (!h) h = `<div class="empty">${t('Почни да куцаш назив. У бази има {a} намирница и јела,', { a: BASE.length })}<br>${t('а оно што често једеш појавиће се овде.')}</div>`;
    } else {
      const r = searchFoods(q);
      h = r.length ? r.map(foodRes).join('') : `<div class="empty">${t('Нема „{a}“ у бази.', { a: esc(q) })}<br>${t('Пробај 🌐 Интернет или ✍️ Ручно.')}</div>`;
    }
    res.innerHTML = L(h);
  };
  input.addEventListener('input', draw);
  draw();
  res.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rmeal) return done(JSON.parse(JSON.stringify(draw.rm[+b.dataset.rmeal].m.items)));
    const f = getFood(b.dataset.fid);
    if (f) qtySheet(f, items => done(items), null, draw.n);
  });
  $('#pscan', sh).onclick = () => barcodeSheet(f => qtySheet(f, items => done(items)));
  $('#pnet', sh).onclick = () => netSheet(input.value.trim(), f => qtySheet(f, items => done(items)));
  $('#pman', sh).onclick = () => manualSheet(input.value.trim(), r => {
    if (r.item) done([r.item]); else qtySheet(r.food, items => done(items));
  });
}

/* ---------- количина ---------- */
function qtySheet(f, cb, g0, count) {
  const u = unitOf(f);
  const por = f.portion && f.portion[1] > 0 ? f.portion : null;
  // Подразумевано у грамима (тако она уноси), осим за оно што се броји (јаја, комади)
  // или ако је за ову намирницу последњи пут бирала порцију. Број из претраге се поштује.
  S.qmode ||= {};
  let mode = 'g', val;
  if (g0 != null) val = g0;
  else if (count > 0 && por && count <= 30) { mode = 'p'; val = count; }
  else if (count > 30) val = count;
  else {
    mode = por && (S.qmode[f.id] || (COUNT_PORTIONS.includes(por[0]) ? 'p' : 'g')) === 'p' ? 'p' : 'g';
    val = mode === 'p' ? 1 : por ? por[1] : 100;
  }
  const sh = openSheet(esc(foodName(f)), `
    <div class="muted small" style="text-align:center">${t('{a} kcal · {b} g протеина на 100 {u}', { a: fmt(f.kcal), b: fmt(f.p, 1), u })}${f.brand ? ' · ' + esc(f.brand) : ''}</div>
    ${por ? `<div class="chips" style="justify-content:center;margin-top:12px"><button class="chip" data-mode="p">${esc(porName(por[0]))} (${fmt(por[1])} ${u})</button><button class="chip" data-mode="g">${u}</button></div>` : ''}
    <label class="f" id="qlab"></label>
    <input type="text" inputmode="decimal" id="qv" autocomplete="off">
    <div class="chips" id="qq" style="margin-top:8px"></div>
    <div class="qty-big"><b class="num" id="qk"></b><span class="muted">kcal</span><b class="num prot" id="qp" style="font-size:22px;margin-left:10px"></b><span class="muted">${t('g протеина')}</span></div>
    <div class="muted small" style="text-align:center" id="qg"></div>
    ${f.src === 'recipe' ? `<button class="btn block sm ghost" id="qsplit" style="margin-top:10px">${t('Додај као састојке (да измениш појединачно)')}</button>` : ''}`,
    `<button class="btn" data-close>${t('Назад')}</button><button class="btn primary" id="qok">${g0 != null ? t('Сачувај') : t('Додај')}</button>`);
  const input = $('#qv', sh);
  const grams = () => { const v = num(input.value); return isFinite(v) ? (mode === 'p' ? v * por[1] : v) : NaN; };
  const upd = () => {
    const g = grams();
    $('#qk', sh).textContent = isFinite(g) ? fmt(f.kcal * g / 100) : '—';
    $('#qp', sh).textContent = isFinite(g) ? fmt(f.p * g / 100, 1) : '—';
    $('#qg', sh).textContent = isFinite(g) && mode === 'p' ? '= ' + fmt(g) + ' ' + u : '';
  };
  const draw = () => {
    $$('[data-mode]', sh).forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
    $('#qlab', sh).textContent = L(mode === 'p' ? t('Колико ({a})', { a: porName(por[0]) }) : t('Количина ({a})', { a: u }));
    const quick = mode === 'p' ? [1, 2, 3, 4, 5] : [30, 50, 100, 150, 200, 250];
    $('#qq', sh).innerHTML = quick.map(q => `<button class="chip" data-q="${q}">${fmt(q, 1)}</button>`).join('');
    upd();
  };
  input.value = decStr(val);
  draw();
  input.addEventListener('input', upd);
  sh.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mode && b.dataset.mode !== mode) {
      const g = grams();
      mode = b.dataset.mode;
      if (isFinite(g)) input.value = decStr(mode === 'p' ? g / por[1] : g);
      draw();
    } else if (b.dataset.q) { input.value = decStr(+b.dataset.q); upd(); }
  });
  setTimeout(() => { input.focus(); input.select(); }, 250);
  $('#qok', sh).onclick = () => {
    const g = grams();
    if (!(g > 0)) return toast(t('Упиши количину'));
    if (por) { S.qmode[f.id] = mode; save(); }
    const it = makeItem(f, g);
    // Запамти и број порција (нпр. 3 јаја), да у листи пише тако, а не само у грамима.
    if (mode === 'p') it.pc = [por[0], num(input.value)];
    closeSheet(); cb([it]);
  };
  const split = $('#qsplit', sh);
  if (split) split.onclick = () => {
    const g = grams(); if (!(g > 0)) return toast(t('Упиши количину'));
    const k = g / (f.totalG || 1);
    const items = (f.items || []).map(it => ({ ...it, g: Math.round(it.g * k * 10) / 10, kcal: Math.round(it.kcal * k * 10) / 10, p: Math.round(it.p * k * 10) / 10 }));
    closeSheet(); cb(items);
  };
}

/* ---------- ручни унос ---------- */
function quickSheet(it, cb) {
  const sh = openSheet(t('Ручни унос'), `
    <label class="f">${t('Назив')}</label><input type="text" id="qn" value="${esc(it?.name || '')}">
    <div class="grid2"><div><label class="f">${t('Калорије (kcal)')}</label><input type="text" inputmode="decimal" id="qk" value="${it ? decStr(it.kcal) : ''}"></div>
    <div><label class="f">${t('Протеин (g)')}</label><input type="text" inputmode="decimal" id="qp" value="${it ? decStr(it.p) : ''}"></div></div>`,
    `<button class="btn" data-close>${t('Назад')}</button><button class="btn primary" id="qok">${t('Сачувај')}</button>`);
  $('#qok', sh).onclick = () => {
    const name = $('#qn', sh).value.trim() || t('Ручни унос'), k = num($('#qk', sh).value), p = num($('#qp', sh).value) || 0;
    if (!(k >= 0)) return toast(t('Упиши калорије'));
    closeSheet(); cb({ name, kcal: k, p, g: 0 });
  };
}
function foodForm(f) {
  return `<label class="f">${t('Назив')}</label><input type="text" id="fn" value="${esc(f.name || '')}" placeholder="${t('нпр. Протеински пудинг Tine')}">
    <label class="f">${t('Бренд / продавница (није обавезно)')}</label><input type="text" id="fb" value="${esc(f.brand || '')}">
    <div class="chips" style="margin-top:12px" id="fu"><button class="chip ${unitOf(f) === 'g' ? 'on' : ''}" data-u="g">${t('на 100 g')}</button><button class="chip ${unitOf(f) === 'ml' ? 'on' : ''}" data-u="ml">${t('на 100 ml')}</button></div>
    <div class="grid2"><div><label class="f">${t('Калорије (kcal)')}</label><input type="text" inputmode="decimal" id="fk" value="${f.kcal != null ? decStr(f.kcal) : ''}"></div>
    <div><label class="f">${t('Протеин (g)')}</label><input type="text" inputmode="decimal" id="fp" value="${f.p != null ? decStr(f.p) : ''}"></div></div>
    <div class="grid2"><div><label class="f">${t('Порција (назив)')}</label><input type="text" id="fpn" value="${esc(f.portion ? porName(f.portion[0]) : '')}" placeholder="${t('нпр. чашица')}"></div>
    <div><label class="f">${t('Порција (g / ml)')}</label><input type="text" inputmode="decimal" id="fpg" value="${f.portion?.[1] ?? ''}" placeholder="${t('нпр. 200')}"></div></div>
    <label class="f">${t('Бар-код (није обавезно)')}</label><input type="text" inputmode="numeric" id="fc" value="${esc(f.barcode || '')}">`;
}
function readFoodForm(sh, base) {
  const name = $('#fn', sh).value.trim(), kcal = num($('#fk', sh).value), p = num($('#fp', sh).value);
  if (!name) { toast(t('Упиши назив')); return null; }
  if (!(kcal >= 0)) { toast(t('Упиши калорије на 100 g')); return null; }
  const pn = $('#fpn', sh).value.trim(), pg = num($('#fpg', sh).value);
  const unit = $('#fu .on', sh)?.dataset.u || 'g';
  return {
    ...base, id: base.id || 'u:' + uid(), name, brand: $('#fb', sh).value.trim(), kcal, p: isFinite(p) ? p : 0, unit,
    portion: pg > 0 ? [pn || t('порција'), pg] : null, barcode: $('#fc', sh).value.trim() || undefined, src: base.src || 'user'
  };
}
function wireUnit(sh) {
  $('#fu', sh).addEventListener('click', e => {
    const b = e.target.closest('[data-u]'); if (!b) return;
    $$('#fu .chip', sh).forEach(x => x.classList.toggle('on', x === b));
  });
}
function manualSheet(q, cb, pre = {}) {
  let tab = 'label';
  const sh = openSheet(t('Ручни унос'), `
    <div class="chips" id="mt"><button class="chip on" data-t="label">${t('Са етикете (на 100 g)')}</button><button class="chip" data-t="quick">${t('Брзо (укупно)')}</button></div>
    ${pre.msg ? `<div class="note">${pre.msg}</div>` : ''}
    <div id="tlabel">${foodForm({ name: q, barcode: pre.barcode })}<div class="note">${t('Намирница се чува у „Моја храна“, па је следећи пут само изабереш.')}</div></div>
    <div id="tquick" class="hidden"><label class="f">${t('Шта си појела')}</label><input type="text" id="qn" value="${esc(q)}">
      <div class="grid2"><div><label class="f">${t('Калорије (kcal)')}</label><input type="text" inputmode="decimal" id="qk"></div>
      <div><label class="f">${t('Протеин (g)')}</label><input type="text" inputmode="decimal" id="qp"></div></div>
      <div class="note">${t('Брзи унос се не чува у бази. Користи га кад знаш само укупне бројеве (нпр. из ресторана).')}</div></div>`,
    `<button class="btn" data-close>${t('Назад')}</button><button class="btn primary" id="mok">${t('Даље')}</button>`);
  wireUnit(sh);
  $('#mt', sh).addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    tab = b.dataset.t;
    $$('#mt .chip', sh).forEach(x => x.classList.toggle('on', x === b));
    $('#tlabel', sh).classList.toggle('hidden', tab !== 'label');
    $('#tquick', sh).classList.toggle('hidden', tab !== 'quick');
  });
  $('#mok', sh).onclick = () => {
    if (tab === 'quick') {
      const name = $('#qn', sh).value.trim() || t('Ручни унос'), k = num($('#qk', sh).value), p = num($('#qp', sh).value) || 0;
      if (!(k >= 0)) return toast(t('Упиши калорије'));
      closeSheet(); cb({ item: { name, kcal: k, p, g: 0 } }); return;
    }
    const f = readFoodForm(sh, { src: 'user' }); if (!f) return;
    S.foods[f.id] = f; save();
    closeSheet(); cb({ food: f });
  };
}

/* ---------- бар-код и интернет (Open Food Facts) ---------- */
const OFF = 'https://world.openfoodfacts.org';
function offFood(p, code) {
  const n = p.nutriments || {};
  let kcal = n['energy-kcal_100g'];
  if (kcal == null && n['energy_100g'] != null) kcal = n['energy_100g'] / 4.184;
  if (kcal == null) return null;
  const l = lang();
  const name = (p[l === 'en' ? 'product_name_en' : l === 'no' ? 'product_name_nb' : 'product_name_sr'] || p.product_name || p.generic_name || '').trim();
  if (!name) return null;
  const sq = parseFloat(p.serving_quantity);
  return {
    id: 'o:' + (code || p.code || uid()), name, brand: (p.brands || '').split(',')[0].trim(), kcal: Math.round(kcal * 10) / 10,
    p: Math.round((n['proteins_100g'] || 0) * 10) / 10, unit: /ml|l\b/i.test(p.quantity || '') && !/g\b/i.test(p.quantity || '') ? 'ml' : 'g',
    portion: sq > 0 ? [t('порција'), sq] : null, barcode: code || p.code, src: 'off'
  };
}
const OFF_FIELDS = 'code,product_name,product_name_sr,product_name_en,product_name_nb,generic_name,brands,quantity,serving_quantity,nutriments';
async function fetchJSON(url, ms = 12000) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); }
  finally { clearTimeout(tm); }
}
function barcodeSheet(cb) {
  const native = !!(window.FitAndroid && window.FitAndroid.scanBarcode);
  const web = 'BarcodeDetector' in window && navigator.mediaDevices;
  const sh = openSheet(t('Бар-код'), `
    ${native || web ? `<button class="btn primary block" id="bscan">📷 ${t('Скенирај камером')}</button><div id="bcam"></div>` : ''}
    <label class="f">${native || web ? t('или упиши број испод бар-кода') : t('Упиши број испод бар-кода')}</label>
    <input type="text" inputmode="numeric" id="bc" placeholder="${t('нпр. 3838…')}">
    <button class="btn block" id="bgo" style="margin-top:10px">${t('Тражи')}</button>
    <div id="bst" class="note hidden"></div>`, '', { onClose: () => stopCam() });
  let stream = null, timer = null;
  const stopCam = () => { clearInterval(timer); if (stream) stream.getTracks().forEach(x => x.stop()); stream = null; };
  const status = m => { const s = $('#bst', sh); s.classList.remove('hidden'); s.innerHTML = L(m); };
  const lookup = async code => {
    code = String(code || '').replace(/\D/g, '');
    if (code.length < 6) return toast(t('Бар-код није исправан'));
    stopCam();
    $('#bc', sh).value = code;
    const local = Object.values(S.foods).find(f => f.barcode === code);
    if (local) { closeSheet(); cb(local); return; }
    status(t('Тражим производ…'));
    try {
      const j = await fetchJSON(`${OFF}/api/v2/product/${code}.json?fields=${OFF_FIELDS}`);
      const f = j && j.status === 1 && j.product ? offFood(j.product, code) : null;
      if (f) { S.foods[f.id] = f; save(); closeSheet(); cb(f); return; }
      closeSheet();
      manualSheet('', r => r.food ? cb(r.food) : null, { barcode: code, msg: t('Производ није пронађен у отвореној бази. Упиши вредности са етикете. Следећи пут ће бити препознат одмах.') });
    } catch (e) {
      status(t('Нема интернета или сервер не одговара. Покушај поново или унеси ручно са етикете.'));
    }
  };
  $('#bgo', sh).onclick = () => lookup($('#bc', sh).value);
  const scanBtn = $('#bscan', sh);
  if (scanBtn) scanBtn.onclick = async () => {
    if (native) {
      window.onBarcode = code => { window.onBarcode = null; if (code) lookup(code); };
      window.FitAndroid.scanBarcode();
      return;
    }
    try {
      const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = document.createElement('video'); v.className = 'scan'; v.playsInline = true; v.muted = true; v.srcObject = stream;
      $('#bcam', sh).replaceChildren(v); await v.play();
      timer = setInterval(async () => {
        try { const r = await det.detect(v); if (r[0]) lookup(r[0].rawValue); } catch (e) { }
      }, 350);
    } catch (e) { toast(t('Камера није доступна')); }
  };
}
function netSheet(q, cb) {
  const sh = openSheet(t('Тражи на интернету'), `
    <div style="display:flex;gap:8px"><input type="search" id="nq" value="${esc(q)}" placeholder="${t('нпр. Tine protein puding')}"><button class="btn primary" id="ngo">${t('Тражи')}</button></div>
    <div class="note">${t('Претрага у бесплатној отвореној бази производа (Open Food Facts). Пре уноса провери вредности са етикетом, јер базу пуне људи.')}</div>
    <div id="nres"></div>`);
  const res = $('#nres', sh);
  let found = [];
  const go = async () => {
    // Производи у бази су углавном написани латиницом, па се ћирилица пресловљава.
    const term = toLat($('#nq', sh).value.trim()); if (!term) return;
    res.innerHTML = L(`<div class="empty">${t('Тражим…')}</div>`);
    try {
      let prods;
      try {
        const j = await fetchJSON(`${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=30&fields=${OFF_FIELDS}`);
        prods = j.products || [];
      } catch (e) {
        const j = await fetchJSON(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(term)}&page_size=30&fields=${OFF_FIELDS}`);
        prods = j.hits || [];
      }
      found = prods.map(p => offFood(p, p.code)).filter(Boolean);
      res.innerHTML = L(found.length ? found.map((f, i) => `<button class="res" data-i="${i}"><div class="grow"><b>${esc(f.name)}</b><span>${f.brand ? esc(f.brand) + ' · ' : ''}${t('{a} kcal · {b} g П на 100 {u}', { a: fmt(f.kcal), b: fmt(f.p, 1), u: f.unit })}</span></div></button>`).join('')
        : `<div class="empty">${t('Ништа није пронађено. Пробај другачији назив (латиницом, бренд) или ✍️ Ручно.')}</div>`);
    } catch (e) {
      res.innerHTML = L(`<div class="empty">${t('Нема интернета или сервер не одговара. Покушај поново мало касније.')}</div>`);
    }
  };
  $('#ngo', sh).onclick = go;
  $('#nq', sh).addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  res.addEventListener('click', e => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    const f = found[+b.dataset.i];
    S.foods[f.id] = f; save();
    closeSheet(); cb(f);
  });
  if (q) go();
}

/* ---------- рецепти ---------- */
function recipeSheet(id, preItems) {
  const ex = id ? S.foods[id] : null;
  const r = ex ? JSON.parse(JSON.stringify(ex)) : { id: 'r:' + uid(), name: '', items: preItems || [], src: 'recipe', cookedG: null, portions: 1 };
  const sh = openSheet(ex ? t('Измени рецепт') : t('Нови рецепт'), `
    <label class="f">${t('Назив')}</label><input type="text" id="rn" value="${esc(r.name)}" placeholder="${t('нпр. Мој бурито')}">
    <div id="ri"></div>
    <button class="btn block" id="radd" style="margin-top:8px">+ ${t('Додај састојак')}</button>
    <div class="grid2"><div><label class="f">${t('Колико порција')}</label><input type="text" inputmode="decimal" id="rp" value="${r.portions || 1}"></div>
    <div><label class="f">${t('Тежина готовог јела (g, опционо)')}</label><input type="text" inputmode="decimal" id="rc" value="${r.cookedG || ''}" placeholder="${t('ако се кува')}"></div></div>
    <div class="note">${t('Кад додајеш рецепт у оброк, бираш број порција или грамажу. Може и „као састојке“ да би изменила само један.')}</div>
    ${ex ? `<button class="btn danger block" id="rdel" style="margin-top:6px">${t('Обриши рецепт')}</button>` : ''}`,
    `<button class="btn" data-close>${t('Откажи')}</button><button class="btn primary" id="rok">${t('Сачувај рецепт')}</button>`);
  const draw = () => {
    const tk = r.items.reduce((s, i) => s + i.kcal, 0), tp = r.items.reduce((s, i) => s + i.p, 0);
    $('#ri', sh).innerHTML = L((r.items.length ? r.items.map((it, i) => `<div class="item"><div class="grow"><b>${esc(itemName(it))}</b><span class="num">${esc(itemLine(it))} · ${fmt(it.kcal)} kcal · ${fmt(it.p, 1)} ${PA()}</span></div><button class="x" data-rm="${i}">×</button></div>`).join('')
      : `<div class="empty">${t('Додај састојке у грамима.')}</div>`) +
      (r.items.length ? `<div class="sumline"><span>${t('Цело јело')}</span><span class="num">${fmt(tk)} kcal · <span class="prot">${fmt(tp, 1)} g</span></span></div>` : ''));
  };
  draw();
  $('#ri', sh).addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { r.items.splice(+b.dataset.rm, 1); draw(); } });
  $('#radd', sh).onclick = () => pickFood({ meals: false }, items => { r.items.push(...items); draw(); });
  if (ex) $('#rdel', sh).onclick = () => ask(t('Обрисати рецепт „{a}“? Већ унети оброци остају.', { a: esc(r.name) }), t('Обриши'), () => { delete S.foods[r.id]; save(); closeSheet(); render(); });
  $('#rok', sh).onclick = () => {
    r.name = $('#rn', sh).value.trim();
    if (!r.name) return toast(t('Упиши назив рецепта'));
    if (!r.items.length) return toast(t('Додај бар један састојак'));
    const rawG = r.items.reduce((s, i) => s + (i.g || 0), 0);
    const tk = r.items.reduce((s, i) => s + i.kcal, 0), tp = r.items.reduce((s, i) => s + i.p, 0);
    r.cookedG = num($('#rc', sh).value) > 0 ? num($('#rc', sh).value) : null;
    r.portions = num($('#rp', sh).value) > 0 ? num($('#rp', sh).value) : 1;
    r.totalG = r.cookedG || rawG || 100;
    r.kcal = Math.round(tk / r.totalG * 1000) / 10;
    r.p = Math.round(tp / r.totalG * 1000) / 10;
    r.unit = 'g';
    r.portion = ['порција', Math.round(r.totalG / r.portions)];
    S.foods[r.id] = r; save(); closeSheet(); render();
    toast(t('Рецепт је сачуван'));
  };
}

/* ---------- активност ---------- */
function actSheet(k, actId, routine) {
  const d = day(k);
  const ex = actId ? d.acts.find(a => a.id === actId) : null;
  const w = weightOn(k);
  const a = ex ? { ...ex } : routine
    ? { id: uid(), rid: routine.id, name: routine.name, met: routine.met, min: routine.min, int: 1 }
    : { id: uid(), name: ACTS[0]?.name || 'Вежбе', met: ACTS[0]?.met || 3.5, min: 30, int: 1 };
  const sh = openSheet(ex ? t('Измени активност') : routine ? t('Колико минута?') : t('Нова активност'), `
    ${routine || a.rid ? `<div class="note"><b>${esc(actName(a))}</b></div>` : `<label class="f">${t('Активност')}</label><select id="as">${ACTS.map((x, i) => `<option value="${i}" ${x.name === a.name ? 'selected' : ''}>${esc(t(x.name))}</option>`).join('')}</select>`}
    <label class="f">${t('Трајање (минута)')}</label><input type="text" inputmode="numeric" id="am" value="${a.min}">
    <div class="chips" style="margin-top:8px">${[10, 20, 30, 40, 60, 90].map(m => `<button class="chip" data-m="${m}">${m}</button>`).join('')}</div>
    <label class="f">${t('Интензитет')}</label>
    <div class="chips" id="ai">${[[0.8, t('Лагано')], [1, t('Нормално')], [1.2, t('Јако')]].map(([v, l]) => `<button class="chip ${a.int === v ? 'on' : ''}" data-i="${v}">${l}</button>`).join('')}</div>
    <div class="qty-big"><b class="num" id="ak"></b><span class="muted">${t('kcal потрошено')}</span></div>
    ${ex ? `<button class="btn danger block" id="adel">${t('Обриши активност')}</button>` : ''}`,
    `<button class="btn" data-close>${t('Откажи')}</button><button class="btn primary" id="aok">${t('Сачувај')}</button>`);
  const upd = () => {
    const sel = $('#as', sh);
    if (sel) { const x = ACTS[+sel.value]; a.name = x.name; a.met = x.met; }
    a.min = num($('#am', sh).value) || 0;
    a.kcal = Math.round(actKcal(a.met, a.min, w, a.int));
    $('#ak', sh).textContent = fmt(a.kcal);
  };
  upd();
  sh.addEventListener('input', upd);
  sh.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.m) { $('#am', sh).value = b.dataset.m; upd(); }
    if (b.dataset.i) { a.int = +b.dataset.i; $$('#ai .chip', sh).forEach(x => x.classList.toggle('on', x === b)); upd(); }
  });
  if (ex) $('#adel', sh).onclick = () => { d.acts = d.acts.filter(x => x.id !== a.id); save(); closeSheet(); render(); };
  $('#aok', sh).onclick = () => {
    upd();
    if (!(a.min > 0)) return toast(t('Упиши трајање'));
    // Краће од плана се бележи као „скраћено“.
    const plan = a.rid && S.routines.find(r => r.id === a.rid);
    if (plan) a.short = a.min < plan.min;
    const i = d.acts.findIndex(x => x.id === a.id);
    if (i >= 0) d.acts[i] = a; else d.acts.push(a);
    save(); closeSheet(); render();
    if (routine) toast(t('Браво! 💪'));
  };
}
function stepsSheet(k) {
  const d = peek(k);
  const sh = openSheet(t('Кораци'), `<label class="f">${t('Колико корака данас (са телефона/сата)')}</label>
    <input type="text" inputmode="numeric" id="sv" value="${d?.steps || ''}" placeholder="${t('нпр. 8300')}">
    <div class="note">${t('Уноси укупан број корака за дан. Ако си ходала као посебну вежбу, немој је додатно уписивати у активности, јер су кораци већ урачунати.')}</div>
    ${d?.stepsSrc === 'hc' ? `<div class="note">📱 ${t('Овај број је учитан са телефона. Ако га промениш, важи твој број. Обриши поље да се поново учитава са телефона.')}</div>` : ''}
    ${stepsStatus() === 'granted' ? `<button class="btn block" id="shc">📱 ${t('Учитај са телефона')}</button>` : ''}`,
    `<button class="btn" data-close>${t('Откажи')}</button><button class="btn primary" id="sok">${t('Сачувај')}</button>`);
  const inp = $('#sv', sh); setTimeout(() => inp.focus(), 250);
  $('#sok', sh).onclick = () => {
    const v = parseInt(String(inp.value).replace(/[^\d]/g, ''), 10);
    const dd = day(k);
    if (v > 0 && v !== dd.steps) { dd.steps = v; dd.stepsSrc = 'manual'; }
    else if (!(v > 0)) { dd.steps = null; delete dd.stepsSrc; }
    save(); closeSheet(); render();
  };
  const hc = $('#shc', sh);
  if (hc) hc.onclick = () => { const dd = day(k); if (dd.stepsSrc === 'manual') delete dd.stepsSrc; closeSheet(); syncSteps(true); };
}
function weightSheet(k) {
  const d = peek(k);
  const sh = openSheet(t('Тежина'), `<label class="f">${t('Тежина (kg), само ако желиш')}</label>
    <input type="text" inputmode="decimal" id="wv" value="${d?.weight ? decStr(d.weight) : ''}">
    <div class="note">${t('Тежина служи само да формуле потрошње буду тачније. Не приказује се као график, осим ако то укључиш у подешавањима.')}</div>`,
    `<button class="btn" data-close>${t('Откажи')}</button><button class="btn primary" id="wok">${t('Сачувај')}</button>`);
  $('#wok', sh).onclick = () => {
    const v = num($('#wv', sh).value);
    day(k).weight = v > 25 && v < 300 ? Math.round(v * 10) / 10 : null; save(); closeSheet(); render();
  };
}

/* ================= Храна ================= */
function renderFood() {
  $('#topin').innerHTML = L(`<div class="topbar"><h1>${t('Храна')}</h1></div>`);
  const mine = Object.values(S.foods);
  const h = `
    <input type="search" id="fq" placeholder="${t('Тражи у бази…')}" value="${esc(ui.foodQ)}" autocomplete="off">
    <div class="chips" style="margin:10px 0" id="fseg">
      <button class="chip ${ui.foodSeg === 'mine' ? 'on' : ''}" data-seg="mine">${t('Моја храна ({a})', { a: mine.length })}</button>
      <button class="chip ${ui.foodSeg === 'base' ? 'on' : ''}" data-seg="base">${t('База ({a})', { a: BASE.length })}</button>
    </div>
    <div class="grid2">
      <button class="btn" data-fa="recipe">🍲 ${t('Нови рецепт')}</button>
      <button class="btn" data-fa="new">✍️ ${t('Нова намирница')}</button>
      <button class="btn" data-fa="scan">📷 ${t('Бар-код')}</button>
      <button class="btn" data-fa="net">🌐 ${t('Интернет')}</button>
    </div>
    <div id="flist" style="margin-top:8px"></div>`;
  $('#view').innerHTML = L(h);
  drawFoodList();
}
function drawFoodList() {
  const q = ui.foodQ.trim();
  if (ui.foodSeg === 'mine') {
    let list = Object.values(S.foods);
    if (q) { const w = norm(q).split(/\s+/); list = list.filter(f => w.every(x => norm(f.name + ' ' + (f.brand || '')).includes(x))); }
    list.sort((a, b) => (S.usage[b.id] || 0) - (S.usage[a.id] || 0) || a.name.localeCompare(b.name));
    $('#flist').innerHTML = L(list.length ? list.map(foodRes).join('')
      : `<div class="empty">${q ? t('Ништа није пронађено.') : t('Овде ће бити твоји рецепти и производи (са етикете, бар-кода или интернета).')}</div>`);
  } else {
    let h = '', cat = '';
    for (const f of (q ? searchFoods(q, 300).filter(x => x.src === 'base') : BASE)) {
      if (!q && f.cat !== cat) { cat = f.cat; h += `<div class="gh">${esc(t(cat))}</div>`; }
      h += foodRes(f);
    }
    $('#flist').innerHTML = L(h || `<div class="empty">${t('Ништа није пронађено.')}</div>`);
  }
}
$('#view').addEventListener('input', e => {
  if (e.target.id === 'fq') { ui.foodQ = e.target.value; drawFoodList(); }
});
$('#view').addEventListener('click', e => {
  if (ui.tab !== 'food') return;
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.seg) { ui.foodSeg = b.dataset.seg; renderFood(); return; }
  if (b.dataset.fa === 'recipe') return recipeSheet();
  if (b.dataset.fa === 'new') return manualSheet(ui.foodQ, () => { ui.foodSeg = 'mine'; render(); });
  if (b.dataset.fa === 'scan') return barcodeSheet(f => { ui.foodSeg = 'mine'; render(); editFood(f); });
  if (b.dataset.fa === 'net') return netSheet(ui.foodQ, () => { ui.foodSeg = 'mine'; render(); toast(t('Додато у „Моја храна“')); });
  if (b.dataset.fid) return editFood(getFood(b.dataset.fid));
});
function editFood(f) {
  if (!f) return;
  if (f.src === 'recipe') return recipeSheet(f.id);
  if (f.src === 'base') {
    const u = unitOf(f);
    const sh = openSheet(esc(foodName(f)), `<div class="sumline"><span>${t('На 100 {u}', { u })}</span><span class="num">${fmt(f.kcal)} kcal · <span class="prot">${t('{a} g протеина', { a: fmt(f.p, 1) })}</span></span></div>
      ${f.portion ? `<div class="sumline"><span>${esc(porName(f.portion[0]))} (${fmt(f.portion[1])} ${u})</span><span class="num">${fmt(f.kcal * f.portion[1] / 100)} kcal · <span class="prot">${fmt(f.p * f.portion[1] / 100, 1)} g</span></span></div>` : ''}
      <div class="note">${t('Категорија: {a}. Вредности су просечне. Ако имаш конкретан производ, направи копију и упиши вредности са етикете.', { a: esc(t(f.cat)) })}</div>`,
      `<button class="btn" data-close>${t('Затвори')}</button><button class="btn primary" id="cp">${t('Копирај у моје')}</button>`);
    $('#cp', sh).onclick = () => { closeSheet(); editFood({ ...f, name: foodName(f), portion: f.portion ? [porName(f.portion[0]), f.portion[1]] : null, id: null, key: undefined, src: 'user', cat: undefined, _new: true }); };
    return;
  }
  const sh = openSheet(f._new ? t('Нова намирница') : t('Измени намирницу'), foodForm(f) + (f._new ? '' : `<button class="btn danger block" id="fdel" style="margin-top:14px">${t('Обриши из моје хране')}</button>`),
    `<button class="btn" data-close>${t('Откажи')}</button><button class="btn primary" id="fok">${t('Сачувај')}</button>`);
  wireUnit(sh);
  const del = $('#fdel', sh);
  if (del) del.onclick = () => ask(t('Обрисати „{a}“? Већ унети оброци остају.', { a: esc(f.name) }), t('Обриши'), () => { delete S.foods[f.id]; save(); closeSheet(); render(); });
  $('#fok', sh).onclick = () => {
    const base = { ...f }; delete base._new;
    const nf = readFoodForm(sh, base); if (!nf) return;
    S.foods[nf.id] = nf; save(); closeSheet(); render();
  };
}

/* ================= Статистика ================= */
const chartData = {};
function barChart(data, o) {
  const W = 340, H = 150, pl = 2, pr = 2, pt = 14, pb = 18;
  const n = data.length, iw = W - pl - pr, ih = H - pt - pb;
  const vals = data.map(d => d.v).filter(v => v != null && isFinite(v));
  const max = Math.max(1, ...vals.map(Math.abs), o.target || 0, o.band ? o.band[1] : 0) * 1.12;
  const bw = iw / n, gap = n > 45 ? 1 : 2, w = Math.max(1, bw - gap), rx = Math.min(4, w / 2);
  const zero = o.div ? pt + ih / 2 : pt + ih, sc = o.div ? (ih / 2) / max : ih / max;
  let s = '';
  if (o.band) s += `<rect x="${pl}" y="${zero - o.band[1] * sc}" width="${iw}" height="${(o.band[1] - o.band[0]) * sc}" fill="var(--prot-soft)"/>`;
  data.forEach((d, i) => {
    const x = pl + i * bw;
    s += `<rect class="col" x="${x}" y="${pt}" width="${bw}" height="${ih}" data-i="${i}"/>`;
    if (d.v == null || !isFinite(d.v) || d.v === 0) return;
    const hgt = Math.max(2, Math.abs(d.v) * sc);
    const y = o.div ? (d.v < 0 ? zero - hgt : zero) : zero - hgt;
    s += `<rect x="${x + gap / 2}" y="${y}" width="${w}" height="${hgt}" rx="${rx}" fill="${o.color(d)}" pointer-events="none"/>`;
  });
  s += `<line x1="${pl}" x2="${W - pr}" y1="${zero}" y2="${zero}" stroke="var(--line)" stroke-width="1"/>`;
  if (o.target) {
    const y = zero - o.target * sc;
    s += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="4 4" pointer-events="none"/>
      <text x="${W - pr}" y="${y - 4}" text-anchor="end">${esc(o.targetLabel || '')}</text>`;
  }
  if (o.div) {
    s += `<text x="${pl + 2}" y="${pt - 3}">${esc(o.upLabel || '')}</text><text x="${pl + 2}" y="${H - pb + 12}">${esc(o.downLabel || '')}</text>`;
  } else {
    const idx = n <= 7 ? data.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
    for (const i of idx) {
      const x = pl + i * bw + bw / 2;
      s += `<text x="${x}" y="${H - 4}" text-anchor="${i === 0 && n > 7 ? 'start' : i === n - 1 && n > 7 ? 'end' : 'middle'}">${esc(data[i].lab)}</text>`;
    }
  }
  const id = 'c' + uid();
  chartData[id] = data.map(d => d.tip);
  return `<div class="chart" data-chart="${id}"><div class="chart-tip">${esc(o.hint || t('Додирни стубић за детаље'))}</div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">${s}</svg></div>`;
}
$('#view').addEventListener('click', e => {
  const r = e.target.closest('.chart .col'); if (!r) return;
  const ch = r.closest('.chart');
  $$('.col.on', ch).forEach(x => x.classList.remove('on'));
  r.classList.add('on');
  $('.chart-tip', ch).innerHTML = L(chartData[ch.dataset.chart][+r.dataset.i] || '');
});

function renderStats() {
  $('#topin').innerHTML = L(`<div class="topbar"><h1>${t('Статистика')}</h1></div>`);
  const N = ui.statN, end = todayKey(), keys = lastDays(end, N);
  const cs = keys.map(calc), logged = cs.filter(c => c.logged);
  const tg = target(), [pmin] = protRange();
  const sumBal = logged.reduce((s, c) => s + c.bal, 0);
  const avg = (arr, f) => arr.length ? arr.reduce((s, c) => s + f(c), 0) / arr.length : null;
  const stepsDays = cs.filter(c => c.steps > 0);
  let sched = 0, done = 0;
  for (const c of cs) for (const r of routinesOn(c.k)) {
    if (c.k === end && routineState(c.k, r) === 'pending') continue;
    if (!c.logged && !(c.d.acts || []).length) continue;
    sched++; if (routineState(c.k, r) === 'done') done++;
  }
  const streak = pred => { let n = 0, k = end; if (!pred(calc(k))) k = addDays(k, -1); while (pred(calc(k))) { n++; k = addDays(k, -1); if (n > 3650) break; } return n; };
  const sLog = streak(c => c.logged), sTar = streak(inTarget), sProt = streak(c => c.logged && c.p >= pmin);

  let h = `<div class="chips" style="margin:4px 0 6px">${[7, 30, 90].map(v => `<button class="chip ${N === v ? 'on' : ''}" data-n="${v}">${t('{a} дана', { a: v })}</button>`).join('')}</div>`;
  if (!logged.length) {
    h += `<div class="empty">${t('За овај период још нема унете хране.')}<br>${t('Статистика ће се попуњавати сама како уносиш дане.')}</div>`;
    $('#view').innerHTML = L(h); return;
  }
  h += `<div class="stat-tiles">
    <div class="st"><div class="l">${t('Укупан биланс')}</div><div class="v num ${sumBal <= 0 ? 'pos' : 'warn'}">${signed(Math.round(sumBal))}</div><div class="s">kcal${sumBal < 0 ? ' ≈ ' + t('{a} масти', { a: fatText(-sumBal) }) : ''}</div></div>
    <div class="st"><div class="l">${t('Дана у циљу')}</div><div class="v num">${logged.filter(inTarget).length}/${logged.length}</div><div class="s">${t('од унетих дана')}</div></div>
    <div class="st"><div class="l">${t('Просечан унос')}</div><div class="v num">${fmt(avg(logged, c => c.kcal))}</div><div class="s">${t('kcal · циљ {a}', { a: fmt(tg) })}</div></div>
    <div class="st"><div class="l">${t('Просечан протеин')}</div><div class="v num prot">${fmt(avg(logged, c => c.p))} g</div><div class="s">${t('испуњен {a}/{b} дана', { a: logged.filter(c => c.p >= pmin).length, b: logged.length })}</div></div>
    <div class="st"><div class="l">${t('Просечна потрошња')}</div><div class="v num">${fmt(avg(logged, c => c.exp))}</div><div class="s">${t('kcal дневно')}</div></div>
    <div class="st"><div class="l">${t('Кораци (просек)')}</div><div class="v num">${stepsDays.length ? fmt(avg(stepsDays, c => c.steps)) : '—'}</div><div class="s">${t('{a} дана са уносом', { a: stepsDays.length })}</div></div>
    <div class="st"><div class="l">${t('Тренинг по плану')}</div><div class="v num">${sched ? Math.round(done / sched * 100) + '%' : '—'}</div><div class="s">${sched ? t('{a} од {b} планираних', { a: done, b: sched }) : t('нема рутина')}</div></div>
    <div class="st"><div class="l">${t('Минута вежбања')}</div><div class="v num">${fmt(cs.reduce((s, c) => s + c.amin, 0))}</div><div class="s">${t('укупно у периоду')}</div></div>
  </div>
  <div class="card"><div class="card-head"><h2>🔥 ${t('Низови')}</h2></div>
    <div class="grid3" style="text-align:center">
      <div><div class="bigval num">${sLog}</div><div class="muted tiny">${t('дана заредом са уносом')}</div></div>
      <div><div class="bigval num pos">${sTar}</div><div class="muted tiny">${t('дана заредом у циљу')}</div></div>
      <div><div class="bigval num prot">${sProt}</div><div class="muted tiny">${t('дана заредом протеин')}</div></div>
    </div></div>`;

  const lab = k => N <= 7 ? dayShort(wd(k)) : dateShort(k);
  const tipHead = c => `<b>${dayShort(wd(c.k))} ${dateShort(c.k)}</b>: `;
  const none = t('нема уноса');
  h += `<div class="card"><h2>${t('Унос калорија')}</h2>${barChart(cs.map(c => ({ v: c.logged ? c.kcal : null, lab: lab(c.k), tip: tipHead(c) + (c.logged ? t('{a} kcal од {b}', { a: fmt(c.kcal), b: fmt(tg) }) : none) })),
    { color: d => d.v > tg + 50 ? 'var(--warn)' : 'var(--accent)', target: tg, targetLabel: t('циљ {a}', { a: fmt(tg) }), aria: t('Унос калорија') })}</div>`;
  h += `<div class="card"><h2>${t('Дефицит / суфицит')}</h2>${barChart(cs.map(c => ({ v: c.logged ? -c.bal : null, lab: lab(c.k), tip: tipHead(c) + (c.logged ? (c.bal <= 0 ? t('дефицит {a} kcal', { a: fmt(-c.bal) }) : t('суфицит {a} kcal', { a: fmt(c.bal) })) + ' ' + t('(потрошња {a})', { a: fmt(c.exp) }) : none) })),
    { div: true, color: d => d.v >= 0 ? 'var(--pos)' : 'var(--warn)', upLabel: t('↑ дефицит'), downLabel: t('↓ суфицит'), aria: t('Дефицит / суфицит') })}</div>`;
  h += `<div class="card"><h2>${t('Протеин')}</h2>${barChart(cs.map(c => ({ v: c.logged ? c.p : null, lab: lab(c.k), tip: tipHead(c) + (c.logged ? fmt(c.p) + ' g' : none) })),
    { color: () => 'var(--prot)', band: protRange(), aria: t('Протеин') })}<div class="muted tiny">${t('Обојена трака је циљ {a} g.', { a: protRange().join('–') })}</div></div>`;
  if (stepsDays.length) h += `<div class="card"><h2>${t('Кораци')}</h2>${barChart(cs.map(c => ({ v: c.steps || null, lab: lab(c.k), tip: tipHead(c) + (c.steps ? t('{a} корака ≈ {b} kcal', { a: fmt(c.steps), b: fmt(c.st) }) : none) })),
    { color: () => 'var(--water)', target: 8000, targetLabel: fmt(8000), aria: t('Кораци') })}</div>`;
  const moods = cs.filter(c => c.d.mood);
  if (moods.length) h += `<div class="card"><h2>${t('Расположење')}</h2><div class="muted small" style="margin-top:4px">${t('Просек: {a} · унето {b} дана', { a: MOODS[Math.round(avg(moods, c => c.d.mood)) - 1], b: moods.length })}</div></div>`;
  if (S.settings.showWeight && cs.some(c => c.d.weight)) {
    h += `<div class="card"><h2>${t('Тежина')}</h2>${barChart(cs.map(c => ({ v: c.d.weight || null, lab: lab(c.k), tip: tipHead(c) + (c.d.weight ? fmt(c.d.weight, 1) + ' kg' : '—') })), { color: () => 'var(--muted)', aria: t('Тежина') })}</div>`;
  }
  if (N > 7) {
    const rows = [];
    for (let e = end; rows.length < Math.ceil(N / 7); e = addDays(e, -7)) {
      const ks = lastDays(e, 7), cc = ks.map(calc).filter(c => c.logged), sb = cc.reduce((s, c) => s + c.bal, 0);
      rows.push(`<tr><td>${dateShort(ks[0])}–${dateShort(e)}</td><td class="r num">${cc.length}</td><td class="r num">${cc.length ? fmt(avg(cc, c => c.kcal)) : '—'}</td><td class="r num">${cc.length ? fmt(avg(cc, c => c.p)) : '—'}</td><td class="r num ${sb <= 0 ? 'pos' : 'warn'}">${cc.length ? signed(Math.round(sb)) : '—'}</td></tr>`);
    }
    h += `<div class="card"><h2 style="margin-bottom:8px">${t('По недељама')}</h2><table class="t"><tr><th>${t('Седмица')}</th><th class="r">${t('Дана')}</th><th class="r">kcal</th><th class="r">${PA()}</th><th class="r">${t('Биланс')}</th></tr>${rows.join('')}</table></div>`;
  }
  const cnt = {};
  for (const c of cs) for (const m of c.d.meals || []) for (const it of m.items) {
    if (!it.fid) continue;
    const nm = itemName(it);
    cnt[nm] = cnt[nm] || { n: 0, k: 0 }; cnt[nm].n++; cnt[nm].k += it.kcal;
  }
  const top = Object.entries(cnt).sort((a, b) => b[1].n - a[1].n).slice(0, 8);
  if (top.length) h += `<div class="card"><h2 style="margin-bottom:8px">${t('Најчешће једеш')}</h2><table class="t">${top.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="r muted">${v.n}×</td><td class="r num">${fmt(v.k)} kcal</td></tr>`).join('')}</table></div>`;
  h += `<div class="note">${t('Биланс = унос − потрошња. Минус значи дефицит (топи се), плус значи вишак. 7.700 kcal дефицита је отприлике 1 kg масти. Рачунају се само дани у којима је унета храна.')}</div>`;
  $('#view').innerHTML = L(h);
}
$('#view').addEventListener('click', e => {
  if (ui.tab !== 'stats') return;
  const b = e.target.closest('[data-n]'); if (b) { ui.statN = +b.dataset.n; renderStats(); }
});

/* ================= Подешавања ================= */
function langChips() {
  return `<div class="chips" data-langs>${LANGS.map(([v, l]) => `<button class="chip ${lang() === v ? 'on' : ''}" data-lang="${v}">${l}</button>`).join('')}</div>`;
}
function renderSettings() {
  $('#topin').innerHTML = L(`<div class="topbar"><h1>${t('Подешавања')}</h1></div>`);
  const p = S.profile, w = weightOn(todayKey()), b = bmr(w);
  const [pmin, pmax] = protRange();
  const sinceB = S.settings.lastBackup ? new Date(S.settings.lastBackup) : null;
  const h = `
  <div class="card"><div class="card-head"><h2>🌍 ${t('Језик')}</h2></div>${langChips()}</div>

  <div class="card"><div class="card-head"><h2>📲 ${t('Апликација')}</h2></div>
    ${NATIVE && window.FitAndroid.getVersion ? `<div class="muted small" style="margin-bottom:10px">${t('Верзија {a}', { a: esc(window.FitAndroid.getVersion()) })}</div>
    <button class="btn block" data-s="update">${t('Провери да ли има ажурирање')}</button>`
    : `<div class="muted small">${t('Ажурирање се проверава у Android апликацији.')}</div>`}
  </div>

${stepsCard()}

  <div class="card"><div class="card-head"><h2>💾 ${t('Бекап')}</h2></div>
    <p class="muted small" style="margin:0 0 10px">${t('Сви подаци су само на овом телефону. Бекап их чува у фајл који можеш да пошаљеш себи (Viber, мејл, Drive) и вратиш на новом телефону.')}</p>
    <div class="grid2"><button class="btn primary" data-s="export">${t('Сачувај бекап')}</button><button class="btn" data-s="import">${t('Врати из бекапа')}</button></div>
    <div class="muted tiny" style="margin-top:8px">${sinceB ? t('Последњи бекап: {a}', { a: dateLong(sinceB) }) : t('Бекап још није направљен.')}</div>
    <input type="file" id="impf" accept=".json,application/json,text/plain" class="hidden">
  </div>

  <div class="card"><div class="card-head"><h2>👤 ${t('Профил и циљеви')}</h2><button class="linkbtn" data-s="profile">${t('Измени')}</button></div>
    <table class="t">
      <tr><td>${t('Пол, године, висина')}</td><td class="r">${p.sex === 'm' ? t('М') : t('Ж')}, ${p.age || '—'}, ${p.height ? p.height + ' cm' : '—'}</td></tr>
      <tr><td>${t('Тежина за формуле')}</td><td class="r">${fmt(w, 1)} kg${!p.weight && !Object.values(S.days).some(d => d.weight) ? ` <span class="faint">${t('(процена)')}</span>` : ''}</td></tr>
      <tr><td>${t('Мировање (BMR)')}</td><td class="r num">${fmt(b)} kcal</td></tr>
      <tr><td>${t('Основна дневна потрошња (без корака и вежби)')}</td><td class="r num">${fmt(b * p.level)} kcal</td></tr>
      <tr><td>${t('Циљ уноса')}</td><td class="r num"><b>${fmt(target())} kcal</b></td></tr>
      <tr><td>${t('Протеин')}</td><td class="r num">${pmin}–${pmax} g</td></tr>
      <tr><td>${t('Вода')}</td><td class="r num">${fmt((p.water || 2250) / 1000, 2)} L</td></tr>
    </table></div>

  <div class="card"><div class="card-head"><h2>🏋️‍♀️ ${t('Редовни тренинзи')}</h2><button class="linkbtn" data-s="addr">+ ${t('Додај')}</button></div>
    <p class="muted small" style="margin:0 0 6px">${t('Појављују се на екрану „Дан“ у изабране дане, па их само потврдиш.')}</p>
    ${S.routines.length ? S.routines.map(r => `<button class="row" data-r="${r.id}" style="background:var(--surface2)"><div class="grow"><b>${esc(r.name)}</b><span>${t('{a} мин', { a: r.min })} · ${r.days.length === 7 ? t('сваки дан') : r.days.map(dayShort).join(', ')}</span></div></button>`).join('')
      : `<div class="empty">${t('Нема редовних тренинга. Додај нпр. „Core / ноге · 40 мин · сваки дан“ и „Плес · 90 мин“.')}</div>`}
  </div>

  <div class="card"><div class="card-head"><h2>🎨 ${t('Изглед')}</h2></div>
    <label class="f">${t('Тема')}</label>
    <div class="chips">${[['auto', t('Као телефон')], ['dark', t('Тамна')], ['light', t('Светла')]].map(([v, l]) => `<button class="chip ${S.settings.theme === v ? 'on' : ''}" data-theme="${v}">${l}</button>`).join('')}</div>
    <label class="f">${t('Тежина у статистици')}</label>
    <div class="chips"><button class="chip ${!S.settings.showWeight ? 'on' : ''}" data-sw="0">${t('Сакриј')}</button><button class="chip ${S.settings.showWeight ? 'on' : ''}" data-sw="1">${t('Прикажи')}</button></div>
  </div>

  <div class="card"><div class="card-head"><h2>ℹ️ ${t('Како апликација рачуна')}</h2></div>
    <p class="small muted" style="margin:0">
    ${t('<b>Мировање</b> по Mifflin-St Jeor формули (пол, године, висина, тежина) × {a} за канцеларијски посао.', { a: fmt(p.level, 1) })}<br>
    ${t('<b>Кораци</b>: око {a} kcal на 1.000 корака за твоју тежину.', { a: fmt(w * 0.44) })}<br>
    ${t('<b>Вежбе</b>: MET вредност × тежина × трајање, само оно изнад мировања, да се ништа не рачуна двапут.')}<br>
    ${t('<b>Биланс</b> = унос − (мировање + кораци + вежбе). 7.700 kcal ≈ 1 kg масти.')}<br>
    ${t('Све су то процене, а тачније постају што редовније уносиш.')}</p></div>


  <button class="btn danger block" data-s="wipe" style="margin:8px 0 20px">${t('Обриши све податке')}</button>
  <div class="faint tiny" style="text-align:center;margin-bottom:20px">${t('Фит дневник · подаци остају само на овом уређају')}</div>`;
  $('#view').innerHTML = L(h);
}
function stepsCard() {
  const st = stepsStatus();
  if (!st) return '';
  let body;
  if (st === 'unsupported') body = `<div class="muted small">${t('За аутоматске кораке потребан је Android 14 или новији. Кораке уписуј ручно.')}</div>`;
  else if (st === 'granted' && S.settings.autoSteps) {
    const at = S.settings.stepsSyncedAt ? new Date(S.settings.stepsSyncedAt) : null;
    body = `<div class="small" style="margin-bottom:10px"><span class="pos">✓ ${t('Повезано')}</span> <span class="muted">· ${at ? t('учитано {a}', { a: pad2(at.getHours()) + ':' + pad2(at.getMinutes()) }) : ''}</span></div>
      <div class="muted small" style="margin-bottom:10px">${t('Кораци се учитавају сами кад отвориш апликацију. Ако неки дан упишеш ручно, важи твој број.')}</div>
      ${stepsSources()}
      ${stepsWeekTable()}
      <button class="btn block" data-s="steps">${t('Учитај сада')}</button>`;
  } else body = `<div class="muted small" style="margin-bottom:10px">${t('Апликација може сама да чита кораке које телефон броји (преко Health Connect). Први пут Android пита за дозволу: укључи „Кораци“.')}</div>
      <button class="btn primary block" data-s="steps">${t('Повежи кораке са телефона')}</button>`;
  return `<div class="card"><div class="card-head"><h2>👟 ${t('Кораци са телефона')}</h2></div>${body}</div>`;
}
const SOURCE_NAMES = {
  'com.google.android.apps.fitness': 'Google Fit',
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.google.android.apps.healthdata': 'Health Connect',
  'com.google.android.healthconnect.controller': 'Health Connect',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.xiaomi.wearable': 'Mi Fitness',
  'com.huawei.health': 'Huawei Health'
};
const sourceName = pkg => SOURCE_NAMES[pkg] || (/^(android|com\.android|com\.google\.android\.gms)/.test(pkg) ? t('телефон') : pkg.split('.').slice(-1)[0]);
/** Данашњи кораци по изворима (ако их има више), да се види одакле стиже број. */
function stepsSources() {
  const d = peek(todayKey());
  const by = d && d.stepsBy ? Object.entries(d.stepsBy) : [];
  if (!by.length) return '';
  return `<div class="muted small" style="margin-bottom:10px">${t('Данас по изворима:')} ${by.sort((a, b) => b[1] - a[1]).map(([k, v]) => `${esc(sourceName(k))} <b class="num">${fmt(v)}</b>`).join(' · ')}</div>`;
}
/** Кораци последњих 7 дана, да може да упореди са апликацијом која их броји. */
function stepsWeekTable() {
  const ks = lastDays(todayKey(), 7).reverse();
  let sum = 0;
  const rows = ks.map(k => {
    const d = peek(k), v = d && d.steps || 0; sum += v;
    return `<tr><td>${dayShort(wd(k))} ${dateShort(k)}</td><td class="r num">${v ? fmt(v) : '—'}</td><td class="r">${d && d.stepsSrc === 'hc' ? '📱' : d && d.steps ? '✍️' : ''}</td></tr>`;
  }).join('');
  return `<table class="t" style="margin-bottom:10px">${rows}<tr><td><b>${t('Укупно 7 дана')}</b></td><td class="r num"><b>${fmt(sum)}</b></td><td></td></tr></table>`;
}
function setLang(l) { S.settings.lang = l; save(); render(); }
$('#view').addEventListener('click', e => {
  if (ui.tab !== 'settings') return;
  const b = e.target.closest('button'); if (!b) return;
  const ds = b.dataset;
  if (ds.lang) return setLang(ds.lang);
  if (ds.theme) { S.settings.theme = ds.theme; save(); render(); return; }
  if (ds.sw) { S.settings.showWeight = ds.sw === '1'; save(); render(); return; }
  if (ds.r) return routineSheet(ds.r);
  switch (ds.s) {
    case 'export': return exportBackup();
    case 'import': return $('#impf').click();
    case 'profile': return profileSheet();
    case 'addr': return routineSheet();
    case 'update': return window.FitAndroid.checkUpdate();
    case 'steps': return syncSteps(true);
    case 'wipe': return ask(t('Обрисати СВЕ податке (дане, храну, рецепте, подешавања)? Ово не може да се врати, осим из бекапа.'), t('Обриши све'), () =>
      ask(t('Сигурно? Последња провера.'), t('Да, обриши'), () => { const l = lang(); S = defaults(); S.settings.lang = l; save(); ui.date = todayKey(); ui.tab = 'today'; render(); onboarding(); }));
  }
});
$('#view').addEventListener('change', e => {
  if (e.target.id !== 'impf') return;
  const file = e.target.files[0]; e.target.value = '';
  if (file) importBackup(file);
});

function profileSheet(first) {
  const p = S.profile;
  const w = weightOn(todayKey());
  const sh = openSheet(first ? t('Добро дошла! 👋') : t('Профил и циљеви'), `
    ${first ? `${langChips()}<p class="muted small">${t('Попуни основне податке да апликација може да рачуна потрошњу. Све може касније да се промени. Ако већ имаш бекап, врати га доле.')}</p>` : ''}
    <div class="chips" id="psx"><button class="chip ${p.sex !== 'm' ? 'on' : ''}" data-x="f">${t('Жена')}</button><button class="chip ${p.sex === 'm' ? 'on' : ''}" data-x="m">${t('Мушкарац')}</button></div>
    <div class="grid3"><div><label class="f">${t('Године')}</label><input type="text" inputmode="numeric" id="pa" value="${p.age || ''}"></div>
      <div><label class="f">${t('Висина (cm)')}</label><input type="text" inputmode="numeric" id="ph" value="${p.height || ''}"></div>
      <div><label class="f">${t('Тежина (kg)')}</label><input type="text" inputmode="decimal" id="pw" value="${p.weight ? decStr(p.weight) : ''}" placeholder="${t('опционо')}"></div></div>
    <div class="muted tiny" style="margin-top:6px">${t('Тежина није обавезна. Без ње апликација користи процену према висини.')}</div>
    <label class="f">${t('Посао / свакодневица (без корака и тренинга)')}</label>
    <select id="pl">${[[1.2, t('Седећи / канцеларија')], [1.3, t('Доста стајања')], [1.4, t('Физички посао')]].map(([v, l]) => `<option value="${v}" ${p.level == v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <div class="grid2"><div><label class="f">${t('Циљ уноса (kcal)')}</label><input type="text" inputmode="numeric" id="pt" value="${p.target || ''}" placeholder="${t('предлог: {a}', { a: suggestTarget(w) })}"></div>
      <div><label class="f">${t('Вода (ml)')}</label><input type="text" inputmode="numeric" id="pwa" value="${p.water || 2250}"></div></div>
    <div class="grid3"><div><label class="f">${t('Протеин од (g)')}</label><input type="text" inputmode="numeric" id="ppl" value="${p.protMin || ''}" placeholder="${protRange()[0]}"></div>
      <div><label class="f">${t('до (g)')}</label><input type="text" inputmode="numeric" id="pph" value="${p.protMax || ''}" placeholder="${protRange()[1]}"></div>
      <div><label class="f">${t('Чаша (ml)')}</label><input type="text" inputmode="numeric" id="pg" value="${p.glass || 250}"></div></div>
    <div class="note" id="pinfo"></div>
    ${first ? `<button class="btn block" id="pimp">${t('Имам бекап, врати га')}</button><input type="file" id="pimpf" accept=".json,application/json,text/plain" class="hidden">` : ''}`,
    `${first ? '' : `<button class="btn" data-close>${t('Откажи')}</button>`}<button class="btn primary" id="pok">${t('Сачувај')}</button>`);
  let sex = p.sex || 'f';
  const info = () => {
    const tmp = { ...S.profile, sex, age: num($('#pa', sh).value) || null, height: num($('#ph', sh).value) || null, weight: num($('#pw', sh).value) || null, level: +$('#pl', sh).value };
    const old = S.profile; S.profile = tmp;
    const ww = tmp.weight || weightOn(todayKey()), bb = bmr(ww);
    $('#pinfo', sh).innerHTML = L(t('Мировање ≈ <b>{a}</b> kcal · основно са послом ≈ <b>{b}</b> kcal.', { a: fmt(bb), b: fmt(bb * tmp.level) }) + '<br>' +
      t('Типичан дан са ~8.000 корака и 40 мин вежби ≈ <b>{a}</b> kcal. Предлог циља за лагано мршављење: <b>{b}</b> kcal.', { a: fmt(bb * 1.5), b: fmt(suggestTarget(ww)) }));
    S.profile = old;
  };
  info();
  sh.addEventListener('input', info);
  sh.addEventListener('change', info);
  $('#psx', sh).addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (!b) return; sex = b.dataset.x; $$('#psx .chip', sh).forEach(x => x.classList.toggle('on', x === b)); info(); });
  if (first) {
    // Промена језика на првом екрану: поново отвори исти лист на новом језику.
    $('[data-langs]', sh).addEventListener('click', e => {
      const b = e.target.closest('[data-lang]'); if (!b) return;
      S.settings.lang = b.dataset.lang; save(); render(); closeSheet(); profileSheet(true);
    });
    $('#pimp', sh).onclick = () => $('#pimpf', sh).click();
    $('#pimpf', sh).onchange = e => { const f = e.target.files[0]; if (f) { closeSheet(); importBackup(f); } };
  }
  $('#pok', sh).onclick = () => {
    const age = num($('#pa', sh).value), h = num($('#ph', sh).value);
    if (!(age > 10 && age < 110)) return toast(t('Упиши године'));
    if (!(h > 100 && h < 230)) return toast(t('Упиши висину у cm'));
    const wv = num($('#pw', sh).value);
    Object.assign(S.profile, {
      sex, age: Math.round(age), height: Math.round(h), weight: wv > 25 && wv < 300 ? wv : null, level: +$('#pl', sh).value,
      target: num($('#pt', sh).value) >= 800 ? Math.round(num($('#pt', sh).value)) : null,
      protMin: num($('#ppl', sh).value) > 0 ? Math.round(num($('#ppl', sh).value)) : null,
      protMax: num($('#pph', sh).value) > 0 ? Math.round(num($('#pph', sh).value)) : null,
      water: num($('#pwa', sh).value) > 0 ? Math.round(num($('#pwa', sh).value)) : 2250,
      glass: num($('#pg', sh).value) > 0 ? Math.round(num($('#pg', sh).value)) : 250
    });
    S.settings.onboarded = true;
    save(); closeSheet(); render();
    if (first) toast(t('Спремно! Додај редовне тренинге у Подешавањима.'));
  };
}

function routineSheet(id) {
  const ex = id ? S.routines.find(r => r.id === id) : null;
  const r = ex ? JSON.parse(JSON.stringify(ex)) : { id: uid(), act: ACTS[0].name, name: t(ACTS[0].name), met: ACTS[0].met, min: 40, days: [0, 1, 2, 3, 4, 5, 6] };
  const sh = openSheet(ex ? t('Измени тренинг') : t('Нови редовни тренинг'), `
    <label class="f">${t('Врста')}</label><select id="rs">${ACTS.map((x, i) => `<option value="${i}" ${x.name === (r.act || r.name) ? 'selected' : ''}>${esc(t(x.name))}</option>`).join('')}</select>
    <label class="f">${t('Назив (како га ти зовеш)')}</label><input type="text" id="rn" value="${esc(r.name)}">
    <label class="f">${t('Трајање (мин)')}</label><input type="text" inputmode="numeric" id="rm" value="${r.min}">
    <label class="f">${t('Дани')}</label>
    <div class="chips" id="rd">${DAY_SHORT.map((d, i) => `<button class="chip ${r.days.includes(i) ? 'on' : ''}" data-d="${i}">${dayShort(i)}</button>`).join('')}</div>
    <div class="note" id="rinfo"></div>
    ${ex ? `<button class="btn danger block" id="rdel">${t('Обриши')}</button>` : ''}`,
    `<button class="btn" data-close>${t('Откажи')}</button><button class="btn primary" id="rok">${t('Сачувај')}</button>`);
  const sel = $('#rs', sh), nm = $('#rn', sh);
  let lastAuto = L(t(ACTS[+sel.value]?.name));
  const info = () => { $('#rinfo', sh).innerHTML = L(t('≈ <b>{a}</b> kcal по тренингу', { a: fmt(actKcal(ACTS[+sel.value].met, num($('#rm', sh).value) || 0, weightOn(todayKey()))) })); };
  info();
  sel.onchange = () => { const x = ACTS[+sel.value]; if (!nm.value.trim() || nm.value === lastAuto) nm.value = L(t(x.name)); lastAuto = L(t(x.name)); info(); };
  $('#rm', sh).oninput = info;
  $('#rd', sh).addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) b.classList.toggle('on'); });
  if (ex) $('#rdel', sh).onclick = () => { S.routines = S.routines.filter(x => x.id !== r.id); save(); closeSheet(); render(); };
  $('#rok', sh).onclick = () => {
    r.met = ACTS[+sel.value].met;
    r.act = ACTS[+sel.value].name;
    r.name = nm.value.trim() || t(ACTS[+sel.value].name);
    r.min = Math.round(num($('#rm', sh).value));
    r.days = $$('#rd .on', sh).map(b => +b.dataset.d);
    if (!(r.min > 0)) return toast(t('Упиши трајање'));
    if (!r.days.length) return toast(t('Изабери бар један дан'));
    const i = S.routines.findIndex(x => x.id === r.id);
    if (i >= 0) S.routines[i] = r; else S.routines.push(r);
    save(); closeSheet(); render();
  };
}

/* ================= бекап ================= */
function exportBackup() {
  const d = new Date();
  const name = `fit-dnevnik-${keyOf(d)}.json`;
  const text = JSON.stringify({ app: 'fit-dnevnik', v: 1, exported: d.toISOString(), data: S }, null, 1);
  S.settings.lastBackup = Date.now(); save();
  if (window.FitAndroid && window.FitAndroid.saveFile) {
    window.FitAndroid.saveFile(name, text);
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast(t('Бекап је сачуван'));
  }
  render();
}
function importBackup(file) {
  const rd = new FileReader();
  rd.onload = () => {
    let j;
    try { j = JSON.parse(rd.result); } catch (e) { return toast(t('Фајл није исправан бекап')); }
    const data = j && j.app === 'fit-dnevnik' ? j.data : j;
    if (!data || typeof data.days !== 'object') return toast(t('Фајл није бекап Фит дневника'));
    const nd = Object.keys(data.days).length;
    ask(t('Вратити бекап ({a} дана)? Тренутни подаци на телефону биће замењени.', { a: nd }), t('Врати'), () => {
      // Језик остаје онај који је изабран на овом телефону.
      const l = lang();
      S = normalize(data); S.settings.onboarded = true; S.settings.lang = l; save();
      ui.date = todayKey(); ui.tab = 'today'; render();
      toast(t('Бекап је враћен ✓'));
    }, false);
  };
  rd.readAsText(file);
}

/* ================= кораци са телефона (Health Connect) ================= */
/** null у прегледачу или старом APK-у; иначе 'unsupported' | 'available' | 'granted'. */
function stepsStatus() {
  try { return NATIVE && window.FitAndroid.stepsStatus ? window.FitAndroid.stepsStatus() : null; } catch (e) { return null; }
}
let stepsManual = false, stepsLast = 0;
function syncSteps(manual) {
  const st = stepsStatus();
  if (!st || st === 'unsupported') { if (manual) toast(t('За аутоматске кораке потребан је Android 14 или новији. Кораке уписуј ручно.')); return; }
  if (!manual && (!S.settings.autoSteps || st !== 'granted' || Date.now() - stepsLast < 60000)) return;
  stepsManual = manual; stepsLast = Date.now();
  // Први пут и на захтев се чита цео месец, иначе последња недеља.
  window.FitAndroid.syncSteps(manual || !S.settings.stepsSyncedAt ? 30 : 7, !!manual);
}
window.onSteps = (data, err) => {
  if (err) {
    if (stepsManual) toast(err === 'denied' ? t('Дозвола за кораке није дата. Можеш је укључити у Health Connect подешавањима.')
      : err === 'unsupported' ? t('За аутоматске кораке потребан је Android 14 или новији. Кораке уписуј ручно.')
      : t('Кораци нису учитани. Покушај поново.'));
    return;
  }
  let n = 0;
  for (const [k, raw] of Object.entries(data || {})) {
    // Нова верзија шаље {t: збир Health Connect-а, by: {извор: кораци}}; узима се највећи број,
    // јер Health Connect понекад изабере извор који је избројао мање (извори се не сабирају).
    const by = raw && typeof raw === 'object' ? raw.by || {} : {};
    const v = Math.max(typeof raw === 'number' ? raw : raw.t || 0, ...Object.values(by).map(Number));
    if (!(v > 0)) continue;
    const d = day(k);
    if (Object.keys(by).length) d.stepsBy = by; else delete d.stepsBy;
    // Број који је она сама уписала се не мења.
    if (d.stepsSrc === 'manual' && d.steps) continue;
    if (d.steps !== v) { d.steps = v; n++; }
    d.stepsSrc = 'hc';
  }
  S.settings.autoSteps = true;
  S.settings.stepsSyncedAt = Date.now();
  save(); render();
  if (stepsManual) toast(Object.keys(data || {}).length ? t('Кораци су учитани ✓') : t('Телефон још нема забележене кораке. Провери да ли апликација која броји кораке шаље податке у Health Connect.'));
};

/* ================= старт ================= */
function onboarding() { if (!S.settings.onboarded) profileSheet(true); }
render();
onboarding();
syncSteps(false);
// Нови дан после поноћи ако је апликација остала отворена.
let lastToday = todayKey();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const td = todayKey();
  if (td !== lastToday) { if (ui.date === lastToday) ui.date = td; lastToday = td; }
  render();
  syncSteps(false);
});
