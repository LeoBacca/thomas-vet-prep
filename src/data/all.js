// Indice unificato di tutte le materie (per layout/componenti condivisi).
// Le pagine indice per-materia importano invece il proprio <materia>-index.json.
import fisica from './fisica-index.json';
import biologia from './biologia-index.json';
import chimica from './chimica-index.json';

export const topics = [...fisica.topics, ...biologia.topics, ...chimica.topics];
export const subjects = { fisica, biologia, chimica };
