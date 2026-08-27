# Publier une actualité

Les actualités sont des fichiers **Markdown**, un dossier par article, dans `src/contents/news/`. Aucune base de données : ajouter un dossier suffit pour que l'article apparaisse sur le site.

## Créer un nouvel article

1. Créer un dossier dans `src/contents/news/`, nommé **`AAAA-MM-JJ-slug-du-titre`** — la date de publication en préfixe, puis un slug lisible. C'est aussi ce préfixe qui compose l'URL de l'article :

   ```
   src/contents/news/2026-09-15-atelier-photo-numerique/
   ```

   Nommer les dossiers ainsi les fait apparaître triés chronologiquement dans un explorateur de fichiers, sans avoir à ouvrir chaque `index.md` pour connaître sa date.

2. À l'intérieur, créer un fichier `index.md` avec ce frontmatter :

   ```markdown
   ---
   title: "Titre de l'actualité"
   isPublish: true
   publishAt: 2026-09-15
   excerpt: "Un court résumé (1-2 phrases) affiché dans les cartes de la liste et de l'accueil."
   tag: "Ateliers"
   author: "numérik&Co"
   ---

   Le corps de l'article en Markdown : paragraphes, **gras**, sous-titres `## ...`,
   citations `> ...`, liens `[texte](https://...)`.
   ```

   | Champ | Obligatoire | Rôle |
   | :--- | :--- | :--- |
   | `title` | oui | Titre affiché partout (carte, page de détail, flux RSS) |
   | `isPublish` | non | `false` pour masquer l'article partout (listes, accueil, flux RSS) et faire 404 sa page de détail — un brouillon reste dans le dossier sans être visible. Absent ou `true` = publié |
   | `publishAt` | oui | Format `AAAA-MM-JJ`, doit correspondre à la date en préfixe du nom de dossier. Sert au tri (plus récent en premier) et à l'affichage (`19 mai 2026`) |
   | `excerpt` | oui | Résumé court, utilisé dans les cartes et la description du flux RSS |
   | `tag` | non | Catégorie affichée en pastille + utilisée par les **filtres** de la page Actualités |
   | `author` | non | Affiché à côté de la date |
   | `imageCredit` | non | Légende affichée sous l'image **sur la page de détail uniquement** (ex. `"Photo : Prénom Nom / Source"`). Si absent ou vide, retombe automatiquement sur `"Photo : <nom de l'association>"` (voir `src/lib/association.ts`) |

3. (Optionnel) Ajouter une image de couverture dans le même dossier, nommée `cover.jpg`, `cover.png` ou `cover.webp` :

   ```
   src/contents/news/atelier-photo-numerique/
   ├── index.md
   └── cover.jpg
   ```

   Sans image, une vignette de remplacement (dégradé + texte "Images à venir") s'affiche automatiquement — rien à faire de spécial.

C'est tout : l'article apparaît immédiatement (en dev) sur :
- la page **`/actualites`** (liste complète, triée, avec filtres par tag),
- l'**accueil** (les 3 actualités les plus récentes, section "Les dernières nouvelles de l'association"),
- sa propre page de détail **`/actualites/<nom-du-dossier>`**,
- le **flux RSS** `/rss.xml`.

## Modifier ou supprimer un article

- Modifier : éditer directement le `index.md` du dossier concerné.
- Supprimer : supprimer le dossier entier.
- Changer la date ou le slug (URL) : renommer le dossier — attention, cela change l'URL de la page de détail. Penser à mettre à jour `publishAt` en même temps si la date change, pour que le préfixe du dossier et le tri restent cohérents.

## Comment ça marche techniquement

Toute la logique de lecture est centralisée dans `src/lib/news.ts` (fonction `getAllNews()`), qui :
- écarte les articles avec `isPublish: false`,
- scanne tous les `src/contents/news/*/index.md` et `*/cover.*`,
- associe l'image au bon article via le nom de dossier,
- calcule le `slug` (= nom du dossier, donc `AAAA-MM-JJ-titre`), le `href` (`/actualites/<slug>`), et formate `publishAt` en date française,
- trie par `publishAt` décroissant.

Trois pages consomment cette fonction : `src/components/sections/ActualitesSection.astro` (accueil), `src/pages/actualites.astro` (liste), `src/pages/actualites/[slug].astro` (détail, génère une page statique par article via `getStaticPaths`). Le rendu visuel de chaque vignette est le composant partagé `src/components/cards/ArticleCard.astro` — voir [composants.md](composants.md).

## Pistes d'évolution

- **Contenu réel manquant** : à ce stade, 6 articles ont été migrés depuis l'ancien site (clubmicrosaintpierre.fr) à titre d'exemple/contenu de démarrage. Le site source propose une page 2 avec d'autres actualités plus anciennes, non encore migrées.
- **Astro Content Collections** : si le volume d'actualités grandit beaucoup, on peut migrer vers une vraie [content collection](https://docs.astro.build/en/guides/content-collections/) (dossier `src/content/` avec un schéma de validation) — la fonction `getAllNews()` est le seul endroit à adapter.
