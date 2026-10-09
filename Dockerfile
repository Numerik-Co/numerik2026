# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# Étape 1 — dépendances (dont les outils de build) + sources
# ─────────────────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app

# Couche cachée tant que package*.json ne change pas
COPY package.json package-lock.json ./
RUN npm ci

# Sources. Pas de `npm run build` ici : l'image est la même pour toutes les
# associations, le site est construit AU DÉMARRAGE par scripts/start.mjs avec
# le contenu (volume src/content) et le SITE_URL (.env) du déploiement, puis
# seulement quand l'un d'eux ou la version change (cf. docs/mise-a-jour.md).
COPY . .

# ─────────────────────────────────────────────────────────────
# Étape 2 — runtime : n'embarque que ce qu'il faut pour servir
# ─────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
# Indispensable en conteneur : écouter sur toutes les interfaces
ENV HOST=0.0.0.0
ENV PORT=4321

# Tout le projet : les sources ET les outils de build (node_modules complet). Indispensable pour publier
# depuis l'espace bénévoles : le conteneur reconstruit lui-même le site après
# l'ajout d'une actualité (cf. docs/publication.md). src/content/ est monté
# depuis le VPS (docker-compose.yml) pour que ce contenu survive aux
# redéploiements.
COPY --from=build /app ./

EXPOSE 4321

# Construit le site si besoin, puis lance le serveur @astrojs/node (standalone :
# il sert AUSSI les fichiers statiques de dist/client).
CMD ["node", "scripts/start.mjs"]
