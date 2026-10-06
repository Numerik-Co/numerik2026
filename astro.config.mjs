// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

import mdx from '@astrojs/mdx';

import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  // Nom de domaine public (URLs absolues du flux RSS, sitemap…).
  site: 'https://www.clubmicrosaintpierre.fr',

  // Derrière le reverse proxy HTTPS (cf. docker-compose.yml) : fait confiance à
  // X-Forwarded-Host/Proto pour ce domaine seulement. Sans cela, Astro voit
  // http://… alors que le navigateur envoie Origin: https://…, et refuse les
  // formulaires POST (connexion, espace bénévoles) avec un 403.
  security: {
    allowedDomains: [{ hostname: 'www.clubmicrosaintpierre.fr', protocol: 'https' }]
  },

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: node({
    mode: 'standalone'
  }),

  integrations: [mdx(), vue()]
});