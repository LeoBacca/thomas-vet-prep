// Sincronizzazione cloud dei progressi su DUE namespace localStorage:
//   - 'prep:studio'   → SRS (card, XP, streak, medaglie, statistiche)
//   - 'prep:progress' → spunte "letto/non letto" + flag delle Risorse
// Entrambi vivono in un unico documento Firestore: progress/<uid> = { studio, risorse, updatedAt }.
//
// Filosofia OFFLINE-FIRST: localStorage resta la verità immediata; il cloud è backup + sync.
// Al login/avvio: pull → MERGE (mai overwrite cieco) → scrivi in locale → push.
// Ad ogni modifica: push debounced (~2s) + push all'uscita pagina.
import { load, setSyncHook } from './store.js';
import { cloudConfigured, onUser, pull, push } from './cloud.js';

const STUDIO_KEY = 'prep:studio';
const RISORSE_KEY = 'prep:progress';

const readLS = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ---------------------------------------------------------------------------
// MERGE — RISORSE (spunte). Unione per topicId; per ogni flag "true vince" (OR).
// Una spunta "letto" su un device non si perde MAI. Lo "de-spuntare" non si propaga
// (scelta conservativa per non perdere progressi).
// ---------------------------------------------------------------------------
export function mergeRisorse(a = {}, b = {}) {
  a = a || {}; b = b || {};
  const out = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const fa = a[id] || {}, fb = b[id] || {};
    const flags = {};
    for (const f of new Set([...Object.keys(fa), ...Object.keys(fb)])) {
      flags[f] = !!fa[f] || !!fb[f];
    }
    out[id] = flags;
  }
  return out;
}

// ---------------------------------------------------------------------------
// MERGE — STUDIO (SRS). Combina senza scegliere un vincitore unico, così anche due
// device con progressi diversi si fondono in unione.
// ---------------------------------------------------------------------------
const num = (x) => (typeof x === 'number' && isFinite(x) ? x : 0);
const isoOlder = (x, y) => (!x ? y : !y ? x : (x < y ? x : y));
const isoNewer = (x, y) => (!x ? y : !y ? x : (x > y ? x : y));

function mergeStreak(a = {}, b = {}) {
  const la = a.lastDay || '', lb = b.lastDay || '';
  const base = la >= lb ? a : b;
  return {
    current: num(base.current),
    longest: Math.max(num(a.longest), num(b.longest)),
    lastDay: (la >= lb ? la : lb) || null,
  };
}

function mergeChallenge(a = {}, b = {}) {
  return {
    plays: Math.max(num(a.plays), num(b.plays)),
    bestScore: Math.max(num(a.bestScore), num(b.bestScore)),
    bestStreak: Math.max(num(a.bestStreak), num(b.bestStreak)),
    perfect: Math.max(num(a.perfect), num(b.perfect)),
  };
}

// Per ogni card: tieni l'entry col ripasso più recente (fallback: più ripassi).
function mergeCards(a = {}, b = {}) {
  const out = { ...a };
  for (const [id, cb] of Object.entries(b)) {
    const ca = out[id];
    if (!ca) { out[id] = cb; continue; }
    const la = ca.last || '', lb = cb.last || '';
    if (la !== lb) out[id] = lb > la ? cb : ca;
    else out[id] = num(cb.reps) > num(ca.reps) ? cb : ca;
  }
  return out;
}

// Per ogni giorno: max campo-per-campo (conservativo, niente gonfiaggi).
function mergeDays(a = {}, b = {}) {
  const out = {};
  for (const day of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const da = a[day] || {}, db = b[day] || {};
    out[day] = {
      reviews: Math.max(num(da.reviews), num(db.reviews)),
      correct: Math.max(num(da.correct), num(db.correct)),
      xp: Math.max(num(da.xp), num(db.xp)),
      newCards: Math.max(num(da.newCards), num(db.newCards)),
    };
  }
  return out;
}

// Medaglie: unione; a parità di id tieni il timestamp più vecchio (prima conquista).
function mergeAch(a = {}, b = {}) {
  const out = { ...a };
  for (const [id, ts] of Object.entries(b)) {
    out[id] = out[id] ? isoOlder(out[id], ts) : ts;
  }
  return out;
}

export function mergeStudio(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const newer = (a.updatedAt || '') >= (b.updatedAt || '') ? a : b;
  return {
    v: Math.max(num(a.v), num(b.v)) || 1,
    cards: mergeCards(a.cards, b.cards),
    xp: Math.max(num(a.xp), num(b.xp)),
    reviewsTotal: Math.max(num(a.reviewsTotal), num(b.reviewsTotal)),
    correctTotal: Math.max(num(a.correctTotal), num(b.correctTotal)),
    combo: {
      current: num((newer.combo || {}).current),
      best: Math.max(num((a.combo || {}).best), num((b.combo || {}).best)),
    },
    streak: mergeStreak(a.streak, b.streak),
    days: mergeDays(a.days, b.days),
    // settings: vince il lato più recente, ma senza perdere campi presenti solo nell'altro
    settings: { ...(a.settings || {}), ...(b.settings || {}), ...(newer.settings || {}) },
    achievements: mergeAch(a.achievements, b.achievements),
    challenge: mergeChallenge(a.challenge, b.challenge),
    createdAt: isoOlder(a.createdAt, b.createdAt),
    updatedAt: isoNewer(a.updatedAt, b.updatedAt),
  };
}

// ---------------------------------------------------------------------------
// ORCHESTRAZIONE
// ---------------------------------------------------------------------------
let currentUid = null;
let started = false;
let pushTimer = null;

function buildDoc() {
  return {
    studio: readLS(STUDIO_KEY) || {},
    risorse: readLS(RISORSE_KEY) || {},
    updatedAt: new Date().toISOString(),
  };
}

// Push ritardato: chiamabile a raffica (debounce ~2s). No-op se non loggati.
export function pushSoon() {
  if (!currentUid) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    push(currentUid, buildDoc()).catch((e) => console.warn('[sync] push fallito:', e));
  }, 2000);
}

function flushPush() {
  if (!currentUid) return;
  clearTimeout(pushTimer);
  push(currentUid, buildDoc()).catch(() => {});
}

// Avvia il motore di sync (idempotente). Da chiamare una volta per pagina (in BaseLayout).
// Quando il merge è pronto emette l'evento window 'prep:synced' così le pagine si ridisegnano.
export async function engageSync() {
  if (!cloudConfigured || started) return;
  started = true;
  setSyncHook(pushSoon); // ogni save() dello Studio farà partire un push debounced

  await onUser(async (user) => {
    currentUid = user ? user.uid : null;
    if (!user) return;
    try {
      const remote = await pull(user.uid);
      const mergedStudio = mergeStudio(load(), remote && remote.studio);
      const mergedRisorse = mergeRisorse(readLS(RISORSE_KEY) || {}, (remote && remote.risorse) || {});
      if (mergedStudio) writeLS(STUDIO_KEY, mergedStudio);
      writeLS(RISORSE_KEY, mergedRisorse);
      await push(user.uid, {
        studio: mergedStudio || {},
        risorse: mergedRisorse,
        updatedAt: new Date().toISOString(),
      });
      window.dispatchEvent(new CustomEvent('prep:synced', { detail: { studio: mergedStudio, risorse: mergedRisorse } }));
    } catch (e) {
      console.warn('[sync] pull/merge fallito (resto su localStorage):', e);
    }
  });

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushPush(); });
  window.addEventListener('pagehide', flushPush);
}
