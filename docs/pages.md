# Créer ou modifier une page

Deux mécanismes coexistent :

- **Pages de contenu** (éditoriales) — un simple fichier Markdown dans
  `src/contents/pages/`. Aucune ligne de code à écrire. **C'est le cas courant.**
  Guide pas-à-pas pour les éditeurs : [`src/contents/README.md`](../src/contents/README.md).
- **Pages applicatives** — un `.astro` dans `src/pages/` (routage par fichiers
  d'Astro), pour tout ce qui a une logique propre (listes, filtres, formulaires).

## Pages existantes

| Fichier | URL | Type | Contenu |
| :--- | :--- | :--- | :--- |
| `src/pages/index.astro` | `/` | applicative | Accueil (Hero, Actualités, Activités, CTA) |
| `src/pages/activites.astro` | `/activites` | applicative | Les 4 catégories d'activités |
| `src/pages/activites/[category].astro` | `/activites/<categorie>` | applicative | Liste des activités d'une catégorie (`src/lib/categories.ts`) |
| `src/pages/activites/[category]/[slug].astro` | `/activites/<categorie>/<slug>` | applicative | Détail d'une activité (`src/contents/activites/`) |
| `src/pages/actualites.astro` | `/actualites` | applicative | Liste des actualités + filtres + RSS |
| `src/pages/actualites/[slug].astro` | `/actualites/<slug>` | applicative | Détail d'un article (`src/contents/news/`) |
| `src/pages/adherer.astro` | `/adherer` | applicative | Adhésion à l'association |
| `src/pages/contact.astro` | `/contact` | applicative | Coordonnées + formulaire de contact |
| `src/pages/[...slug].astro` | (voir ci-dessous) | applicative | **Route attrape-tout** qui rend les pages de contenu |
| `src/pages/404.astro` | (toute URL inconnue) | applicative | Page « en construction » |
| `src/pages/rss.xml.js` | `/rss.xml` | applicative | Flux RSS des actualités |
| `src/contents/pages/statuts/index.md` | `/statuts` | contenu | Statuts (lien de pied de page) |
| `src/contents/pages/reglement-interieur/index.md` | `/reglement-interieur` | contenu | Règlement intérieur (lien de pied de page) |
| `src/contents/pages/mentions-legales/index.mdx` | `/mentions-legales` | contenu | Mentions légales (lien de pied de page) |
| `src/contents/pages/association/_group.md` | — | contenu | Décrit le menu déroulant « Association » |
| `src/contents/pages/association/notre-histoire/index.md` | `/association/notre-histoire` | contenu | Histoire de l'association |
| `src/contents/pages/association/ethique-du-logiciel-libre/index.md` | `/association/ethique-du-logiciel-libre` | contenu | Éthique du logiciel libre |
| `src/contents/pages/association/conseiller-numerique/index.md` | `/association/conseiller-numerique` | contenu | Conseiller numérique |

## Ajouter une page de contenu (cas courant)

1. Créer `src/contents/pages/<slug>/index.md` (le chemin du dossier = l'URL) :

   ```
   src/contents/pages/notre-projet/index.md        -> /notre-projet
   src/contents/pages/association/partenaires/index.md  -> /association/partenaires (dans le dropdown)
   ```

2. Frontmatter :

   ```md
   ---
   title: "Notre projet"
   description: "Résumé affiché sous le titre et en méta description SEO."
   menu:
     show: true      # true = visible dans la barre de navigation
     order: 15        # position (petit = plus à gauche / plus haut)
     label: "Projet"  # facultatif : texte du menu si différent du titre
   ---

   Contenu en **Markdown**…
   ```

3. `npm run build` (ou dev) : la route `/notre-projet` et l'entrée de menu
   existent. Aucun `.astro` à créer.

### Détails

- **Hors menu mais accessible** : omettre le bloc `menu:` ou mettre
  `show: false`. Utile pour les pages liées seulement depuis le pied de page.
- **Menu déroulant** : ranger les pages dans un sous-dossier + y placer un
  `_group.md` (`label`, `order`). Voir [navigation.md](navigation.md).
- **Valeurs dynamiques dans le texte** (ex. `mentions-legales` qui injecte les
  coordonnées depuis `src/lib/association.ts`) : utiliser `.mdx` au lieu de
  `.md`. Le `.mdx` accepte `import` / `export const` et des expressions `{...}`.
  La route attrape-tout lit les deux extensions indifféremment.
- **Sommaire** : `src/pages/[...slug].astro` affiche automatiquement le sommaire
  « Sur cette page » si le contenu a plus d'un titre (`<h2>`/`<h3>`).

### Comment ça marche

`src/lib/content-pages.ts` scanne `src/contents/pages/**/index.{md,mdx}` avec
`import.meta.glob` (au build), en déduit le `slug` (= chemin relatif sans
`/index.md`) et lit le frontmatter. `src/pages/[...slug].astro` génère une route
par page via `getStaticPaths()` et la rend avec `ArticleLayout`. Les fichiers
`_group.md` ne produisent pas de route (uniquement des métadonnées de menu).

## Renommer une page de contenu

### Changer seulement le titre affiché (URL inchangée)

Un seul endroit : `title:` dans `src/contents/pages/<slug>/index.md`. L'onglet,
le `PageHeader`, le fil d'Ariane et le libellé de menu (s'il n'y a pas de
`menu.label`) se mettent à jour automatiquement.

### Changer le slug (l'URL change)

1. Renommer le dossier : `src/contents/pages/historique/` →
   `src/contents/pages/notre-histoire/` (ou le déplacer dans un sous-dossier
   pour le faire passer dans un dropdown).
2. `title:` du frontmatter si besoin.
3. Liens entrants : `grep -rn "/historique" src/` — fils d'Ariane d'autres
   pages, liens dans d'autres contenus. Le menu, lui, suit automatiquement.
4. Site en ligne : ajouter une redirection dans `astro.config.mjs` —
   `redirects: { '/association/historique': '/association/notre-histoire' }`.
5. `npm run build` pour vérifier.

Il n'y a plus de fichier `.astro` ni d'appel `getPageBySlug('<slug>')` à tenir
synchronisés : le slug **est** le chemin du dossier.

## Ajouter une page applicative (`.astro`)

Réservé aux pages avec logique propre. Créer `src/pages/ma-page.astro` :

```astro
---
import Layout from '../layouts/Layout.astro';
import PageHeader from '../components/sections/PageHeader.astro';
---

<Layout
	title="Titre · numérik&Co"
	description="Description SEO"
	breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Titre affiché' }]}
>
	<PageHeader slot="page-header" title="Titre affiché" description="Sous-titre" />

	<section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
		<!-- contenu -->
	</section>
</Layout>
```

Pour l'ajouter au menu, l'inscrire dans `builtinNav` de `src/config/site.ts`
(voir [navigation.md](navigation.md)) — le routage par fichiers crée la route,
mais pas l'entrée de menu.

## Lien vers une page inexistante

Tout `href` vers une page pas encore créée retombe sur `src/pages/404.astro`
(statut HTTP 404 réel, présentation soignée). On peut donc poser les liens de
navigation à l'avance.
