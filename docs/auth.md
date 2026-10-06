# Espace bénévoles — authentification à plat

Connexion du bureau et des animateur·rice·s, **sans base de données**, sur le
modèle de Grav CMS : un fichier YAML par compte, des groupes, et un `access:`
dans le frontmatter des pages à réserver.

**Aucune page d'administration** : tout se fait par-dessus le site. Le lien
« Espace bénévoles » du pied de page ouvre une **modale de connexion** ; une
fois connecté·e, une **barre fixe en haut** donne accès aux **modules**, qui
s'ouvrent en **panneau latéral** au-dessus de la page en cours.

Mise en service et mode d'emploi pour les bénévoles :
[guide-espace-benevoles.md](guide-espace-benevoles.md).

## En bref

| Grav | Ici |
| :--- | :--- |
| `user/accounts/<login>.yaml` | `data/accounts/<login>.yaml` (`AUTH_DATA_DIR`) |
| `user/config/groups.yaml` | `AUTH_GROUPS` dans `src/lib/auth/groups.ts` |
| `bin/plugin login newuser` | `npm run auth:user -- add …` (`scripts/auth-user.ts`) |
| Admin plugin > Utilisateurs | module « Comptes » de la barre admin (groupe `admin`) |
| `access: site.login: true` | `access: true` / `access: animateur` dans le frontmatter |
| Session PHP | cookie signé HMAC (`AUTH_SECRET`), aucun stockage serveur |

## Fichier de compte

```yaml
# data/accounts/marie.f.yaml — le nom du fichier est l'identifiant
fullname: Marie Fruit
email: marie@exemple.fr        # facultatif
groups:
  - animateur
state: enabled                 # disabled = connexion refusée
hashed_password: scrypt$16384$8$1$<sel>$<empreinte>
created: 2026-10-06T10:00:00.000Z
updated: 2026-10-06T10:00:00.000Z
```

- Identifiant : 2 à 32 caractères `a-z 0-9 . - _` (`LOGIN_PATTERN`), validé
  avant tout accès disque.
- Mot de passe haché avec **scrypt** (`node:crypto`, paramètres stockés avec
  l'empreinte). 10 caractères minimum pour un mot de passe choisi ; les mots
  de passe provisoires générés ont la forme `k7mp-q3zt-h9wx`.
- Écriture atomique (fichier temporaire + renommage), fichiers en `0600`,
  dossier en `0700`. Le dossier `data/` est ignoré par git et par Docker.

## Groupes et droits

| Groupe | Droits |
| :--- | :--- |
| `admin` | Tout : toutes les pages réservées + tous les modules (dont « Comptes ») |
| `animateur` | Pages réservées dont l'`access:` cite `animateur` (ou `true`) |

Ajouter un groupe = une entrée dans `AUTH_GROUPS` (`src/lib/auth/groups.ts`).

## Réserver une page de contenu

Frontmatter de `src/contents/pages/<…>/index.md` :

```yaml
access: true                 # toute personne connectée
access: animateur            # un groupe
access: [animateur, admin]   # l'un de ces groupes
```

- Personne non connectée → **401**, encart « Page réservée » avec un bouton
  « Se connecter » (ouvre la modale ; la page se recharge après connexion).
- Connectée sans le bon groupe → **403** « Accès réservé ».
- Une page réservée n'apparaît **jamais dans le menu** (calculé au build) ;
  elle est listée dans le module « Pages réservées » des personnes autorisées.
- Pas d'outils de partage, `noindex`, en-tête `Cache-Control: private, no-store`.
- Un groupe inconnu dans `access:` fait **échouer le build** (une faute de
  frappe ne doit jamais ouvrir une page).

Conséquence technique : `src/pages/[...slug].astro` est rendue **à la
demande** (`prerender = false`) pour toutes les pages de contenu, et non plus
prérendue. Les autres pages statiques (accueil, actualités…) restent prérendues.

## Interface : modale, barre, modules

| Fichier | Rôle |
| :--- | :--- |
| `src/components/admin/AdminLoader.astro` | Inclus par `Layout.astro` et `ArticleLayout.astro` (~2 Ko). Ne charge l'îlot Vue que si le cookie indicateur `numerik_connecte` existe, au clic sur un `[data-auth-open]` ou sur une URL `#connexion`. Un visiteur ne télécharge ni Vue ni l'admin. |
| `src/components/admin/mount.ts` | Monte `AdminRoot.vue` dans `<div id="espace-benevoles">` à la fin du `<body>`. |
| `src/components/admin/AdminRoot.vue` | Interroge `/api/auth/me`, affiche la barre (classe `has-admin-bar` sur `<html>` : décale le `body` et le header collant via `--admin-bar-h`), la modale de connexion et le module ouvert. Connexion/déconnexion → rechargement de la page. |
| `src/components/admin/AdminOverlay.vue` | Calque générique : `variant="drawer"` (panneau à droite, plein écran sur mobile) ou `"modal"`. Échap / clic sur le fond ferment, focus piégé puis rendu, défilement de la page bloqué. |
| `src/components/admin/LoginForm.vue` | Formulaire de la modale de connexion. |
| `src/components/admin/modules.ts` | **Registre des modules** (`id`, `label`, icône, `groups`, composant chargé à la demande). |
| `src/components/admin/modules/*.vue` | `PagesModule` (pages réservées), `AccountsModule` (comptes, `admin`), `PasswordModule` (mon mot de passe). |
| `src/components/admin/client.ts` | Appels typés aux routes ; `ApiError.status === 401` = session expirée (`sessionExpired()` du contexte rouvre la connexion). |
| `src/components/admin/context.ts` | `provide/inject` (`user`, `pages`, `sessionExpired`) + classes des champs. |

N'importe quel élément peut ouvrir la connexion : `<button type="button" data-auth-open>…</button>`
(une fois connecté·e, il ouvre le premier module).

### Ajouter un module

1. Un composant `src/components/admin/modules/MonModule.vue` (contexte via
   `inject(ADMIN_CONTEXT)`, appels via des fonctions ajoutées à `client.ts`).
2. Une entrée dans `ADMIN_MODULES` (`modules.ts`) — `groups: []` = toute
   personne connectée ; `admin` voit tout.
3. Ses routes JSON sous `src/pages/api/admin/<…>` : connexion déjà exigée
   par le middleware ; si elles sont réservées à un groupe, ajouter la garde
   dans `src/middleware.ts` (comme `/api/admin/comptes`). **Le contrôle
   d'accès réel est toujours côté serveur.**

## Routes API

| Route | Rôle |
| :--- | :--- |
| `POST /api/auth/login` | `{ login, password }` → `{ user }` + cookies |
| `POST /api/auth/logout` | Ferme la session |
| `GET /api/auth/me` | `{ user, pages }` (pages réservées ouvertes) ou 401 |
| `POST /api/admin/mot-de-passe` | `{ current, next }` — ferme les autres sessions |
| `GET/POST /api/admin/comptes` | Liste / création (`password` provisoire renvoyé une fois) — `admin` |
| `PATCH/POST/DELETE /api/admin/comptes/<login>` | Modification / réinitialisation du mot de passe / suppression (`{ confirm: <login> }`) — `admin` |

Garde : `src/middleware.ts` — `/api/auth/*` et `/api/admin/*` n'acceptent
que les requêtes du site lui-même (`Sec-Fetch-Site`, à défaut `Origin`),
`/api/admin/*` exige une connexion (401), `/api/admin/comptes*` le groupe
`admin` (403). `Astro.locals.user` est renseigné sur chaque requête rendue à
la demande.

Garde-fous des comptes : impossible de se retirer ses propres droits admin,
de se désactiver ou de se supprimer, et de supprimer ou dégrader le
**dernier admin actif**. Suppression confirmée en recopiant l'identifiant
(pas de boîte de dialogue JavaScript).

## Sessions

Cookie `numerik_session` = `<données base64url>.<HMAC-SHA256>` contenant le
login, une empreinte du mot de passe et l'échéance (14 jours, renouvelée au
plus une fois par jour). `HttpOnly`, `SameSite=Lax`, `Secure` en production.

Cookie compagnon `numerik_connecte=1`, lisible en JavaScript et sans aucune
donnée : il dit seulement aux pages statiques de charger la barre. Il est
posé et effacé avec la session (et effacé si la session est refusée).

Le compte est relu à chaque requête, donc :

- désactiver ou supprimer un compte coupe ses sessions immédiatement ;
- changer / réinitialiser un mot de passe déconnecte ses autres appareils ;
- changer `AUTH_SECRET` déconnecte tout le monde.

Sans `AUTH_SECRET` (ou s'il fait moins de 32 caractères), la connexion est
impossible et la modale l'indique.

## Sécurité

- **CSRF** : cookie `SameSite=Lax`, contrôle `Sec-Fetch-Site`/`Origin` du
  middleware sur les routes JSON, et protection native d'Astro
  (`security.checkOrigin`). Derrière le reverse proxy HTTPS, `security.allowedDomains`
  (`astro.config.mjs`) autorise `X-Forwarded-Host`/`-Proto` pour
  `www.clubmicrosaintpierre.fr` uniquement. **Le proxy doit transmettre ces
  deux en-têtes**, sinon les requêtes de l'espace bénévoles risquent d'être refusées (403). Si le site est
  aussi servi sur un autre domaine (sans `www`…), l'ajouter à la liste.
- **Force brute** : 5 échecs en 15 min par identifiant et par adresse IP →
  blocage temporaire (`src/lib/auth/rate-limit.ts`, en mémoire, remis à zéro
  au redémarrage). Un identifiant inconnu coûte le même temps de calcul
  qu'un mauvais mot de passe.

## Mise en route

### En local

```sh
# .env : AUTH_SECRET=<chaîne aléatoire ≥ 32 caractères>
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

npm run auth:user -- add xavier "Xavier Burke" admin   # affiche le mot de passe provisoire
npm run auth:user -- list
npm run auth:user -- reset xavier                       # nouveau mot de passe provisoire (et réactive)
```

### En production (Docker)

1. Ajouter `AUTH_SECRET=…` au `.env` du VPS.
2. Le `docker-compose.yml` monte `./data` sur `/app/data` (`AUTH_DATA_DIR`) :
   les comptes survivent aux redéploiements. Sauvegarder ce dossier.
3. Créer le premier admin, puis tout se fait depuis le module « Comptes » :

   ```sh
   docker compose exec web node dist/cli/auth-user.mjs add xavier "Xavier Burke" admin
   ```

Le CLI est compilé par esbuild pendant `npm run build` (`build:cli` →
`dist/cli/auth-user.mjs`) : le Node de certains environnements n'exécute pas
le TypeScript directement.

## Fichiers

- `src/lib/auth/accounts.ts` — lecture/écriture des YAML
- `src/lib/auth/password.ts` — scrypt, mots de passe provisoires ; `password-rules.ts` — longueur minimale (partagée avec le navigateur)
- `src/lib/auth/groups.ts` — groupes
- `src/lib/auth/session.ts` — cookie signé, `readSession()` / `openSession()` / `closeSession()`
- `src/lib/auth/access.ts` — `parseAccess()` / `canAccess()` / `isAdmin()`
- `src/lib/auth/api.ts` — réponses JSON, contrôle d'origine
- `src/lib/auth/rate-limit.ts` — anti force brute
- `src/lib/auth/admin-forms.ts` — validation des comptes, `accountView()`
- `src/middleware.ts`, `src/pages/api/auth/*`, `src/pages/api/admin/**`
- `src/components/admin/**` — interface (voir plus haut)
- `scripts/auth-user.ts` — CLI

`accounts.ts`, `password.ts` et `groups.ts` n'importent rien d'Astro (imports
relatifs en `.ts`) : ils sont partagés avec le CLI.
