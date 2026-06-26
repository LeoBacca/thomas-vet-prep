// Config del progetto Firebase per la sincronizzazione cloud dei progressi.
//
// ⚠️ LEO: incolla qui i valori del TUO progetto Firebase.
//   Firebase Console → Impostazioni progetto (⚙️) → "Le tue app" → app Web → SDK setup → Config.
//   Le chiavi del client web sono PUBBLICHE per design (la sicurezza sta nelle regole Firestore),
//   quindi è normale e sicuro committarle nel repo.
//
// Finché i valori restano i placeholder "INCOLLA_...", il sync resta DISATTIVATO e il sito
// funziona esattamente come prima (tutto in localStorage, niente cloud).
export const firebaseConfig = {
  apiKey: 'INCOLLA_API_KEY',
  authDomain: 'INCOLLA_PROGETTO.firebaseapp.com',
  projectId: 'INCOLLA_PROJECT_ID',
  storageBucket: 'INCOLLA_PROGETTO.appspot.com',
  messagingSenderId: 'INCOLLA_SENDER_ID',
  appId: 'INCOLLA_APP_ID',
};

// Vero solo quando le chiavi sono state davvero sostituite.
export const cloudConfigured = !String(firebaseConfig.apiKey).startsWith('INCOLLA');
