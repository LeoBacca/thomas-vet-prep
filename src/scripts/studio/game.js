// Il "cervello" della gamification: XP, livelli, streak, mastery, medaglie.
import { localDay } from './store.js';
import { evaluate, ACH_BY_ID } from './achievements.js';
import { RATING } from './fsrs.js';

// --- Livelli (a tema veterinario) ---
const LEVEL_NAMES = [
  'Aspirante', 'Matricola', 'Studente', 'Studente provetto', 'Tirocinante',
  'Assistente', 'Specializzando', 'Dottorando', 'Veterinario', 'Veterinario esperto',
  'Primario', 'Luminare',
];
// XP cumulativi per RAGGIUNGERE il livello L: C(L) = 50*L*(L+1)  (L>=1, C(1)=100... usiamo C(L-1))
const cumXp = (level) => 50 * level * (level + 1); // soglia per passare a level+1

export function getLevel(xp) {
  let level = 1;
  while (xp >= cumXp(level)) level++;
  const floor = level === 1 ? 0 : cumXp(level - 1);
  const ceil = cumXp(level);
  const name = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] +
    (level > LEVEL_NAMES.length ? ' ' + '★'.repeat(level - LEVEL_NAMES.length) : '');
  return { level, name, intoLevel: xp - floor, span: ceil - floor, pct: Math.round(((xp - floor) / (ceil - floor)) * 100), nextAt: ceil };
}

// --- XP per ripasso ---
const BASE_XP = { [RATING.AGAIN]: 4, [RATING.HARD]: 12, [RATING.GOOD]: 10, [RATING.EASY]: 7 };
const comboMult = (combo) => Math.min(2, 1 + combo * 0.05); // cap 2x a combo 20

// --- Mastery ---
// Livello di una card: 0 nuova, 1 vista, 2 consolidata, 3 masterata.
export function cardLevel(fsrs) {
  if (!fsrs || !fsrs.reps) return 0;
  const ivl = fsrs.ivl ?? 0;
  if (ivl >= 21 && fsrs.reps >= 3) return 3;
  if (ivl >= 7) return 2;
  return 1;
}

export function computeMastery(state, cardsMeta) {
  const byTopic = {}, byUnit = {}, byMateria = {};
  const ensure = (m, k) => (m[k] ||= { total: 0, mastered: 0, sumLevel: 0 });
  for (const c of cardsMeta) {
    const lvl = cardLevel(state.cards[c.id]);
    const isMast = lvl >= 3;
    const tk = c.topicId, uk = c.materia + '-u' + c.unita, mk = c.materia;
    for (const [m, k] of [[byTopic, tk], [byUnit, uk], [byMateria, mk]]) {
      const e = ensure(m, k); e.total++; e.sumLevel += lvl; if (isMast) e.mastered++;
    }
  }
  const fullyMastered = (m) => Object.entries(m).filter(([, e]) => e.total > 0 && e.mastered === e.total).map(([k]) => k);
  return {
    byTopic, byUnit, byMateria,
    masteredTopics: fullyMastered(byTopic).length,
    masteredUnits: fullyMastered(byUnit),
    masteredMaterie: fullyMastered(byMateria),
  };
}

const prevDay = (dayStr) => { const d = new Date(dayStr + 'T12:00:00'); d.setDate(d.getDate() - 1); return localDay(d); };

// Applica un ripasso. Ritorna { xpGained, mult, correct, level, leveledUp, newAchievements, mastery }.
export function applyReview(state, payload, cardsMeta) {
  const { cardId, grade, newCardState, isNew, now = new Date().toISOString() } = payload;
  const correct = grade >= RATING.HARD;
  const day = localDay(new Date(now));
  const hour = new Date(now).getHours();
  const beforeLevel = getLevel(state.xp).level;

  // 1) salva stato FSRS
  state.cards[cardId] = newCardState;

  // 2) combo
  if (correct) { state.combo.current++; state.combo.best = Math.max(state.combo.best, state.combo.current); }
  else state.combo.current = 0;

  // 3) XP
  const base = BASE_XP[grade] ?? 6;
  const mult = correct ? comboMult(state.combo.current) : 1;
  const xpGained = Math.round(base * mult) + (isNew ? 5 : 0);
  state.xp += xpGained;

  // 4) totali
  state.reviewsTotal++;
  if (correct) state.correctTotal++;

  // 5) streak
  let comeback = false;
  if (state.streak.lastDay !== day) {
    if (state.streak.lastDay === prevDay(day)) state.streak.current++;
    else { if (state.streak.current >= 3) comeback = true; state.streak.current = 1; }
    state.streak.longest = Math.max(state.streak.longest, state.streak.current);
    state.streak.lastDay = day;
  }

  // 6) giorno (heatmap)
  const d = (state.days[day] ||= { reviews: 0, correct: 0, xp: 0, newCards: 0 });
  d.reviews++; if (correct) d.correct++; d.xp += xpGained; if (isNew) d.newCards++;

  // 7) medaglie
  const mastery = computeMastery(state, cardsMeta);
  const newAchievements = evaluate({
    state, mastery,
    event: { type: 'review', hour, correct, comboNow: state.combo.current, comeback, todayReviews: d.reviews },
  });
  for (const id of newAchievements) state.achievements[id] = new Date(now).toISOString();

  const lvl = getLevel(state.xp);
  return { xpGained, mult, correct, level: lvl.level, leveledUp: lvl.level > beforeLevel, newAchievements, mastery };
}

// Applica il risultato di una Sfida. result = { score, total, correct, perfect, streak }
export function applyChallenge(state, result, cardsMeta, now = new Date().toISOString()) {
  const beforeLevel = getLevel(state.xp).level;
  state.challenge.plays++;
  state.challenge.bestScore = Math.max(state.challenge.bestScore, result.score);
  state.challenge.bestStreak = Math.max(state.challenge.bestStreak, result.streak || 0);
  if (result.perfect) state.challenge.perfect++;

  const xpGained = Math.round(result.score / 2) + (result.perfect ? 50 : 0);
  state.xp += xpGained;
  const day = localDay(new Date(now));
  const d = (state.days[day] ||= { reviews: 0, correct: 0, xp: 0, newCards: 0 });
  d.xp += xpGained;

  const mastery = computeMastery(state, cardsMeta);
  const newAchievements = evaluate({
    state, mastery,
    event: { type: 'challenge', hour: new Date(now).getHours(), challengePerfect: !!result.perfect, todayReviews: d.reviews },
  });
  for (const id of newAchievements) state.achievements[id] = new Date(now).toISOString();
  const lvl = getLevel(state.xp);
  return { xpGained, level: lvl.level, leveledUp: lvl.level > beforeLevel, newAchievements };
}

// Valutazione "passiva" (al caricamento dashboard): sblocca medaglie già meritate.
export function evaluatePassive(state, cardsMeta, now = new Date().toISOString()) {
  const mastery = computeMastery(state, cardsMeta);
  const newAchievements = evaluate({ state, mastery, event: { type: 'load', hour: new Date(now).getHours() } });
  for (const id of newAchievements) state.achievements[id] = new Date(now).toISOString();
  return { mastery, newAchievements };
}

export { ACH_BY_ID };
