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

# Le serveur standalone + ses dépendances d'exécution.
# (On recopie node_modules tel quel : image un peu plus lourde,
#  mais parité garantie avec le build — pas de surprise sharp/vue.)
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 4321

# @astrojs/node standalone : ce serveur sert AUSSI les fichiers statiques de dist/client
CMD ["node", "./dist/server/entry.mjs"]
