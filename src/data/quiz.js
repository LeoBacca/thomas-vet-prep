// "Ponte" verso la banca delle domande d'esame storiche.
// Mappa { topicId: numero di volte chiesto agli esami passati }, usata per il
// bollino "Argomento da quiz" su Risorse e flashcard.
//
// La mappa è in quiz-counts.json (file leggero ~2.6 KB) e NON nell'intera banca
// (~408 KB), così la sezione Studio non se la porta dietro nel bundle client.
// Rigenera dopo aver aggiornato la banca esami:  npm run gen:quiz
import QUIZ_COUNTS from './quiz-counts.json';

export { QUIZ_COUNTS };

// Quante volte un argomento è stato chiesto (0 se mai).
export const quizCount = (id) => QUIZ_COUNTS[id] || 0;

// È un "argomento da quiz"? (chiesto almeno una volta agli esami passati)
export const isQuizTopic = (id) => quizCount(id) > 0;

// Testo per il tooltip del bollino, es. "Chiesto 19 volte agli esami passati".
export const quizTitle = (id) => {
  const n = quizCount(id);
  if (!n) return '';
  return n === 1
    ? 'Chiesto 1 volta agli esami passati'
    : `Chiesto ${n} volte agli esami passati`;
};
