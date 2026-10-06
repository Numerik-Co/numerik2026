#!/usr/bin/env bash
# Comptes de l'espace bénévoles, sur le VPS (à côté de deploy.sh).
# Lance le CLI DANS le conteneur : le dist/ du VPS n'est pas celui de l'image.
#
# Usage (depuis le dossier du projet, sur le serveur) :
#   ./auth-user.sh list
#   ./auth-user.sh add <login> "<Prénom Nom>" [groupe…]   (défaut : admin)
#   ./auth-user.sh reset <login>
set -euo pipefail
cd "$(dirname "$0")"

# Même contournement que deploy.sh : /root peut être en lecture seule sur le
# VPS, le CLI Docker a besoin d'un dossier de config inscriptible.
export DOCKER_CONFIG="$(pwd)/.dockercfg"
mkdir -p "$DOCKER_CONFIG"

exec docker compose exec web node dist/cli/auth-user.mjs "$@"
