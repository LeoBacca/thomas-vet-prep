// Carica i mazzi di flashcard, costruisce la mappa verso le Risorse (il "ponte"),
// e seleziona le card per la sessione giornaliera / la sfida.
import chimica from '../../data/flashcards/chimica.json';
import fisica from '../../data/flashcards/fisica.json';
import biologia from '../../data/flashcards/biologia.json';
import { topics as RISORSE_TOPICS } from '../../data/all.js';
import { isDue } from './fsrs.js';
import { localDay } from './store.js';

export const ALL_CARDS = [...chimica, ...fisica, ...biologia];
export const CARDS_BY_ID = Object.fromEntries(ALL_CARDS.map(c => [c.id, c]));

// metadati leggeri per il calcolo mastery
export const CARDS_META = ALL_CARDS.map(c => ({ id: c.id, topicId: c.topicId, unita: c.unita, materia: c.materia }));

// --- Ponte verso le Risorse ---
const BASE = import.meta.env.BASE_URL;
const withBase = (p) => (BASE + p).replace(/\/{2,}/g, '/');
const TOPIC_MAP = Object.fromEntries(
  RISORSE_TOPICS.map(t => [t.id, { titolo: t.titolo, href: withBase(t.url), materia: t.materiaKey, unita: t.unita }])
);
export function ripasso(topicId) {
  return TOPIC_MAP[topicId] || null; // { titolo, href } oppure null
}

export const MATERIE = [
  { key: 'chimica', nome: 'Chimica', emoji: '⚗️' },
  { key: 'fisica', nome: 'Fisica', emoji: '🧲' },
  { key: 'biologia', nome: 'Biologia', emoji: '🧬' },
];

const shuffle = (arr, rng = Math.random) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

export const TOTAL_CARDS = ALL_CARDS.length;

// Quante card NON sono ancora mai state introdotte (mai viste).
export function newCardsRemaining(state) {
  let n = 0;
  for (const c of ALL_CARDS) { const st = state.cards[c.id]; if (!st || !st.reps) n++; }
  return n;
}

// Giorni (interi, >=1) da oggi fino alla data obiettivo inclusa. null se non valida/passata.
export function daysUntil(targetISO, fromISO = localDay()) {
  if (!targetISO) return null;
  const MS = 86400000;
  const a = new Date(fromISO + 'T00:00:00');
  const b = new Date(targetISO + 'T00:00:00');
  const diff = Math.round((b - a) / MS);
  return diff >= 1 ? diff : null; // oggi stesso o passato => non calcolabile
}

// Card nuove/giorno consigliate per arrivare pronti entro la data obiettivo.
// Se non c'è una data valida, usa il valore manuale settings.newPerDay.
// Ritorna { perDay, fromDate, remaining, days } per poterlo anche mostrare in dashboard.
export function recommendedNewPerDay(state) {
  const remaining = newCardsRemaining(state);
  const days = daysUntil(state.settings.targetDate);
  if (!days) {
    return { perDay: Math.max(0, state.settings.newPerDay || 12), fromDate: false, remaining, days: null };
  }
  const perDay = Math.max(1, Math.ceil(remaining / days));
  return { perDay, fromDate: true, remaining, days };
}

// Coda della sessione: prima le DOVUTE (già viste e scadute), poi le NUOVE fino al limite.
export function buildQueue(state, opts = {}) {
  const newPerDay = opts.newPerDay ?? recommendedNewPerDay(state).perDay;
  const materia = opts.materia || null;
  const now = new Date().toISOString();
  const pool = materia ? ALL_CARDS.filter(c => c.materia === materia) : ALL_CARDS;

  const due = [], fresh = [];
  for (const c of pool) {
    const st = state.cards[c.id];
    if (!st || !st.reps) fresh.push(c);
    else if (isDue(st, now)) due.push(c);
  }
  // dovute: dalla più "in ritardo"; nuove: in ordine di mazzo, limitate
  due.sort((a, b) => new Date(state.cards[a.id].due) - new Date(state.cards[b.id].due));
  const newToday = countNewToday(state);
  const remainingNew = Math.max(0, newPerDay - newToday);
  return [...due, ...fresh.slice(0, remainingNew)];
}

export function countDue(state) {
  const now = new Date().toISOString();
  let due = 0, fresh = 0;
  for (const c of ALL_CARDS) {
    const st = state.cards[c.id];
    if (!st || !st.reps) fresh++;
    else if (isDue(st, now)) due++;
  }
  return { due, fresh };
}

function countNewToday(state) {
  // quante card "nuove" sono state introdotte oggi (per non superare il limite giornaliero)
  return (state.days[localDay()] || {}).newCards || 0;
}

// Pool casuale per la Sfida (ignora le scadenze SRS).
// Solo card a risposta multipla (mc/tf): la Sfida è "lampo" e a tempo, le aperte
// (autovalutazione) non c'entrano e mandavano in crash il timer.
export function challengePool(n = 10, opts = {}) {
  const materia = opts.materia || null;
  const pool = ALL_CARDS.filter(c =>
    (c.type === 'mc' || c.type === 'tf') && Array.isArray(c.choices) && c.choices.length &&
    (!materia || c.materia === materia)
  );
  return shuffle(pool).slice(0, Math.min(n, pool.length));
}
