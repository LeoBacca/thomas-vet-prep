// Genera src/data/quiz-counts.json a partire da content/exam-bank.json.
// È la mappa { topicId: numero di domande d'esame } usata per il bollino "Argomento da quiz".
// Teniamo un file leggero (~2.6 KB) invece di importare l'intera banca (~408 KB),
// così non appesantiamo il bundle client della sezione Studio.
//
// Rigenera dopo ogni aggiornamento della banca esami:  npm run gen:quiz
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bank = JSON.parse(readFileSync(join(root, 'content/exam-bank.json'), 'utf8'));

const counts = {};
for (const q of bank.questions) {
  if (q.topicId) counts[q.topicId] = (counts[q.topicId] || 0) + 1;
}

// ordina per conteggio decrescente (solo per leggibilità del file)
const sorted = Object.fromEntries(
  Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
);

const out = join(root, 'src/data/quiz-counts.json');
writeFileSync(out, JSON.stringify(sorted, null, 0) + '\n');
console.log(`quiz-counts.json: ${Object.keys(sorted).length} argomenti da ${bank.questions.length} domande → ${out}`);
