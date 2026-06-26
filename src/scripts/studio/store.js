// Stato della sezione Studio — tutto in localStorage, esportabile/importabile.
// Namespace separato da 'prep:progress' (le spunte "letto" delle Risorse).
const KEY = 'prep:studio';
export const SCHEMA_VERSION = 1;

export const localDay = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

const defaultState = () => ({
  v: SCHEMA_VERSION,
  cards: {},               // cardId -> stato FSRS
  xp: 0,
  reviewsTotal: 0,
  correctTotal: 0,
  combo: { current: 0, best: 0 },
  streak: { current: 0, longest: 0, lastDay: null },
  days: {},                // 'YYYY-MM-DD' -> { reviews, correct, xp, newCards }
  // newPerDay = quante card NUOVE al giorno quando NON è impostata una data obiettivo.
  // targetDate = 'YYYY-MM-DD' della prova/di quando vuoi essere pronto: se c'è, le card
  //   nuove al giorno vengono calcolate da sola (vedi cards.js recommendedNewPerDay).
  settings: { newPerDay: 12, goalPerDay: 20, desiredRetention: 0.9, targetDate: null },
  achievements: {},        // achId -> ISO data sblocco
  challenge: { plays: 0, bestScore: 0, bestStreak: 0, perfect: 0 },
  createdAt: new Date().toISOString(),
  updatedAt: null,         // ISO ultimo salvataggio (tie-breaker per il merge cloud)
});

// Hook opzionale chiamato dopo ogni save() — usato dal sync cloud (sync.js) per il push.
// Se nessuno lo registra, save() resta puro localStorage (sito identico offline).
let _syncHook = null;
export function setSyncHook(fn) { _syncHook = fn; }

export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw || typeof raw !== 'object') return defaultState();
    return migrate(raw);
  } catch {
    return defaultState();
  }
}

export function save(state) {
  try {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  try { if (_syncHook) _syncHook(state); } catch {}
  return state;
}

function migrate(s) {
  const base = defaultState();
  // merge poco profondo + sotto-oggetti, così aggiungere campi non rompe i salvataggi vecchi.
  const out = { ...base, ...s };
  out.combo = { ...base.combo, ...(s.combo || {}) };
  out.streak = { ...base.streak, ...(s.streak || {}) };
  out.settings = { ...base.settings, ...(s.settings || {}) };
  out.challenge = { ...base.challenge, ...(s.challenge || {}) };
  out.cards = s.cards || {};
  out.days = s.days || {};
  out.achievements = s.achievements || {};
  out.v = SCHEMA_VERSION;
  return out;
}

export function reset() {
  return save(defaultState());
}

export function exportJSON() {
  return JSON.stringify(load(), null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  return save(migrate(parsed));
}

export function todayEntry(state, day = localDay()) {
  return state.days[day] || { reviews: 0, correct: 0, xp: 0, newCards: 0 };
}
