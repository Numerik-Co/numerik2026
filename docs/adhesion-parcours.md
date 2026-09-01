# Le parcours d'adhésion en ligne (former les collègues)

Formulaire public : **`/adherer/formulaire`**. Il enregistre directement dans
Grist (tables `Membres`, `Adhesions`, `Inscription`) — aucune saisie manuelle à
reprendre ensuite.

- **Ouvrir / fermer** les adhésions en ligne : `forms.adhesion.enabled` dans
  `src/config/site.ts` (`true` = ouvert). Fermé, le formulaire est remplacé par
  un message et le bouton « Adhérer en ligne » disparaît.
- Chaque étape n'apparaît qu'une fois la précédente validée.
- Le **règlement se fait sur place** (ou chez les partenaires) : le formulaire
  n'encaisse rien.

## Vue d'ensemble

```mermaid
flowchart TD
    A(["Page « Adhérer en ligne »<br/>/adherer/formulaire"]) --> B{"Votre situation ?"}

    B -->|"Nouveau membre"| C["Étape 1 · Identité<br/>identité, coordonnées, adresse (autocomplétée),<br/>newsletter, droit à l'image"]
    B -->|"Renouvellement"| D["Étape 1 · Nom + prénom<br/>recherche de la fiche existante"]
    B -->|"Juste recevoir les actualités"| E["Nom, prénom, courriel + consentement"]
    E --> Efin(["Inscription aux actualités enregistrée"])

    D -->|"1 fiche trouvée"| DP
    D -->|"Plusieurs fiches"| D1["Choisir la bonne personne"] --> DP
    D -->|"Aucune fiche"| D2["Message d'aide → revenir au choix de départ"] --> B
    D -. "fiche = membre rattaché →<br/>bascule silencieuse sur le·la responsable" .-> DP

    DP["Confirmer la fiche + préférences<br/>(newsletter, droit à l'image)"] --> DA{"Adhésion déjà à jour<br/>pour la saison ?"}
    DA -->|"Oui"| J
    DA -->|"Non"| G

    C --> G["Étape 2 · Cotisation<br/>liste filtrée : personne physique / morale"]
    G --> H{"Cotisation famille / couple ?"}

    H -->|"Oui"| I["Étape · Membres du groupe<br/>ajouter un nouveau membre<br/>ou rattacher un membre existant · minimum 2"]
    H -->|"Non"| J
    I --> J["Étape 3 · Activité"]

    J --> K{"Adhésion à plusieurs membres ?"}
    K -->|"Oui"| L["Choisir « Pour qui ? »"]
    K -->|"Non"| M["Choisir une activité"]
    L --> M
    M --> N["« Ajouter une activité »<br/>l'inscription est enregistrée aussitôt"]
    N --> O{"Une autre activité ?<br/>même personne ou autre membre"}
    O -->|"Oui"| M
    O -->|"Non"| P["« Valider mon inscription »"]
    J -->|"Aucune activité pour l'instant"| Q["« Continuer sans activité »"]

    P --> R
    Q --> R(["Étape 4 · Récapitulatif"])
    R --> S["Cotisation + activité(s) + total à régler"]
    S --> T["Imprimer le bulletin d'adhésion (PDF)<br/>si l'instance Gotenberg est configurée"]
    S --> U["« Faire une autre inscription » → retour au début"]
```

## Étape par étape

### Départ — « Votre situation ? »

| Choix | Ce que ça fait |
| :--- | :--- |
| **Nouveau membre** | Première adhésion : on saisit toute la fiche. |
| **Renouvellement** | Déjà adhérent·e : on saisit seulement **nom + prénom**, le formulaire retrouve la fiche. |
| **Juste recevoir les actualités** | Nom + prénom + courriel + consentement → crée un simple contact, fin du parcours. |

### Étape 1 · Identité

- **Nouveau** : genre, identité, coordonnées, **adresse avec autocomplétion**
  (remplit code postal + commune), cases newsletter et droit à l'image. La date
  de naissance disparaît si le genre est « Association ».
- **Renouvellement** : après nom + prénom, trois cas :
  - **1 fiche** → on continue ;
  - **plusieurs fiches** → on choisit la bonne (un indice « né·e en 19•• · ville »
    aide à distinguer) ;
  - **aucune fiche** → message : vérifier l'orthographe ou repartir sur
    « Nouveau membre ».
- **Membre rattaché** : si le nom saisi est celui d'un membre inscrit dans le
  `Responsable_de` d'un·e autre (famille / couple), la fiche est **résolue
  silencieusement sur le·la responsable** — c'est lui/elle qui porte l'adhésion.
  Aucun message : les membres du groupe apparaissent ensuite à l'étape
  « Membres du groupe » comme pour toute adhésion multiple.
- **Renouvellement — confirmation de la fiche** : une fois la bonne personne
  identifiée, un encart récapitule la fiche (son nom **canonique**, celui de
  Grist) et affiche deux cases **pré-cochées selon Grist** — *lettre
  d'information* et *droit à l'image* — que l'adhérent·e peut ajuster. Pour une
  **adhésion liée**, ce choix est appliqué à **tous les membres du foyer**
  (responsable + membres rattachés), pas seulement à la fiche saisie. Un lien
  « Ce n'est pas vous ? » permet de reprendre la saisie.
- **Renouvellement — adhésion déjà à jour** : si la colonne
  `Membres.Adhesion en cours` est vraie (le membre figure déjà dans une
  adhésion de la saison en cours), l'encart l'indique et le bouton devient
  **« Choisir une activité »** : on saute l'étape Cotisation et on va
  directement à l'activité. Utile pour inscrire un membre à jour à une
  nouvelle activité en cours d'année.
- Les erreurs de saisie (courriel, code postal, téléphone…) s'affichent sous les
  champs ; l'envoi reste bloqué tant qu'il en reste.

### Étape 2 · Cotisation

- La liste ne montre que les cotisations compatibles : **personne physique** ou
  **personne morale** selon le genre.
- Une cotisation marquée **famille / couple** ouvre l'étape « Membres du groupe ».
  Sinon on passe directement à l'activité.

### Étape · Membres du groupe *(cotisation famille / couple uniquement)*

- Ajouter chaque membre : soit **créer une nouvelle fiche**, soit **rechercher
  et rattacher un membre existant**.
- **Minimum 2 membres** pour continuer. Un membre ajouté par erreur se retire ici.
- La **lettre d'information** et le **droit à l'image** ne sont pas demandés par
  membre : chaque membre ajouté (nouveau ou existant) hérite du choix du·de la
  responsable de l'adhésion.

### Étape 3 · Activité

- Si l'adhésion compte **plusieurs membres**, un menu **« Pour qui ? »** apparaît :
  on choisit à quel membre l'activité s'applique.
- On sélectionne une activité (« N places restantes » / « Complet » indiqués),
  puis :
  - **« Ajouter une activité »** → l'inscription est **enregistrée
    immédiatement** et s'ajoute à la liste ; on peut en ajouter d'autres (autre
    activité, ou même activité pour un autre membre). Un doublon (même membre +
    même activité) est refusé.
  - **« Valider mon inscription »** → enregistre l'activité encore sélectionnée
    puis va au récapitulatif.
  - **« Continuer sans activité »** (visible tant qu'aucune activité n'a été
    ajoutée) → récapitulatif sans inscription. Le choix pourra se faire plus
    tard directement dans Grist.
- Si une activité est complète, l'inscription part en **liste d'attente**
  (indiqué sur la ligne).

### Étape 4 · Récapitulatif

- Rappel : cotisation (ou « Déjà à jour pour la saison » si l'étape Cotisation a
  été sautée), **liste des activités**, **total à régler** (sur place).
- **« Imprimer le bulletin d'adhésion (PDF) »** : présent si l'instance Gotenberg
  est configurée sur le serveur (voir [bulletin-pdf.md](bulletin-pdf.md)). Ouvre
  le bulletin dans un nouvel onglet, prêt à imprimer.
- **« Faire une autre inscription »** repart d'une fiche vierge.

## Où vont les données

| Étape | Table Grist |
| :--- | :--- |
| Identité | `Membres` |
| Cotisation (+ membres du groupe) | `Adhesions` |
| Chaque activité ajoutée | `Inscription` (1 ligne par membre × activité) |

Détail technique et schéma des colonnes : [api.md](api.md).
