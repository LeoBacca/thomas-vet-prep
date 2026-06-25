import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// DEPLOY (GitHub Pages, project page):
//  Il sito vive su  https://<utente>.github.io/thomas-vet-prep/
//  -> base DEVE restare '/thomas-vet-prep' (è il path del repo).
//  ⚠️ Non cambiare il nome del repo: cambierebbe l'URL e i link si romperebbero.
//  (I progressi di Thomas vivono nel browser e NON dipendono dalla build:
//   sopravvivono a ogni aggiornamento finché l'URL resta questo.)
//  'site' viene riempito con lo username GitHub al primo deploy (serve solo per
//   gli URL assoluti/sitemap; non è critico).
export default defineConfig({
  site: 'https://LeoBacca.github.io',
  base: '/thomas-vet-prep',
  integrations: [mdx()],
});
