# Prep Veterinaria — sito di studio per Thomas

Sito statico (Astro) per preparare il **semestre filtro di Veterinaria** (Fisica, Biologia, Chimica).
Tre sezioni: **Tutorial** (metodo di studio), **Risorse** (wiki di concetti) e **Studio** (flashcard + SRS + gamification).

> 🔗 **Sito online (per Thomas):** https://LeoBacca.github.io/thomas-vet-prep/

---

## 🟢 Per Thomas (l'utente)

1. Apri il link qui sopra.
2. Sul telefono: **«Aggiungi alla schermata Home»** → lo usi come un'app.
3. Studia. **I progressi si salvano da soli** (niente "salva"/"esporta").
4. Unica regola: usa **sempre lo stesso dispositivo/browser** e non cancellare i dati del browser, o riparti da zero. _(I dati vivono nel browser, non sul server.)_

---

## 🔧 Per chi mantiene il sito (Leo)

### Le 3 regole d'oro — perché i progressi di Thomas NON si perdono mai

I progressi (flashcard SRS + spunte "letto") stanno nel **`localStorage` del browser di Thomas**, non nei
file del sito. La build è solo "l'app": puoi ripubblicarla mille volte, i dati restano nel suo browser.
Perché continui a funzionare, **non violare mai** questo:

1. **Stesso URL.** Non rinominare il repo `thomas-vet-prep` e non cambiare `base` in `astro.config.mjs`.
   Cambiare l'indirizzo = i link si rompono (e anche il punto d'accesso che Thomas ha salvato).
2. **Stesse chiavi `localStorage`:** `prep:studio` (Studio/SRS) e `prep:progress` (spunte Risorse).
   Sono in [`src/scripts/studio/store.js`](src/scripts/studio/store.js) e
   [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro). Non rinominarle.
3. **Se cambi la forma dei dati**, alza `SCHEMA_VERSION` ed estendi `migrate()` in `store.js`
   (già fa merge non distruttivo): i salvataggi vecchi vengono *aggiornati*, non cancellati.

Rispettando queste 3 regole, puoi aggiungere materie, pagine, feature e fix all'infinito:
**lo storico di Thomas resta invariato.**

### Pubblicare un aggiornamento

Ogni `git push` su `main` ribuilda e ripubblica automaticamente (GitHub Actions →
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

```bash
git add -A
git commit -m "descrizione modifica"
git push            # ~1-2 min e il sito online è aggiornato; i progressi di Thomas restano
```

## Avvio in locale

```bash
npm install
npm run dev      # apri l'indirizzo mostrato (di solito http://localhost:4321/thomas-vet-prep/)
npm run build    # genera il sito statico in dist/
npm run preview  # anteprima del sito buildato
```

## Come è organizzato

```
content/topics/<materia>.json   # FONTE DI VERITÀ: argomenti atomici per unità (id, obiettivo, prereq...)
scripts/generate-unit.mjs       # genera indice + pagine skeleton da quel JSON
src/data/<materia>-index.json   # indice generato (NON modificare a mano)
src/pages/risorse/...           # le pagine wiki (1 file MDX per concetto)
src/pages/studio/...            # sezione Studio (flashcard/SRS)
src/scripts/studio/             # logica SRS (fsrs.js) + salvataggio (store.js)
src/layouts/  src/components/    # impaginazione + Diagram (Mermaid handDrawn), YouTube, RelatedLinks
```

### Aggiungere/rigenerare contenuti

1. Modifica `content/topics/fisica.json` (argomenti, prerequisiti, `correlati`).
2. `npm run gen:fisica` per rigenerare indice e skeleton (la 1ª scheda di ogni unità non viene sovrascritta).
3. Scrivi il contenuto vero nei file `.mdx` (testo + `<Diagram>` + `<YouTube>`).

## Deploy su GitHub Pages (prima volta)

1. `gh auth login` (una volta sola).
2. Crea il repo **pubblico** `thomas-vet-prep` e fai push (vedi sotto).
3. Su GitHub: **Settings → Pages → Source: GitHub Actions**.
4. Il workflow builda e pubblica a ogni push su `main`.

```bash
gh repo create thomas-vet-prep --public --source=. --remote=origin --push
```

## Stato attuale

- ✅ Scaffold completo + 3 sezioni (Tutorial / Risorse / Studio)
- ✅ Fisica decomposta in 73 argomenti (7 unità); Biologia e Chimica indicizzate
- ✅ Salvataggio automatico progressi (localStorage) con migrazione non distruttiva
- ⬜ Completare le schede Risorse e le flashcard materia per materia
