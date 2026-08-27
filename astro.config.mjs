// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  // TODO: remplacer par le vrai nom de domaine une fois le site en ligne (utilisé pour générer les URLs absolues du flux RSS).
  site: 'https://numerikandco.org',

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: node({
    mode: 'standalone'
  })
});