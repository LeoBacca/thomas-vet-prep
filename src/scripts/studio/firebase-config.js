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
  apiKey: 'AIzaSyC3TkEOfLqn2EZasbeSLw8EZnRmhkgSdX8',
  authDomain: 'thomas-vet-prep.firebaseapp.com',
  projectId: 'thomas-vet-prep',
  storageBucket: 'thomas-vet-prep.firebasestorage.app',
  messagingSenderId: '298476473334',
  appId: '1:298476473334:web:f5a6d2d0772d67769e95d7',
};

// Vero solo quando le chiavi sono state davvero sostituite.
export const cloudConfigured = !String(firebaseConfig.apiKey).startsWith('INCOLLA');
