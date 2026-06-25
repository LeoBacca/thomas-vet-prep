// FSRS-5 — Free Spaced Repetition Scheduler (modalità "long-term", senza step intra-giornalieri).
// Implementazione fedele dell'algoritmo usato da Anki. Tutto client-side, niente dipendenze.
// Voti: 1=Di nuovo, 2=Difficile, 3=Bene, 4=Facile.
//
// Stato di una card (serializzabile in localStorage):
//   { s, d, due, last, reps, lapses, state }
//     s     = stabilità (giorni)            d   = difficoltà (1..10)
//     due   = ISO date (prossimo ripasso)   last= ISO date (ultimo ripasso)
//     reps  = numero ripassi                lapses = numero "Di nuovo" da card matura
//     state = 'new' | 'review' | 'relearning'

// Pesi di default FSRS-5 (19). Tarabili in futuro su dati reali.
export const DEFAULT_W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];

export const DECAY = -0.5;
export const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // = 19/81 ≈ 0.234567

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
const S_MIN = 0.01;

export const RATING = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 };

const MS_DAY = 86400000;
const daysBetween = (aIso, bIso) => Math.max(0, (new Date(bIso) - new Date(aIso)) / MS_DAY);

// Ritenzione: probabilità di ricordare dopo `t` giorni con stabilità `s`.
export function retrievability(t, s) {
  if (s <= 0) return 0;
  return Math.pow(1 + FACTOR * (t / s), DECAY);
}

// Intervallo (giorni) per raggiungere la ritenzione desiderata data la stabilità.
export function intervalForStability(s, desiredRetention = 0.9) {
  const ivl = (s / FACTOR) * (Math.pow(desiredRetention, 1 / DECAY) - 1);
  return Math.max(1, Math.round(ivl));
}

// --- difficoltà ---
function initDifficulty(w, grade) {
  return clamp(w[4] - Math.exp(w[5] * (grade - 1)) + 1, 1, 10);
}
function nextDifficulty(w, d, grade) {
  const deltaD = -w[6] * (grade - 3);
  const dPrime = d + deltaD * (10 - d) / 9; // linear damping (FSRS-5)
  const reverted = w[7] * initDifficulty(w, RATING.EASY) + (1 - w[7]) * dPrime; // mean reversion
  return clamp(reverted, 1, 10);
}

// --- stabilità ---
function initStability(w, grade) {
  return Math.max(S_MIN, w[grade - 1]);
}
function nextRecallStability(w, d, s, r, grade) {
  const hardPenalty = grade === RATING.HARD ? w[15] : 1;
  const easyBonus = grade === RATING.EASY ? w[16] : 1;
  const inc =
    Math.exp(w[8]) *
    (11 - d) *
    Math.pow(s, -w[9]) *
    (Math.exp(w[10] * (1 - r)) - 1) *
    hardPenalty *
    easyBonus;
  return Math.max(S_MIN, s * (1 + inc));
}
function nextForgetStability(w, d, s, r) {
  const sf =
    w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r));
  // dopo un lapse la stabilità non deve crescere: cappa al valore precedente.
  return Math.max(S_MIN, Math.min(sf, s));
}

// Applica un ripasso allo stato e restituisce il NUOVO stato.
// opts: { now: ISO, w, desiredRetention, fuzz: bool }
export function review(prev, grade, opts = {}) {
  const w = opts.w || DEFAULT_W;
  const now = opts.now || new Date().toISOString();
  const dr = opts.desiredRetention ?? 0.9;
  const isNew = !prev || prev.state === 'new' || !prev.reps;

  let s, d;
  if (isNew) {
    s = initStability(w, grade);
    d = initDifficulty(w, grade);
  } else {
    const elapsed = prev.last ? daysBetween(prev.last, now) : 0;
    const r = retrievability(elapsed, prev.s);
    d = nextDifficulty(w, prev.d, grade);
    s = grade === RATING.AGAIN
      ? nextForgetStability(w, prev.d, prev.s, r)
      : nextRecallStability(w, prev.d, prev.s, r, grade);
  }

  let ivl = intervalForStability(s, dr);
  if (opts.fuzz) ivl = applyFuzz(ivl, opts.rng);

  const due = new Date(new Date(now).getTime() + ivl * MS_DAY).toISOString();
  return {
    s,
    d,
    due,
    last: now,
    reps: (prev?.reps || 0) + 1,
    lapses: (prev?.lapses || 0) + (grade === RATING.AGAIN && !isNew ? 1 : 0),
    state: grade === RATING.AGAIN ? 'relearning' : 'review',
    ivl,
  };
}

// Anteprima dei 4 intervalli (in giorni) senza modificare lo stato — per mostrare i bottoni.
export function previewIntervals(prev, opts = {}) {
  const out = {};
  for (const g of [1, 2, 3, 4]) out[g] = review(prev, g, opts).ivl;
  return out;
}

// Fuzz: ±5-10% per evitare che le card "marciano in fila". Deterministico se passi rng.
function applyFuzz(ivl, rng = Math.random) {
  if (ivl < 3) return ivl;
  const pct = 0.05 + 0.05 * Math.min(1, ivl / 30);
  const delta = Math.round(ivl * pct);
  return Math.max(1, ivl + Math.round((rng() * 2 - 1) * delta));
}

export function isDue(state, now = new Date().toISOString()) {
  if (!state || !state.due) return true; // mai vista = da studiare
  return new Date(state.due) <= new Date(now);
}
