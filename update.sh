#!/usr/bin/env bash
# Mise à jour du site vers une version publiée du modèle (docs/mise-a-jour.md).
#
#   ./update.sh            dernière version publiée
#   ./update.sh v1.2.0     version précise (aussi pour revenir en arrière)
#
# Options : --docker / --node (mode, détecté sinon), --no-pull (Docker : image
# déjà présente localement, tests), --archive <fichier.tar.gz> (Node : archive
# locale au lieu du téléchargement, tests).
#
# Le contenu de l'association (src/content/, data/, .env) n'est jamais touché.
# Principe : la nouvelle version est construite À CÔTÉ pendant que l'ancienne
# tourne ; en cas d'échec, rien ne change. Puis bascule (quelques secondes),
# vérification que le site répond, et retour à la version précédente sinon.
set -euo pipefail
cd "$(dirname "$0")"

REPO="${UPDATE_REPO:-Numerik-Co/numerik2026}"
IMAGE="ghcr.io/${REPO,,}"
PORT="${UPDATE_PORT:-4321}"

mode=""; version=""; pull=1; archive=""
while [ $# -gt 0 ]; do
  case "$1" in
    --docker) mode=docker ;;
    --node) mode=node ;;
    --no-pull) pull=0 ;;
    --archive) archive="$2"; shift ;;
    v[0-9]*) version="$1" ;;
    *) echo "Option inconnue : $1 (voir l'en-tête de ce fichier)"; exit 2 ;;
  esac
  shift
done

etape() { echo "→ $*"; }
echec() { echo "✗ $*" >&2; exit 1; }

# ── Prérequis communs ────────────────────────────────────────────────────────
grep -qE '^SITE_URL=https?://' .env 2>/dev/null \
  || echec "SITE_URL manquant dans .env (ex. SITE_URL=https://www.mon-asso.fr)."

if [ -z "$version" ]; then
  etape "Recherche de la dernière version publiée ($REPO)"
  version=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
    | sed -nE 's/.*"tag_name": *"([^"]+)".*/\1/p' | head -1) || true
  [ -n "$version" ] || echec "impossible de connaître la dernière version (réseau ? aucune version publiée ?)."
fi
echo "  version visée : $version"

if [ -z "$mode" ]; then
  if [ -f docker-compose.yml ] && command -v docker >/dev/null 2>&1; then mode=docker; else mode=node; fi
fi

# ── Node seul : délégué à scripts/update.mjs ────────────────────────────────
if [ "$mode" = node ]; then
  exec node scripts/update.mjs "$version" ${archive:+--archive "$archive"}
fi

# ── Docker ───────────────────────────────────────────────────────────────────
# Certains VPS montent /root en lecture seule (cf. deploy.sh).
export DOCKER_CONFIG="${DOCKER_CONFIG:-$(pwd)/.dockercfg}"
mkdir -p "$DOCKER_CONFIG" .releases

cible="${version#v}"
actuelle=$(sed -nE 's/^NUMERIK_VERSION=(.*)$/\1/p' .env | tail -1)
actuelle="${actuelle:-latest}"
if [ "$cible" = "$actuelle" ] && [ "$(docker compose ps -q web 2>/dev/null)" != "" ]; then
  echo "✓ Déjà en version $cible."
  exit 0
fi

if [ "$pull" = 1 ]; then
  etape "Téléchargement de l'image $IMAGE:$cible"
  docker pull "$IMAGE:$cible" || echec "image introuvable : $IMAGE:$cible (version publiée ? paquet public ?)."
fi

# 1. Construction à côté, avec le contenu et le .env de l'association, dans
#    le volume .releases — le site en ligne n'est pas touché.
release=$(date -u +%Y%m%dT%H%M%SZ)
etape "Construction de la version $cible à côté du site en ligne (.releases/$release)"
# `compose run` reprend la configuration du service (.env, volumes), avec
# l'image visée ; pas de ports publiés, le conteneur en ligne continue.
if ! NUMERIK_VERSION="$cible" docker compose run --rm --no-deps --no-build \
     -e "ASTRO_OUT_DIR=.releases/$release" web npm run -s build; then
  rm -rf ".releases/$release"
  echec "la version $cible ne se construit pas avec votre contenu : rien n'a été changé, le site reste en version $actuelle."
fi

# 2. Bascule : nouveau conteneur, qui trouve la version déjà construite.
choisir_version() {
  if grep -q '^NUMERIK_VERSION=' .env; then
    sed -i.bak -E "s/^NUMERIK_VERSION=.*/NUMERIK_VERSION=$1/" .env && rm -f .env.bak
  else
    printf '\n# Version du modèle (écrite par ./update.sh)\nNUMERIK_VERSION=%s\n' "$1" >> .env
  fi
}
repond() {
  # Jusqu'à 3 minutes : 5 s sans version prête (simple bascule), plus si reconstruction.
  for _ in $(seq 1 36); do
    curl -fsS -o /dev/null "http://127.0.0.1:$PORT/" 2>/dev/null && return 0
    sleep 5
  done
  return 1
}

etape "Bascule sur la version $cible"
choisir_version "$cible"
docker compose up -d --no-build web

etape "Vérification que le site répond"
if repond; then
  docker compose logs --tail 20 web 2>&1 | grep "\[démarrage\]" || true
  echo "✓ Site en version $cible."
  exit 0
fi

# 3. Échec : retour à la version précédente.
echo "✗ La version $cible ne répond pas. Journal :" >&2
docker compose logs --tail 40 web >&2 || true
etape "Retour à la version $actuelle"
choisir_version "$actuelle"
docker compose up -d --no-build web
if repond; then
  echec "mise à jour annulée : le site est revenu en version $actuelle."
fi
echec "le site ne répond plus, même en version $actuelle : voir « docker compose logs web »."
