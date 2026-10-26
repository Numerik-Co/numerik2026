# Plugin « adhesion » : adhésion et activités

Tout ce qui s'appuie sur le **document Grist de l'adhésion** (tables
`Membres`, `Adhesions`, `Cotisation`, `Activite`, `Inscription`, `Saisons`,
`Presence`) :

- **adhésion en ligne** : page `/adherer` (présentation, relais partenaires)
  et formulaire `/adherer/formulaire` (nouvelle adhésion ou renouvellement,
  membres rattachés, cotisation), **bulletin PDF** signé ;
- **inscription aux activités** : page `/inscription`, bouton « S'inscrire »
  des fiches d'activité ;
- **présence** : page `/je-participe` (« Je participe » / « Je ne pourrai pas
  venir » pendant une séance) ;
- **planning** de la page `/activites` : séances de la semaine lues dans la
  table `Activite`.

**Actif par défaut** (`actifParDefaut` du catalogue) : rien à écrire dans
`src/content/reglages.yaml`. Pour le retirer d'un site :

```yaml
plugins:
  adhesion: false
```

ou la case « Plugin actif » du module **Plugins** de l'espace bénévoles
(super admin). Voir aussi [les plugins](../README.md) (activation,
organisation).

## Plugin inactif

- `/adherer`, `/adherer/formulaire`, `/inscription`, `/je-participe` et les
  routes `/api/adhesion/*`, `/api/presence/*` n'existent pas (404) ;
- le bouton « Adhérer » de la barre de navigation et « Je participe » (si
  leur lien mène à ces pages), le bouton « Nous rejoindre » du bandeau
  d'accueil et celui de l'encart d'appel à l'action disparaissent ;
- les fiches d'activité n'ont plus de bouton « S'inscrire », et le module
  « Activités » ne propose plus ses réglages d'inscription (gardés dans les
  fiches) ;
- le planning de `/activites` n'affiche que les permanences du plugin RDV ;
- plan du site et liens proposés dans l'espace bénévoles : sans ces pages.

## Mise en place

`.env` (voir [api.md](../../../docs/api.md#variables-denvironnement)) :
`GRIST_BASE_URL`, `GRIST_API_KEY` (partagés avec le plugin RDV),
`GRIST_DOC_ID`, et si besoin les noms de tables `GRIST_TABLE_*` ; pour le
bulletin PDF, `GOTENBERG_URL` (partagé) et `BULLETIN_SECRET`
([bulletin-pdf.md](../../../docs/bulletin-pdf.md)). Ouverture et fermeture
des formulaires : `forms.adhesion` et `forms.inscription` de
`reglages.yaml`.

## Organisation

| Dossier | Contenu |
| :--- | :--- |
| `plugin.ts` | Manifeste : pages, routes (`API` = routes `/api/adhesion/<nom>`), variables d'environnement propres (`GRIST_DOC_ID`, `GRIST_TABLE_*`, `BULLETIN_SECRET`) |
| `index.ts` | Ce que le reste du site utilise : `planningActivites()`, `lienAdhesionIndisponible(href)`, adresses des pages |
| `pages/` | `adherer.astro`, `formulaire.astro` (`/adherer/formulaire`), `inscription.astro`, `je-participe.astro` |
| `api/` | Routes `/api/adhesion/*` (membres, cotisations, adhésion, inscription, bulletin…) et `api/presence/` (`/api/presence/*`) |
| `formulaire/` | Îlots Vue : `adhesion/` (formulaire d'adhésion et son client), `inscription/`, `presence/` |
| `lib/` | Client Grist et mapping des colonnes (`grist.ts`, **seul endroit à modifier si le schéma change**), choix, validation, planning, présence, bulletin |

Outils partagés avec le plugin RDV, hors de ce dossier : `src/lib/http.ts`,
`src/lib/grist-error.ts`, `src/lib/gotenberg.ts`.

Détail des routes, des colonnes Grist et du planning :
[api.md](../../../docs/api.md) ; inscription :
[inscription.md](../../../docs/inscription.md) ; bulletin :
[bulletin-pdf.md](../../../docs/bulletin-pdf.md).
