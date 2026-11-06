# Devis et facturation (auto-entrepreneur)

Plugin **« Devis et facturation »** (`facturation`), proposé aux sites de
type **auto-entrepreneur** ([structure.md](structure.md)). Les clients, le
catalogue de prestations, les devis et les factures sont rangés dans un
**document Grist** ; on les gère depuis le module **Facturation** de
l'Espace Admin, et les visiteurs peuvent **demander un devis** en ligne.

Référence technique (schéma Grist complet, fichiers, règles) :
[src/plugins/facturation/README.md](../src/plugins/facturation/README.md).

## Mise en place

1. **Créer le document Grist** avec les cinq tables `Clients`,
   `Prestations`, `Devis`, `Factures`, `Lignes` et leurs colonnes, **avec
   exactement les identifiants** du
   [schéma](../src/plugins/facturation/README.md#schéma-grist-attendu)
   (types compris : Reference, Date, Numeric, Choice). Remplir la table
   `Prestations` (libellé, description, prix, unité, active).
2. Dans Grist, créer une **clé d'API** (Paramètres du compte) ; noter
   l'adresse de l'instance et l'identifiant du document (dans son adresse :
   `https://…/o/…/<identifiant>/…`).
3. **Assistant d'installation** : type « Auto-entrepreneur », cocher
   « Devis et facturation », saisir les trois valeurs Grist et, pour les PDF,
   l'adresse du service Gotenberg ([bulletin-pdf.md](bulletin-pdf.md) pour
   l'installer). Le fichier de réglages `src/content/facturation.yaml` est
   créé. Sans l'assistant, voir le
   [README du plugin](../src/plugins/facturation/README.md#activation).
4. **Paramètres → Entreprise** : renseigner le **SIRET** et le **nom de
   l'entrepreneur·e** (imprimés sur les devis et factures ; sinon « à
   compléter »).
5. Relire `src/content/facturation.yaml` : délai de paiement, conditions,
   **IBAN/BIC** (imprimés sur les factures), modèles de numérotation.

| Variable | Rôle |
| --- | --- |
| `GRIST_BASE_URL` | Instance Grist |
| `GRIST_DOC_ID_FACTURATION` | Document de la facturation |
| `GRIST_API_KEY_FACTURATION` | Clé d'API (sinon `GRIST_API_KEY`) |
| `GOTENBERG_URL` | Service PDF (facultatif : sans lui, pas de PDF) |

## Au quotidien

### Demandes de devis

La page publique **« Demander un devis »** (`/devis`, adresse réglable dans
le module Plugins ou `facturation.yaml`) recueille : nom, société,
coordonnées, prestations du catalogue qui intéressent, message, accord
RGPD. Chaque demande :

- retrouve le client par son **email** (ses coordonnées manquantes sont
  complétées, jamais effacées) ou le crée ;
- crée un devis au statut **« Demande »**, avec une ligne par prestation
  cochée et le message du client.

Protection : champ piège invisible pour les robots, 5 demandes par quart
d'heure et par adresse IP. Fermer les demandes : `ouvert: false` dans
`facturation.yaml` (message `textes.fermeTitre` / `fermeMessage` à la place
du formulaire). Mettre le lien dans le menu ou sur l'accueil : bouton
« Demander un devis » vers `/devis` (module « Pages »).

Aucune notification n'est envoyée : les demandes s'affichent en tête du
module, avec leur nombre.

### Devis

Module **Facturation → Devis** :

1. ouvrir la demande (ou **Nouveau devis**) ; choisir le client (ou
   **Nouveau client**) ;
2. ajuster les **lignes** : prestation du catalogue (désignation, unité et
   prix repris) ou **ligne libre** ; quantité et prix modifiables ; total
   recalculé ;
3. statut **Brouillon** ou **Envoyé**, puis **Enregistrer le devis** : il
   reçoit son numéro (`D-2026-001`) ;
4. **PDF** pour l'envoyer au client (cadre « Bon pour accord ») ;
5. accepté : **Créer la facture** (le devis passe « Accepté »).

Un devis se supprime tant qu'il n'est ni accepté ni facturé.

### Factures

Module **Facturation → Factures** :

1. **Brouillon** (créé depuis un devis, ou **Nouvelle facture**) :
   modifiable ; renseigner la **date ou période de la prestation**
   (mention obligatoire) ;
2. **Émettre la facture** (confirmation) : numéro suivant de l'année
   (`F-2026-001`, sans trou), **date du jour**, échéance (date + délai de
   `facturation.yaml`) ;
3. **PDF** à envoyer ;
4. à l'encaissement : **Facture payée**, date, mode de paiement.

Une facture émise **ne se modifie plus et ne se supprime plus** : une
erreur se corrige par une **facture d'avoir**, à établir pour l'instant dans
Grist. En tête du module : total des factures émises non payées ; une
échéance dépassée est signalée en rouge.

### Clients

Module **Facturation → Clients** : nom, société, coordonnées, **SIREN/SIRET
d'un client professionnel** (imprimé sur ses factures), notes internes.

## Règles légales prises en charge

- **Numérotation** continue et chronologique : numéro attribué à
  l'émission, dans l'ordre, avec la date du jour ; jamais réutilisé. Ne pas
  changer le modèle de numéro des factures en cours d'année.
- **Mentions** du PDF : nom + « EI », adresse, SIRET, coordonnées ;
  client (et son SIRET) ; numéro, date d'émission, date de la prestation,
  échéance ; désignation, quantité, prix unitaire HT, total ; « TVA non
  applicable, article 293 B du CGI » (`tva:`) ; conditions de paiement,
  pénalités de retard et indemnité forfaitaire de 40 € (`factures.conditions`) ;
  absence d'escompte.
- **Montants** recalculés par le serveur, arrondis au centime ligne par
  ligne.
- Ne pas modifier à la main dans Grist le numéro, la date ou les lignes
  d'une facture émise.

Hors du plugin : la déclaration de chiffre d'affaires, le livre des
recettes (Grist peut le produire à partir de la table `Factures`) et la
conservation des factures (dix ans).

## Limites actuelles

- Pas d'envoi d'email (devis, facture, avis de demande).
- Pas de facture d'avoir ni d'acompte dans le module.
- Le catalogue de prestations se tient dans Grist.
- Sans `GOTENBERG_URL`, pas de PDF (le bouton est masqué).
