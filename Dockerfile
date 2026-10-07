# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# Étape 1 — build : installe les deps et génère dist/
# ─────────────────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app

# Couche cachée tant que package*.json ne change pas
COPY package.json package-lock.json ./
RUN npm ci

# Sources + build Astro (adaptateur node, mode standalone)
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Étape 2 — runtime : n'embarque que ce qu'il faut pour servir
# ─────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
# Indispensable en conteneur : écouter sur toutes les interfaces
ENV HOST=0.0.0.0
ENV PORT=4321

# Tout le projet construit : le serveur (dist/) MAIS AUSSI les sources et
# les outils de build (node_modules complet). Indispensable pour publier
# depuis l'espace bénévoles : le conteneur reconstruit lui-même le site après
# l'ajout d'une actualité (cf. docs/publication.md). src/content/ est monté
# depuis le VPS (docker-compose.yml) pour que ce contenu survive aux
# redéploiements.
COPY --from=build /app ./

EXPOSE 4321

# @astrojs/node standalone : ce serveur sert AUSSI les fichiers statiques de dist/client
CMD ["node", "./dist/server/entry.mjs"]
