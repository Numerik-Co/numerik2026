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
| `src/pages/association/historique.astro` | `/association/historique` | Historique de l'association |
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

## Créer un sous-dossier de pages (ex: `/adherer/tarifs`)

Un dossier dans `src/pages/` crée un sous-chemin d'URL :

```
src/pages/adherer/index.astro       → /adherer
src/pages/adherer/tarifs.astro      → /adherer/tarifs
```

C'est exactement ce principe qu'utilisent déjà `src/pages/activites/[category].astro` et `src/pages/activites/[category]/[slug].astro` (voir [activites.md](activites.md)) pour générer automatiquement une page par catégorie et par activité, ainsi que `src/pages/association/` (pages statiques classiques cette fois, pas de `getStaticPaths`) :

```
src/pages/association/index.astro                       → /association
src/pages/association/historique.astro                  → /association/historique
src/pages/association/ethique-du-logiciel-libre.astro    → /association/ethique-du-logiciel-libre
src/pages/association/conseiller-numerique.astro         → /association/conseiller-numerique
```

⚠️ Ceci crée uniquement la **route** — cela ne fait *pas* apparaître automatiquement un sous-menu déroulant dans la navigation. Voir [navigation.md](navigation.md) pour ce point.

## Que se passe-t-il sur un lien qui ne mène nulle part ?

N'importe quel lien vers une page pas encore créée (ex. un `href="/futur-truc"` dans le menu) retombe automatiquement sur `src/pages/404.astro`, une page "en cours de construction" au thème du site (statut HTTP 404 réel, mais présentation soignée avec un bouton retour à l'accueil). C'est volontaire : on peut poser tous les liens de navigation dès maintenant, même si la page n'est pas encore écrite.
