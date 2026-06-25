// Genera, da content/topics/<materia>.json:
//   - src/data/<materia>-index.json   (indice: prev/next globali + interlink bidirezionali)
//   - (opzionale) pagine skeleton, solo se passi 'skeletons'
//
// Uso:  node scripts/generate-unit.mjs fisica            -> solo indice
//       node scripts/generate-unit.mjs fisica skeletons  -> indice + skeleton (salta la 1a di ogni unità)
import fs from 'node:fs';
import path from 'node:path';

const materia = process.argv[2] || 'fisica';
const writeSkeletons = process.argv.includes('skeletons');

const root = path.resolve(process.cwd());
const data = JSON.parse(fs.readFileSync(path.join(root, 'content', 'topics', `${materia}.json`), 'utf8'));

const DIACRITICS = /[̀-ͯ]/g;
const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(DIACRITICS, '')
    .replace(/['’()]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-')
    .split('-').slice(0, 6).join('-');

const unitNum = (id) => parseInt(id.replace(/^.*u/, ''), 10);

// 1) costruisci la lista piatta (ordine globale) e i meta delle unità
const flat = [];
const unitaMeta = [];
for (const unit of data.unita) {
  const uKey = 'u' + unitNum(unit.id);
  unit.argomenti.forEach((arg, i) => {
    const nn = String(i + 1).padStart(2, '0');
    const slug = `${nn}-${slugify(arg.titolo)}`;
    flat.push({ arg, unit, uKey, n: i + 1, slug, url: `risorse/${materia}/${uKey}/${slug}/` });
  });
  unitaMeta.push({ key: uKey, num: unitNum(unit.id), titolo: unit.titolo, cfu: unit.cfu, ready: true, topicIds: unit.argomenti.map((a) => a.id) });
}

// 2) interlink bidirezionali: correlati = correlati espliciti + reverse dei prerequisiti
const reverse = {};
for (const t of flat) for (const p of (t.arg.prereq || [])) (reverse[p] ||= []).push(t.arg.id);

// 3) costruisci i topics con prev/next globali
const topics = flat.map((t, idx) => {
  const correlati = [...new Set([...(t.arg.correlati || []), ...(reverse[t.arg.id] || [])])];
  return {
    id: t.arg.id, titolo: t.arg.titolo, obiettivo: t.arg.obiettivo, difficolta: t.arg.difficolta,
    materia: data.materia, materiaKey: materia,
    unita: unitNum(t.unit.id), unitaTitolo: t.unit.titolo,
    prereq: t.arg.prereq || [], correlati,
    slug: t.slug, url: t.url,
    prev: idx > 0 ? flat[idx - 1].arg.id : null,
    next: idx < flat.length - 1 ? flat[idx + 1].arg.id : null,
    diagramma: t.arg.diagramma || null, video: !!t.arg.video,
  };
});

// 4) skeleton opzionali
if (writeSkeletons) {
  for (const t of flat) {
    if (t.n === 1) continue;
    const dir = path.join(root, 'src', 'pages', 'risorse', materia, t.uKey);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${t.slug}.mdx`);
    if (fs.existsSync(file)) continue;
    fs.writeFileSync(file,
      `import RisorsaLayout from '@/layouts/RisorsaLayout.astro';\n\n` +
      `<RisorsaLayout id="${t.arg.id}">\n\n🚧 **Contenuto in arrivo.**\n\n</RisorsaLayout>\n`, 'utf8');
  }
}

const dataDir = path.join(root, 'src', 'data');
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, `${materia}-index.json`), JSON.stringify({ materia: data.materia, unita: unitaMeta, topics }, null, 2), 'utf8');
console.log(`OK: indice con ${topics.length} schede (tutte le unità). Skeleton: ${writeSkeletons ? 'sì' : 'no'}.`);
