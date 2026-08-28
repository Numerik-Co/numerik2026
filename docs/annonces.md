# Bannière d'annonces

Une **annonce** s'affiche dans une bannière pleine largeur **au-dessus de la
barre de navigation**, sur toutes les pages, pendant une période donnée :
assemblée générale à venir, recherche de bénévoles, fermeture exceptionnelle,
événement…

- Le visiteur peut fermer la bannière (croix). Elle ne réapparaît alors plus
  **pour la session de navigation en cours**, mais revient à la visite suivante
  (nouvel onglet / nouveau navigateur). C'est volontaire : `sessionStorage`, pas
  `localStorage`.
- Si **plusieurs** annonces sont valides en même temps, elles **défilent
  automatiquement** (rotation toutes les 7 s) et des flèches `‹` `›`
  apparaissent pour naviguer manuellement. La rotation se met en pause au survol
  de la souris et pendant la navigation au clavier, et est désactivée si le
  visiteur a demandé « animations réduites » dans son système.

Toutes les annonces sont regroupées dans **un seul fichier** :
`src/contents/annonces.md`. Aucune base de données, aucun dossier à créer.

## Ajouter une annonce

Ouvrir `src/contents/annonces.md` et ajouter une entrée dans la liste `annonces`
de l'en-tête (la partie entre les `---`) :

```markdown
  - id: "ag-2026"
    title: "Assemblée générale 2026"
    message: "Notre assemblée générale annuelle approche. Votre présence compte."
    startDate: "2026-08-20"
    endDate: "2026-09-18"
    tone: "info"
    icon: "fa-calendar-days"
    ctaLabel: "Voir les détails"
    ctaHref: "/actualites/2026-08-17-assemblee-generale-2026"
```

| Champ | Obligatoire | Rôle |
| :--- | :--- | :--- |
| `id` | oui | Identifiant unique (`minuscules-avec-tirets`). Sert à mémoriser la fermeture par le visiteur. **Changer l'`id`** pour ré-afficher une annonce modifiée à tout le monde. |
| `title` | oui | Titre court, en gras. |
| `message` | oui | Une à deux phrases. |
| `startDate` | oui | `"AAAA-MM-JJ"` — premier jour d'affichage (inclus). |
| `endDate` | oui | `"AAAA-MM-JJ"` — dernier jour d'affichage (inclus). |
| `tone` | non | `"info"` (bleu, défaut), `"accent"` (vert), `"urgent"` (ambre). Colore **toute** la bannière. Si deux annonces de `tone` différents défilent, la bannière change de couleur à chaque rotation. |
| `icon` | non | Icône [Font Awesome solid](https://fontawesome.com/search?o=r&s=solid&f=classic), ex. `"fa-bullhorn"` (défaut), `"fa-calendar-days"`, `"fa-hand-holding-heart"`, `"fa-triangle-exclamation"`. |
| `ctaLabel` + `ctaHref` | non | Lien d'action. Les **deux** doivent être renseignés. Lien interne (`/adherer`) ou externe. |
| `active` | non | `false` pour préparer une annonce sans l'afficher (brouillon). |

Toujours mettre les valeurs **entre guillemets doubles**.

### Régler la vitesse de défilement

Elle est fixée à 7 s dans `src/layouts/Layout.astro` :

```astro
<AnnonceBanner intervalMs={7000} />
```

## Comment la période est-elle contrôlée ?

Le site est généré en statique. Pour qu'une annonce apparaisse et disparaisse à
la bonne date **sans reconstruire le site**, le filtrage par date est fait dans
le navigateur du visiteur (composant `src/components/layout/AnnonceBanner.astro`) :
le HTML contient toujours toutes les annonces non-brouillon, masquées, et un
petit script révèle celles dont la date du jour est dans l'intervalle et que le
visiteur n'a pas fermées.

Il reste utile de reconstruire / redéployer le site après avoir édité
`annonces.md` pour que le nouveau contenu soit servi.

## Retirer une annonce

- La laisser expirer (passé `endDate`, elle ne s'affiche plus).
- Ou mettre `active: false`.
- Ou supprimer l'entrée de la liste.

## Où s'affiche la bannière ?

Sur **toutes les pages**, car `<AnnonceBanner />` est monté dans
`src/layouts/Layout.astro`, juste avant `<Header />`. Pour la limiter à la page
d'accueil, retirer cette ligne du layout et placer `<AnnonceBanner />` en
première ligne du `<Layout>` de `src/pages/index.astro`.

## Comment ça marche techniquement

- `src/contents/annonces.md` — le contenu (frontmatter uniquement).
- `src/lib/annonces.ts` — `getAnnonces()` lit le frontmatter, valide les champs
  (erreur de build explicite si `id` / `title` / `message` / dates manquants ou
  mal formés), écarte les `active: false`.
- `src/components/layout/AnnonceBanner.astro` — rendu de la bannière + script client :
  fenêtre de dates, rotation automatique avec pause au survol/focus, flèches
  `‹` `›`, fermeture mémorisée dans `sessionStorage` (clé
  `annonce-dismissed:<id>`).

> À propos du `<script>` du composant : dans un fichier `.astro`, Astro le
> compile et l'envoie au navigateur automatiquement. Il n'y a **pas** de
> directive `client:*` à ajouter — celles-ci ne concernent que les composants de
> framework (React, Vue, Svelte…).
