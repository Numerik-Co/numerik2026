#!/usr/bin/env bash
# Déploiement / mise à jour sur le VPS.
# Usage : ./deploy.sh   (depuis le dossier du projet, sur le serveur)
set -euo pipefail
cd "$(dirname "$0")"

# Certains VPS montent /root en lecture seule : le CLI Docker ne peut pas créer
# ~/.docker. On lui donne un dossier inscriptible dans le projet.
export DOCKER_CONFIG="$(pwd)/.dockercfg"
mkdir -p "$DOCKER_CONFIG"

echo "→ Récupération du code (git pull --ff-only)"
git pull --ff-only

echo "→ Reconstruction de l'image + redémarrage du conteneur"
docker compose up -d --build

echo "→ Nettoyage des images orphelines"
docker image prune -f

echo "→ État :"
docker compose ps

echo "✓ Déployé. Vérif : curl -s http://127.0.0.1:4321/ | head -c 200"
