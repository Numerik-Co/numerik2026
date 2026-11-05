# Sauvegarde et restauration

Comme Grav, le site sait **sauvegarder** tout ce qui appartient à
l'association dans une archive **ZIP**, et la **restaurer** plus tard (même
serveur, nouveau serveur, retour en arrière après une erreur).

## Ce que contient une sauvegarde

| Dans l'archive | Pas dans l'archive |
| --- | --- |
| `src/content/` : pages, actualités, activités, annonces, images, polices, réglages (`*.yaml`) | `.env` (secrets : `AUTH_SECRET`, clés Grist…) — à garder à part |
| `data/accounts/` : comptes de l'Espace Admin | `data/publication/` (état des publications) |
| `data/journal/` : journal des modifications | les sauvegardes elles-mêmes, le code du modèle |

Chaque archive porte un fichier `sauvegarde.json` : date, version du modèle,
nom de l'association, motif, auteur·rice. Les archives sont rangées sur le
serveur dans **`data/sauvegardes/`** (volume Docker `./data` : elles
survivent aux mises à jour).

> Une sauvegarde qui ne quitte pas le serveur ne protège pas d'une panne du
> serveur : **téléchargez-la** (module, `scp`…) et gardez-la ailleurs.

## Depuis l'Espace Admin (module « Sauvegardes »)

Bureau (`admin`) et super admin :

- **Créer une sauvegarde** (motif facultatif, repris dans le nom du fichier) ;
- **Télécharger** une archive (icône ⬇) ;
- **Déposer** une archive venue d'ailleurs (autre serveur, ordinateur) : elle
  est contrôlée puis rangée avec les autres, **rien n'est restauré** ;
- **Supprimer** une archive du serveur.

Super admin seul :

- **Restaurer** (icône ↺, puis « Restaurer et publier ») : `src/content/`,
  les comptes et le journal sont **remplacés** par ceux de l'archive, puis le
  site est reconstruit. L'état actuel est d'abord sauvegardé
  (`…-avant-restauration.zip`) ; si la reconstruction échoue, il est remis
  automatiquement. Indisponible pendant une publication ou tant que des
  modifications « enregistrées sans publier » attendent (les publier ou les
  annuler avant). Si votre compte n'existe pas dans l'archive, vous êtes
  déconnecté·e après la restauration.

Dépôt d'une grosse archive : derrière nginx, la limite d'envoi
(`client_max_body_size`) peut refuser le fichier (erreur 413). La relever,
ou restaurer en ligne de commande.

## Sur le serveur (ligne de commande)

Dans le dossier du site (Docker ou Node seul, détecté comme `./update.sh`) :

```bash
./sauvegarde.sh                      # nouvelle sauvegarde → data/sauvegardes/
./sauvegarde.sh "avant migration"    # avec un motif
./sauvegarde.sh --liste              # sauvegardes existantes

./restauration.sh sauvegarde-2026-11-05-10h30.zip   # archive de data/sauvegardes/
./restauration.sh ~/numerik-vps.zip                 # archive ailleurs (copiée dans data/sauvegardes/)
./restauration.sh … --oui                           # sans confirmation
```

La restauration demande de taper « oui », sauvegarde l'état courant
(`…-avant-restauration.zip`), remplace le contenu puis **redémarre le site**
pour le reconstruire (Docker : `docker compose restart web` ; Node seul :
`UPDATE_RESTART` du `.env`, sinon consigne affichée).

Sans les scripts (site Docker plus ancien) : les mêmes commandes existent
dans le conteneur :

```bash
docker compose exec web node scripts/sauvegarde.mjs creer "motif"
docker compose exec web node scripts/sauvegarde.mjs liste
docker compose exec web node scripts/sauvegarde.mjs restaurer <nom.zip>   # puis : docker compose restart web
```

Les scripts `sauvegarde.sh`, `restauration.sh` et `auth-user.sh` sont
recopiés depuis l'image par `./update.sh` après chaque mise à jour Docker
réussie. Pour les récupérer à la main :
`docker compose cp web:/app/sauvegarde.sh . && docker compose cp web:/app/restauration.sh .`

## Sauvegarde automatique avant chaque mise à jour

`./update.sh` (Docker ou Node seul) crée lui-même une sauvegarde avant de
changer quoi que ce soit : motif « avant mise à jour », **5 dernières
gardées** (les plus anciennes de ce motif sont supprimées ; vos sauvegardes
manuelles ne le sont jamais). Si la sauvegarde échoue, la mise à jour
s'arrête sans rien changer ; `./update.sh --sans-sauvegarde` pour passer
outre. Rien à faire de plus pour un·e novice : lancer `./update.sh` suffit.

En ligne de commande, la même rotation : `./sauvegarde.sh "motif" --garder 5`.

## Déménager un site

1. Ancien serveur : `./sauvegarde.sh "demenagement"`, puis récupérer
   l'archive (`scp serveur:/opt/numerik2026/data/sauvegardes/<nom>.zip .`) et
   le `.env`.
2. Nouveau serveur : installer le site ([deploiement-docker.md](deploiement-docker.md)),
   y copier le `.env`, puis `./restauration.sh ~/<nom>.zip`.

## Détails techniques

- Code : `scripts/sauvegarde.mjs` (création, liste, contrôle, restauration ;
  bibliothèque `fflate`, aucun outil système requis), utilisé par les
  commandes et par les routes `/api/admin/sauvegardes*`
  (`src/pages/api/admin/sauvegardes/`, gardes dans `src/middleware.ts` :
  bureau, restauration = super admin seul).
- Une archive n'est acceptée que si elle contient `sauvegarde.json` (format
  `numerik-sauvegarde`) et `src/content/association.yaml`, et seulement des
  fichiers sous `src/content/`, `data/accounts/`, `data/journal/` (aucun
  chemin en `..`). Taille maximale : 500 Mo.
- Les dossiers sont vidés puis remplis (jamais renommés : ce sont des
  volumes sous Docker).
- Journal : `sauvegarde.creation`, `sauvegarde.depot`,
  `sauvegarde.suppression`, `sauvegarde.restauration` (écrit après la
  restauration, le journal étant lui-même restauré).
