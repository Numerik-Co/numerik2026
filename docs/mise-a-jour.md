# Versions et mises à jour

Le dépôt est un **modèle** partagé par plusieurs associations. Tout ce qui
appartient à une association reste chez elle et n'est jamais remplacé par une
mise à jour :

| Appartient à l'association | Appartient au modèle (mis à jour) |
| --- | --- |
| `src/content/` (pages, actualités, `*.yaml`, `images/`) | tout le reste : code, composants, dépendances |
| `data/` (comptes, journal) | |
| `.env` (`SITE_URL`, clés Grist…) | |

## Construction au démarrage

Le site n'est construit ni dans le dépôt ni dans l'image Docker : il l'est
**sur chaque serveur**, avec le contenu et le `.env` de l'association, par
`scripts/start.mjs` (`npm start`, ou `CMD` de l'image).

Au démarrage, le script calcule une **empreinte** (version du modèle dans
`package.json` + `SITE_URL` + contenu de `src/content/` octet par octet,
`scripts/releases.mjs`) et la compare à celle du site en place
(`dist/build-info.json`, écrit par chaque `npm run build` via
`src/integrations/build-info.ts`) :

- **identiques** → le serveur démarre tout de suite ;
- **différentes** → `npm run build` dans `.releases/<horodatage>/`, `dist`
  pointe dessus, puis démarrage. Le journal indique la raison : « aucun site
  construit », « nouvelle version du modèle (1.0.0 → 1.1.0) », « adresse du
  site changée », « contenu modifié ». Pendant la construction (quelques
  secondes à quelques minutes selon le serveur), le site ne répond pas ;
- **construction en échec** → l'ancien site reste servi, l'erreur est dans
  le journal ; sans ancien site, arrêt (code 1).

Les publications depuis l'espace bénévoles construisent elles-mêmes
(`src/lib/site-build.ts`, mêmes fonctions) : au redémarrage qui suit,
l'empreinte correspond, rien n'est reconstruit.

Conséquence pratique : après un changement de `SITE_URL` ou une modification
de `src/content/` à la main, **redémarrer suffit**.

## Publier une version du modèle (mainteneur)

Sur `master`, une fois la CI au vert ([ci.md](ci.md)), arbre de travail propre :

```bash
npm version minor        # 1.0.0 → 1.1.0 : met à jour package.json, commit + tag v1.1.0
git push --follow-tags   # envoie le commit ET le tag
```

(`npm version patch` pour une correction, `major` pour un changement qui
demande une action des associations — à décrire dans le message de commit.)

Le tag déclenche `.github/workflows/release.yml` :

1. vérifie que le tag correspond à `package.json` et à un commit de `master` ;
2. relance la CI complète (`ci.yml`) ;
3. publie l'image Docker `ghcr.io/numerik-co/numerik2026` avec les
   étiquettes `X.Y.Z`, `X.Y` et `latest` ;
4. crée la **Release** GitHub : notes = consignes de mise à jour + liste des
   commits depuis la version précédente ; GitHub y joint l'archive des
   sources (installations Node seul).

Suivi : onglet **Actions** du dépôt ; résultat : onglet **Releases** et
**Packages**.

> **Première publication** : vérifier dans GitHub (organisation → Packages →
> `numerik2026` → Package settings) que le paquet est **public**, sinon les
> serveurs ne pourront pas télécharger l'image sans identifiants.

## Mettre à jour un site (association)

Dans le dossier du site, sur le serveur :

```bash
./update.sh            # dernière version publiée
./update.sh v1.2.0     # version précise — sert aussi à revenir en arrière
```

Le mode est détecté (Docker si `docker-compose.yml` et la commande `docker`
sont présents, sinon Node seul) ; `--docker` / `--node` pour l'imposer.
`SITE_URL` doit être dans le `.env`.

Le principe est le même dans les deux modes :

1. **la nouvelle version est construite à côté**, avec le contenu et le
   `.env` de l'association, pendant que le site en ligne continue sur
   l'ancienne. Si elle ne se construit pas (bug, contenu devenu invalide),
   **rien n'est changé** et le message dit pourquoi ;
2. **bascule** : au redémarrage, `scripts/start.mjs` trouve la version déjà
   construite (même empreinte) — coupure d'environ une seconde ;
3. Docker : **vérification** que le site répond, sinon **retour automatique**
   à la version précédente.

### Docker

- l'image vient de `ghcr.io/numerik-co/numerik2026`, version choisie par
  `NUMERIK_VERSION` dans le `.env` (écrite par `update.sh`) ;
- la construction à côté se fait dans un conteneur temporaire
  (`docker compose run`), dans le volume `./.releases` partagé avec le
  conteneur en ligne ;
- bascule : `docker compose up -d` (nouveau conteneur), puis le site doit
  répondre en 3 minutes, sinon `NUMERIK_VERSION` reprend son ancienne valeur.

Testé par la CI à chaque envoi (tâche « Mise à jour Docker ») : 0.0.1 →
0.0.2 en sondant le site, puis une 0.0.3 cassée qui doit être refusée.

### Node seul (sans Docker ni git)

`./update.sh` lance `scripts/update.mjs` (`node`, `npm` et `tar` suffisent) :

1. télécharge l'archive des sources de la version (Release GitHub) ;
2. met le code actuel de côté (`.update/sauvegarde-<version>.tar.gz`) ;
3. remplace le code du modèle — `src/` (sauf `src/content/`), `scripts/`,
   `docs/`, `.github/` remplacés, fichiers de la racine écrasés ; jamais
   touchés : `src/content/`, `data/`, `.env`, `.releases/`, `dist`, fichiers
   ajoutés à la racine ;
4. `npm ci` puis construction à côté ; en cas d'échec, l'ancien code est
   remis (`npm ci` compris) et le site, jamais arrêté, reste tel quel ;
5. redémarrage par la commande `UPDATE_RESTART` du `.env` (ex.
   `pm2 restart numerik2026`), sinon consigne affichée.

Pendant l'étape 4, `node_modules` change sous le serveur en marche : choisir
un moment calme (aucune publication en cours).

### Passer à ce système (site déjà installé)

- **Docker, installé avec `git clone` + `./deploy.sh`** (cas du premier
  site) : ajouter `SITE_URL` au `.env`, `git pull`, puis `./update.sh` une
  fois une version publiée. `./deploy.sh` reste utilisable par le mainteneur
  (construction locale depuis les sources).
- **Node seul** : ajouter `SITE_URL` au `.env`, remplacer `npm run build &&
  npm start` par `npm start` dans le gestionnaire de process.
