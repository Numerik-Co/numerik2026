# Les plugins

Un **plugin** est un volet du site qu'une association active ou non : par
exemple la prise de rendez-vous en ligne. Tout son code est
rangé dans un seul dossier, `src/plugins/<id>/`, et il ne laisse aucune trace
dans le site quand il est inactif.

| Plugin | Dossier | Contenu |
| :--- | :--- | :--- |
| `rdv` | [`rdv/`](rdv/README.md) | Prise de rendez-vous en ligne (réglages de l'asso : `src/content/rdv.yaml`) |

L'adhésion deviendra un plugin plus tard, sur le même modèle.

## Activer ou désactiver un plugin

Dans `src/content/reglages.yaml` (fichier de l'association, jamais remplacé
par une mise à jour) :

```yaml
plugins:
  rdv: true
```

**Tous les plugins sont inactifs par défaut** : si rien n'est écrit, le volet
n'existe pas sur le site. Changer la valeur demande de **reconstruire** le site
(`npm start` le fait tout seul au démarrage quand `src/content/` a changé ; en
dev, le serveur redémarre de lui-même).

⚠️ Avant de passer un site existant à une version qui introduit un plugin,
ajouter `plugins: <id>: true` à son `reglages.yaml` s'il utilisait déjà ce
volet, sinon il disparaît après la mise à jour.

Plugin inactif :

- ses pages et ses routes `/api/…` n'existent pas (404) : elles ne sont pas
  construites du tout ;
- ce qu'il ajoute ailleurs disparaît : module d'accueil, bloc de page, liens
  proposés dans l'espace bénévoles, plan du site, permanences du planning…
- un module d'accueil ou un bloc déjà enregistré dans le contenu est gardé
  mais n'est plus affiché : il revient si on réactive le plugin.

## Organisation d'un plugin

```
src/plugins/
  catalogue.ts     ← liste des plugins (id, nom, description), sans dépendance
  index.ts         ← pluginActif(id), disponible(def) : utilisables partout
  manifests.ts     ← manifestes lus par la config Astro
  <id>/
    plugin.ts      ← manifeste : routes ajoutées si actif, variables d'environnement
    index.ts       ← ce que le reste du site utilise du plugin
    README.md      ← documentation du plugin
    pages/         ← pages publiques
    api/           ← routes /api/…
    formulaire/    ← îlots Vue des formulaires et leurs appels aux routes
    sections/      ← sections de page (accueil, blocs) et leurs définitions
    admin/         ← modules de l'espace bénévoles
    lib/           ← code serveur
    images/        ← images propres au plugin
```

Un dossier vide n'est pas créé : chaque plugin n'a que ceux dont il a besoin.

### Comment ça marche

- **Réglage** : `site.plugins` (`src/config/site.ts`), validé avec le reste de
  `reglages.yaml` (clé inconnue = construction en échec).
- **Routes** : `src/integrations/plugins.ts` lit `reglages.yaml` au démarrage
  de la construction et ajoute (`injectRoute`) les routes du manifeste
  `plugin.ts` des seuls plugins actifs. Les pages d'un plugin ne sont donc
  **jamais dans `src/pages/`**.
- **Variables d'environnement** : déclarées dans le manifeste et ajoutées au
  schéma de `astro.config.mjs`, que le plugin soit actif ou non (son code est
  toujours vérifié par `astro check`).
- **Catalogues partagés** (modules d'accueil `src/lib/home-modules.ts`, blocs
  `src/lib/blocs.ts`) : le plugin y ajoute ses entrées depuis
  `sections/definitions.ts`, avec `plugin: '<id>'`. `disponible(def)` les
  retire de l'éditeur et du rendu quand le plugin est inactif.
- **Ailleurs** (planning, plan du site, liens) : `pluginActif('<id>')` ou une
  fonction de `<id>/index.ts` qui renvoie une liste vide si inactif.

## Ajouter un plugin

1. Une entrée dans `PLUGINS` (`catalogue.ts`) : le réglage
   `plugins.<id>` est aussitôt reconnu, inactif par défaut.
2. Le dossier `src/plugins/<id>/` avec son `plugin.ts`, ajouté à
   `PLUGIN_MANIFESTS` (`manifests.ts`).
3. Chaque branchement dans le reste du site passe par `pluginActif()` ou
   `disponible()`.
4. Une ligne dans le tableau ci-dessus, un `README.md` dans le dossier, et le
   commentaire `plugins:` de `src/content/reglages.yaml`.
