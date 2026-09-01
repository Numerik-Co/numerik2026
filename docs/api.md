# Routes serveur et intégration Grist

Le site est statique par défaut (`output: 'static'`, voir [developpement.md](developpement.md)). Certaines routes ont besoin d'un vrai serveur — typiquement pour appeler une API externe avec une clé secrète, ce qu'on ne peut jamais faire depuis le navigateur sans exposer cette clé à n'importe quel visiteur.

## Pourquoi pas d'appel direct à Grist depuis le navigateur

L'API de Grist s'authentifie avec une clé (`Authorization: Bearer <clé>`) qui donne accès en lecture/écriture au document. Si le futur formulaire d'adhésion appelait Grist directement depuis le JS du navigateur, cette clé se retrouverait visible dans le code source pour n'importe qui — permettant de lire, modifier ou supprimer les données du document, pas seulement d'envoyer un bulletin.

La solution : le formulaire (un îlot Vue — intégration `@astrojs/vue`, voir [composants.md](composants.md)) n'appelle que nos propres routes API. Ce sont ces routes, exécutées côté serveur, qui détiennent la clé Grist et relaient la requête.

## Activer le rendu serveur pour une route

Par défaut toutes les pages restent pré-rendues en HTML statique. Pour qu'une route précise s'exécute côté serveur à chaque requête, il suffit d'ajouter dans son frontmatter/module :

```ts
export const prerender = false;
```

C'est ce que font les routes `src/pages/api/adhesion/*`. Le reste du site (toutes les autres pages) continue d'être généré statiquement au build, sans changement de comportement ni de performance.

## Adaptateur

`@astrojs/node` (mode `standalone`) fournit le serveur HTTP qui exécute ces routes. Configuré dans `astro.config.mjs` :

```js
import node from '@astrojs/node';

export default defineConfig({
	// ...
	adapter: node({ mode: 'standalone' }),
});
```

En développement (`astro dev`), tout fonctionne de façon transparente. En production sur un VPS/serveur dédié (OVH ou autre) :

1. `npm run build` — génère `dist/server/entry.mjs` (le serveur Node) en plus des fichiers statiques.
2. Lancer ce serveur en continu avec un process manager (ex. PM2 : `pm2 start dist/server/entry.mjs --name numerik2026`).
3. Mettre nginx/Apache en reverse proxy devant, avec le vrai nom de domaine.
4. Définir les variables d'environnement (voir plus bas) directement sur le serveur — jamais dans les fichiers commités.

## Variables d'environnement

Copier `.env.example` en `.env` (déjà dans `.gitignore`) et renseigner :

| Variable | Rôle |
| :--- | :--- |
| `GRIST_BASE_URL` | URL de l'instance Grist (ex. `https://grist.exemple.org`) |
| `GRIST_DOC_ID` | Identifiant du document Grist contenant les tables d'adhésion |
| `GRIST_API_KEY` | Clé API Grist — **secret**, ne doit exister que dans `.env` côté serveur |
| `GRIST_TABLE_MEMBRES` | Nom technique de la table des membres (défaut `Membres`) — optionnel |
| `GRIST_TABLE_INSCRIPTIONS` | Nom technique de la table des inscriptions (défaut `Inscriptions`) — optionnel |
| `GRIST_TABLE_COTISATIONS` | Nom technique de la table des cotisations (défaut `Cotisations`) — optionnel |
| `GRIST_TABLE_ACTIVITES` | Nom technique de la table des activités (défaut `Activites`) — optionnel |
| `GOTENBERG_URL` | Instance Gotenberg pour le bulletin PDF (ex. `http://gotenberg:3000`) — optionnel, voir [bulletin-pdf.md](bulletin-pdf.md) |
| `GOTENBERG_USERNAME` / `GOTENBERG_PASSWORD` | Auth HTTP Basic de Gotenberg — optionnel, seulement si l'instance l'exige |
| `BULLETIN_SECRET` | Secret HMAC du lien de bulletin — **secret**, requis avec `GOTENBERG_URL` |

Ces variables sont typées dans `src/env.d.ts` pour l'auto-complétion sur `import.meta.env`.

## Formulaire d'adhésion

> Vue fonctionnelle du parcours (schéma + étape par étape, pour former des
> utilisateurs) : [adhesion-parcours.md](adhesion-parcours.md). Ci-dessous, le
> détail technique.

### Îlot Vue

`src/pages/adherer/formulaire.astro` monte l'îlot `src/components/adhesion/AdhesionForm.vue` en `client:load`, entouré de `<FormGate form="adhesion">`. Deux parcours (**Nouveau membre** / **Renouvellement**) et un déroulé : identité → cotisation → *(membres du groupe si cotisation multiple)* → activité → récapitulatif, chaque étape n'étant révélée qu'après le retour de la précédente. En **renouvellement**, l'étape 1 marque une pause « confirmation de la fiche + préférences » (cases `newsletter` / `droitImage` pré-cochées, écrites via `/api/adhesion/preferences`) ; si `Membres.Adhesion_en_cours` est vrai, la cotisation est **sautée** et on passe directement à l'activité (permet à un membre à jour de s'inscrire à une nouvelle activité).

**Fermer les adhésions en ligne** : passer `site.forms.adhesion.enabled` à `false` dans `src/config/site.ts`. Le formulaire est alors remplacé par le message `closedTitle` / `closedMessage`, et le bouton « Adhérer en ligne » de `src/pages/adherer.astro` disparaît (`isFormOpen('adhesion')`). Voir [composants.md](composants.md#forms) pour le mécanisme `FormGate`.

| Composant | Rôle |
| :--- | :--- |
| `AdhesionForm.vue` | orchestrateur : machine à états, appels API, gestion d'erreur, bouton « Annuler et tout effacer » |
| `MembreFields.vue` | grille de champs d'un membre (genre en radios, identité, coordonnées, cases newsletter / droit à l'image) — réutilisée pour l'adhérent principal **et** les membres supplémentaires ; masque la date de naissance si genre = `Association` ; **autocomplétion de l'adresse** (voir route `/api/adhesion/adresse`) qui remplit code postal + commune ; affiche les messages de validation reçus via la prop `errors` |
| `SectionIdentite.vue` | étape 1 ; en renouvellement : recherche nom + prénom puis panneau **confirmation de la fiche + préférences** (`newsletter` / `droitImage`), avec le cas `rattache` (basculer vers le·la responsable) et la mention « adhésion déjà à jour » ; porte aussi le sous-parcours **« recevoir seulement les actualités »** (nom + prénom + courriel + consentement) |
| `SectionCotisation.vue` | étape 2 ; filtre les cotisations selon personne physique / morale (`personneMorale`) |
| `SectionMembres.vue` | étape « groupe », affichée si la cotisation choisie a `Multiple = true` ; liste des membres + formulaire d'ajout, min. 2 membres pour continuer |
| `SectionActivite.vue` | étape 3 ; « N places restantes » / « Complet ». Select **« Pour qui ? »** si l'adhésion compte plusieurs membres. Bouton **« Ajouter une activité »** → `POST /api/adhesion/inscription` immédiat (1 `Inscription` par membre × activité), la ligne s'ajoute à la liste ; **« Valider mon inscription »** → enregistre la sélection en attente puis va au récap ; **« Continuer sans activité »** (visible tant qu'aucune activité n'est ajoutée) → récap sans créer d'`Inscription`. Pas de retrait ici — se corrige ensuite dans Grist. |
| `SectionRecap.vue` | récapitulatif (liste des activités, une par ligne) + montant à régler (règlement en présentiel) + lien bulletin PDF |

Les appels réseau passent par `src/components/adhesion/client.ts`.

### Routes API (`src/pages/api/adhesion/`)

Toutes en `prerender = false`. Elles ne parlent à Grist qu'à travers `src/lib/adhesion/grist.ts`.

| Route | Méthode | Rôle |
| :--- | :--- | :--- |
| `/api/adhesion/cotisations` | GET | Cotisations de la saison en cours (`{ id, label, prix, personneMorale, multiple }`). |
| `/api/adhesion/activites` | GET | Activités de la saison en cours (`{ id, label, prix, placesRestantes }`). |
| `/api/adhesion/membre` | POST | Étape 1. `mode:'nouveau'` → crée le `Membres` (rôle déduit du genre) et renvoie `membreId`. `mode:'renouvellement'` → rapproche sur nom + prénom normalisés : `ok` / `ambigu` (plusieurs fiches) / `rattache` (la fiche saisie figure dans le `Responsable_de` d'un·e autre membre → renvoie `membre` + `responsable`, le front propose de renouveler au nom du·de la responsable) / `introuvable`. Les réponses `ok` et les candidats `ambigu` / `rattache` portent l'**état** de la fiche : `newsletter`, `droitImage`, `adhesionEnCours` (colonne formule `Membres.Adhesion_en_cours`) et `groupe` (responsable + membres rattachés, `[]` si fiche seule). |
| `/api/adhesion/preferences` | POST | Renouvellement — met à jour `Newsletters` + `Droit_image` de la fiche retrouvée (`{ membreId, newsletter, droitImage }`). |
| `/api/adhesion/contact` | POST | Sous-parcours actualités : crée un `Membres` minimal `Role = Contact`, `Newsletters = true`. |
| `/api/adhesion/cotisation` | POST | Étape 2. Crée l'enregistrement **`Adhesions`** (membre + cotisation, `Statut = Impayé`), renvoie `adhesionId`. |
| `/api/adhesion/co-membre` | POST | Adhésion multiple : crée un `Membres`, l'ajoute à `Adhesions.Membres` et à `Membres[responsable].Responsable_de`. |
| `/api/adhesion/inscription` | POST | Étape 3. Crée l'enregistrement **`Inscription`** (membre + activité), `Disponibilite = Inscrit` ou `Liste d'attente` selon `Places_restantes`. |
| `/api/adhesion/membres` | GET | Recherche de membres par nom/prénom (`?q=`), pour rattacher un membre existant à une adhésion multiple. |
| `/api/adhesion/detacher-membre` | POST | Retire un membre d'une adhésion multiple (`Adhesions.Membres` + `Responsable_de`). |
| `/api/adhesion/adresse` | GET | Proxy vers l'**API Adresse** (Base Adresse Nationale, `api-adresse.data.gouv.fr`, sans clé). `?q=` → suggestions `{ label, adresse, codePostal, commune }`. |

### Deux tables distinctes

Le process alimente **deux** tables, pas une :

- **`Adhesions`** (étape 2) : « la personne adhère à l'association avec telle cotisation » — `Membres` (RefList), `Cotisation`, `Statut`, `Montant_du`.
- **`Inscription`** (étape 3) : « la personne s'inscrit à telle activité » — `Membre` (Ref), `Activite`, `Date_d_inscription`, `Montant_du`, `Disponibilite`.

`Saison` est une **colonne formule** dans les deux ; de même `Tarif` / `Regle` (`Adhesions`) et `Eligible` / `Regle` (`Inscription`), ainsi que `Places_restantes` (`Activite`, décrément automatique). Ces colonnes ne sont **jamais écrites** par le code — Grist les calcule.

### Mapping Grist — le seul point à ajuster

`src/lib/adhesion/grist.ts` centralise tout ce qui dépend du schéma : `TABLES` (défauts = `Membres` / `Adhesions` / `Inscription` / `Cotisation` / `Activite` / `Saisons`, surchargeables par variables d'environnement), `COLS`, les valeurs de listes de choix (`GENRE_CHOICES`, `ROLE_*`, `STATUT_IMPAYE`, `DISPO_*`), et les helpers `dateToEpochSeconds` / `refList` / `parseRefList` / `currentSaisonId`.

`src/lib/adhesion/membre-fields.ts` porte la validation + conversion d'un membre **côté serveur** (partagée par `membre` et `co-membre`). `src/lib/adhesion/validation.ts` porte la validation **côté client** (`validateMembre` / `validateContact` / `validateRenouvellement`) : champs obligatoires, format courriel / code postal / téléphone (10 chiffres, au moins un des deux), date de naissance non future et plausible. Les composants passent le résultat à `MembreFields` via la prop `errors` et bloquent l'envoi tant qu'il reste une erreur ; le serveur revalide systématiquement.

### Bulletin d'adhésion en PDF

Lien « Imprimer le bulletin » au récapitulatif : la route
`/api/adhesion/bulletin` lit la colonne Formule `Adhesions.Formule` (HTML
complet) et la fait convertir par une instance **Gotenberg**. Accès protégé par
un jeton signé (`BULLETIN_SECRET`) émis dans la réponse de
`/api/adhesion/cotisation`. Actif seulement si `GOTENBERG_URL` et
`BULLETIN_SECRET` sont renseignés. Détail complet : [bulletin-pdf.md](bulletin-pdf.md).

### À finaliser

- Protection anti-spam (honeypot, rate-limit) et éventuel e-mail de confirmation.
- Vérifier le comportement si `Places_restantes` cesse d'être une formule (verrou de place à gérer).
- Pas de retrait d'une `Inscription` depuis l'étape 3 (il faudrait une route `detacher-inscription` façon `detacher-membre`).

> Besoin de réinspecter le schéma Grist (tables/colonnes/formules) ? Recréer une petite route de debug jetable qui appelle `GET {GRIST_BASE_URL}/api/docs/{GRIST_DOC_ID}/tables` puis `.../tables/<id>/columns`, la garder derrière `import.meta.env.DEV`, et la supprimer une fois le mapping calé.
