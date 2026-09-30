# Inscription en ligne à une activité

Formulaire public qui permet de s'inscrire à une activité (atelier, module…)
**sans passer par le parcours d'adhésion complet**, que l'on soit adhérent·e
ou non. Il est ouvert depuis le bouton **« S'inscrire »** des fiches
activité, ou directement à l'adresse `/inscription`.

> À ne pas confondre avec le [parcours d'adhésion](adhesion-parcours.md)
> (`/adherer/formulaire`), qui crée ou renouvelle une adhésion et peut
> aussi inscrire à des activités au passage. Les deux formulaires écrivent
> dans la même table Grist `Inscription`.

## Le parcours en 3 étapes

### 1. « Qui êtes-vous ? »

La personne choisit son profil :

- **Adhérent·e** : saisie du nom et du prénom. La fiche `Membres` est
  retrouvée par rapprochement sur nom + prénom (sans tenir compte des
  accents ni de la casse). Trois cas :
  - une seule fiche → on passe à l'étape 2. Si cette fiche est rattachée à
    une adhésion familiale (un enfant, un·e conjoint·e…), c'est **bien elle**
    qui est inscrite, pas celle du·de la responsable du foyer (champ
    `ficheId` de la réponse API, voir plus bas) ;
  - plusieurs fiches (homonymes) → la personne choisit la sienne dans la
    liste proposée ;
  - aucune fiche → message d'erreur, la personne peut corriger sa saisie ou
    s'inscrire comme extérieur·e.
- **Extérieur·e** (non adhérent·e) : saisie de la civilité (Homme / Femme /
  Autre), du nom, du prénom et d'un téléphone (10 chiffres, commençant par
  0). Une fiche `Membres` **minimale** est créée pour pouvoir recontacter la
  personne : rôle `Contact`, newsletter non cochée, commentaire « Inscription
  à une activité (participant·e extérieur·e) ». Aucune adhésion n'est créée.

### 2. « Choix de l'activité »

Activités Grist (table `Activite`) de la **saison en cours** et de **type
`Séances`, `Ateliers` ou `Atelier CN`** (`TYPES_ACTIVITE_INSCRIPTION` dans
`src/lib/adhesion/choices.ts`) : parcours, FabLab, ateliers et ateliers du
Conseiller Numérique. Pour un·e non-adhérent·e, l'animateur·rice formalise
l'adhésion ensuite. Route : `GET /api/adhesion/offre-inscription`.

Trois cas :

- **arrivée depuis une fiche dont une activité au moins est publiée**
  (`Publiee = true`) : seules les activités de la fiche sont proposées
  (ex. les 3 créneaux « Initiation … » pour le Parcours Initiation), cochée
  d'office s'il n'y en a qu'une ;
- **arrivée depuis une fiche dont aucune activité n'est publiée** : pas
  d'inscription, mais le choix du créneau et un bouton **« Me
  préinscrire »**. Une ligne est ajoutée (à la suite de l'existant) dans la
  colonne `Commentaires` de la fiche `Membres` :
  `30/09/2026 : Intéressé·e par « Module IA » — préinscription` (pas de
  doublon si elle y figure déjà). Aucune ligne `Inscription` n'est créée :
  l'association recontacte la personne à l'ouverture. Route :
  `POST /api/adhesion/preinscription` ;
- **accès direct à `/inscription`** (ou fiche sans activité Grist
  correspondante, ex. Parcours Junior, Cours individuels) : toutes les
  activités **publiées** sont listées. Les activités non publiées
  n'apparaissent jamais dans cette liste.

#### Tarif adhérent·e / non-adhérent·e

Pour une activité réservée aux adhérent·es (case Grist
**`Activite.Adhesion_requise`** cochée), l'étape 2 affiche deux prix :

- **adhérent·e** : `Tarif` ;
- **non-adhérent·e** : adhésion individuelle + `Tarif`, avec le détail, ex.
  « 75,00 € (30 € adhésion + 45 € activité) ».

Le prix de l'adhésion est celui de la cotisation de la saison en cours dont
le libellé contient « Individuelle » (table `Cotisation`, `Tarif_conseille`).
Le prix qui s'applique à la personne est en gras, l'autre en gris :
adhérent·e si la fiche a une adhésion en cours (`Membres.Adhesion_en_cours`),
non-adhérent·e sinon (donc toujours pour un·e extérieur·e). Activité sans
`Adhesion_requise` (ex. ateliers CN) : un seul prix.

Le récapitulatif d'un·e non-adhérent·e détaille activité + adhésion + total
et rappelle que l'adhésion est formalisée avec l'animateur·rice à la
première séance. Le **montant dû** enregistré dans `Inscription` reste le
`Tarif` de l'activité seul.

Chaque activité affiche ses **places restantes** en direct (colonne
`Places_restantes`) : « 3 places restantes », « 1 place restante » ou
**« Complet »**. Une activité complète est grisée et ne peut pas être
choisie depuis la liste.

Le lien entre fiche et activités Grist est décrit dans « Présélection » plus bas.

### 3. Récapitulatif

Une ligne est créée dans la table Grist `Inscription` (membre, activité, date
d'inscription, montant dû, disponibilité). L'écran de confirmation affiche :

- le nom de la personne et l'activité ;
- **« en liste d'attente »** si l'activité est devenue complète entre-temps
  (`Disponibilite = Liste d'attente`, sinon `Inscrit`) — l'association
  recontacte la personne dès qu'une place se libère ;
- le **tarif** (0 si l'activité n'est pas payante) — pour un·e
  non-adhérent·e, détail activité + adhésion + total —, avec le rappel
  « Règlement à effectuer sur place, lors de la première séance » quand il y
  a un montant à payer ;
- pour un·e extérieur·e, une mention sur l'usage des données transmises ;
- un bouton « Faire une autre inscription ».

Le bouton **« Annuler et tout effacer »** (sous le formulaire, avant le
récapitulatif) remet le formulaire à zéro après confirmation.

## Le bouton « S'inscrire » sur les fiches activité

Il apparaît dans la colonne de droite de chaque fiche
(`/activites/<categorie>/<slug>`), sous le sommaire, et renvoie vers
`/inscription?activite=<titre de la fiche>`.

Il est **masqué** :

- **sur une fiche précise** : ajouter `inscription: false` dans le
  frontmatter de son `index.md` — à utiliser pour les activités qui ne
  s'inscrivent pas en ligne (sur rendez-vous, gérées à part) :

  ```yaml
  ---
  title: "RDV Conseiller numérique"
  inscription: false
  ---
  ```

  Actuellement le seul cas de `rdv-conseiller-numerique` (les permanences
  se réservent via la [prise de RDV](rdv-conseiller-numerique.md)). Sans ce
  champ, le bouton est affiché.

- **partout** : quand le formulaire est fermé dans `site.forms.inscription`
  (`src/config/site.ts`, voir plus bas).

### Présélection

La fiche indique **ses activités dans Grist** par son frontmatter :

- `activiteGrist` : nom `Activite.Nom`, ou liste de noms. Un `*` final
  désigne un **préfixe** (« Initiation* » = tous les créneaux dont le nom
  commence par « Initiation ») ;
- `typeGrist` : un `Activite.Type` (`Séances`, `Ateliers`, `Atelier CN`) ;
- ni l'un ni l'autre : le `title` de la fiche sert de nom.

```yaml
---
title: "Atelier — Intelligence artificielle : comprendre pour mieux choisir"
category: "ateliers"
activiteGrist: "Module IA"
---
```

Correspondances actuelles :

| Fiche | Frontmatter |
| :--- | :--- |
| Ateliers IA, Linux, Montage vidéo, Photo, Tableurs | `activiteGrist: "Module IA"` (resp. `Module Linux`, `Module Video`, `Module Photo`, `Module Tableur`) |
| Parcours Initiation | `activiteGrist: "Initiation*"` |
| Le FabLab | `activiteGrist: "Espace FABLAB"` |
| L'Espace Junior | `activiteGrist: "Espace Jeune"` |
| Ateliers du·de la Conseiller·ère Numérique | `typeGrist: "Atelier CN"` |

La comparaison ignore les accents, la casse et les espaces en trop.
⚠️ Si une activité est renommée dans Grist, mettre à jour la fiche : sinon
elle ne la retrouve plus et le formulaire liste toutes les activités
publiées (avec le message « Cette activité ne se réserve pas via ce
formulaire »).

## Ouvrir / fermer les inscriptions en ligne

Dans `src/config/site.ts` :

```ts
forms: {
	inscription: {
		enabled: true,
		closedTitle: 'Inscriptions en ligne momentanément fermées',
		closedMessage: "Le formulaire d'inscription en ligne n'est pas ouvert actuellement. …",
	},
},
```

`enabled: false` :

- masque le bouton « S'inscrire » sur toutes les fiches activité ;
- remplace le formulaire de `/inscription` par un encart
  (`closedTitle` + `closedMessage`) et un bouton « Nous contacter »
  (composant `<FormGate form="inscription">`, voir
  [composants.md](composants.md#forms)).

Changer ce réglage demande une reconstruction du site (voir
[deploiement-docker.md](deploiement-docker.md)).

## Gérer les inscriptions (côté association)

Tout se fait **dans Grist**, table `Inscription` — il n'y a pas d'écran
d'administration côté site :

- **places** : régler la capacité de l'activité dans `Activite` ;
  `Places_restantes` (formule) décide de l'affichage « Complet » et du
  passage en liste d'attente ;
- **liste d'attente** : passer `Disponibilite` de `Liste d'attente` à
  `Inscrit` quand une place se libère ;
- **annulation / erreur** : supprimer ou corriger la ligne `Inscription` ;
- **extérieur·e qui adhère ensuite** : sa fiche `Membres` (rôle `Contact`)
  existe déjà — la retrouver plutôt que d'en créer une seconde.

Les inscriptions servent aussi au dispositif de présence « Je participe » :
seules les personnes inscrites à une activité peuvent y signaler leur
présence (voir [api.md](api.md)).

## Fonctionnement technique

| Élément | Rôle |
| :--- | :--- |
| `src/pages/inscription.astro` | Page `/inscription` ; monte l'îlot Vue dans un `<FormGate form="inscription">`. |
| `src/components/inscription/InscriptionForm.vue` | Îlot `client:load` : enchaînement des étapes, relais des paramètres `?activite=`/`?type=`, tarif mis en avant, appels API. |
| `src/components/inscription/EtapeProfil.vue` | Étape 1 : choix adhérent·e / extérieur·e, recherche ou saisie, choix parmi les homonymes. |
| `src/components/inscription/EtapeActivite.vue` | Étape 2 : liste des activités, tarif adhérent·e / non-adhérent·e, places restantes, « Complet », mode préinscription. |
| `src/components/inscription/EtapeRecap.vue` | Étape 3 : confirmation, liste d'attente, tarif, rappel du règlement. |
| `src/pages/activites/[category]/[slug].astro` | Bouton « S'inscrire » (condition `activity.inscription && isFormOpen('inscription')`). |
| `src/lib/activites.ts` | Champs `inscription` (`frontmatter.inscription !== false`) et `inscriptionHref` (construit depuis `activiteGrist` / `typeGrist`). |
| `src/lib/adhesion/activite-option.ts` | Ligne `Activite` → option (tarifs, places), partagé avec le parcours d'adhésion. |

Routes API utilisées (communes avec le parcours d'adhésion, client
`adhesionApi` de `src/components/adhesion/client.ts`, détail dans
[api.md](api.md)) :

| Route | Méthode | Usage dans ce formulaire |
| :--- | :--- | :--- |
| `/api/adhesion/membre` (`mode: 'renouvellement'`) | POST | Étape 1 adhérent·e : retrouver la fiche par nom + prénom (`ok` / `ambigu` / `introuvable`). Le formulaire inscrit `ficheId` (la fiche trouvée), jamais `membreId` (qui désigne le·la responsable du foyer pour un membre rattaché — logique propre à l'adhésion). |
| `/api/adhesion/participant-exterieur` | POST | Étape 1 extérieur·e : créer la fiche `Membres` minimale (rôle `Contact`). Propre à ce formulaire. |
| `/api/adhesion/offre-inscription` | GET | Étape 2 : activités proposées (`?activite=` répétable, `?type=`) → `{ mode, activites, cibleIntrouvable }`. Propre à ce formulaire. |
| `/api/adhesion/preinscription` | POST | Étape 2, mode préinscription : note l'intérêt dans `Membres.Commentaires`. Propre à ce formulaire. |
| `/api/adhesion/inscription` | POST | Passage à l'étape 3 : crée la ligne `Inscription` (activité publiée uniquement, montant dû = `Tarif`) ; `Liste d'attente` si `Places_restantes <= 0`, sinon `Inscrit`. |

## Limites connues

- **Adhésion non exigée** : l'inscription est ouverte à tous ; une adhésion
  absente ou pas à jour ne fait qu'afficher le tarif non-adhérent·e.
  L'animateur·rice formalise l'adhésion ensuite.
- **Pas de contrôle de doublon** : une même personne peut s'inscrire deux fois
  à la même activité (deux lignes `Inscription`) ; à nettoyer dans Grist.
- **Une activité par passage** : pour s'inscrire à plusieurs activités,
  utiliser « Faire une autre inscription ».
- **Pas de confirmation par e-mail ni SMS.**
