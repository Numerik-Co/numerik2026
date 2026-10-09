#!/usr/bin/env bash
# Déploiement / mise à jour sur le VPS.
# Usage : ./deploy.sh   (depuis le dossier du projet, sur le serveur)
set -euo pipefail
cd "$(dirname "$0")"

# Certains VPS montent /root en lecture seule : le CLI Docker ne peut pas créer
# ~/.docker. On lui donne un dossier inscriptible dans le projet.
export DOCKER_CONFIG="$(pwd)/.dockercfg"
mkdir -p "$DOCKER_CONFIG"

# Le site est construit au démarrage du conteneur (scripts/start.mjs) : sans
# SITE_URL, un conteneur neuf ne pourrait rien servir. On s'arrête avant.
if ! grep -qE '^SITE_URL=https?://' .env 2>/dev/null; then
  echo "✗ SITE_URL manquant dans .env (ex. SITE_URL=https://www.mon-asso.fr) : déploiement annulé, le site en ligne n'est pas touché."
  exit 1
fi

echo "→ Récupération du code (git pull --ff-only)"
git pull --ff-only

echo "→ Reconstruction de l'image + redémarrage du conteneur"
docker compose up -d --build

echo "→ Nettoyage des images orphelines"
docker image prune -f

echo "→ État :"
docker compose ps

echo "✓ Déployé. Le site se construit au démarrage du conteneur (1 à quelques minutes) :"
echo "  suivre avec : DOCKER_CONFIG=\"$DOCKER_CONFIG\" docker compose logs -f   (ligne « [démarrage] site construit »)"
echo "  puis vérifier : curl -s http://127.0.0.1:4321/ | head -c 200"
