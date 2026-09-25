## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Contenu & navigation

Ce projet est un template déployé pour plusieurs structures. Les pages
éditoriales et le menu se pilotent **uniquement** depuis `src/contents/` — voir
`src/contents/README.md` (guide destiné aux éditeurs).

Fonctionnement technique :

- `src/pages/[...slug].astro` — route attrape-tout ; rend toute page
  `src/contents/pages/<...>/index.{md,mdx}`. Aucun wrapper `.astro` par page.
- `src/lib/content-pages.ts` — découverte des pages via `import.meta.glob`
  (build-time), lecture du frontmatter `menu:` et des fichiers `_group.md`.
- `src/lib/navigation.ts` — `getNavTree()` fusionne `site.builtinNav` et les
  pages `menu.show: true`, l'arborescence de dossiers produisant les menus
  déroulants (libellé de dropdown non cliquable, enfants seuls cliquables).
- `src/config/site.ts` — seul fichier de config par déploiement : bouton CTA
  « Adhérer », pages applicatives du template (Accueil, Activités, Actualités,
  Contact) et ouverture/fermeture des formulaires (`site.forms`).
- `src/components/layout/Header.astro` — consomme `getNavTree()` ; markup
  inchangé, structure `{ label, href, children }`.

Tout est statique (`output: 'static'`) : le menu est calculé au `build`.

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
  Numérique sont générées par le helper exporté `conseillerNumerique`
  (chaque matin de semaine, lieu variable) — dispositif géré à part de la
  programmation de l'association, jamais dans Grist. `groupByDay()`
  regroupe et trie les séances selon `AGENDA_DAYS`. `weeklyAgenda` reste un
  planning figé en dur : **filet de sécurité uniquement**, utilisé si Grist
  est injoignable (voir ci-dessous) ou comme valeur par défaut du
  composant.
- **Source du planning affiché sur `/activites`** : la table Grist
  `Activite` elle-même (chaque ligne est déjà un créneau précis : jour,
  horaires, lieu, encadrant·e·s), lue à chaque requête par
  `fetchPlanningAgenda()` (`src/lib/adhesion/planning.ts`) et recombinée
  avec `conseillerNumerique`. Seules les lignes `Publiee = true` de la
  saison en cours, avec une `Categorie_agenda` renseignée, sont affichées.
  **Modifier le planning = éditer les lignes `Activite` dans Grist**, pas
  le code. Détail des colonnes et du mapping : [docs/api.md](docs/api.md).
- `src/components/sections/WeeklyAgenda.astro` — le composant.
  `<WeeklyAgenda />` rend `weeklyAgenda` (le planning en dur) par défaut ;
  props : `sessions` (jeu de séances personnalisé — c'est ce que passe
  `/activites` avec les créneaux venus de Grist), `showHeading`, `title`,
  `description`, `showLegend`, `startHour` / `endHour` (bornes de l'axe
  horaire, défaut 9 → 20), `class` (utilitaires ajoutés au `<section>`).
  Rendu en grille agenda : axe des heures à gauche, une colonne par jour,
  blocs positionnés par `grid-row` calculé depuis les horaires (lignes de
  30 min) ; scroll horizontal sous ~44rem. Les horaires doivent tomber sur
  des multiples de 30 min et tenir dans `[startHour, endHour]`.
- Consommé par `src/pages/activites.astro` (`prerender = false`, pour lire
  Grist à chaque requête). Réutilisable ailleurs :
  `import WeeklyAgenda from '../components/sections/WeeklyAgenda.astro'` puis
  `<WeeklyAgenda showHeading={false} />` (ex. bloc dans une page d'accueil,
  planning en dur par défaut sauf `sessions` fourni explicitement).

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
créneau → coordonnées → profil facultatif → consentement/envoi.

- `src/lib/rdv/demarches.ts` — catalogue de démarches (table Grist
  `Demarches` : Nom, Thematique, Icone, Description, Documents), alimenté et
  tenu à jour **directement dans Grist** par l'association, aucune admin
  côté site. `Documents` (facultatif, une ligne par document à apporter) est
  affiché en rappel à l'étape 5 et sur l'écran de confirmation de
  `RdvForm.vue`.
- `src/lib/rdv/creneaux.ts` — créneaux de 30 min dérivés de
  `conseillerNumerique` (`src/lib/agenda.ts`).
- `src/lib/rdv/beneficiaires.ts` — rapproche un bénéficiaire par **email OU
  téléphone** (un seul des deux est obligatoire à la saisie, jamais aucun —
  voir `validation.ts` — et le rapprochement ne compare que le champ
  effectivement renseigné) ou en crée un nouveau.
- `src/lib/rdv/reservation.ts` — revérifie la disponibilité puis écrit la
  ligne `RDV` (même doc Grist que `Beneficiaires`/`Demarches`).
- Routes : `GET /api/rdv/creneaux`, `GET /api/rdv/demarches`,
  `GET /api/rdv/commune`, `POST /api/rdv/prendre`, `GET /api/rdv/ics`
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

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
