# Déploiement Docker (VPS OVH)

## 1. Ce qui reste modifiable — et ce qui demande une reconstruction

C'est **la** question à se poser avant de choisir Docker. Le site est généré par
Astro : la majeure partie est du **HTML statique produit au `build`**. Docker n'y
change rien — il empaquette juste ce build.

| Élément | Où il vit | Ajout / modif = rebuild de l'image ? |
| :--- | :--- | :--- |
| **Adhésions, inscriptions, contacts** (formulaire) | **Grist** (via les routes `/api/adhesion/*`) | ❌ **Non.** C'est live, indépendant de l'image. |
| Autres données saisies via un futur formulaire | Grist / service externe | ❌ Non |
| **Actualités** (`src/contents/news/…`) | fichiers Markdown compilés au build | ✅ **Oui** |
| **Activités** (`src/contents/activites/…`) | idem | ✅ Oui |
| **Pages de contenu** (`src/contents/pages/…`) | idem | ✅ Oui |
| **Bannière d'annonces** (`src/contents/annonces.md`) | idem | ✅ Oui |
| **Partenaires, catégories, infos asso** (`src/lib/*.ts`) | données en dur dans le code | ✅ Oui |
| Composants, styles, structure | code | ✅ Oui |

> **En clair :** le cœur « vivant » du projet (les adhésions) tourne contre Grist
> et n'est jamais concerné par un rebuild. En revanche, **publier une actualité
> ou changer une page = reconstruire l'image** (30 s – 2 min) puis redémarrer le
> conteneur. C'est le fonctionnement normal d'un site statique ; ce n'est pas une
> limite de Docker.

Si un jour vous voulez éditer les actualités « en live » sans rebuild, il faudra
les faire vivre elles aussi dans Grist (ou un CMS) et les rendre via des routes
SSR — c'est un autre chantier. Pour l'instant : **workflow de rebuild**, décrit
plus bas, très simple.

---

## 2. Les fichiers ajoutés

| Fichier | Rôle |
| :--- | :--- |
| `Dockerfile` | build multi-étapes : `npm ci` + `npm run build`, puis une image runtime qui ne garde que `dist/` + `node_modules` + le serveur |
| `.dockerignore` | exclut `node_modules`, `dist`, `.astro`, **`.env`**, `.git`… du contexte de build |
| `docker-compose.yml` | un service `web`, `restart: unless-stopped`, port publié **uniquement sur `127.0.0.1:4321`**, secrets via `env_file: .env` |
| `deploy.sh` | `git pull` + `docker compose up -d --build` + ménage |

### Pourquoi ces choix

- **Multi-étapes** : l'image finale ne contient pas les sources ni le cache de
  build, seulement de quoi servir.
- **`node:22-slim`** (Debian) plutôt qu'`alpine` : `sharp` (optimisation d'images
  au build) est plus fiable sur Debian.
- **`mode: 'standalone'`** (déjà dans `astro.config.mjs`) → `dist/server/entry.mjs`
  est un serveur HTTP complet qui sert **à la fois** les pages statiques et les
  routes API. Rien d'autre à lancer.
- **`HOST=0.0.0.0`** dans le `Dockerfile` : sans ça, le serveur n'écoute que sur
  `localhost` **dans** le conteneur et n'est pas joignable.
- **Port sur `127.0.0.1`** : le conteneur n'est pas exposé directement à
  Internet. Un reverse proxy (nginx/Traefik) fait le domaine + HTTPS (§5).
- **Aucun volume** : l'application n'écrit rien sur le disque (tout va dans
  Grist), donc pas de donnée à persister entre deux conteneurs.

### Le `.env` : jamais dans l'image

Les clés Grist (`GRIST_API_KEY`…) **ne doivent pas** être copiées dans l'image
(elle pourrait être partagée, poussée sur un registre…). Elles sont :

- exclues du contexte de build par `.dockerignore` ;
- injectées **au démarrage** du conteneur via `env_file: .env` (compose) ;
- stockées dans un fichier `.env` **présent sur le VPS uniquement**, hors dépôt
  Git (déjà dans `.gitignore`).

---

## 3. Tester en local

```bash
# à la racine du projet, avec un .env rempli
docker compose up --build

# → http://localhost:4321
# Ctrl-C pour arrêter ; `docker compose down` pour nettoyer
```

Vérifs :

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/            # 200
curl -s http://localhost:4321/adherer/formulaire | grep -o 'renderer-url="[^"]*"'
# → renderer-url="/node_modules/@astrojs/vue/dist/client.js"  (l'îlot est bien monté)
curl -s http://localhost:4321/api/adhesion/cotisations                    # JSON de Grist
```

---

## 4. Première installation sur le VPS OVH

```bash
# 1. Récupérer le projet
cd /opt        # ou ~/apps, au choix
git clone <url-du-dépôt> numerik2026
cd numerik2026

# 2. Créer le .env (secrets Grist) — NE PAS commiter
cp .env.example .env
nano .env       # renseigner GRIST_BASE_URL / GRIST_DOC_ID / GRIST_API_KEY

# 3. Construire et démarrer
docker compose up -d --build

# 4. Vérifier
docker compose ps
docker compose logs -f web       # Ctrl-C pour quitter les logs
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4321/
```

Le conteneur redémarre tout seul au reboot du VPS (`restart: unless-stopped`).

---

## 5. Reverse proxy + HTTPS (nginx)

Le conteneur écoute sur `127.0.0.1:4321`. On met nginx devant pour le domaine et
le certificat.

`/etc/nginx/sites-available/numerikandco.conf` :

```nginx
server {
    listen 80;
    server_name numerikandco.org www.numerikandco.org;

    location / {
        proxy_pass http://127.0.0.1:4321;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/numerikandco.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d numerikandco.org -d www.numerikandco.org   # HTTPS auto
```

> Pensez à mettre le vrai domaine dans `astro.config.mjs` (`site:`) — il sert aux
> URL absolues du flux RSS.

---

## 6. Workflow « ajouter du contenu » (actualité, activité, page…)

### Depuis votre poste (recommandé)

```bash
# 1. localement : créer le dossier de l'article + index.md + image
#    (voir docs/actualites.md)
# 2. commit + push
git add src/contents/news/2026-09-xx-mon-article
git commit -m "Actu : mon article"
git push
```

```bash
# 3. sur le VPS
cd /opt/numerik2026
./deploy.sh          # git pull + rebuild image + redémarrage (~1 min de coupure)
```

### En éditant directement sur le VPS

```bash
cd /opt/numerik2026
nano src/contents/news/...           # ou scp de vos fichiers
git add -A && git commit -m "..."    # gardez l'historique propre
docker compose up -d --build         # reconstruit et redémarre
```

Dans les deux cas, **le rebuild est obligatoire** : le Markdown est transformé en
HTML pendant `npm run build`, pas au moment où on visite la page.

### Ce qui NE demande PAS de rebuild

- toute **adhésion / inscription / contact** faite via le formulaire → écrit dans
  Grist en temps réel ;
- toute modif faite **dans Grist** (tarifs de cotisation, activités et leurs
  places, saison active…) → les routes `/api/adhesion/*` la lisent à chaque
  requête. Le `<select>` du formulaire se met à jour sans toucher au site.

---

## 7. Commandes utiles

```bash
docker compose logs -f web            # suivre les logs
docker compose restart web            # redémarrer sans rebuild
docker compose up -d --build          # rebuild + redémarrage
docker compose down                   # arrêter et supprimer le conteneur
docker compose ps                     # état
docker image prune -f                 # supprimer les images orphelines (après rebuilds)
docker stats numerik2026              # CPU / RAM du conteneur
```

### Rollback rapide

```bash
git log --oneline -5
git checkout <commit-precedent>
docker compose up -d --build
# puis revenir : git checkout master && ./deploy.sh
```

---

## 8. Points d'attention

| Sujet | À savoir |
| :--- | :--- |
| **RAM du build** | `astro build` + `sharp` peuvent monter à ~1–1,5 Go. VPS OVH « VPS Value » (2 Go) : OK. En dessous, ajouter du swap ou builder ailleurs. |
| **Coupure au déploiement** | `up -d --build` reconstruit puis remplace le conteneur → quelques secondes d'indisponibilité. Acceptable pour ce site. Pour du zéro-coupure : deux conteneurs + bascule nginx (surdimensionné ici). |
| **`.env` absent** | le conteneur démarre mais les routes `/api/adhesion/*` renvoient `500 « Configuration Grist manquante »`. Le reste du site fonctionne. |
| **Secrets** | ne jamais faire `COPY .env` ni `ENV GRIST_API_KEY=...` dans le `Dockerfile`. Toujours `env_file` / `-e` au runtime. |
| **Fuseau horaire** | l'image est en UTC. Les dates « saison » Grist sont calculées côté Grist, donc OK. Si besoin : `ENV TZ=Europe/Paris` + paquet `tzdata`. |
| **Mises à jour Node** | image basée sur `node:22-slim`. Rebuild régulier pour les correctifs de sécurité de base. |
| **Registre d'images** | non nécessaire ici (on build sur le VPS). Si un jour CI → registre → `docker compose pull` : possible, mais plus lourd à mettre en place. |

---

## 9. Résumé décision

- **Docker = bon choix** : déploiement reproductible, `restart` automatique,
  isolation, rollback par commit.
- **Le formulaire d'adhésion continue de fonctionner en autonomie** (Grist),
  quel que soit l'état de l'image.
- **Publier du contenu éditorial = 1 commit + `./deploy.sh`.** Si ce rythme
  devient gênant, la vraie solution n'est pas Docker mais faire passer ces
  contenus dans Grist eux aussi.
