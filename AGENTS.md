## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Production sans Docker : `npm run build` puis `npm start`
(`node --env-file-if-exists=.env dist/server/entry.mjs`).

### Variables d'environnement

Déclarées dans `astro.config.mjs` (`env.schema`, `astro:env`), **toutes en
`access: 'secret'`** : lues au démarrage du serveur, jamais recopiées dans
`dist/` (vérifié : aucun secret dans le build). Lire via
`import { X } from 'astro:env/server'` — **jamais `import.meta.env.X`** pour
un secret (Vite le figerait dans le build). Toutes facultatives : une fonction
non configurée se désactive. Changer le `.env` = redémarrer, pas rebuild.
⚠️ Dans un module chargé par le **middleware** (ex. `src/lib/auth/session.ts`),
lire le secret à l'usage avec `getSecret('X')`, pas par import nommé : en
dev, le middleware est chargé avant le `.env` et l'import vaudrait `undefined`.
Exception : `DATA_DIR` (`process.env`, `src/lib/data-dir.ts`, partagé avec le
CLI). Autre exception, **`SITE_URL`** (domaine public, obligatoire pour
`build`, sinon `http://localhost:4321`) : lu **à la construction** par
`astro.config.mjs` (`loadEnv`) pour `site` et `security.allowedDomains` ;
Docker le passe en `build.args` depuis le `.env`. Le changer = reconstruire. Détail : [docs/api.md](docs/api.md#variables-denvironnement).

## Contenu & navigation

Ce projet est un template déployé pour plusieurs structures. Les pages
éditoriales et le menu se pilotent **uniquement** depuis `src/content/` — voir
`src/content/README.md` (guide destiné aux éditeurs).

Fonctionnement technique :

- `src/pages/[...slug].astro` — route attrape-tout **prérendue** ; rend toute
  page publique `src/content/pages/<...>/index.{md,mdx}`. Aucun wrapper
  `.astro` par page. Rendu partagé : `src/components/article/ContentPageView.astro`.
- `src/pages/espace-benevoles/[...slug].astro` — pages réservées
  (`src/content/pages/espace-benevoles/`), seules rendues à la demande.
- `src/lib/content-pages.ts` — collections `pages` / `pageGroups`
  (`getContentPages()`, `pageParts()`, `renderPage()`, `getGroups()`),
  frontmatter `menu:` et fichiers `_group.md`. Page `.md` : HTML nettoyé
  (`sanitizeNewsHtml`), variables `{{association.…}}`
  (`src/lib/page-variables.ts`) et, si `type: enrichie`, **blocs** (`blocs:`
  + marqueurs `[[bloc:<id>]]` seuls sur leur ligne ; catalogue
  `src/lib/blocs.ts`, rendu `src/components/blocs/BlocView.astro` ; nouveau
  bloc = entrée `BLOC_TYPES` + branche `BlocView`). `.mdx` = page
  « technique » écrite dans le code, jamais produite par l'admin (le MDX
  s'exécute sur le serveur).
- **Module « Pages »** (`redacteur`) : `SitePagesModule.vue` +
  `modules/pages/*`, `src/lib/page-writer.ts` (validation = schéma,
  transaction sur tout `src/content/pages/`, puis `admin-publish.ts` →
  `site-build.ts`), routes `/api/admin/pages*` et
  `/api/admin/menus-deroulants*`. Création : page classique ou enrichie,
  ou fichier `.md` déposé qui pré-remplit le formulaire (modèles
  téléchargeables, `modules/pages/page-markdown.ts`) ; emplacement racine / menu déroulant / réservée ; menus déroulants =
  `_group.md`, un seul niveau, suppression si vide. Vocabulaire : « menu »
  = menu de navigation (frontmatter `menu:`), « menu déroulant » = groupe
  type « Association » (code : `dropdown`). **Pages du site** :
  bibliothèque `src/lib/site-pages.ts` (`SITE_PAGES` : Accueil, Activités,
  Actualités, Contact), activables (désactivée = 404, HTML prérendu retiré par
  `src/integrations/site-pages.ts` ; accueil toujours actif, composé de
  **modules** : `src/lib/home-modules.ts`, `HomeModulesEditor.vue`, rendu
  `src/pages/index.astro`), lien et
  **textes** réglables (`SitePageForm.vue`, `PUT /api/admin/pages-du-site/<id>`,
  `saveSitePage()`), écarts écrits dans `src/content/pages/_pages-site.md`
  (collection `sitePages`) ; lecture au build `getSitePage(id)`
  (`src/lib/site-pages-content.ts`). Nouvelle page de bibliothèque = entrée
  `SITE_PAGES` + `getSitePage()` dans la page `.astro`. Ordre : flèches ↑/↓ du
  module → `PUT /api/admin/ordre-menu` (`saveMenuOrder()`) ; une nouvelle
  page se place en dernier (`menuOrderFor()`).
- `src/lib/navigation.ts` — `getNavTree()` fusionne les pages du site actives et les
  pages `menu.show: true`, l'arborescence de dossiers produisant les menus
  déroulants (libellé de dropdown non cliquable, enfants seuls cliquables).
- `src/config/site.ts` — réglages du site (bouton CTA « Adhérer », « Je
  participe », outils de partage, ouverture/fermeture des formulaires
  `site.forms`) : `DEFAULTS` du modèle **fusionnés** avec
  `src/content/reglages.yaml` (propre à l'asso, tout facultatif, clé inconnue
  = build en échec ; `?raw` + zod, lecture synchrone comme
  `association.ts`). Nouveau formulaire / outil = une entrée dans `DEFAULTS`
  (fonctionne sans toucher au YAML des assos). Les pages du site se règlent
  dans l'espace bénévoles.
- `src/components/layout/Header.astro` — consomme `getNavTree()` ; markup
  inchangé, structure `{ label, href, children }`.

Le menu est calculé au `build` (`getNavTree()` est async). Tout le contenu est
**prérendu** : `npm run build` produit le site complet. Seules exceptions,
qui exigent Node : les pages réservées (`/espace-benevoles/*`), les routes
`/api/*` et les pages applicatives dynamiques (`/activites`, formulaires
Grist…).

### Formulaires

- `site.forms.<clé>` (`enabled`, `closedTitle`, `closedMessage`) décrit l'état
  de chaque formulaire.
- `src/components/forms/FormGate.astro` — `<FormGate form="<clé>">…</FormGate>`
  rend le formulaire si `enabled`, sinon un encart informatif ; slot nommé
  `fallback` pour un bouton d'alternative.
- `src/lib/forms.ts` — `isFormOpen(name)` / `getFormToggle(name)` pour la
  logique `.astro` (ex. masquer le bouton « Adhérer en ligne » dans
  `src/pages/adherer.astro`).
- Câblé sur `src/pages/adherer/formulaire.astro` (`adhesion`) et
  `src/pages/contact.astro` (`contact`). Nouveau formulaire : ajouter une clé
  dans `site.forms` puis l'entourer d'un `<FormGate>`.

## Espace bénévoles (authentification à plat)

Connexion du bureau, des rédacteur·rice·s et des animateur·rice·s **sans
base de données**, façon Grav : un YAML par compte dans
`data/accounts/<login>.yaml` (`DATA_DIR`, volume Docker `./data`), cookie de
session signé HMAC (`AUTH_SECRET`), groupes `admin` / `animateur` /
`redacteur`, plus `superadmin` (`src/lib/auth/groups.ts`) : compte technique
créé au déploiement (`auth-user init`, mot de passe provisoire imposé —
`must_change_password`, modale non refermable, `/api/admin/*` bloqué sauf
`mot-de-passe`), tous les droits + seul à voir le **journal**, invisible et
intouchable depuis le module « Comptes ».

**Pas de pages d'administration** : tout se superpose au site. Lien
« Espace bénévoles » du pied de page (`[data-auth-open]`) → modale de
connexion ; connecté·e → barre fixe en haut + **modules en panneau
latéral**. Toute nouvelle fonction d'admin = un module (registre
`src/components/admin/modules.ts`, composant dans `modules/`, routes JSON
sous `/api/admin/`).

- `src/components/admin/AdminLoader.astro` (dans les deux layouts) ne
  charge l'îlot Vue (`mount.ts` → `AdminRoot.vue`) que si le cookie
  indicateur `numerik_connecte` existe ou au clic : rien pour un visiteur.
- `src/middleware.ts` — `Astro.locals.user` ; `/api/auth/*` et
  `/api/admin/*` : requêtes du site seulement ; `/api/admin/*` exige une
  connexion ; `GUARDS` réserve des préfixes à des groupes
  (`/api/admin/comptes` → `admin`, `/api/admin/actualites`,
  `/api/admin/publication`, `/api/admin/pages`, `/api/admin/menus-deroulants`,
  `/api/admin/pages-du-site` et `/api/admin/ordre-menu` →
  `redacteur`, `/api/admin/journal` → `superadmin` seul).
- **Journal des modifications** : `src/lib/journal.ts` (`logEvent()`,
  `<DATA_DIR>/journal/<AAAA>.jsonl`, ajout seul), appelé par chaque route
  d'admin et par `site-build.ts` (résultat des publications). Fermer
  l'encadré de publication = `dismissStatus()` (définitif, pour tous, journalisé).
  Nouvelle action d'admin = un `logEvent()` + son libellé dans `JournalModule.vue`.
- Modules : Pages réservées, **Actualités**, **Pages**, Comptes, Journal (`exclusive`,
  `superadmin` seul) ; Mon mot de passe
  (`placement: 'user'`) est rangé avec Déconnexion dans le menu déroulant
  du nom, en fin de barre (pleine largeur, badge serveur juste avant).

### HTML des actualités

Le HTML est **autorisé** dans les actualités (souhait explicite : ne jamais le
bloquer). Il est **nettoyé à l'affichage** par la page d'article
(`renderNews()` → `sanitizeNewsHtml()`, `src/lib/sanitize-news.ts`, sur
`entry.rendered.html`) : balisage, classes, styles, tableaux gardés ; `<script>`,
`<style>`, `on…=`, `javascript:`, svg/math et iframes hors `IFRAME_HOSTS`
(YouTube, Vimeo, PeerTube, OpenStreetMap) retirés. Le moteur Markdown du site
(Satteri, défaut d'Astro 7) n'est PAS modifié. Même nettoyage pour les
pages `.md` (`pageParts()`, publiables depuis le module « Pages ») et le
texte de leurs blocs ; activités non concernées.

### Publication (module Actualités)

Le module écrit dans les **sources** (`src/content/news/<date-slug>/`,
`src/lib/news-writer.ts` : validation identique au schéma, liens Markdown
dangereux et images locales refusés, photo nettoyée par sharp) puis `src/lib/site-build.ts`
relance `npm run build` sur le serveur dans `.releases/<horodatage>`
(`ASTRO_OUT_DIR` → `outDir`), fait pointer `dist` dessus, lance
`PUBLISH_HOOK` éventuel et **arrête le process** pour que son gestionnaire
(Docker, PM2, systemd) le relance. Build en échec = contenu retiré, site
intact. Modification (`PUT /api/admin/actualites/<slug>`, formulaire dans le
module) : même dossier donc URL inchangée, sauvegarde restaurée si échec
(`updateNews`). Suppression (`DELETE …/<slug>`) : dossier mis de
côté (`setAsideNews`), effacé après reconstruction réussie (`onSuccess`),
remis en place sinon (`onFailure`). Prérequis : sources + `node_modules` complet + gestionnaire de
process. Docker : l'image embarque tout le projet, `./src/content` monté
depuis le VPS. Détail : [docs/publication.md](docs/publication.md).
- Page de contenu réservée : rangée dans `src/content/pages/espace-benevoles/`
  (défaut : toute personne connectée ; `access: <groupe> | [groupes]` pour
  restreindre — `parseAccess`/`canAccess`, `src/lib/auth/access.ts`) ;
  jamais dans le menu ni dans `dist/client`, 401 + bouton « Se connecter »
  sans session, 403 si mauvais groupe ; groupe inconnu ou `access:` hors de
  ce dossier = build en échec.
- Premier admin : `npm run auth:user -- add <login> "<Nom>" admin` en local ;
  sur le VPS `./auth-user.sh add …` (exécute `dist/cli/auth-user.mjs`,
  compilé par `build:cli`, dans le conteneur avec `DOCKER_CONFIG`).
- `astro.config.mjs` `security.allowedDomains` : indispensable derrière le
  proxy HTTPS ; tiré de `SITE_URL`, comme `site`.

Détail : [docs/auth.md](docs/auth.md) ; guide déploiement + utilisation
(à tenir à jour avec chaque nouveau module) :
[docs/guide-espace-benevoles.md](docs/guide-espace-benevoles.md).

### Contenu = collections Astro

Tout le contenu éditorial vit dans `src/content/` et `npm run build` produit
le site complet (déposable tel quel pour la partie contenu). Les collections
sont déclarées dans `src/content.config.ts` (Content Layer, loader `glob`,
schéma `zod` via `astro/zod`) — suivre la doc Astro
(https://docs.astro.build/en/guides/content-collections/). **Ne pas stocker de
contenu hors de `src/content/`.**

- `news` — `src/content/news/<AAAA-MM-JJ-slug>/index.md`, id = nom du
  dossier, `cover: ./cover.jpg` validé par `image()`. `src/lib/news.ts` :
  `getAllNews()` (async, `getCollection`), `renderNews()` (`render()`).
  Pages prérendues. Détail : [docs/actualites.md](docs/actualites.md).
- `pages` + `pageGroups` — `src/content/pages/<chemin>/index.{md,mdx}`
  (id = chemin = URL) et `_group.md` ; `cover:` via `image()`, `access:`
  validé par `parseAccess`. `src/lib/content-pages.ts`. Détail :
  [docs/pages.md](docs/pages.md).
- `activites` — `src/content/activites/<slug>/index.md`, `category` limitée
  aux slugs de `src/lib/categories.ts`, `cover:` via `image()`.
  `src/lib/activites.ts` : `getAllActivities()`, `getActivitiesByCategory()`,
  `renderActivity()` (async). Détail : [docs/activites.md](docs/activites.md).
- `association.yaml` (pas une collection) — nom, coordonnées, mentions
  légales de l'association, fichier propre à chaque déploiement qu'une mise
  à jour du modèle ne remplace pas. Importé en `?raw` et validé (zod) par
  `src/lib/association.ts`, lecture **synchrone** voulue (`association` est
  utilisé partout, jusque dans `content.config.ts` et l'îlot Vue) ; champ
  invalide = build en échec avec le chemin du champ.
- `partenaires.yaml` (pas une collection, même principe qu'`association.yaml`)
  — `src/lib/partenaires.ts` : `partenaires` (cartes `PartenairesSection`,
  absente si liste vide), `relaisAdhesion` (`relais: true` : cités sur
  `/adherer` et, en prop, dans le récap de `AdhesionForm.vue` — jamais le
  YAML côté visiteur), `avantage` (`**gras**`, `avantageHtml()`).
- `annonces` — `src/content/annonces.yaml` (loader `file()`, liste avec
  `id`) ; `position` ajoutée par le parser du loader pour garder l'ordre du
  fichier. `src/lib/annonces.ts` : `getAnnonces()` (async). Détail :
  [docs/annonces.md](docs/annonces.md).

## Composants réutilisables

### Agenda hebdomadaire

Affiche le planning des séances de la semaine, jour par jour, avec code
couleur par famille d'activité.

- `src/lib/agenda.ts` — types et données de repli. `AgendaSession` (jour,
  horaires, intitulé, `animators` et `location` facultatifs, `kind`, `note`
  facultative). `AGENDA_KIND_META` associe à chaque `kind` (`parcours`,
  `fablab`, `espace-jeune`, `bidouille-repair`, `conseiller-numerique`) un
  libellé, une icône Font Awesome et des classes / hex de couleur ; ajouter
  un `kind` = ajouter une entrée ici. Les permanences du Conseiller
  Numérique (`conseillerNumerique`, exporté) sont lues dans
  `src/content/conseiller-numerique.yaml` (fichier de l'asso, validé : jours
  d'`AGENDA_DAYS`, une par jour, heures « 09h00 » piles/demies dans
  09h–20h ; liste vide = encart `RdvCtaSection` absent) — dispositif géré à
  part de la programmation de l'association, jamais dans Grist. `groupByDay()`
  regroupe et trie les séances selon `AGENDA_DAYS`. `weeklyAgenda` reste un
  planning figé en dur : **filet de sécurité uniquement**, utilisé si Grist
  est injoignable (voir ci-dessous) ou comme valeur par défaut du
  composant.
- **Source du planning affiché sur `/activites`** : la table Grist
  `Activite` elle-même (chaque ligne est déjà un créneau précis : jour,
  horaires, lieu, encadrant·e·s), lue à chaque requête par
  `fetchPlanningAgenda()` (`src/lib/adhesion/planning.ts`) et recombinée
  avec `conseillerNumerique`. Seules les lignes `Publiee = true` de la
  saison en cours, avec une `Categorie_agenda` renseignée, et qui ont lieu
  dans la semaine en cours (`Ouverture` = date de 1re séance, puis
  `Nombre_de_seances` semaines ; sans `Ouverture` = chaque semaine) sont
  affichées.
  **Modifier le planning = éditer les lignes `Activite` dans Grist**, pas
  le code. Détail des colonnes et du mapping : [docs/api.md](docs/api.md).
- `src/components/sections/WeeklyAgenda.astro` — le composant.
  `<WeeklyAgenda />` rend `weeklyAgenda` (le planning en dur) par défaut ;
  props : `sessions` (jeu de séances personnalisé — c'est ce que passe
  `/activites` avec les créneaux venus de Grist), `showHeading`, `title`,
  `description`, `showLegend`, `startHour` / `endHour` (bornes de l'axe
  horaire, défaut 9 → 20), `alwaysShowDays` (jours affichés même vides,
  défaut lundi → samedi), `class` (utilitaires ajoutés au `<section>`).
  Rendu en grille agenda : axe des heures à gauche, une colonne par jour,
  blocs positionnés par `grid-row` calculé depuis les horaires (lignes de
  30 min) ; scroll horizontal sous ~44rem. Les horaires doivent tomber sur
  des multiples de 30 min et tenir dans `[startHour, endHour]`.
  Les créneaux qui se chevauchent un même jour sont décalés en cascade
  (droite + bas, `overlapLanes()`), le survol ramène le bloc au premier plan.
- Consommé par `src/pages/activites.astro` (`prerender = false`, pour lire
  Grist à chaque requête). Réutilisable ailleurs :
  `import WeeklyAgenda from '../components/sections/WeeklyAgenda.astro'` puis
  `<WeeklyAgenda showHeading={false} />` (ex. bloc dans une page d'accueil,
  planning en dur par défaut sauf `sessions` fourni explicitement).

### Outils de partage (actualités et pages)

`src/components/article/ShareTools.astro` — encart à bordure complète et
coins arrondis (`rounded-2xl border`), sans titre : icône « partage »
(couleur du texte, `text-gray-700`) à gauche, puis à droite une icône de marque par outil,
sans fond (libellé en `aria-label`/`title`). Placé dans la colonne de droite (slot
`sidebar`) de `src/pages/actualites/[slug].astro` (sous le temps de
lecture) et de `src/pages/[...slug].astro` (au-dessus du sommaire) ; la
colonne étant masquée sous `lg`, une seconde instance `lg:hidden` est
rendue sous le contenu. La colonne de droite est donc toujours présente
sur ces pages. `<ShareTools title={…} />`, prop `url` facultative (défaut =
URL publique de la page). Premier outil : partage Facebook (simple lien `sharer.php`,
aucun SDK ni cookie, ouvert dans un onglet normal — jamais en popup, qui bloquait la publication sur certaines Pages). Activation par outil dans
`site.share` (`src/config/site.ts`) ; nouvel outil = une entrée dans
`tools` du composant + une clé dans `site.share`. L'aperçu Facebook vient
des balises Open Graph ajoutées dans `ArticleLayout.astro` (props `image`
→ `og:image` recadrée 1,91:1, 1200×630 au plus, dimensions réelles déclarées, via `getImage` ; `ogType`) — elles s'appuient sur
`site` d'`astro.config.mjs` pour les URL absolues. L'icône « partage » est
un SVG inline au trait fin (Font Awesome gratuit ne l'a qu'en plein), les
icônes font 24 px et sont centrées verticalement. Détail :
[docs/partage.md](docs/partage.md).

### Inscription en ligne à une activité

Page `/inscription`, îlot Vue `src/components/inscription/InscriptionForm.vue`
(`client:load`), gardé par `<FormGate form="inscription">`. 3 étapes :
profil (adhérent·e retrouvé·e par nom + prénom via
`/api/adhesion/membre` `mode:'renouvellement'`, ou extérieur·e → fiche
`Membres` minimale rôle `Contact` via `/api/adhesion/participant-exterieur`)
→ activité (`/api/adhesion/offre-inscription` : saison en cours, type
`Séances`/`Ateliers`/`Atelier CN` — `TYPES_ACTIVITE_INSCRIPTION` ; les
activités de la fiche d'origine si l'une est publiée, sinon tous les
publiés ; si `Activite.Tarif_non_adherent` renseigné : total adhérent·e =
adhésion « Individuelle » de la saison + `Tarif` (détaillé, adhésion comptée
si `Adhesion_requise`) et total non-adhérent·e = `Tarif_non_adherent`, mis
en avant selon `Adhesion_en_cours`) → récap (`/api/adhesion/inscription`,
montant dû = `Tarif_non_adherent` sans adhésion en cours, sinon `Tarif` ;
`Liste d'attente` si complet, règlement sur place). Activités visées **toutes non publiées**
→ « Me préinscrire » (`/api/adhesion/preinscription`, ligne ajoutée à
`Membres.Commentaires`, pas d'`Inscription`). Bouton « S'inscrire » dans la
sidebar de `src/pages/activites/[category]/[slug].astro` →
`activity.inscriptionHref` (`src/lib/activites.ts`, depuis le frontmatter
`activiteGrist` = nom(s) Grist, `*` final = préfixe, et/ou `typeGrist` ;
défaut `title`) ; masqué par `inscription: false` dans le frontmatter de la
fiche ou si `site.forms.inscription` est fermé. Inscrit la fiche trouvée
(`ficheId` de `/api/adhesion/membre`), pas `membreId` qui désigne le·la
responsable du foyer pour un membre rattaché. Détail : [docs/inscription.md](docs/inscription.md).

### Présence (« Je participe »)

Page `/je-participe` (lien de menu, `src/config/site.ts`), îlot Vue
`src/components/presence/PresenceForm.vue`. Sans système de connexion :
un membre se retrouve par recherche de nom (réutilise la route publique
`/api/adhesion/membres`), mémorisé ensuite en `localStorage` sur
l'appareil. La page détecte la (les) séance(s) en cours parmi les lignes
`Activite` publiées (`fetchSeancesCourantes()`,
`src/lib/adhesion/presence.ts`) et propose un bouton « Je participe » /
« Je ne pourrai pas venir » par séance candidate — écrit dans la table
Grist `Presence` (une ligne par séance, `Presents` / `Absents` en
RefList:Membres). Détail : [docs/api.md](docs/api.md).

### RDV avec le Conseiller Numérique

Page `/rdv-conseiller-numerique` (lien de menu, `src/config/site.ts`, entre
Activités et Actualités), formulaire public `src/components/rdv/RdvForm.vue`
(`client:load`), gardé par `<FormGate form="rdvConseillerNumerique">`.
Parcours en 5 étapes (même motif que `AdhesionForm.vue`) : démarche →
créneau → vous (premier RDV ou déjà venu) → profil facultatif (premier RDV
seulement) → consentement/envoi.

- `src/lib/rdv/demarches.ts` — catalogue de démarches (table Grist
  `Demarches` : Nom, Thematique, Icone, Description, Documents), alimenté et
  tenu à jour **directement dans Grist** par l'association, aucune admin
  côté site. `Documents` (facultatif, une ligne par document à apporter) est
  affiché en rappel sur l'écran de confirmation de `RdvForm.vue` (après
  envoi uniquement).
- `src/components/sections/RdvCtaSection.astro` — encart d'accueil
  (`src/pages/index.astro`, juste avant « Envie de nous rejoindre ? ») :
  jours, horaires et lieux déduits de `conseillerNumerique`, bouton vers
  `/rdv-conseiller-numerique` (« Voir les permanences » si le formulaire est
  fermé dans `site.forms`). Props facultatives : `eyebrow`, `title`,
  `description`, `buttonLabel`, `buttonHref`.
- `src/lib/rdv/creneaux.ts` — créneaux de 30 min dérivés de
  `conseillerNumerique` (`src/lib/agenda.ts`).
- Étape 3 « Vous » : choix **« C'est mon premier rendez-vous »** (saisie
  civilité/nom/coordonnées puis profil, étape 4) ou **« J'ai déjà rencontré le·la
  conseiller·ère »** (recherche prénom + nom, fiche existante réutilisée telle
  quelle, étape 4 profil sautée — la dernière étape s'affiche alors « 4 »).
  Objectif : pas de doublons dans `Beneficiaires`. Les pièces à apporter ne
  sont rappelées qu'après l'envoi (écran de confirmation).
- `src/lib/rdv/beneficiaires.ts` — premier RDV : rapproche un bénéficiaire
  par **email OU téléphone** (un seul des deux est obligatoire à la saisie,
  jamais aucun — voir `validation.ts` — et le rapprochement ne compare que
  le champ effectivement renseigné, filet anti-doublon) ou en crée un
  nouveau. Déjà venu : `rechercherBeneficiaires()` = prénom ET nom **exacts**
  (hors accents/casse/tirets, jamais de recherche partielle), ne renvoie
  qu'un indice masqué (`j•••@gmail.com · 06 •• •• •• 78 · commune`) ;
  `beneficiaireCorrespond()` revérifie à l'envoi que l'id choisi porte bien
  ce nom (un id seul ne suffit pas).
- `src/lib/rdv/reservation.ts` — revérifie la disponibilité puis écrit la
  ligne `RDV` (même doc Grist que `Beneficiaires`/`Demarches`).
- Routes : `GET /api/rdv/creneaux`, `GET /api/rdv/demarches`,
  `GET /api/rdv/commune`, `GET /api/rdv/beneficiaires` (`?prenom=&nom=`),
  `POST /api/rdv/prendre`, `GET /api/rdv/ics`
  (`?date=&heure=&demarche=<id>` → fichier `.ics` ; lieu et documents
  recalculés côté serveur).
- `src/lib/rdv/ics.ts` — événement d'agenda partagé par la route `.ics` et
  le QR code de l'écran de confirmation (heure Europe/Paris convertie en UTC).

Pistes de suite non traitées (à reprendre si redemandé) :
1. Mécanisme de collecte de l'évaluation bénéficiaire (colonnes Grist
   `Evaluation_satisfaction`/`Suggestions_beneficiaire` prêtes, rien de
   branché côté formulaire).
2. Notification email/SMS de confirmation ou de rappel de RDV.
3. Vue admin pour lister/annuler des RDV (aujourd'hui uniquement gérable
   depuis Grist directement).
4. Suppression de `Table1` (table Grist vide créée par défaut, sans impact).

## Documentation

Snippets prêts à copier (frontmatter, blocs de page, variables, FormGate, route API Grist…) :
[docs/snippets.md](docs/snippets.md) — à tenir à jour quand un motif change.

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
