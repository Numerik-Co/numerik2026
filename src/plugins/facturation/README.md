# Plugin « Devis et facturation » (`facturation`)

Pour un **auto-entrepreneur** (type de structure `entreprise`,
`src/lib/structure.ts` : le plugin n'est pas proposé aux associations).
Clients, devis et factures dans un **document Grist**, gérés depuis le
module **Facturation** de l'Espace Admin ; page publique **« Demander un
devis »**.

## Activation

- Assistant d'installation (type « Auto-entrepreneur », plugin coché) : il
  crée `src/content/facturation.yaml` depuis le modèle et range les secrets
  (Grist, Gotenberg) dans `data/installation/secrets.env`.
- Ou à la main : copier `facturation.exemple.yaml` en
  `src/content/facturation.yaml`, `plugins: { facturation: true }` et
  `structure: entreprise` dans `reglages.yaml`, variables ci-dessous dans le
  `.env`, puis reconstruire.

| Variable | Rôle |
| --- | --- |
| `GRIST_BASE_URL` | Instance Grist (partagée avec les autres plugins) |
| `GRIST_DOC_ID_FACTURATION` | Identifiant du document de facturation |
| `GRIST_API_KEY_FACTURATION` | Clé d'API (sinon `GRIST_API_KEY`) |
| `GOTENBERG_URL` (+ `GOTENBERG_USERNAME` / `GOTENBERG_PASSWORD`) | PDF des devis et factures (facultatif : sans lui, pas de PDF) |

Réglages de l'entreprise (`facturation.yaml`, tous facultatifs) : adresse de
la page, ouverture, textes, validité des devis, délai de paiement,
conditions et pénalités, modes de paiement, mention de TVA, IBAN/BIC,
modèles de numérotation. Les mentions de l'émetteur (nom, « EI », adresse,
SIRET, entrepreneur·e) viennent d'`association.yaml` (module « Entreprise »).

## Schéma Grist attendu

Créer un document avec ces tables et colonnes (identifiants exacts ; seul
`lib/grist.ts` est à modifier si le schéma change).

### `Clients`

| Colonne | Type | Remarque |
| --- | --- | --- |
| `Nom` | Text | obligatoire |
| `Societe` | Text | |
| `Email` | Text | sert à reconnaître un client qui redemande un devis |
| `Telephone` | Text | |
| `Adresse` | Text | |
| `Code_postal` | Text | |
| `Ville` | Text | |
| `SIRET` | Text | client professionnel |
| `Notes` | Text | |
| `Cree_le` | Date | |

### `Prestations` (catalogue, tenu dans Grist)

| Colonne | Type | Remarque |
| --- | --- | --- |
| `Libelle` | Text | |
| `Description` | Text | affichée dans la demande de devis |
| `Prix_unitaire` | Numeric | en euros |
| `Unite` | Text | heure, forfait, jour… |
| `Active` | Toggle | décochée = plus proposée |

### `Devis`

| Colonne | Type | Remarque |
| --- | --- | --- |
| `Numero` | Text | donné par le site (`D-2026-001`), vide pour une demande |
| `Client` | Reference → `Clients` | |
| `Date` | Date | |
| `Validite` | Date | |
| `Objet` | Text | |
| `Statut` | Choice | `Demande`, `Brouillon`, `Envoyé`, `Accepté`, `Refusé` |
| `Message_client` | Text | message de la demande en ligne |
| `Notes` | Text | imprimées sur le devis |
| `Total` | Numeric | recalculé par le site |
| `Cree_le` | Date | |

### `Factures`

| Colonne | Type | Remarque |
| --- | --- | --- |
| `Numero` | Text | donné à l'émission (`F-2026-001`), vide pour un brouillon |
| `Client` | Reference → `Clients` | |
| `Devis` | Reference → `Devis` | devis d'origine |
| `Date` | Date | date d'émission |
| `Date_prestation` | Text | date ou période de la prestation |
| `Echeance` | Date | émission + délai de paiement |
| `Objet` | Text | |
| `Statut` | Choice | `Brouillon`, `Émise`, `Payée` |
| `Date_paiement` | Date | |
| `Mode_paiement` | Text | |
| `Notes` | Text | imprimées sur la facture |
| `Total` | Numeric | recalculé par le site |
| `Cree_le` | Date | |

### `Lignes`

| Colonne | Type | Remarque |
| --- | --- | --- |
| `Devis` | Reference → `Devis` | ligne d'un devis… |
| `Facture` | Reference → `Factures` | …ou d'une facture |
| `Ordre` | Integer | |
| `Libelle` | Text | |
| `Quantite` | Numeric | |
| `Unite` | Text | |
| `Prix_unitaire` | Numeric | |
| `Montant` | Numeric | quantité × prix, arrondi au centime |

## Règles

- **Devis** : numéroté dès qu'il n'est plus une simple demande en ligne ;
  « Créer la facture » en fait une facture brouillon (le devis passe
  « Accepté ») ; supprimable sauf accepté ou facturé.
- **Facture** : brouillon modifiable, puis **« Émettre »** : numéro suivant de
  l'année (continu, sans trou), date du jour (chronologie garantie),
  échéance = date + délai. Émise, elle ne se modifie ni ne se supprime plus ;
  seul son paiement (payée, date, mode) change. Une erreur se corrige par
  une facture d'avoir (à établir dans Grist pour l'instant).
- Ne pas modifier à la main dans Grist `Numero`, `Date` ni les lignes d'une
  facture émise.
- Montants recalculés par le site à chaque enregistrement (jamais repris du
  navigateur). Franchise de TVA : montants HT = TTC, mention `tva:`.
- **Demande en ligne** (`/devis`) : client retrouvé par email (coordonnées
  complétées, jamais effacées) ou créé ; devis « Demande » avec les
  prestations cochées ; champ piège anti-robots ; 5 demandes par quart
  d'heure et par adresse IP.

## Fichiers

- `plugin.ts` (routes, variables), `lib/config.ts` (`facturation.yaml`),
  `lib/grist.ts` (tables, colonnes ; client `src/lib/grist-client.ts`),
  `lib/documents.ts` (règles), `lib/pdf.ts` (gabarit PDF), `lib/types.ts`
  (types et calculs partagés avec le navigateur).
- `api/` : `prestations`, `demande` (public) ; `admin/api/` : `index` (GET),
  `clients`, `devis`, `factures` (POST avec `action`), `pdf`.
- `admin/` : `FacturationModule.vue`, `DocumentForm.vue`,
  `LignesEditeur.vue`, `ClientForm.vue`, `client.ts`.
- `pages/devis.astro` + `formulaire/DemandeDevisForm.vue`.
