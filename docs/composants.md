# Composants réutilisables

## Briques de base (`src/components/`)

| Composant | Usage |
| :--- | :--- |
| `Button.astro` | Bouton pilule. Props : `href` (rend un `<a>`, sinon un `<button>`), `variant` (`primary` \| `secondary` \| `outline`), `class` (classes additionnelles). |
| `Card.astro` | Carte simple : titre + contenu libre (slot). Utilisée pour la grille "Adhérer". |
| `ArticleCard.astro` | Carte d'actualité (image ou placeholder, date, auteur, titre, extrait, tag). Prend un objet `article` (voir [actualites.md](actualites.md)). Hauteur fixe `h-116` (464px, échelle dynamique Tailwind 4) pour harmoniser toutes les cartes d'une grille ; titre bloqué à 2 lignes (`line-clamp-2`, `leading-snug`), extrait bloqué à 4 lignes (`line-clamp-4`) ; carte en `flex flex-col`, le tag est poussé en bas via `mt-auto` quel que soit le nombre de lignes utilisées au-dessus. |
| `ActivityCard.astro` | Carte d'activité (image ou placeholder, titre, extrait, lien "En savoir plus" et pastille de niveau optionnelle, tous deux ancrés en bas de carte), utilisée sur une page catégorie. Prend un objet `activity` (voir [activites.md](activites.md)). |
| `CategoryCard.astro` | Carte de catégorie d'activité : badge icône [FontAwesome](https://fontawesome.com/search?ip=classic&s=solid) + libellé en majuscules, pas d'image. Prend un objet `category` (`{ slug, label, icon }` depuis `src/lib/categories.ts`). |
| `FigureImage.astro` | Image (`astro:assets`) encapsulée dans un `<figure>`, avec `<figcaption>` optionnel affiché uniquement si un `caption` est fourni. Utilisé sur les pages de détail (actualité, activité) pour créditer une photo. |
| `Breadcrumb.astro` | Fil d'Ariane (`Accueil > ... > page courante`). Prend un tableau `items` (`{ label, href? }`) ; le dernier élément (page courante) n'a jamais de `href` et reçoit seul `aria-current="page"`. Un élément intermédiaire peut aussi omettre `href` (ex. un libellé de menu déroulant sans page "hub" propre) : il s'affiche alors en texte simple, sans lien ni `aria-current`. Ne se rend pas si `items` contient moins de 2 éléments. Voir [navigation.md](navigation.md). |
| `Article.astro` | Grille 2 colonnes article/sommaire. Sans le slot nommé `sidebar` rempli : une seule colonne (`<article class="mx-auto max-w-3xl px-4 py-16 sm:px-6">`). Avec ce slot rempli : bascule en 2 colonnes — `article` en largeur flexible (`minmax(0,1fr)`) + `aside` collant de 240px (visible à partir de `lg:`). Utilisé uniquement par `ArticleLayout` (voir plus bas) — pas destiné à être appelé directement depuis une page. |
| `TableOfContents.astro` | Sommaire ("Sur cette page") à placer dans le slot `sidebar` d'`Article`. Prop `headings: { depth, slug, text }[]` (type `Heading` de `src/lib/headings.ts`) ; ne garde que `depth` 2-3, ne se rend pas s'il reste moins de 2 entrées — c'est ce qui fait que la colonne annexe n'apparaît que "selon le contenu". Défilement animé au clic (`scroll-behavior: smooth` + `scroll-margin-top` sur les `h2`/`h3`, dans `global.css`, avec respect de `prefers-reduced-motion`). Le lien du titre actuellement lu est surligné automatiquement au scroll (script `IntersectionObserver`-like sur `getBoundingClientRect`, classe `.is-active` définie dans `global.css`) — même style que le survol (liseré bleu à gauche). |
| `ReadingProgress.astro` | Module "X min de lecture" + barre de progression qui se remplit avec le scroll de la page. Prop `minutes: number`. Placé juste au-dessus de `TableOfContents` dans le slot `sidebar`, uniquement quand le sommaire est lui-même affiché (même condition `headings.length > 1`). Le temps de lecture est calculé automatiquement au build (`estimateReadingTime()` dans `src/lib/reading-time.ts`, ~200 mots/minute) à partir du contenu brut markdown, et exposé via le champ `readingTime` de `NewsArticle`/`Activity` (`src/lib/news.ts`, `src/lib/activites.ts`). |
| `Header.astro` | En-tête du site : logo, navigation, bouton "Adhérer", menu mobile. |
| `Footer.astro` | Pied de page : logo, coordonnées, réseaux sociaux, copyright. |

> `ArticleLayout.astro` (le gabarit de page qui compose `Article` + `TableOfContents` + `ReadingProgress`, voir plus bas) vit dans `src/layouts/ArticleLayout.astro`, pas dans `src/components/` — comme `Layout.astro`, c'est un gabarit de page complet plutôt qu'une brique visuelle.

Exemple d'usage de `Button` :

```astro
<Button href="/adherer" variant="primary">Adhérer à l'association</Button>
<Button href="/activites" variant="outline">Découvrir nos activités</Button>
```

## Sections de page (`src/components/sections/`)

Une section = un bloc complet de page (souvent une balise `<section>` pleine largeur), assemblé à partir des briques ci-dessus. Une page (`src/pages/*.astro`) se construit en empilant des sections dans un `<Layout>`.

| Section | Rôle | Où elle est utilisée |
| :--- | :--- | :--- |
| `Hero.astro` | Grand titre + accroche + 2 boutons | Accueil |
| `ActivitesSection.astro` | Grille des 4 catégories d'activités (`CategoryCard`, depuis `src/lib/categories.ts` — pas les activités individuelles). Prop `showHeading` (défaut `true`) : sur l'accueil, affiche le titre "Activités" + bouton "Accéder à la page" ; sur `activites.astro`, passé à `false` car la page a déjà son `PageHeader` | Accueil, page Activités |
| `ActualitesSection.astro` | Les 3 actualités les plus récentes + lien "Voir toutes les actualités" | Accueil |
| `CtaSection.astro` | Bandeau d'appel à l'action (dégradé primary→secondary) | Accueil |
| `PageHeader.astro` | Bannière de titre pour les pages internes (dégradé + titre + description). Props : `title`, `description` | Activités, Actualités, Adhérer, Contact |

> ⚠️ Ne pas confondre **Activités** (`activites/`, `ActivitesSection`, `ActivityCard` — les parcours/ateliers proposés par l'association, contenu évergreen) et **Actualités** (`actualites/`, `ActualitesSection`, `ArticleCard` — les news datées). Deux systèmes de contenu distincts, avec le même fonctionnement (dossier + `index.md` + `cover.*`).

## Ajouter une nouvelle section

1. Créer `src/components/sections/MaSection.astro`.
2. L'importer et l'ajouter dans la page souhaitée, ex. `src/pages/index.astro` :

   ```astro
   import MaSection from '../components/sections/MaSection.astro';
   ...
   <Layout>
       <Hero />
       <MaSection />
       <CtaSection />
   </Layout>
   ```

## Page longue avec sommaire (`ArticleLayout`)

`ArticleLayout` (`src/layouts/ArticleLayout.astro`) est un **gabarit de page** à part entière, au même titre que `Layout.astro` — pas un composant qu'on assemble à l'intérieur d'un `<Layout>`. Une page qui l'utilise n'importe qu'`ArticleLayout` : pas besoin de reprendre séparément `Layout`, `PageHeader`, `Article`, `TableOfContents` ou `ReadingProgress`, `ArticleLayout` les compose déjà en interne. Il est réservé aux pages qui affichent un contenu de lecture (article, page légale...) — les pages qui empilent des sections libres (accueil, `activites.astro`...) continuent d'utiliser `Layout` directement (voir plus haut).

```astro
---
import ArticleLayout from '../layouts/ArticleLayout.astro';
---
<ArticleLayout
	title="Titre · numérik&Co"
	description="Description pour les moteurs de recherche"
	breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Titre affiché' }]}
	pageHeaderTitle="Titre affiché"
	pageHeaderDescription="Sous-titre optionnel affiché sous le titre"
	headings={headings}
	readingTime={readingTime}
>
	<!-- contenu de l'article -->
</ArticleLayout>
```

Props :

| Prop | Rôle |
| :--- | :--- |
| `title`, `description`, `breadcrumbs` | Transmis tels quels à `Layout` (balise `<title>`, meta description, fil d'Ariane). |
| `pageHeaderTitle`, `pageHeaderDescription` | Transmis à `PageHeader` (bannière dégradée en haut de page). |
| `headings` | Optionnel, tableau `Heading[]`. Si plus d'une entrée, `ArticleLayout` affiche automatiquement `ReadingProgress` (si `readingTime` est fourni) + `TableOfContents` dans la colonne latérale — sinon la page reste en une seule colonne. |
| `readingTime` | Optionnel (`number`, en minutes). Sans valeur, pas de module temps de lecture même si `headings` en a plusieurs. |

- Pour une page markdown/MDX (actualité, activité, page "légale" — voir [pages.md](pages.md)), `headings` et `readingTime` viennent directement de l'objet de contenu (`article.headings`/`article.readingTime`, `activity.*`, ou `page.headings` via `src/lib/pages.ts`) — Astro (et `@astrojs/mdx` pour le `.mdx`) génère les `id` des `<h2>`/`<h3>` automatiquement, pas besoin de les écrire à la main.
- Le contenu spécifique à une page (ex. `PrevNextNav`, un lien "Retour à ...") se place simplement dans le slot par défaut, avant ou après le `<div class="markdown-content">`.

## Convention de style

Toutes les briques et sections respectent la même palette (`bg-primary`, `text-secondary`, `bg-accent`...) et les mêmes rayons/ombres (`rounded-2xl`, `border-gray-100`, `shadow-sm hover:shadow-md`) — réutiliser ces classes pour toute nouvelle carte ou bloc garde le site cohérent visuellement. Voir [theme.md](theme.md) pour la liste des couleurs disponibles.
