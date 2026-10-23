## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Mise à jour d'un site : `./update.sh [vX.Y.Z]` (Docker : `NUMERIK_VERSION`
dans `.env`, construction à côté par `docker compose run` dans le volume
`.releases`, bascule, vérification, retour arrière ; Node seul :
`scripts/update.mjs`, sauvegarde `.update/`, code du modèle remplacé hors
`src/content/`, `data/`, `.env`). `start.mjs` réutilise une version de
`.releases/` déjà construite avec la même empreinte (`findRelease`) ;
`pruneReleases` ne supprime jamais la version active.
Production sans Docker : `npm start`
(`node --env-file-if-exists=.env scripts/start.mjs` : construit le site si
l'empreinte version + `SITE_URL` + `src/content/` diffère de
`dist/build-info.json`, puis lance `dist/server/entry.mjs`). Docker : même
script (`CMD`), image sans site construit. Versions publiées et mises à jour :
[docs/mise-a-jour.md](docs/mise-a-jour.md).

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
le changer puis redémarrer suffit (`scripts/start.mjs` reconstruit). Détail : [docs/api.md](docs/api.md#variables-denvironnement).

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
  `src/pages/index.astro` ; photo du bandeau réglée dans le module
  « Bandeau » : `HomePhotoField.vue` → champ `photo` du PUT de l'accueil,
  `src/lib/home-photo.ts`, fichier `images/accueil.jpg` ; `<title>`/description de l'accueil = textes `titre`/`description` de sa section « Référencement »), lien et
  **textes** réglables (`SitePageForm.vue`, `PUT /api/admin/pages-du-site/<id>`,
  `saveSitePage()`), écarts écrits dans `src/content/pages/_pages-site.md`
  (collection `sitePages`) ; lecture au build `getSitePage(id)`
  (`src/lib/site-pages-content.ts`). Nouvelle page de bibliothèque = entrée
  `SITE_PAGES` + `getSitePage()` dans la page `.astro`. Ordre : glisser-déposer
  ou flèches ↑/↓ du module → `PUT /api/admin/ordre-menu` (`saveMenuOrder()`) ; une nouvelle
  page se place en dernier (`menuOrderFor()`).
- **Module « Activités »** (`redacteur`) : `ActivitiesModule.vue` +
  `modules/activites/ActivityForm.vue`, `src/lib/activity-writer.ts`
  (validation = schéma `activites`, frontmatter modifié en place via `yaml`
  Document — commentaires gardés —, transaction sur tout
  `src/content/activites/` : `src/lib/content-transaction.ts`, partagée avec
  `page-writer.ts`), routes `/api/admin/activites*` (`ordre` = glisser-déposer
  ou flèches ↑/↓ par catégorie, `order` renuméroté 1, 2, 3…). Adresse (dossier) fixée à la
  création ; changer de catégorie change l'URL et place la fiche en dernier.
  **Catégories** gérées dans le même module (`CategoryForm.vue`,
  `src/lib/category-writer.ts`, routes `/api/admin/activites/categories*`,
  ordre avec celui des fiches dans `ordre`) : fichier de l'asso
  `src/content/activites/_categories.yaml` (lu par `src/lib/categories.ts`,
  `?raw` + zod via `import.meta.glob` ; absent = `DEFAULT_CATEGORIES`),
  adresse fixée à la création, suppression d'une catégorie vide seulement,
  icônes proposées : `src/lib/category-icons.ts`.
- `src/lib/navigation.ts` — `getNavTree()` fusionne les pages du site actives et les
  pages `menu.show: true`, l'arborescence de dossiers produisant les menus
  déroulants (libellé de dropdown non cliquable, enfants seuls cliquables).
- `src/config/site.ts` — réglages du site (couleurs `colors` → `themeCss`
  injecté dans `<head>` par les deux layouts, remplace les `--color-*` de
  `@theme` ; jamais de couleur du thème en hexadécimal dans le code :
  `var(--color-primary)` ou classe Tailwind ; bouton CTA « Adhérer », « Je
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

Listes ordonnables (menu, activités et catégories, modules de l'accueil,
éléments d'un bloc) : glisser-déposer `vue-draggable-plus` (SortableJS ;
`<VueDraggable v-bind="sortableProps" :model-value @update:model-value>`,
réglages dans `src/components/admin/context.ts`, saisie par la poignée
`modules/pages/DragHandle.vue` seulement) **et** flèches
`modules/pages/OrderArrows.vue` (masquées ≥ `lg`, réapparaissent au focus
clavier) : les deux modifient le même brouillon d'ordre, enregistré à part.

Sous le texte Markdown des actualités, pages et activités : bloc « Insérer
un lien vers une page du site » (`src/components/admin/LinkPicker.vue`,
`v-model` = texte + `field` = zone de saisie ; liste `GET /api/admin/liens`
← `src/lib/site-links.ts`, lue dans les sources : pages du site actives +
pages applicatives `SERVICE_PAGES`, pages de contenu, catégories et fiches,
actualités ; brouillons / réservées / à paraître signalés par `note`).
Aussi sous les champs `markdown` (insertion) et `url` (`mode="url"` :
remplace l'adresse) des blocs et modules de l'accueil (`BlocFields.vue`) ;
liste partagée entre instances (cache module, 1 min).

En tête de ces formulaires (et de celui du module Comptes), `FormHeader.vue` : bouton de retour à la liste
(couleur accent) puis pastille ronde (icône modifier / créer) + titre suivant la saisie (vide :
titre enregistré ou « Nouvelle … »).
Formulaires d'actualité, de page et d'activité **en onglets** Informations /
Contenu / Image (`FormTabs.vue` + `form-tabs.ts` : `EDIT_TABS`,
`useFormTabs()` dont `onInvalid` en `@invalid.capture` ramène sur l'onglet
d'un champ requis vide ; aussi utilisé par le module Association). En
modification, `EditFileBar.vue` au-dessus : télécharger le `.md` construit
depuis le formulaire / charger un `.md` modifié qui remplit le formulaire
(sans publier) ; `src/components/admin/markdown-file.ts` +
`modules/actualites/news-markdown.ts`, `modules/activites/activity-markdown.ts`,
`modules/pages/page-markdown.ts` (`pageMarkdownFile`, `parsePageMarkdown`).

- `src/components/admin/AdminLoader.astro` (dans les deux layouts) ne
  charge l'îlot Vue (`mount.ts` → `AdminRoot.vue`) que si le cookie
  indicateur `numerik_connecte` existe ou au clic : rien pour un visiteur.
- `src/middleware.ts` — `Astro.locals.user` ; `/api/auth/*` et
  `/api/admin/*` : requêtes du site seulement ; `/api/admin/*` exige une
  connexion ; `GUARDS` réserve des préfixes à des groupes
  (`/api/admin/comptes`, `/api/admin/version`, `/api/admin/association` et `/api/admin/charte` → `admin`, `/api/admin/actualites`,
  `/api/admin/publication`, `/api/admin/activites`, `/api/admin/pages`, `/api/admin/menus-deroulants`,
  `/api/admin/liens`, `/api/admin/pages-du-site` et `/api/admin/ordre-menu` →
  `redacteur`, `/api/admin/journal` → `superadmin` seul).
- **Journal des modifications** : `src/lib/journal.ts` (`logEvent()`,
  `<DATA_DIR>/journal/<AAAA>.jsonl`, ajout seul), appelé par chaque route
  d'admin et par `site-build.ts` (résultat des publications).
- **Badge « Mise à jour X.Y.Z »** (barre, bureau seul) : `GET
  /api/admin/version` → `src/lib/model-version.ts` (`package.json` construit
  vs dernière Release GitHub, cache mémoire 6 h, jamais bloquant). Fermer
  l'encadré de publication = `dismissStatus()` (définitif, pour tous, journalisé).
  Nouvelle action d'admin = un `logEvent()` + son libellé dans `JournalModule.vue`.
- **Enregistrer sans publier** (lot) : `PublishButtons.vue` (2 boutons
  d'envoi, `isDeferredSubmit(event)`), `ConfirmIconButton` `deferrable`
  (`confirm(deferred)`) → `?publier=non` (`SaveOptions` de `client.ts`) ;
  serveur : `publishBlocked(request)` ouvre le lot (copie de `src/content/`
  dans `<DATA_DIR>/publication/lot/`) avant écriture, `publishChange({ request, … })`
  l'y ajoute au lieu de reconstruire (`src/lib/publication-lot.ts`, route
  `/api/admin/publication/lot`). Toute reconstruction réussie referme le lot
  (`clearLot()` dans `site-build.ts` ; redémarrage : empreinte comparée dans
  `readLot()`). Client : `lot.ts` (store, badge `isPendingHref`), bouton
  « À publier (N) » de `AdminRoot`, encadré de `PublishStatus`,
  `usePublication().afterSave(label, result)`. Nouvelle route qui modifie le
  contenu = `publishBlocked(request)` + `publishChange`.
- **Fin de publication** (`usePublication`, option `module`) : publication
  suivie réussie → compte à rebours 3 s dans `PublishStatus` (« Ne pas
  actualiser ») puis rechargement de la page, module rouvert
  (`reopenAfterReload` → `takeModuleToReopen` dans `AdminRoot`) ; page en
  404 (supprimée, déplacée) → `status.href` ou l'accueil.
- Modules : Pages réservées (masqué pour qui a « Pages » : `replacedBy`), **Actualités**, **Pages**, **Activités**, **Association** (bureau), Comptes, Journal (`exclusive`,
  `superadmin` seul) ; Mon compte (module Comptes ouvert sur sa
  propre fiche : `AccountsModule.vue` prop `self`, via `props` du registre ;
  nom + email seuls, `GET`/`PUT /api/admin/mon-compte`, `readProfileFields()`,
  plus le changement de mot de passe : `PasswordModule.vue` intégré, aussi
  modale du mot de passe provisoire) est rangé (`placement: 'user'`) avec Déconnexion dans le menu déroulant
  du nom, en fin de barre (pleine largeur, badge serveur juste avant).
  Actualités et Pages sont regroupées sous **Contenu ▾** (`menu: 'contenu'`,
  `ADMIN_MENUS` / `barEntries()` dans `modules.ts`, sous-liens côte à côte ;
  un seul module visible du menu = bouton direct).

### HTML des actualités

Le HTML est **autorisé** dans les actualités (souhait explicite : ne jamais le
bloquer). Il est **nettoyé à l'affichage** par la page d'article
(`renderNews()` → `sanitizeNewsHtml()`, `src/lib/sanitize-news.ts`, sur
`entry.rendered.html`) : balisage, classes, styles, tableaux gardés ; `<script>`,
`<style>`, `on…=`, `javascript:`, svg/math et iframes hors `IFRAME_HOSTS`
(YouTube, Vimeo, PeerTube, OpenStreetMap) retirés. Le moteur Markdown du site
(Satteri, défaut d'Astro 7) n'est PAS modifié. Même nettoyage pour les
pages `.md` (`pageParts()`, publiables depuis le module « Pages ») et le
texte de leurs blocs, et pour les fiches d'activité (`renderActivity()`,
modifiables depuis le module « Activités »).

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
  aux slugs de `_categories.yaml` (`src/lib/categories.ts`), `cover:` via `image()`.
  `src/lib/activites.ts` : `getAllActivities()`, `getActivitiesByCategory()`,
  `renderActivity()` (async). Détail : [docs/activites.md](docs/activites.md).
- `association.yaml` (pas une collection) — nom, coordonnées, mentions
  légales de l'association, fichier propre à chaque déploiement qu'une mise
  à jour du modèle ne remplace pas. Importé en `?raw` et validé (zod) par
  `src/lib/association.ts`, lecture **synchrone** voulue (`association` est
  utilisé partout, jusque dans `content.config.ts` et l'îlot Vue) ; champ
  invalide = build en échec avec le chemin du champ. Modifiable par le
  bureau depuis le module **« Association »**, onglet « Généralités »
  (`AssociationModule.vue` → `association/GeneralForm.vue`,
  `src/lib/association-writer.ts` : valeurs changées en place via `yaml`
  Document — commentaires gardés —, fichier revalidé par
  `parseAssociation()`, restauré si le build échoue ; route
  `/api/admin/association`). Réseaux sociaux reconnus : `SOCIAL_NETWORKS`
  (`association.ts`, partagé avec `Footer.astro`). Onglet « Charte
  graphique » (`association/BrandForm.vue`, `src/lib/brand-writer.ts`,
  route `/api/admin/charte`) : `colors:` de `reglages.yaml` (en place,
  revalidé par `parseReglages()`), `logo.*` et `favicon.*` d'`images/`
  (raster passé par sharp, SVG à contenu actif refusé, SVG d'icône →
  `favicon.png` en plus), aperçu en direct et contraste du texte blanc
  (`association/contrast.ts`).
- `partenaires.yaml` (pas une collection, même principe qu'`association.yaml`)
  — `src/lib/partenaires.ts` : `partenaires` (cartes `PartenairesSection`,
  absente si liste vide), `relaisAdhesion` (`relais: true` : cités sur
  `/adherer` et, en prop, dans le récap de `AdhesionForm.vue` — jamais le
  YAML côté visiteur), `avantage` (`**gras**`, `avantageHtml()`).
- `images/` (pas une collection) — logo (obligatoire), photo d'accueil,
  favicon(s) de l'asso, retrouvés par `import.meta.glob` (extension libre)
  dans `src/lib/site-images.ts` (`logo`, `logoWidth()`, `accueilImage`,
  `favicons`) ; `/favicon.ico` servi par `src/pages/favicon.ico.ts`.
  `public/` est vide : n'y rien mettre de propre à une asso.
- `annonces` — `src/content/annonces.yaml` (loader `file()`, liste avec
  `id`) ; `position` ajoutée par le parser du loader pour garder l'ordre du
  fichier. `src/lib/annonces.ts` : `getAnnonces()` (async). Détail :
  [docs/annonces.md](docs/annonces.md).

## Référencement (SEO)

`src/components/layout/SeoHead.astro` (dans les deux layouts) : canonique
sans « / » final (`trailingSlash: 'never'`, `cleanPath()`), Open Graph +
`twitter:card` (image de la page, sinon photo d'accueil, sinon logo), lien
RSS, JSON-LD (`src/lib/seo.ts` : `Organization` + `WebSite` sur l'accueil,
`BreadcrumbList`, `NewsArticle` via la prop `jsonLd`). `src/pages/robots.txt.ts`,
`src/pages/sitemap.xml.ts` (pages publiques seulement ; nouvelle page de
service = l'y ajouter). Détail : [docs/referencement.md](docs/referencement.md).

## Composants réutilisables

### Agenda hebdomadaire

Affiche le planning des séances de la semaine, jour par jour, avec code
couleur par famille d'activité.

- `src/lib/agenda.ts` — types et données de repli. `AgendaSession` (jour,
  horaires, intitulé, `animators` et `location` facultatifs, `kind`, `note`
  facultative). `AGENDA_KIND_META` associe à chaque `kind` (`parcours`,
  `fablab`, `espace-jeune`, `bidouille-repair`, `ateliers`, `rdv`) un
  libellé, une icône Font Awesome et des classes / hex de couleur ; ajouter
  un `kind` = ajouter une entrée ici (`kind: 'rdv'` = permanences du plugin
  RDV ; `legend` d'une séance remplace le libellé de la légende). Les
  permanences de prise de RDV (`permanences` de
  `src/plugins/rdv/lib/permanences.ts`, `permanencesAffichees()` pour le
  planning, vide si le plugin est inactif) sont lues dans `permanences:` de
  `src/content/rdv.yaml` (validé : jours d'`AGENDA_DAYS`, une par jour,
  heures « 09h00 » piles/demies dans 09h–20h ; liste vide = encart
  `RdvCtaSection` absent) — dispositif géré à
  part de la programmation de l'association, jamais dans Grist. `groupByDay()`
  regroupe et trie les séances selon `AGENDA_DAYS`. Plus de planning figé
  (`weeklyAgenda` supprimé le 2026-10-09) : Grist injoignable = permanences
  seules + avertissement (`notice`).
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
  props : `sessions` (**obligatoire** — `/activites` passe permanences +
  créneaux venus de Grist), `notice` (avertissement au-dessus de la grille),
  `showHeading`, `title`,
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
  `<WeeklyAgenda sessions={…} showHeading={false} />`.

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
URL publique de la page). Outils : « Copier le lien » (`site.share.copy`, bouton + script du composant :
contournement de `sharer.php` qui tourne sans fin quand on publie au nom d'une
Page Facebook) et partage Facebook (simple lien `sharer.php`,
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

### Plugins (volets activables)

`src/plugins/` — un dossier par plugin, `src/plugins/<id>/` (sous-dossiers
`pages/`, `api/`, `formulaire/`, `sections/`, `admin/`, `lib/`, `images/`
selon les besoins ; `plugin.ts` = manifeste, `index.ts` = ce que le reste
du site en utilise). Catalogue `src/plugins/catalogue.ts` (`PLUGINS`, sans
dépendance), réglage `plugins: { <id>: true }` de `reglages.yaml`
(`site.plugins`, **inactif par défaut**, changer = reconstruire),
`pluginActif(id)` / `disponible(def)` (`src/plugins/index.ts`, aussi dans
le navigateur). Routes d'un plugin **jamais dans `src/pages/`** : ajoutées
par `src/integrations/plugins.ts` (`injectRoute`, d'après
`PLUGIN_MANIFESTS` de `src/plugins/manifests.ts`) pour les seuls plugins
actifs (inactif = 404, rien construit ; `reglages.yaml` surveillé en dev).
Variables d'environnement d'un plugin : `env` de son manifeste, toujours
déclarées dans `astro.config.mjs`. Modules d'accueil / blocs d'un plugin :
`sections/definitions.ts` étalés dans `HOME_MODULES` / `BLOC_TYPES` avec
`plugin: '<id>'`, filtrés par `disponible()` (éditeurs, `index.astro`,
`DEFAULT_HOME`, `BlocView`). Mise à jour d'un site existant vers une
version qui introduit un plugin : ajouter `plugins: <id>: true` à son
`reglages.yaml` **avant**. Détail : [src/plugins/README.md](src/plugins/README.md).
L'adhésion deviendra un plugin plus tard.

### Prise de RDV (plugin `rdv`)

Plugin **générique** `src/plugins/rdv/` (doc : [src/plugins/rdv/README.md](src/plugins/rdv/README.md),
schéma Grist attendu compris) ; **aucune référence à un dispositif dans le
plugin** : tout le propre à l'asso est dans `src/content/rdv.yaml`
(`lib/config.ts` : `rdvConfig`, zod, défauts génériques, modèle commenté
`rdv.exemple.yaml` ; plugin actif sans ce fichier = build en échec) —
`adresse` de la page (lue aussi par `plugin.ts` via fs pour `injectRoute`,
format `lib/adresse.ts`), `ouvert` (+ `textes.fermeTitre/fermeMessage`,
`rdvToggle()` → `<FormGate toggle>` ; plus de `site.forms` pour le RDV),
`textes` (`nom`, `titre`, `description`, `intervenant`, `dejaVenu`,
`urgence`, `consentement` ; `{duree}`/`{heure}`/`{intervenant}` remplis par
`remplir()`), `encart` (textes par défaut de `RdvCtaSection`, `logo`
facultatif dans `src/content/images/`), `planning` (titre + `legend`),
`creneaux` (`duree` 15–60, `semaines`, `urgence`), `profil` (questions :
`genre`, `commune`, `zone`, `trancheAge`, `statut` ; sans question de
profil = étape 4 absente), `civilite`, `icones` (thématiques),
`permanences`, `zones`. L'îlot reçoit ces réglages en props
(`rdvFormProps()`, type `RdvFormReglages`), jamais le YAML. **Listes de
choix lues dans le document Grist** (`lib/listes.ts`, `listChoices()`,
cache 5 min, `GET /api/rdv/listes`) : thématiques (`Demarches.Thematique`,
ordre de la colonne), genre, tranche d'âge, statut (`Beneficiaires`) ;
revérifiées par `/api/rdv/prendre` (champs hors `profil` ignorés). Chemins
ci-dessous relatifs au plugin. Page `pages/rendez-vous.astro`, formulaire
`formulaire/RdvForm.vue` (`client:load`). Parcours en 5 étapes (même motif
que `AdhesionForm.vue`) : démarche → créneau → vous (premier RDV ou déjà
venu) → profil facultatif → consentement/envoi. Module d'accueil et bloc
de type `rdv` (`sections/definitions.ts` ; ancien nom `rdv-conseiller`
accepté à la lecture : `RDV_TYPES_RENOMMES`), champs vides = `encart:`.

- `lib/demarches.ts` — catalogue `Demarches` (Nom, Thematique, Icone,
  Description, Documents) tenu **dans Grist** par l'asso. `Documents`
  (une ligne par pièce) rappelé sur l'écran de confirmation seulement.
  Étape 1 en deux temps : thématique (celles qui ont une démarche, ordre
  Grist, icône `icones:`, aussi en repli d'une `Icone` vide) puis démarche.
- `lib/creneaux.ts` — créneaux de `creneaux.duree` sur `creneaux.semaines`.
  `creneaux.urgence: true` : premier créneau de chaque permanence =
  **urgence** (`urgence`, `estCreneauUrgence()`), mention `textes.urgence`
  encadrée au-dessus des horaires, réservable (`reservable`) seulement avec
  une session de l'espace bénévoles (`locals.user`, revérifié par
  `/api/rdv/prendre`, 403 sinon).
- Étape 3 « Vous » : **« C'est mon premier rendez-vous »** (civilité si
  `genre` demandé — choix Grist libellés par `civilite:` —, nom,
  coordonnées) ou **`textes.dejaVenu`** (un seul champ « Prénom et nom »,
  fiche réutilisée telle quelle, étape 4 sautée — dernière étape « 4 »).
- Zones (`zones:` de `rdv.yaml`, `label` = choix Grist `Zone_geographique`) :
  `lib/zones.ts` côté serveur, prop `zones` de `RdvForm.vue`,
  `deduireZone()` (`geographie.ts`), revalidées par `estZoneConnue()`.
- `lib/beneficiaires.ts` — premier RDV : rapproche par **email OU
  téléphone** (un des deux obligatoire, `validation.ts`) ou crée. Déjà
  venu : `rechercherParNomComplet()` = « prénom nom » ou « nom prénom »
  **exacts** (hors accents/casse/tirets, jamais partiel, un mot seul ne
  suffit pas), ne renvoie que prénom/nom de la fiche et un indice masqué ;
  `beneficiaireCorrespond()` revérifie à l'envoi (un id seul ne suffit pas).
- `lib/reservation.ts` — revérifie la disponibilité puis écrit la ligne `RDV`.
- Routes (`api/`, déclarées dans `plugin.ts`) : `GET /api/rdv/creneaux`,
  `GET /api/rdv/demarches`, `GET /api/rdv/listes`, `GET /api/rdv/commune`,
  `GET /api/rdv/beneficiaires` (`?q=<prénom nom>`), `POST /api/rdv/prendre`,
  `GET /api/rdv/ics` (`?date=&heure=&demarche=<id>`, titre `textes.nom`,
  lieu et documents recalculés côté serveur).
- `lib/ics.ts` — événement d'agenda partagé par la route `.ics` et le QR
  code (heure Europe/Paris convertie en UTC, durée `creneaux.duree`).

Pistes de suite non traitées (à reprendre si redemandé) :
1. Mécanisme de collecte de l'évaluation bénéficiaire.
2. Notification email/SMS de confirmation ou de rappel de RDV.
3. Vue admin pour lister/annuler des RDV (aujourd'hui uniquement gérable
   depuis Grist directement) — prochaine étape, dans `admin/` du plugin.
4. Suppression de `Table1` (table Grist vide créée par défaut, sans impact).

## CI

`.github/workflows/ci.yml` (GitHub Actions, push `master`/`DEV` + PR) :
`npm ci`, `astro check`, `npm run build` avec `SITE_URL` fictif et secrets
« témoins » (`temoin-ci-…`, échec s'ils apparaissent dans `dist/`), puis
`docker build` + démarrage d'un conteneur (site construit au démarrage, doit
répondre). Ne déploie rien. Détail : [docs/ci.md](docs/ci.md).
Job `mise-a-jour-docker` : images locales 0.0.1/0.0.2/0.0.3 (cassée),
`./update.sh` sondé pendant la bascule, version cassée refusée.
Tag `vX.Y.Z` (créé par `npm version` sur master) →
`.github/workflows/release.yml` : contrôles du tag, CI (`workflow_call`),
image `ghcr.io/numerik-co/numerik2026` (`X.Y.Z`, `X.Y`, `latest`), Release
GitHub avec notes. Détail : [docs/mise-a-jour.md](docs/mise-a-jour.md).

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
