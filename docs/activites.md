# Publier une activité

> ⚠️ À ne pas confondre avec les **actualités** (voir [actualites.md](actualites.md)). Les **activités** sont les parcours/ateliers proposés par l'association — du contenu évergreen, organisé par **catégorie**, affiché sur `/activites`.

## Les catégories

L'accueil et `/activites` affichent 4 catégories fixes, chacune avec une icône [FontAwesome](https://fontawesome.com/search?ip=classic&s=solid) (auto-hébergée via le package `@fortawesome/fontawesome-free`, pas de CDN externe) :

| Catégorie | Slug | Icône |
| :--- | :--- | :--- |
| Parcours | `parcours` | `fa-route` |
| Ateliers | `ateliers` | `fa-screwdriver-wrench` |
| Médiation numérique | `mediation-numerique` | `fa-people-group` |
| FabLab | `fablab` | `fa-cubes` |

Ce registre vit dans **`src/lib/categories.ts`** — c'est la seule source de vérité pour le libellé, l'icône et la description de chaque catégorie (les activités n'y font référence que par leur slug). La `description` est affichée dans le bandeau (`PageHeader`) de la page `/activites/<slug>`, sous le titre de la catégorie.

**Pour ajouter une 5ᵉ catégorie** : ajouter une entrée `{ slug, label, icon, description }` dans `src/lib/categories.ts`. La carte sur l'accueil/`/activites`, la page `/activites/<slug>` (bandeau de présentation + état vide si aucune activité n'y est encore rattachée) et le routage se mettent à jour automatiquement — rien d'autre à faire.

## Créer une nouvelle activité

1. Créer un dossier dans `src/contents/activites/`, nommé d'après le slug de l'activité :

   ```
   src/contents/activites/atelier-photo-numerique/
   ```

2. À l'intérieur, créer un fichier `index.md` avec ce frontmatter :

   ```markdown
   ---
   title: "Titre de l'activité"
   isPublish: true
   excerpt: "Un court résumé (1-2 phrases) affiché dans les cartes."
   category: "ateliers"
   order: 4
   ---

   Le corps de la page en Markdown : paragraphes, **gras**, sous-titres `## ...`,
   citations `> ...`, liens `[texte](/contact)`.
   ```

   | Champ | Obligatoire | Rôle |
   | :--- | :--- | :--- |
   | `title` | oui | Titre affiché partout (carte, page de détail) |
   | `isPublish` | non | `false` pour masquer l'activité partout (page catégorie, accueil) et faire 404 sa page de détail — un brouillon reste dans le dossier sans être visible. Absent ou `true` = publiée |
   | `excerpt` | oui | Résumé court, utilisé dans les cartes et la description SEO de la page de détail |
   | `category` | oui | Slug d'une catégorie de `src/lib/categories.ts` (`parcours`, `ateliers`, `mediation-numerique`, `fablab`). Détermine sous quelle page catégorie l'activité apparaît, et son URL |
   | `order` | non | Nombre entier, détermine l'ordre d'affichage au sein de sa catégorie (croissant). Sans ce champ, l'activité est affichée en dernier |
   | `level` | non | Niveau du cours (ex. `"Grand débutant"`, `"Initiation"`, `"Perfectionnement"`), affiché en pastille en bas à droite de la carte, à côté du lien "En savoir plus". Sans ce champ, la pastille ne s'affiche pas |
   | `imageCredit` | non | Légende affichée sous l'image **sur la page de détail uniquement** (ex. `"Photo : Prénom Nom / Source"`). Si absent ou vide, retombe automatiquement sur `"Photo : <nom de l'association>"` (voir `src/lib/association.ts`) |

3. (Optionnel) Ajouter une image dans le même dossier, nommée `cover.jpg`, `cover.png` ou `cover.webp`. Sans image, un placeholder "Images à venir" s'affiche automatiquement sur la carte.

L'activité apparaît alors sur :
- la page **`/activites/<category>`** (liste des activités de sa catégorie),
- sa propre page de détail **`/activites/<category>/<slug>`**.

Elle n'apparaît **pas** directement sur l'accueil ni sur `/activites` : ces deux pages n'affichent que les 4 cartes de catégories (icônes), pas les activités individuelles.

## ⚠️ Droits d'usage des images

Avant d'ajouter une photo trouvée sur le web : vérifier sa licence. Une image créditée à une agence (Shutterstock, Getty...) trouvée sur un autre site n'est **pas** libre de réutilisation, même avec attribution — la licence appartient au site qui l'a achetée. Préférer une banque gratuite (Pexels, Unsplash, Pixabay) ou une photo dont l'association détient les droits.

## Comment ça marche techniquement

La logique de lecture est centralisée dans `src/lib/activites.ts` :
- `getAllActivities()` — écarte les activités avec `isPublish: false`, scanne `src/contents/activites/*/index.md`, associe l'image par nom de dossier, trie par `order`. Calcule `href` en `/activites/<category>/<slug>`.
- `getActivitiesByCategory(categorySlug)` — filtre `getAllActivities()` par catégorie.

Quatre endroits consomment ces fonctions :
- `ActivitesSection.astro` (accueil + `/activites`) — affiche les 4 `CategoryCard` depuis `categories.ts`, pas les activités.
- `activites/[category].astro` — une page statique par catégorie (`getStaticPaths()` sur le registre), grille d'`ActivityCard` via `getActivitiesByCategory()`, état vide si la catégorie n'a aucune activité.
- `activites/[category]/[slug].astro` — une page statique par activité (`getStaticPaths()` sur `getAllActivities()`), avec un lien de retour vers la page de sa catégorie.

Voir [composants.md](composants.md) pour le détail de `CategoryCard.astro` et `ActivityCard.astro`.
