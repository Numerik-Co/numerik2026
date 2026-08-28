# Créer ou modifier une page

Astro utilise le **routage par fichiers** : chaque fichier dans `src/pages/` devient une URL, sans configuration.

## Pages existantes

| Fichier | URL | Contenu |
| :--- | :--- | :--- |
| `src/pages/index.astro` | `/` | Accueil (Hero, Actualités, Activités, CTA) |
| `src/pages/activites.astro` | `/activites` | Les 4 catégories d'activités (icônes) |
| `src/pages/activites/[category].astro` | `/activites/<categorie>` | Liste des activités d'une catégorie (généré automatiquement depuis `src/lib/categories.ts`) |
| `src/pages/activites/[category]/[slug].astro` | `/activites/<categorie>/<slug>` | Détail d'une activité (généré automatiquement, une par dossier dans `src/contents/activites/`) |
| `src/pages/actualites.astro` | `/actualites` | Liste des actualités + filtres + RSS |
| `src/pages/actualites/[slug].astro` | `/actualites/<slug>` | Détail d'un article (généré automatiquement, un par dossier dans `src/contents/news/`) |
| `src/pages/adherer.astro` | `/adherer` | Adhésion à l'association |
| `src/pages/association/index.astro` | `/association` | Page d'accueil de l'association, liens vers ses sous-pages |
| `src/pages/association/notre-histoire.astro` | `/association/notre-histoire` | Histoire de l'association (contenu dans `src/contents/pages/notre-histoire/`) |
| `src/pages/association/ethique-du-logiciel-libre.astro` | `/association/ethique-du-logiciel-libre` | Éthique du logiciel libre |
| `src/pages/association/conseiller-numerique.astro` | `/association/conseiller-numerique` | Présentation du conseiller numérique |
| `src/pages/contact.astro` | `/contact` | Coordonnées + formulaire de contact |
| `src/pages/mentions-legales.astro` | `/mentions-legales` | Mentions légales (lien en pied de page) |
| `src/pages/statuts.astro` | `/statuts` | Statuts de l'association (lien en pied de page) |
| `src/pages/reglement-interieur.astro` | `/reglement-interieur` | Règlement intérieur (lien en pied de page) |
| `src/pages/404.astro` | (toute URL inconnue) | Page "en construction" au thème du site |
| `src/pages/rss.xml.js` | `/rss.xml` | Flux RSS des actualités |

## Ajouter une nouvelle page simple

1. Créer un fichier `src/pages/ma-page.astro` (le nom du fichier = l'URL, ex. `ma-page.astro` → `/ma-page`).
2. Reprendre la structure type d'une page existante, par ex. `src/pages/adherer.astro` :

   ```astro
   ---
   import Layout from '../layouts/Layout.astro';
   import PageHeader from '../components/sections/PageHeader.astro';
   ---

   <Layout
       title="Titre · numérik&Co"
       description="Description pour les moteurs de recherche"
       breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Titre affiché' }]}
   >
       <PageHeader slot="page-header" title="Titre affiché" description="Sous-titre affiché sous le titre" />

       <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
           <!-- contenu de la page -->
       </section>
   </Layout>
   ```

   La prop `breadcrumbs` est optionnelle — l'omettre (comme sur l'accueil et la 404) n'affiche aucun fil d'Ariane. Le `slot="page-header"` sur `<PageHeader>` garantit que le fil d'Ariane s'affiche juste en dessous de lui, pas au-dessus. Voir [navigation.md](navigation.md).

3. Ajouter un lien vers cette page dans le menu si besoin (voir [navigation.md](navigation.md)).

## Ajouter une page "de lecture" (contenu article, sans sections libres)

Pour une page qui affiche un contenu de type article — mentions légales, statuts, une sous-page Association... — plutôt que d'empiler des sections comme ci-dessus, utiliser `ArticleLayout` (voir [composants.md](composants.md#page-longue-avec-sommaire-articlelayout--tablecontents)) et stocker le texte dans `src/contents/pages/<slug>/index.md` :

```md
---
title: "Titre affiché"
description: "Sous-titre optionnel affiché sous le titre"
---

Le contenu de la page, en Markdown.
```

Puis un fichier `src/pages/ma-page.astro` minimal :

```astro
---
import ArticleLayout from '../layouts/ArticleLayout.astro';
import { getPageBySlug } from '../lib/pages';
import { association } from '../lib/association';

const page = getPageBySlug('ma-page');
const { Content } = page;
---

<ArticleLayout
	title={`${page.title} · ${association.name}`}
	description="Description pour les moteurs de recherche"
	breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: page.title }]}
	pageHeaderTitle={page.title}
	pageHeaderDescription={page.description}
	headings={page.headings}
>
	<div class="markdown-content font-light text-gray-700">
		<Content />
	</div>
</ArticleLayout>
```

`ArticleLayout` compose déjà `Layout`, `PageHeader`, le fil d'Ariane et — si le contenu a plus d'un titre — le sommaire "Sur cette page" avec temps de lecture : pas besoin de les réimporter séparément. Voir [composants.md](composants.md) pour le détail des props.

Cas particulier : si le contenu a besoin d'interpoler des valeurs dynamiques (ex. `mentions-legales`, qui injecte les coordonnées de l'association depuis `src/lib/association.ts`), utiliser un fichier `.mdx` à la place de `.md` — `src/lib/pages.ts` lit les deux indifféremment. Un `.mdx` peut contenir des `import`/`export const` et des expressions `{...}` au milieu du texte, exactement comme dans un composant Astro.

## Renommer une page ou changer son titre

Le `getPageBySlug('<slug>')` d'une page de lecture ne fait **aucune transformation** : le `<slug>` passé doit être **exactement le nom du dossier** dans `src/contents/pages/` (tirets, minuscules, pas d'espace). C'est le point qui casse le build si on ne le tient pas synchronisé.

### Cas A — changer seulement le titre affiché (URL inchangée)

Un seul endroit : le frontmatter du contenu.

1. Dans `src/contents/pages/<slug>/index.md`, modifier `title:` (et `description:` si besoin).

Le `<title>` de l'onglet, le `PageHeader`, le dernier maillon du fil d'Ariane se mettent à jour automatiquement (ils lisent `page.title`). **Exception** : le libellé dans le menu (`src/components/layout/Header.astro`) est écrit en dur → le changer aussi à la main si besoin.

### Cas B — renommer la page (le slug et l'URL changent)

Exemple réel : `historique` → `notre-histoire`. Le slug apparaît à **trois endroits qui doivent rester identiques**, plus les liens entrants :

1. **Dossier de contenu** : `src/contents/pages/historique/` → `src/contents/pages/notre-histoire/`
2. **Fichier de route** : `src/pages/association/historique.astro` → `src/pages/association/notre-histoire.astro` (l'URL suit le chemin du fichier → `/association/notre-histoire`)
3. **Argument** de `getPageBySlug('historique')` → `getPageBySlug('notre-histoire')` dans ce `.astro` — identique au nom du dossier de l'étape 1
4. `title:` du frontmatter (`src/contents/pages/notre-histoire/index.md`)
5. **Liens vers l'ancienne URL** : `grep -rn "association/historique" src/` — menu déroulant (`src/components/layout/Header.astro`), fils d'Ariane, liens dans d'autres pages ou contenus
6. Site en ligne : ajouter une redirection dans `astro.config.mjs` pour ne pas casser les liens existants —
   `redirects: { '/association/historique': '/association/notre-histoire' }`
7. `npm run build` pour vérifier. L'erreur `Page introuvable dans src/contents/pages/ pour le slug "…"` signifie que les étapes 1 et 3 sont désynchronisées (le dossier ne s'appelle pas comme l'argument de `getPageBySlug`).

## Créer un sous-dossier de pages (ex: `/adherer/tarifs`)

Un dossier dans `src/pages/` crée un sous-chemin d'URL :

```
src/pages/adherer/index.astro       → /adherer
src/pages/adherer/tarifs.astro      → /adherer/tarifs
```

C'est exactement ce principe qu'utilisent déjà `src/pages/activites/[category].astro` et `src/pages/activites/[category]/[slug].astro` (voir [activites.md](activites.md)) pour générer automatiquement une page par catégorie et par activité, ainsi que `src/pages/association/` (pages statiques classiques cette fois, pas de `getStaticPaths`) :

```
src/pages/association/index.astro                       → /association
src/pages/association/notre-histoire.astro              → /association/notre-histoire
src/pages/association/ethique-du-logiciel-libre.astro    → /association/ethique-du-logiciel-libre
src/pages/association/conseiller-numerique.astro         → /association/conseiller-numerique
```

⚠️ Ceci crée uniquement la **route** — cela ne fait *pas* apparaître automatiquement un sous-menu déroulant dans la navigation. Voir [navigation.md](navigation.md) pour ce point.

## Que se passe-t-il sur un lien qui ne mène nulle part ?

N'importe quel lien vers une page pas encore créée (ex. un `href="/futur-truc"` dans le menu) retombe automatiquement sur `src/pages/404.astro`, une page "en cours de construction" au thème du site (statut HTTP 404 réel, mais présentation soignée avec un bouton retour à l'accueil). C'est volontaire : on peut poser tous les liens de navigation dès maintenant, même si la page n'est pas encore écrite.
