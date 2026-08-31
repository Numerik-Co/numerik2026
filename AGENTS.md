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

- `src/lib/agenda.ts` — données et types. `weeklyAgenda: AgendaSession[]` est
  le planning par défaut (jour, horaires, intitulé, `animators` et `location`
  facultatifs, `kind`, `note` facultative). `AGENDA_KIND_META` associe à
  chaque `kind` (`parcours`, `fablab`, `espace-jeune`, `bidouille-repair`,
  `conseiller-numerique`) un libellé, une icône Font Awesome et des classes /
  hex de couleur ; ajouter un `kind` = ajouter une entrée ici. Les
  permanences du Conseiller Numérique sont générées par le helper
  `conseillerNumerique` (chaque matin de semaine, lieu variable). `groupByDay()`
  regroupe et trie les séances selon `AGENDA_DAYS`. **Modifier le planning =
  éditer `weeklyAgenda`** (fichier de code, pas de contenu Markdown).
- `src/components/sections/WeeklyAgenda.astro` — le composant.
  `<WeeklyAgenda />` rend le planning par défaut ; props : `sessions`
  (jeu de séances personnalisé), `showHeading`, `title`, `description`,
  `showLegend`, `startHour` / `endHour` (bornes de l'axe horaire, défaut
  9 → 20), `class` (utilitaires ajoutés au `<section>`). Rendu en grille
  agenda : axe des heures à gauche, une colonne par jour, blocs positionnés
  par `grid-row` calculé depuis les horaires (lignes de 30 min) ; scroll
  horizontal sous ~44rem. Les horaires doivent tomber sur des multiples de
  30 min et tenir dans `[startHour, endHour]`.
- Consommé par `src/pages/activites.astro`. Réutilisable ailleurs :
  `import WeeklyAgenda from '../components/sections/WeeklyAgenda.astro'` puis
  `<WeeklyAgenda showHeading={false} />` (ex. bloc dans une page d'accueil ou
  filtré via `sessions`).

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
