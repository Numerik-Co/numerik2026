# numérik&Co — site associatif

Site de l'association **numérik&Co**, développé avec [Astro 7](https://docs.astro.build) et [Tailwind CSS 4](https://tailwindcss.com).

## Démarrage rapide

```sh
npm install
npm run dev
```

Le site est alors disponible sur `http://localhost:4321`.

> En session avec l'assistant IA, le serveur de dev se lance en tâche de fond avec `astro dev --background` (voir `CLAUDE.md`), géré ensuite avec `astro dev stop` / `astro dev status` / `astro dev logs`.

| Commande            | Action                                    |
| :------------------ | :----------------------------------------- |
| `npm run dev`        | Lance le serveur de développement          |
| `npm run build`       | Génère le site statique dans `./dist/`     |
| `npm run preview`     | Prévisualise le build de production        |
| `npm run astro ...`   | Accès direct à la CLI Astro                |

## Documentation

La documentation détaillée est dans le dossier [`docs/`](docs/), organisée **par besoin** :

| Je veux... | Voir |
| :--- | :--- |
| Publier ou modifier une actualité | [docs/actualites.md](docs/actualites.md) |
| Publier ou modifier une activité (parcours, atelier...) | [docs/activites.md](docs/activites.md) |
| Créer ou modifier une page (ex: une nouvelle rubrique) | [docs/pages.md](docs/pages.md) |
| Changer les couleurs, les polices ou le logo | [docs/theme.md](docs/theme.md) |
| Savoir quels composants réutiliser (boutons, cartes, sections...) | [docs/composants.md](docs/composants.md) |
| Modifier les liens du menu ou du pied de page | [docs/navigation.md](docs/navigation.md) |
| Comprendre l'organisation technique du projet | [docs/developpement.md](docs/developpement.md) |

## Structure du projet (vue rapide)

```text
src/
├── components/         # Briques réutilisables (Button, Card, ArticleCard, ActivityCard, Header, Footer...)
│   └── sections/        # Sections de page assemblées à partir des briques (Hero, CtaSection...)
├── contents/
│   ├── news/            # Actualités : un dossier par article (index.md + image)
│   └── activites/       # Activités : un dossier par activité (index.md + image)
├── layouts/             # Layout.astro : squelette HTML commun à toutes les pages
├── lib/                 # Fonctions utilitaires (news.ts, activites.ts : lecture/tri du contenu)
├── pages/               # Une route par fichier (index.astro = "/", actualites.astro = "/actualites"...)
└── styles/              # global.css (couleurs, polices), fonts/, img/ (logo)
```

Pour le détail de chaque dossier, voir [docs/developpement.md](docs/developpement.md).
