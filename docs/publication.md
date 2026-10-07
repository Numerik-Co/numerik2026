# Publication depuis l'espace bénévoles

Tout le contenu du site vit dans les sources (`src/content/`, collections
Astro) et le site publié est **toujours** le produit d'un `npm run build`
complet. Publier, modifier ou supprimer une actualité depuis la barre d'administration
revient donc à faire, sur le serveur, ce qu'un·e développeur·se ferait à la main :

1. écrire `src/content/news/<AAAA-MM-JJ-slug>/` (`index.md` + `cover.jpg`) — ou,
   pour une modification, remplacer ce dossier par sa nouvelle version après en
   avoir gardé une sauvegarde ; pour une suppression, le mettre de côté
   (`src/content/.tmp-publication/`, même disque que le contenu) ;
2. reconstruire le site dans un dossier neuf, `.releases/<horodatage>/` — le
   site en ligne n'est pas touché pendant ce temps (≈ 10 s à 1 min) ;
3. faire pointer `dist` sur cette nouvelle version (bascule atomique) ;
4. lancer la commande `PUBLISH_HOOK` si elle est définie (voir plus bas) ;
5. redémarrer le serveur sur la nouvelle version (≈ 1 s d'interruption) :
   sous **Docker** ou **PM2**, le process s'arrête et son gestionnaire le relance ;
   sinon (ex. `npm start` dans un terminal, ou service systemd), le serveur
   **se relance lui-même** : un petit processus attend son arrêt puis relance
   la même commande (journal : « relance autonome »).

Si la reconstruction échoue, la modification est défaite (dossier ajouté
retiré, sauvegarde ou dossier supprimé remis en place), `dist` n'est pas modifié, le site reste en ligne tel quel, et le module affiche
l'erreur (journal complet : `<DATA_DIR>/publication/build.log`).

Une seule publication à la fois. En développement (`astro dev`), rien n'est
reconstruit : le contenu écrit est relu à chaud.

## Prérequis

La publication n'est possible que si le serveur Node dispose :

| Besoin | Pourquoi |
| :--- | :--- |
| Les **sources** du site (`src/`, `astro.config.mjs`, `package.json`…) et `node_modules` complet (`npm ci`, dépendances de développement comprises) | Le serveur relance `npm run build` |
| `npm` dans le `PATH` du process | Idem |
| Le dossier du projet **en écriture** | Écriture de `src/content/news/`, `.releases/`, lien `dist` |
| De préférence un **gestionnaire de process** (PM2, systemd, Docker) | Relance propre sur la nouvelle version (étape 5) ; à défaut, relance autonome |

Sinon, le module « Actualités » l'indique et le bouton d'ajout est désactivé
(rien n'est écrit).

> Lancé à la main (`npm start` dans un terminal), le serveur se relance
> lui-même après chaque publication, en arrière-plan : il n'est alors plus
> lié au terminal (Ctrl+C ne l'arrête plus — `pkill -f dist/server/entry.mjs`).
> Un gestionnaire (PM2, systemd `Restart=always`, Docker) reste recommandé en
> production. `PUBLISH_RESTART=false` désactive tout redémarrage (le nouveau
> contenu n'est alors servi qu'au prochain redémarrage manuel).

## Installation « Node seul » (cas de base)

Sur un serveur avec Node 22+, sans Docker ni git :

```bash
# Récupérer le projet (archive des sources) dans /srv/numerik, puis :
cd /srv/numerik
npm ci
cp .env.example .env        # renseigner AUTH_SECRET, Grist… (docs/api.md)
npm run build
```

Puis le faire tourner sous un gestionnaire, par exemple **PM2** :

```bash
pm2 start npm --name numerik -- start     # relancé automatiquement à chaque arrêt
pm2 save && pm2 startup
```

ou **systemd** (`/etc/systemd/system/numerik.service`) :

```ini
[Service]
WorkingDirectory=/srv/numerik
ExecStart=/usr/bin/npm start
Restart=always
User=numerik
Environment=PORT=4321 HOST=127.0.0.1
```

Le site est servi par ce serveur Node (pages statiques comprises), derrière
nginx/Apache pour le domaine et le HTTPS ([api.md](api.md)).

## Avec Docker

Le `Dockerfile` embarque tout le projet construit (sources + `node_modules`
complet + `dist/`), et `docker-compose.yml` :

- monte `./src/content` du serveur dans le conteneur : le contenu publié
  depuis le site est écrit dans la copie du projet sur le serveur et **survit
  aux redéploiements** (la prochaine image le reprend) ;
- relance le conteneur quand le serveur s'arrête (`restart: unless-stopped`).

Les actualités publiées apparaissent dans `git status` sur le serveur :
les commiter pour les avoir aussi dans le dépôt
(`git add src/content/news && git commit -m "Actualités publiées en ligne"`).

## Site statique sur un autre hébergement (`PUBLISH_HOOK`)

Le contenu étant entièrement prérendu, `dist/client/` peut être servi par
n'importe quel serveur web — y compris un hébergement mutualisé PHP. Le
serveur Node sert alors à l'administration (et aux fonctions dynamiques) ;
après chaque publication réussie, `PUBLISH_HOOK` recopie le site :

```dotenv
# Exemples : copie locale vers le dossier d'un vhost, ou envoi vers un hébergement
PUBLISH_HOOK=rsync -a --delete dist/client/ /var/www/site/
PUBLISH_HOOK=rsync -a --delete dist/client/ compte@hebergeur.example:www/
```

La commande s'exécute à la racine du projet (`sh -c`). Si elle échoue, le
site Node est bien publié et le module affiche un avertissement.

## Variables

| Variable | Défaut | Rôle |
| :--- | :--- | :--- |
| `SITE_ROOT` | dossier de lancement | Racine du projet à reconstruire |
| `PUBLISH_HOOK` | — | Commande après chaque publication réussie |
| `PUBLISH_RESTART` | `true` | `false` : ne pas arrêter le serveur après publication |

Lues au démarrage (`astro:env`, cf. [api.md](api.md#variables-denvironnement)).

## Mettre à jour le site (nouvelle version du code)

`npm run build` fonctionne aussi quand `dist` est devenu un lien vers une
version de `.releases/` (il réécrit la version active). `.releases/` ne garde
que les deux dernières versions.

## Fichiers

- `src/lib/site-build.ts` — reconstruction, bascule, redémarrage, état (`readStatus()`, `publish()`, `canPublish()`)
- `src/lib/news-writer.ts` — validation et écriture (`writeNews`), lecture des sources (`readNewsSource`), modification avec sauvegarde (`updateNews`), mise de côté pour suppression (`setAsideNews`)
- `src/pages/api/admin/actualites/index.ts` (liste, ajout), `src/pages/api/admin/actualites/[slug].ts` (lecture, modification, suppression), `src/pages/api/admin/publication.ts` (état)
- `src/components/admin/modules/NewsModule.vue`
- `astro.config.mjs` — `outDir` piloté par `ASTRO_OUT_DIR` (utilisé par la publication)
