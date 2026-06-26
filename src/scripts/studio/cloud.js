// Wrapper minimale su Firebase (Auth + Firestore). Tutto è caricato in modo PIGRO:
// se il sync non è configurato (firebase-config.js coi placeholder) Firebase non viene mai
// importato e il sito resta 100% offline/localStorage.
import { firebaseConfig, cloudConfigured } from './firebase-config.js';

export { cloudConfigured };

let _ctx = null; // { auth, db, mods } — singleton condiviso fra tutti gli import del modulo

async function ensure() {
  if (!cloudConfigured) return null;
  if (_ctx) return _ctx;
  const [appMod, authMod, fsMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  try { await authMod.setPersistence(auth, authMod.browserLocalPersistence); } catch {}
  const db = fsMod.getFirestore(app);
  _ctx = { auth, db, mods: { ...authMod, ...fsMod } };
  return _ctx;
}

// Login con Google (popup). Ritorna l'utente o lancia un errore.
export async function signInGoogle() {
  const c = await ensure();
  if (!c) return null;
  const provider = new c.mods.GoogleAuthProvider();
  await c.mods.signInWithPopup(c.auth, provider);
  return c.auth.currentUser;
}

export async function signOutCloud() {
  const c = await ensure();
  if (!c) return;
  await c.mods.signOut(c.auth);
}

// Registra un callback sullo stato di login. Ritorna la funzione per disiscriversi.
export async function onUser(cb) {
  const c = await ensure();
  if (!c) { cb(null); return () => {}; }
  return c.mods.onAuthStateChanged(c.auth, cb);
}

// Legge il documento progress/<uid>. Ritorna l'oggetto salvato o null.
export async function pull(uid) {
  const c = await ensure();
  if (!c) return null;
  const ref = c.mods.doc(c.db, 'progress', uid);
  const snap = await c.mods.getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// Sovrascrive progress/<uid> con `data` (che deve già essere lo stato FUSO/aggiornato).
export async function push(uid, data) {
  const c = await ensure();
  if (!c) return;
  const ref = c.mods.doc(c.db, 'progress', uid);
  await c.mods.setDoc(ref, data);
}
