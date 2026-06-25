// Definizioni delle medaglie. Ogni check(ctx) -> bool.
// ctx = { state, mastery, event }
//   state   = stato Studio (xp, streak, reviewsTotal, combo, challenge, days, settings...)
//   mastery = { masteredTopics, masteredUnits[], masteredMaterie[] }
//   event   = { type:'review'|'challenge'|'load', hour, correct, comboNow, comeback,
//               challengePerfect, todayReviews }
// Le medaglie "evento" (orari, comeback, imbattuto) scattano solo nel momento giusto.

export const ACHIEVEMENTS = [
  // 🔥 Streak
  { id: 'spark',       icon: '🔥', name: 'Prima scintilla',   desc: 'Studia per 1 giorno.',              cat: 'Streak',     check: c => c.state.streak.current >= 1 },
  { id: 'onfire',      icon: '🔥', name: 'In carreggiata',     desc: 'Streak di 3 giorni.',               cat: 'Streak',     check: c => c.state.streak.current >= 3 },
  { id: 'ironweek',    icon: '🛡️', name: 'Settimana di ferro', desc: 'Streak di 7 giorni.',               cat: 'Streak',     check: c => c.state.streak.current >= 7 },
  { id: 'unstoppable', icon: '🚀', name: 'Inarrestabile',      desc: 'Streak di 30 giorni.',              cat: 'Streak',     check: c => c.state.streak.current >= 30 },
  { id: 'legend',      icon: '👑', name: 'Leggenda',           desc: 'Streak di 100 giorni.',             cat: 'Streak',     check: c => c.state.streak.current >= 100 },

  // 📚 Volume
  { id: 'firststeps',  icon: '👣', name: 'Primi passi',        desc: '10 ripassi totali.',                cat: 'Volume',     check: c => c.state.reviewsTotal >= 10 },
  { id: 'student',     icon: '📚', name: 'Studente modello',   desc: '100 ripassi totali.',               cat: 'Volume',     check: c => c.state.reviewsTotal >= 100 },
  { id: 'bookworm',    icon: '🐛', name: 'Topo da biblioteca', desc: '500 ripassi totali.',               cat: 'Volume',     check: c => c.state.reviewsTotal >= 500 },
  { id: 'machine',     icon: '⚙️', name: 'Macchina da ripasso',desc: '2000 ripassi totali.',              cat: 'Volume',     check: c => c.state.reviewsTotal >= 2000 },

  // 🎯 Accuratezza
  { id: 'sharpshooter',icon: '🎯', name: 'Cecchino',           desc: '20 risposte giuste di fila.',       cat: 'Accuratezza',check: c => c.state.combo.best >= 20 },
  { id: 'ironmem',     icon: '🧠', name: 'Memoria di ferro',   desc: '50 risposte giuste di fila.',       cat: 'Accuratezza',check: c => c.state.combo.best >= 50 },

  // 🏆 Mastery
  { id: 'firstmaster', icon: '🏅', name: 'Primo trofeo',       desc: 'Padroneggia 1 argomento.',          cat: 'Mastery',    check: c => c.mastery.masteredTopics >= 1 },
  { id: 'collector',   icon: '🏆', name: 'Collezionista',      desc: 'Padroneggia 5 argomenti.',          cat: 'Mastery',    check: c => c.mastery.masteredTopics >= 5 },
  { id: 'unitconq',    icon: '🗺️', name: 'Unità conquistata',  desc: 'Padroneggia tutta un\'unità.',      cat: 'Mastery',    check: c => c.mastery.masteredUnits.length >= 1 },
  { id: 'materiadom',  icon: '👑', name: 'Materia dominata',   desc: 'Padroneggia tutta una materia.',    cat: 'Mastery',    check: c => c.mastery.masteredMaterie.length >= 1 },

  // 🦉 Orari
  { id: 'earlybird',   icon: '🌅', name: 'Mattiniero',         desc: 'Studia prima delle 8:00.',          cat: 'Orari',      check: c => c.event.type === 'review' && c.event.hour < 8 },
  { id: 'nightowl',    icon: '🦉', name: 'Gufo notturno',      desc: 'Studia tra mezzanotte e le 5:00.',  cat: 'Orari',      check: c => c.event.type === 'review' && c.event.hour >= 0 && c.event.hour < 5 },

  // ✅ Obiettivo
  { id: 'goalmet',     icon: '✅', name: 'Obiettivo centrato', desc: 'Raggiungi l\'obiettivo di un giorno.',cat: 'Costanza',  check: c => c.event.todayReviews >= c.state.settings.goalPerDay },
  { id: 'goal7days',   icon: '📆', name: 'Sette su sette',     desc: 'Centra l\'obiettivo in 7 giorni.',   cat: 'Costanza',  check: c => Object.values(c.state.days).filter(d => d.reviews >= c.state.settings.goalPerDay).length >= 7 },

  // ⚔️ Sfida
  { id: 'challenger',  icon: '⚔️', name: 'Sfidante',           desc: 'Gioca la tua prima Sfida.',         cat: 'Sfida',      check: c => c.state.challenge.plays >= 1 },
  { id: 'gladiator',   icon: '🏟️', name: 'Gladiatore',         desc: 'Gioca 10 Sfide.',                   cat: 'Sfida',      check: c => c.state.challenge.plays >= 10 },
  { id: 'flawless',    icon: '💎', name: 'Imbattuto',          desc: 'Chiudi una Sfida senza errori.',    cat: 'Sfida',      check: c => c.state.challenge.perfect >= 1 },

  // 🐦‍🔥 Comeback
  { id: 'phoenix',     icon: '🐦‍🔥', name: 'Fenice',            desc: 'Torna a studiare dopo aver perso una streak.', cat: 'Comeback', check: c => c.event.comeback === true },
];

export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

// Restituisce gli id delle medaglie appena sbloccate (non già possedute e con check ok).
export function evaluate(ctx) {
  const unlocked = ctx.state.achievements || {};
  return ACHIEVEMENTS.filter(a => !unlocked[a.id] && safeCheck(a, ctx)).map(a => a.id);
}
function safeCheck(a, ctx) {
  try { return !!a.check(ctx); } catch { return false; }
}
