// Frasi delle mascotte. Tono: pirata/One Piece, simpatico, motivante (stile Duolingo).
// Usate dalla dashboard (Buggy) e dalla sessione (cani sull'errore).

export const buggyMotivazionali = [
  "Ciurma! Oggi si salpa verso il camice ⚓",
  "Un'isola alla volta, mozzo. Il Grand Line dello studio è lungo!",
  "Il vero tesoro? La costanza. E tu ce l'hai 💎",
  "Yohohoho! Pronto a fare a pezzi qualche flashcard?",
  "Niente poteri da fenomeno: serve solo passare ogni giorno di qui 🗺️",
  "Capitano Thomas, la nave è pronta. Studiamo 15 minuti e via!",
  "Chi molla non diventa Re dei Veterinari. E tu non molli 🏴‍☠️",
  "Anche oggi: poco, ma TUTTI i giorni. È così che si vince.",
  "Le card dovute ti aspettano come un forziere da aprire 🔓",
  "Forza! La memoria si allena come una ciurma: ogni giorno.",
];

export const caniIncoraggiamento = [
  "Riprova, ce la fai! 🐾",
  "Sbagliare è solo allenamento 🦴",
  "Dai capitano, non mollare!",
  "Woof! La rivediamo tra poco e la spacchiamo 💪",
  "Tranquillo, succede ai migliori pirati 🏴‍☠️",
  "Un errore oggi = una card imparata bene domani.",
  "Ti seguo io, andiamo avanti! 🐶",
  "Quasi! Respira e riprova.",
  "Bravo che ci provi: è così che si impara 🌊",
  "Niente paura, la ciurma è con te!",
];

// Pesca un elemento a caso da un array.
export function frasaRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// I 3 cani di Thomas (file generati in /mascotte). slug = nome file senza estensione.
export const cani = [
  { slug: "dog-border", nome: "Border collie" },
  { slug: "dog-chi", nome: "Chihuahua" },
  { slug: "dog-koni", nome: "Koni" },
];

// Sceglie un cane a caso (per il fumetto di incoraggiamento sull'errore).
export function caneRandom() {
  return cani[Math.floor(Math.random() * cani.length)];
}
