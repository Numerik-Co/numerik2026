// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

import mdx from '@astrojs/mdx';

import vue from '@astrojs/vue';

import sitePages from './src/integrations/site-pages.ts';

// https://astro.build/config
export default defineConfig({
  // Dossier de sortie : `dist` ; la publication depuis l'espace bénévoles
  // construit chaque nouvelle version dans `.releases/<horodatage>` (cf.
  // src/lib/site-build.ts) puis fait pointer `dist` dessus.
  outDir: process.env.ASTRO_OUT_DIR || './dist',

  // Nom de domaine public (URLs absolues du flux RSS, sitemap…).
  site: 'https://www.clubmicrosaintpierre.fr',

  // Derrière le reverse proxy HTTPS (cf. docker-compose.yml) : fait confiance à
  // X-Forwarded-Host/Proto pour ce domaine seulement. Sans cela, Astro voit
  // http://… alors que le navigateur envoie Origin: https://…, et refuse les
  // formulaires POST (connexion, espace bénévoles) avec un 403.
  security: {
    allowedDomains: [{ hostname: 'www.clubmicrosaintpierre.fr', protocol: 'https' }]
  },

  // Variables d'environnement (.env) : toutes en `access: 'secret'`, donc lues
  // AU DÉMARRAGE du serveur Node et jamais recopiées dans dist/ (une variable
  // serveur « public » serait figée au build). Changer le .env ne demande
  // qu'un redémarrage. Toutes facultatives : une fonction non configurée se
  // désactive (formulaires Grist, bulletin PDF, espace bénévoles).
  // Usage : `import { GRIST_API_KEY } from 'astro:env/server'`. Doc : docs/api.md.
  env: {
    schema: {
      // Grist — adhésion, inscriptions, planning, présence
      GRIST_BASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      GRIST_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      GRIST_DOC_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      GRIST_TABLE_MEMBRES: envField.string({ context: 'server', access: 'secret', default: 'Membres' }),
      GRIST_TABLE_ADHESIONS: envField.string({ context: 'server', access: 'secret', default: 'Adhesions' }),
      GRIST_TABLE_INSCRIPTIONS: envField.string({ context: 'server', access: 'secret', default: 'Inscription' }),
      GRIST_TABLE_COTISATIONS: envField.string({ context: 'server', access: 'secret', default: 'Cotisation' }),
      GRIST_TABLE_ACTIVITES: envField.string({ context: 'server', access: 'secret', default: 'Activite' }),
      GRIST_TABLE_SAISONS: envField.string({ context: 'server', access: 'secret', default: 'Saisons' }),
      GRIST_TABLE_PRESENCE: envField.string({ context: 'server', access: 'secret', default: 'Presence' }),
      // Grist — second document : RDV Conseiller Numérique
      GRIST_DOC_ID_RDV: envField.string({ context: 'server', access: 'secret', optional: true }),
      GRIST_TABLE_BENEFICIAIRES: envField.string({ context: 'server', access: 'secret', default: 'Beneficiaires' }),
      GRIST_TABLE_RDV: envField.string({ context: 'server', access: 'secret', default: 'RDV' }),
      GRIST_TABLE_DEMARCHES: envField.string({ context: 'server', access: 'secret', default: 'Demarches' }),
      // Bulletin d'adhésion PDF (docs/bulletin-pdf.md)
      GOTENBERG_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      GOTENBERG_USERNAME: envField.string({ context: 'server', access: 'secret', optional: true }),
      GOTENBERG_PASSWORD: envField.string({ context: 'server', access: 'secret', optional: true }),
      BULLETIN_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Espace bénévoles (docs/auth.md)
      AUTH_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Publication depuis l'espace bénévoles (docs/publication.md)
      // Racine du projet (sources + node_modules) à reconstruire ; défaut : dossier de lancement.
      SITE_ROOT: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Commande lancée après chaque reconstruction réussie (ex. rsync de dist/client vers un hébergement statique).
      PUBLISH_HOOK: envField.string({ context: 'server', access: 'secret', optional: true }),
      // `false` : ne pas redémarrer le serveur après publication (déconseillé, cf. doc).
      PUBLISH_RESTART: envField.boolean({ context: 'server', access: 'secret', default: true }),
    },
  },

  vite: {
    plugins: [tailwindcss()],
    // `yaml` est aussi chargé dans le navigateur (dépôt de .md, module « Pages ») :
    // pré-optimisé au démarrage du dev, sinon Vite le découvre en cours de route
    // et l'îlot d'administration échoue (504 « Outdated Optimize Dep »).
    optimizeDeps: { include: ['yaml'] }
  },

  adapter: node({
    mode: 'standalone'
  }),

  // sitePages : retire du build le HTML des pages du site désactivées (404 réel).
  integrations: [mdx(), vue(), sitePages()]
});