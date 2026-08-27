# Organisation technique du projet

## Stack

- **[Astro 7](https://docs.astro.build)** — génération de site statique (chaque page est pré-rendue en HTML au build, pas de serveur applicatif nécessaire en production).
- **[Tailwind CSS 4](https://tailwindcss.com)** — classes utilitaires, configurées directement en CSS via `@theme` dans `src/styles/global.css` (pas de fichier `tailwind.config.js`, c'est le fonctionnement natif de Tailwind 4).
- **`@astrojs/rss`** — génération du flux `/rss.xml`.
- **`@fortawesome/fontawesome-free`** — icônes des catégories d'activités, auto-hébergées (import CSS dans `global.css`, pas de CDN externe).

## Commandes

| Commande | Effet |
| :--- | :--- |
| `npm run dev` | Serveur de dev avec rechargement à chaud (`localhost:4321`) |
| `npm run build` | Build de production dans `./dist/` (fichiers statiques) |
| `npm run preview` | Sert le build de `./dist/` localement, pour vérifier avant mise en ligne |

En session avec l'assistant IA, le serveur de dev tourne en tâche de fond (`astro dev --background`, `astro dev stop`, `astro dev status`, `astro dev logs` — voir `CLAUDE.md` à la racine).

## Arborescence détaillée

```text
src/
├── components/
│   ├── Button.astro, Card.astro, ArticleCard.astro,
│   │   ActivityCard.astro, CategoryCard.astro,
│   │   FigureImage.astro                             # briques réutilisables
│   ├── TableOfContents.astro, ReadingProgress.astro  # sommaire + temps de lecture (slot sidebar d'ArticleLayout)
│   ├── Header.astro, Footer.astro                    # structure commune
│   └── sections/                                     # blocs de page (Hero, CtaSection, PageHeader...)
├── contents/
│   ├── news/<slug>/                                  # un dossier par actualité (index.md + cover.*)
│   └── activites/<slug>/                             # un dossier par activité (index.md + cover.*)
├── layouts/
│   ├── Layout.astro                                  # <html>, <head>, Header + <slot/> + Footer
│   └── ArticleLayout.astro                           # conteneur 2 colonnes article/sommaire (pages longues)
├── lib/
│   ├── news.ts                                       # lecture/tri/formatage des actualités (getAllNews)
│   ├── activites.ts                                  # lecture/tri des activités (getAllActivities, getActivitiesByCategory)
│   ├── reading-time.ts                               # estimation du temps de lecture (~200 mots/minute)
│   └── categories.ts                                 # registre fixe des 4 catégories d'activités (label, icône)
├── pages/
│   ├── index.astro, activites.astro, contact.astro...  # une route par fichier
│   ├── actualites/[slug].astro                       # route dynamique, une page par actualité
│   ├── activites/[category].astro                    # route dynamique, une page par catégorie
│   ├── activites/[category]/[slug].astro             # route dynamique, une page par activité
│   ├── rss.xml.js                                    # endpoint RSS
│   └── 404.astro                                     # page "en construction" (toute route inconnue)
└── styles/
    ├── global.css                                    # couleurs, polices, styles de base + .markdown-content (voir theme.md)
    ├── fonts/                                         # fichiers de polices (Aileron, Como)
    └── img/                                            # logo
```

Pas de dossier `src/assets/` ni `public/` actif à ce stade (contenu de démarrage Astro supprimé) ; les images du site vivent à côté de ce qui les utilise (`src/styles/img/` pour le logo, `src/contents/news/<slug>/` et `src/contents/activites/<slug>/` pour les visuels).

## Configuration Astro (`astro.config.mjs`)

```js
export default defineConfig({
	site: 'https://numerikandco.org', // ⚠️ placeholder — à remplacer par le vrai domaine une fois choisi
	vite: { plugins: [tailwindcss()] },
});
```

Le champ `site` sert à générer des URLs absolues correctes dans le flux RSS (`/rss.xml`). Tant qu'il n'est pas mis à jour avec le vrai nom de domaine, les liens du flux RSS pointeront vers une URL fictive.

## Pour aller plus loin

- [docs/actualites.md](actualites.md) — alimenter les actualités
- [docs/activites.md](activites.md) — alimenter les activités
- [docs/pages.md](pages.md) — créer des pages
- [docs/theme.md](theme.md) — couleurs, polices, logo
- [docs/composants.md](composants.md) — composants disponibles
- [docs/navigation.md](navigation.md) — menu et pied de page
