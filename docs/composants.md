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
| `Breadcrumb.astro` | Fil d'Ariane (`Accueil > ... > page courante`). Prend un tableau `items` (`{ label, href? }`) ; seul le dernier élément (page courante) n'a pas de `href`. Ne se rend pas si `items` contient moins de 2 éléments. Voir [navigation.md](navigation.md). |
| `TableOfContents.astro` | Sommaire ("Sur cette page") à placer dans le slot `sidebar` d'`ArticleLayout`. Prop `headings: { depth, slug, text }[]` (type `Heading` de `src/lib/headings.ts`) ; ne garde que `depth` 2-3, ne se rend pas s'il reste moins de 2 entrées — c'est ce qui fait que la colonne annexe n'apparaît que "selon le contenu". Défilement animé au clic (`scroll-behavior: smooth` + `scroll-margin-top` sur les `h2`/`h3`, dans `global.css`, avec respect de `prefers-reduced-motion`). Le lien du titre actuellement lu est surligné automatiquement au scroll (script `IntersectionObserver`-like sur `getBoundingClientRect`, classe `.is-active` définie dans `global.css`) — même style que le survol (liseré bleu à gauche). |
| `ReadingProgress.astro` | Module "X min de lecture" + barre de progression qui se remplit avec le scroll de la page. Prop `minutes: number`. Placé juste au-dessus de `TableOfContents` dans le slot `sidebar`, uniquement quand le sommaire est lui-même affiché (même condition `headings.length > 1`). Le temps de lecture est calculé automatiquement au build (`estimateReadingTime()` dans `src/lib/reading-time.ts`, ~200 mots/minute) à partir du contenu brut markdown, et exposé via le champ `readingTime` de `NewsArticle`/`Activity` (`src/lib/news.ts`, `src/lib/activites.ts`). |
| `Header.astro` | En-tête du site : logo, navigation, bouton "Adhérer", menu mobile. |
| `Footer.astro` | Pied de page : logo, coordonnées, réseaux sociaux, copyright. |

> `ArticleLayout.astro` (le conteneur 2 colonnes article/sommaire, voir plus bas) vit dans `src/layouts/ArticleLayout.astro`, pas dans `src/components/` — comme `Layout.astro`, c'est un gabarit de mise en page plutôt qu'une brique visuelle.

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

## Page longue avec sommaire (`ArticleLayout` + `TableOfContents`)

`ArticleLayout` (`src/layouts/ArticleLayout.astro`) est le conteneur de page longue (détail actualité/activité, pages légales, sous-pages Association). Sans le slot nommé `sidebar` : une seule colonne (`<article class="mx-auto max-w-3xl px-4 py-16 sm:px-6">`). Avec ce slot rempli : bascule en 2 colonnes — `article` en largeur flexible (`minmax(0,1fr)`) + `aside` collant de 240px (visible à partir de `lg:`).

Utilisé sur les pages de détail actualité/activité et les pages légales/Association, avec `ReadingProgress` au-dessus de `TableOfContents` dans le même slot :

```astro
<ArticleLayout>
	{headings.length > 1 && (
		<Fragment slot="sidebar">
			<ReadingProgress minutes={readingTime} />
			<TableOfContents headings={headings} />
		</Fragment>
	)}

	<!-- contenu de l'article -->
</ArticleLayout>
```

- Pour une page markdown (actualité, activité), `headings` et `readingTime` viennent directement de `article.headings`/`article.readingTime` (ou `activity.*`) — voir `src/lib/news.ts`/`src/lib/activites.ts`. Les `id` des `<h2>`/`<h3>` sont générés automatiquement par Astro.
- Pour une page `.astro` écrite à la main (ex. `mentions-legales.astro`), il n'y a pas de génération automatique : ajouter un `id` à chaque `<h2>` et déclarer le tableau `headings` correspondant dans le frontmatter, dans le même ordre (pas de `ReadingProgress` sur ces pages, faute de contenu markdown source pour calculer un temps de lecture).
- Le test `headings.length > 1` avant de passer le slot `sidebar` (plutôt que de compter sur `TableOfContents` seul) est ce qui permet à `ArticleLayout` de rester en une seule colonne quand il n'y a rien à mettre dans la colonne annexe — et c'est la même condition qui masque `ReadingProgress`.

## Convention de style

Toutes les briques et sections respectent la même palette (`bg-primary`, `text-secondary`, `bg-accent`...) et les mêmes rayons/ombres (`rounded-2xl`, `border-gray-100`, `shadow-sm hover:shadow-md`) — réutiliser ces classes pour toute nouvelle carte ou bloc garde le site cohérent visuellement. Voir [theme.md](theme.md) pour la liste des couleurs disponibles.
