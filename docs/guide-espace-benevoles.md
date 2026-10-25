# Guide de l'espace bénévoles

L'espace bénévoles permet au **bureau** et aux **animateur·rice·s** de se
connecter au site pour accéder aux pages réservées et aux outils
d'administration. Il n'y a **pas de page d'administration séparée** : tout
s'affiche par-dessus le site, sur la page où vous vous trouvez.

Ce guide a deux parties :

1. [Mise en service](#partie-1--mise-en-service) — pour la personne qui gère le serveur (une seule fois).
2. [Utilisation](#partie-2--utilisation) — pour le bureau et les animateur·rice·s.

Détail technique (fichiers, routes, sécurité) : [auth.md](auth.md).

---

## Partie 1 — Mise en service

À faire **une fois**, sur le VPS, en plus de l'installation décrite dans
[deploiement-docker.md](deploiement-docker.md).

### 1. Générer le secret de session

Le secret signe les cookies de connexion. Sans lui, personne ne peut se connecter.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
# ou, sans Node sur le VPS :
openssl rand -base64 32
```

Ajouter la valeur obtenue au fichier `.env` du VPS (à côté des clés Grist) :

```dotenv
AUTH_SECRET=colle-ici-la-chaine-generee
```

> ⚠️ **Le `.env` doit se terminer par un retour à la ligne** avant d'ajouter
> une ligne à la fin (`echo >> .env` au besoin) — sinon la nouvelle variable
> se colle à la précédente et casse les deux.
>
> Ne partagez jamais ce secret. Le changer **déconnecte tout le monde**
> (utile si un appareil a été perdu).

### 2. Vérifier le dossier des comptes

Les comptes sont des fichiers stockés dans `data/accounts/` **sur le VPS**,
hors de l'image Docker. Le `docker-compose.yml` monte déjà ce dossier :

```yaml
environment:
  - DATA_DIR=/app/data
volumes:
  - ./data:/app/data
```

Rien à faire de plus : le dossier est créé au premier compte. Il **survit
aux redéploiements** (`./deploy.sh`) et n'est jamais envoyé sur git.

> 💾 **Sauvegardez `data/`** avec vos autres sauvegardes du VPS : c'est la
> seule donnée de l'espace bénévoles. Perdre ce dossier = recréer les comptes.

### 3. Déployer

Comme d'habitude :

```bash
cd /opt/numerik2026
git pull
./deploy.sh
```

> Si le site tournait déjà et que seul le `.env` a changé, `./deploy.sh` ne
> recrée pas forcément le conteneur (image identique) : le nouveau secret ne
> serait pas lu. Dans ce cas :
>
> ```bash
> DOCKER_CONFIG=$PWD/.dockercfg docker compose up -d --force-recreate
> ```

### 4. Créer le super admin et le premier compte administrateur

Ces comptes se créent en ligne de commande, avec le script `./auth-user.sh`
(à côté de `deploy.sh`) ; ensuite, tout se fait depuis le site.

D'abord le **super admin** : compte technique (rôle `superadmin` seul), qui a
tous les droits et est **le seul à voir le journal des modifications**. Il
n'apparaît pas dans le module « Comptes » et ne peut y être ni modifié ni
supprimé. Son mot de passe est provisoire : il **doit être changé à la
première connexion**.

```bash
cd /opt/numerik2026
./auth-user.sh init                     # login « superadmin » ; ou : ./auth-user.sh init <login> "<Nom>"
```

La commande ne fait rien si un super admin existe déjà (relançable sans
risque). Pour imposer le mot de passe provisoire au lieu de le générer :
`SUPERADMIN_PASSWORD='…' ./auth-user.sh init`.

Puis le premier compte du bureau :

```bash
./auth-user.sh add xavier "Xavier Burke" admin
```

La commande affiche un **mot de passe provisoire** (ex. `k7mp-q3zt-h9wx`),
**une seule fois** : notez-le, connectez-vous, puis changez-le (voir
[Changer mon mot de passe](#changer-mon-mot-de-passe)).

> `./auth-user.sh` lance le CLI **dans le conteneur** (`docker compose exec`)
> en posant `DOCKER_CONFIG` comme `deploy.sh` (`/root` est en lecture seule
> sur le VPS). Ne lancez pas `node dist/cli/auth-user.mjs` directement sur le
> VPS : le `dist/` du VPS n'est pas celui de l'image.

Autres commandes utiles :

```bash
# lister les comptes
./auth-user.sh list

# nouveau mot de passe provisoire (et réactive le compte) — dépannage
# (pour le super admin, le changement est à nouveau imposé à la connexion)
./auth-user.sh reset xavier
```

> L'identifiant : 2 à 32 caractères, minuscules, chiffres, `.`, `-` ou `_`
> (ex. `prenom.nom`). Groupes possibles : `admin`, `animateur`, `redacteur`.

### 5. Vérifier

1. Ouvrir le site, cliquer sur **« Espace bénévoles »** tout en bas de la page.
2. Se connecter avec le compte créé : une **barre sombre** apparaît en haut.

### Reverse proxy (nginx)

La configuration nginx de [deploiement-docker.md](deploiement-docker.md#5-reverse-proxy--https-nginx)
convient telle quelle. Il est conseillé d'y ajouter une ligne :

```nginx
proxy_set_header X-Forwarded-Host  $host;
```

et de **relever la taille maximale des requêtes** (photos des actualités :
10 Mo max, ≈ 13,5 Mo une fois encodées ; défaut nginx : 1 Mo → erreur 413) :

```nginx
client_max_body_size 20m;
```

Puis `nginx -t && systemctl reload nginx`. Vérifier aussi que `SITE_URL`
(`.env`) est bien l'adresse publique du site (ex. `https://www.mon-asso.fr`) :
c'est le seul domaine accepté pour la connexion. Si le site répond aussi sur
un autre domaine (sans `www`, autre nom…), le rediriger vers celui-ci dans
nginx — indispensable aussi pour le référencement (sinon contenu dupliqué,
voir [referencement.md](referencement.md)) :

```nginx
# Bloc server du domaine SANS www (certificat HTTPS compris) :
server {
    listen 443 ssl;
    server_name mon-asso.fr;
    # ssl_certificate … (mêmes lignes que le bloc principal, ou certbot)
    return 301 https://www.mon-asso.fr$request_uri;
}
```

Vérifier : `curl -I https://mon-asso.fr/` doit répondre `301` vers `https://www.…`.

### En local (développement)

```bash
# .env : AUTH_SECRET=<chaîne aléatoire ≥ 32 caractères>
npm run auth:user -- add xavier "Xavier Burke" admin
npm run dev
```

Les comptes locaux sont dans `./data/accounts/` (ignoré par git).

---

## Partie 2 — Utilisation

### Se connecter

1. Sur n'importe quelle page du site, cliquer sur **« 🔒 Espace bénévoles »**
   tout en bas (dernière ligne du pied de page).
2. Saisir son **identifiant** et son **mot de passe**, puis **Se connecter**.
3. La page se recharge et une **barre sombre** apparaît en haut de l'écran.

On reste connecté·e **14 jours** sur cet appareil (prolongé à chaque visite).

> Après **5 erreurs** de mot de passe, la connexion est bloquée **15 minutes**.
> Mot de passe oublié ? Demandez à un membre du bureau de le réinitialiser.

### La barre d'administration

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⚙ Espace d'administration   🔒 Pages réservées              🖥 Production  👤 Marie ▾ │
└────────────────────────────────────────────────┬─────────────────────────┤
                                                 │ 👤 Mon compte │ ⏻ Déconnexion │
                                                 └─────────────────────────┘
```

- La barre occupe toute la largeur de l'écran.
- Le **nom** à droite ouvre un menu personnel : **Mon compte** et
  **Déconnexion** (fermé par un clic ailleurs ou **Échap**).
- Un badge, juste avant le nom, indique le **mode du serveur** : **Production** (vert, icône serveur) —
  chaque publication reconstruit le site — ou **Développement** (ambre) —
  serveur de test, modifications visibles aussitôt, sans reconstruction.
- **Bureau seulement** : quand une version plus récente du modèle est
  publiée, un badge bleu **Mise à jour X.Y.Z** apparaît avant ce badge. Un
  clic ouvre les nouveautés (Release GitHub) ; la mise à jour se fait sur le
  serveur avec `./update.sh` ([mise-a-jour.md](mise-a-jour.md)). Simple
  information : le site fonctionne normalement en attendant. Le
  badge **Production** (ou **Développement**) affiche la version en place
  (ex. « Production v0.2.0 »), visible du bureau seulement.
- Chaque bouton ouvre un **module** dans un **panneau à droite**, par-dessus
  la page (plein écran sur téléphone, où seules les icônes s'affichent).
- **Contenus ▾** regroupe **Actualités**, **Pages** et **Activités** : un
  clic les affiche côte à côte, juste en dessous (fermé par un clic ailleurs
  ou **Échap**). Avec le droit d'en voir un seul, il a son propre bouton.
- Pour fermer un panneau : la croix ✕, la touche **Échap**, ou un clic sur
  la partie assombrie de la page. Dans un formulaire (actualité, page ou
  activité à ajouter ou modifier, compte à créer ou modifier), ces mêmes gestes ramènent
  d'abord à la liste.
- Vous naviguez normalement sur le site : la barre vous suit sur toutes les pages.
- **À publier (N)** (ambre, rédaction et bureau) : apparaît dès qu'une
  modification a été enregistrée **sans publier**. Un clic montre la liste
  (quoi, qui, quand), **Publier les modifications** (une seule
  reconstruction pour tout) et **Tout annuler…** (défait toutes les
  modifications en attente, définitif).

Les modules visibles dépendent de votre groupe :

| Module | Super admin | Bureau (`admin`) | Rédacteur·rice | Animateur·rice |
| :--- | :---: | :---: | :---: | :---: |
| Pages réservées | — | — | — | ✅ |
| Actualités | ✅ | ✅ | ✅ | — |
| Pages | ✅ | ✅ | ✅ | — |
| Activités | ✅ | ✅ | ✅ | — |
| Rendez-vous (si le plugin `rdv` est actif) | ✅ | ✅ | — | ✅ |
| Association | ✅ | ✅ | — | — |
| Comptes | ✅ | ✅ | — | — |
| Journal | ✅ | — | — | — |
| Plugins | ✅ | — | — | — |
| Mon compte | ✅ | ✅ | ✅ | ✅ |

Le bouton **Pages réservées** n'apparaît que pour qui n'a pas le module
**Pages** : celui-ci liste déjà les pages réservées (bloc « Pages
réservées »).

**Journal** (super admin seulement) : toutes les modifications faites depuis
l'espace bénévoles — qui, quand, quoi, avec quel résultat (connexions,
mots de passe, actualités, pages, activités et catégories ajoutées /
modifiées / supprimées, changements d'ordre, informations de l'association, résultat de
chaque publication, comptes). Recherche par nom ou objet, connexions
masquables, une page par année. Lecture seule.

**Rendez-vous** (bureau et animateur·rice·s, si la prise de RDV est activée) :
les rendez-vous pris en ligne, **une semaine à la fois** (ouvert sur la
semaine en cours ; chevrons ‹ › pour la précédente ou la suivante, « Cette
semaine » pour revenir), par jour, avec un filtre de statut. La recherche
(nom, démarche) porte sur toutes les semaines ; un clic sur une semaine
trouvée l'affiche. Le bouton **PDF** télécharge le planning de la semaine
affichée, du lundi au vendredi (logo de l'association, une colonne par jour,
créneaux libres et rendez-vous : démarche, usager, téléphone — sinon
e-mail —, commune et message ; statut — Honoré, Absent — sur une semaine
terminée seulement ; rendez-vous annulés exclus) — document interne, à ne
pas diffuser. Il faut le serveur PDF (Gotenberg, `GOTENBERG_URL` du `.env`).
Un clic sur un RDV ouvre un **second panneau à gauche** : coordonnées et commentaire du bénéficiaire
(lecture seule, la fiche se modifie dans Grist) et le rendez-vous — jour et
horaire (seuls les créneaux libres de la période de réservation sont
proposés, urgences comprises), démarche, **statut** (Confirmé, Honoré, Absent,
Annulé : seul « Annulé » libère le créneau), puis, après le rendez-vous, le
**compte rendu de l'accompagnement** (lieu réel, matériel utilisé,
sous-thématique, niveau d'autonomie, orientation vers une autre structure,
notes) et l'**avis du bénéficiaire** (satisfaction, à choisir parmi cinq visages — un
nouveau clic l'efface —, suggestions) — rubriques
reprises des colonnes du document Grist. **Enregistrer** écrit directement dans Grist, sans reconstruire
le site ; un créneau déjà pris est refusé. Sur un écran assez large, les
rubriques sont sur deux colonnes (bénéficiaire et rendez-vous à gauche, compte
rendu et avis à droite). **Supprimer** (en bas de l'éditeur) efface le
rendez-vous de Grist — pour un doublon, une erreur de saisie, un test ; un
rendez-vous décommandé se passe plutôt en « Annulé » — après le choix d'un
**motif** (Doublon, Erreur de saisie, Rendez-vous de test, ou Autre avec une
précision obligatoire) ; la fiche du bénéficiaire reste. Échap ou la croix
ferme l'éditeur. Chaque modification et chaque suppression (avec son motif)
est notée dans le journal.

**Plugins** (super admin seulement) : volets du site que l'association active
ou non (aujourd'hui : prise de rendez-vous en ligne). La liste montre chaque
plugin et son état (actif, inactif, ou activation / désactivation en attente
de publication) ; l'icône **paramètres** (roue dentée) ouvre sa page de
configuration, un seul formulaire : description, documentation, ce qui lui
manque, la case **Plugin actif**, puis ses réglages par rubrique — pour la
prise de RDV : **adresse de la page** (ex. `/rendez-vous`, refusée si une
page du site l'utilise déjà ; les liens déjà écrits vers l'ancienne adresse
ne changent pas) et **document Grist** (adresse de l'instance, identifiant du
document, noms des tables ; un champ vide reprend la valeur du `.env`,
affichée en gris ; la clé d'API reste dans le `.env`). En bas, **Enregistrer
et publier**, qui reconstruit le site (ou rejoint les
modifications en attente avec « Enregistrer sans publier »). Un plugin dont
un fichier de réglages manque (ex. `src/content/rdv.yaml`) ne peut pas être
activé ; une clé secrète absente du `.env` est signalée, et la page dit
laquelle est utilisée (prise de RDV : `GRIST_API_KEY_RDV`, clé limitée au
document des RDV, sinon `GRIST_API_KEY`, celle de l'adhésion). Désactiver retire du site tout ce que le
plugin y ajoute, ses réglages sont gardés. Le changement est noté dans le
journal.

### Pages réservées

Liste les pages du site qui ne sont visibles qu'une fois connecté·e
(fiches pratiques, documents internes…). Un clic ouvre la page. Bureau et
rédacteur·rice·s les retrouvent dans le module **Pages** (bloc « Pages
réservées »), qui remplace alors ce bouton.

Si vous arrivez sur une page réservée **sans être connecté·e**, elle affiche
un encart **« Page réservée »** avec un bouton **Se connecter**.

### Publier une actualité

Module **📰 Actualités** (groupes *Rédacteur·rice* et *Bureau*). La liste
montre toutes les actualités, les plus récentes d'abord (badge
**Brouillon** pour celles non publiées) ; « Voir la page Actualités » ouvre la
page publique.

1. **+ Ajouter une actualité**, puis **Télécharger un modèle** : un fichier
   `.md` déjà daté du jour, avec des exemples de mise en forme, à compléter
   dans n'importe quel éditeur de texte. Il commence par cet en-tête :

   ```markdown
   ---
   title: "Atelier retouche photo"
   publishAt: 2026-10-15
   excerpt: "Un court résumé affiché sur les cartes et l'accueil."
   tag: "Ateliers"
   author: "numérik&Co"
   ---

   Le texte de l'actualité. **Gras**, listes, sous-titres `## …`, liens…
   ```

   `title`, `publishAt` (AAAA-MM-JJ) et `excerpt` sont obligatoires ;
   `tag`, `author`, `imageCredit` facultatifs ; `isPublish: false` pour un
   brouillon. Détail des champs : [actualites.md](actualites.md).
2. Glisser le fichier `.md` dans la première zone (ou cliquer pour le
   choisir) : un aperçu (titre, date, résumé) s'affiche, un champ manquant
   est signalé en rouge.
3. Glisser la **photo** de couverture dans la seconde zone (JPEG, PNG ou
   WebP, 10 Mo max) — facultative mais recommandée. Sa position GPS et ses
   autres métadonnées sont retirées automatiquement.
4. **Publier l'actualité** : le site est **reconstruit** (de quelques
   secondes à une minute) ; un encadré « Publication en cours » suit
   l'avancement, puis affiche le lien vers l'actualité en ligne. Fermer
   cet encadré par sa croix ✕ le fait disparaître **définitivement, pour
   tout le monde** ; le résultat reste consultable dans le journal du super
   admin. On peut fermer le panneau pendant la publication.
   Une fois en ligne, la **page s'actualise** d'elle-même après 3 secondes
   (« Ne pas actualiser » pour rester sur la version affichée) et le module
   se rouvre : le site visible est à jour. Si la page affichée n'existe plus
   (actualité supprimée, adresse changée), on arrive sur la page publiée ou
   sur l'accueil. Vaut pour tous les modules qui publient (Actualités, Pages,
   Activités, Association).

**Enregistrer sans publier** : chaque formulaire (et la pastille de
suppression, choix **Sans publier**) permet d'enregistrer sans reconstruire le
site. La modification est gardée mais **pas encore visible** sur le site
(badge **À publier** dans les listes) ; on enchaîne les retouches sans
attendre, puis **Publier les modifications (N)** — en tête du module ou dans
la barre — les met toutes en ligne en une fois. Idéal au lancement du site.
Attention : les modifications en attente sont communes à tout le monde, et
**Enregistrer et publier** publie aussi celles qui attendaient.

Le texte accepte le **HTML** en plus du Markdown : tableaux, encadrés
(`<div>`), mise en forme, détails dépliables, vidéos et cartes intégrées
(`<iframe>` YouTube, Vimeo, PeerTube, OpenStreetMap). Par sécurité, tout code
exécutable (`<script>`, `<style>`, attributs `onclick=`…, liens
`javascript:`, iframes d'autres sites) est **retiré à l'affichage**, sans
toucher au reste.

Refusés à l'envoi, avec un message qui indique la ligne en cause : les liens
Markdown autres que `http(s)`, `mailto:`, `tel:` ou internes, et les images
Markdown locales (`![…](./photo.jpg)` : seule la photo de couverture se
dépose ; une image en ligne `https://…` est acceptée). Si la reconstruction
échoue, rien n'est publié et le site reste tel quel.

> Le titre et la date forment l'adresse de la page
> (`/actualites/2026-10-15-atelier-retouche-photo`) : deux actualités ne
> peuvent pas avoir la même date et le même titre.

**Supprimer une actualité** : icône 🗑 au bout de sa ligne, puis
**Supprimer** dans l'encadré rouge qui apparaît (ou **Annuler**). Le site est
reconstruit comme pour un ajout ; l'actualité disparaît de la page
Actualités, de l'accueil et du flux RSS. Si la reconstruction échoue, rien
n'est supprimé. **Sans publier** (même encadré) : la suppression attend les
autres modifications. Même encadré pour toutes les suppressions (pages,
menus déroulants, activités, catégories) et la désactivation d'une page du site.

**Modifier une actualité** : clic sur son **titre** dans la liste (l'icône 👁
au bout de la ligne ouvre la page sur le site). Un formulaire
s'ouvre, prérempli : titre, date, catégorie, résumé, auteur·rice, texte (en
Markdown), photo (**Remplacer** / **Retirer**), crédit photo, et la case
**Brouillon** pour retirer l'actualité du site sans la supprimer (la décocher
plus tard la republie). **Enregistrer et publier** reconstruit le site ;
si la reconstruction échoue, la version précédente est conservée.
**Enregistrer sans publier** garde la modification en attente (voir plus haut).

**Formulaires en onglets** (actualités, pages, activités) : **Informations**
(titre, résumé, date, emplacement, brouillon…), **Contenu** (texte en
Markdown, et blocs d'une page enrichie) et **Image** (photo de couverture et
crédit). En cas de champ obligatoire vide, l'enregistrement ramène sur son
onglet.

**Travailler dans un fichier** (modification seulement) : au-dessus des
onglets, **Télécharger le fichier** donne le contenu du formulaire en `.md`
(en-tête + texte, sans la photo) ; après l'avoir modifié dans un éditeur de
texte, **Charger un fichier modifié** (ou le glisser sur le bouton) remplit
le formulaire. Rien n'est publié avant **Enregistrer** ; les champs ignorés
(photo, champ inconnu, catégorie inexistante, date illisible…) sont signalés.
L'adresse et l'emplacement restent ceux du formulaire.

**Insérer un lien vers une page du site** (sous le texte des actualités, des
pages et des activités) : liste des pages du site, des pages de contenu, des
catégories et fiches d'activité et des actualités, avec une recherche. Placer
le curseur dans le texte (ou sélectionner les mots à transformer en lien),
puis cliquer sur la page : `[Titre](/adresse)` est inséré. Brouillons, pages
réservées et actualités à paraître sont signalés : le lien n'est pas encore
(ou pas pour tout le monde) consultable.

> L'adresse de la page ne change pas, même si le titre ou la date sont
> modifiés : les liens déjà partagés continuent de fonctionner.

> Supprimer à la main le dossier dans `src/content/news/` ne retire
> l'actualité du site qu'à la prochaine reconstruction : passez par le
> module.

Côté serveur, la publication a des prérequis (sources du site, gestionnaire
de process) : voir [publication.md](publication.md).

### Gérer les pages et les menus déroulants

Module **🗂 Pages** (groupes *Rédacteur·rice* et *Bureau*). La liste a quatre
blocs :

1. **Menu de navigation**, dans l'ordre d'affichage : pages du site
   (Accueil, Activités…), liens directs et **menus
   déroulants** (comme « Association ») ; un clic sur le nom d'un menu
   déroulant déplie ou replie ses pages ;
   Pour changer l'ordre (premier niveau, ou pages d'un menu déroulant),
   **glissez la ligne par sa poignée ⠿** (souris ou doigt), ou utilisez les
   flèches **↑/↓** (affichées sur téléphone et tablette ; sur grand écran,
   elles réapparaissent au clavier avec Tab) ; un bandeau propose alors **Enregistrer et publier** (une
   seule reconstruction pour tous les déplacements), **Enregistrer sans publier** ou **Annuler** ;
2. **Pages libres** : hors du menu, accessibles par leur adresse seulement ;
3. **Pages réservées** (espace bénévoles) ;
4. **Bibliothèque de pages du site** : les pages fournies par le site
   (Activités, Actualités, Contact) désactivées, avec un bouton **Activer**.

**Nouvelle page** : choisir d'abord le type —

- **Page classique** : du texte mis en forme (titres `##`, listes, liens,
  tableaux) et une photo de couverture facultative ;
- **Page enrichie** : la même chose, plus des **blocs** (grille de cartes,
  encadré tarif, bouton, encadré d'information, prise de rendez-vous si le
  plugin `rdv` est actif). « Ajouter un bloc » le crée et insère son marqueur
  `[[bloc:…]]` dans le texte à l'endroit du curseur ; le bloc s'affiche à
  cet endroit (on peut déplacer la ligne du marqueur). Sous les textes des
  blocs (cartes, encadré), « Insérer un lien vers une page du site » ; sous
  le lien d'un bouton, « Choisir une page du site » remplit l'adresse.

**Ou à partir d'un fichier `.md`** (même écran) : « Télécharger un modèle »
(page classique ou page enrichie, avec des exemples de chaque bloc), le
compléter dans un éditeur de texte, puis le déposer. Le formulaire est
pré-rempli (titre, description, texte, blocs, libellé du menu) ; il reste à
vérifier, choisir l'emplacement et publier. Les champs non repris
(`access`, `cover`…) sont signalés en tête du formulaire.

Puis : titre, description, **emplacement** — **menu de navigation** (lien
direct ou dans un menu déroulant, au choix sous « Position dans le menu »),
**page libre** (hors menu, accessible par son adresse ou un lien) ou **page
réservée** (avec les groupes autorisés) —, adresse (déduite du titre),
libellé dans le menu de navigation. Une nouvelle page (ou une page changée
d'emplacement) se place en **dernière position** de son menu.
« Insérer une information de l'association » liste les variables
(`{{association.nom}}`…) remplacées par les vraies valeurs ; « Insérer un
lien vers une page du site » ajoute un lien vers une autre page (voir
[Publier une actualité](#publier-une-actualité)).

**Créer et publier** reconstruit le site (environ une minute) ; en cas
d'échec, rien n'est modifié. **Enregistrer sans publier** la garde en
attente, avec les autres modifications (badge **À publier** dans la liste). Changer l'emplacement ou l'adresse d'une page
**change son adresse** : les liens déjà partagés vers l'ancienne ne
fonctionnent plus.

Dans la liste, un clic sur le **titre** d'une page (ou le crayon) ouvre sa
modification ; l'icône 👁 l'ouvre sur le site.

**Pages du site** (Accueil, Activités, Actualités, Contact) : leur mise en
page est fournie par le site, l'association règle le reste.

- **Modifier** (crayon) : libellé et visibilité du lien dans le menu
  (masqué, la page reste accessible par son adresse), puis les **textes** de
  la page, section par section (titres, accroches, boutons). Les variables
  `{{association.nom}}`… sont acceptées. Un texte vidé reprend sa valeur
  d'origine ; « rétablir les textes d'origine » les remet tous.
- **L'accueil** est composé de **modules**, dans l'ordre d'affichage :
  bandeau, dernières actualités, activités, prise de rendez-vous (plugin `rdv`), appel à
  l'action, partenaires, texte libre. Le crayon de l'Accueil permet d'en
  **ajouter** (liste « Ajouter un module… » ; l'appel à l'action et le texte
  libre peuvent figurer plusieurs fois), d'en **retirer** (corbeille), de
  les **ordonner** (poignée ⠿ ou ↑/↓) et de **modifier leur contenu** (clic
  sur le module : titres, textes, boutons et leurs liens, nombre d'actualités…). Un champ
  facultatif vidé masque l'élément (ex. second bouton du bandeau). La
  **photo de fond** se règle dans le module **Bandeau** : remplacer
  (JPEG, PNG ou WebP, paysage d'au moins 1 600 px, 10 Mo max ; réduite à
  2 400 px de large) ou retirer (fond uni) ; elle part avec le reste à
  l'enregistrement. « Revenir
  à l'accueil d'origine » remet les modules de départ. Rien n'est publié
  avant **Enregistrer et publier**.
- **Référencement de l'accueil** (sous ses modules) : titre de l'onglet et
  des résultats de recherche, et description, jamais affichés sur la page.
  Par défaut le nom et la présentation courte de l'association ; viser le
  nom + l'activité + la ville. Sous ces champs, et sous le titre et le
  résumé des pages, actualités et activités, un compteur indique la
  longueur (titre : 15 à 60 caractères, description : 120 à 160) ; en
  orange, le texte risque d'être coupé ou est trop court, sans empêcher
  d'enregistrer.
- **Désactiver** (corbeille, après confirmation) : la page disparaît du menu
  **et** du site (son adresse affiche « page introuvable ») ; les liens de
  l'accueil vers elle sont masqués. Elle passe dans la **Bibliothèque**, d'où
  **Activer** la remet en place. L'accueil ne se désactive pas.

**Nouveau menu déroulant** : un libellé (non cliquable sur le site) ; il se
place en dernière position du menu de navigation (poignée ⠿ ou flèches ↑/↓
pour le déplacer). Il apparaît sur le site dès qu'il contient une page. Un menu déroulant ne se supprime que vide.

> Les pages « technique » (fichiers `.mdx`) se modifient dans le code
> uniquement.

### Gérer les activités

Module **🧑‍🏫 Activités** (groupes *Rédacteur·rice* et *Bureau*) : les fiches
des parcours, ateliers… proposés par l'association. Ce sont elles qu'on
retrouve sur les pages de catégorie (`/activites/parcours`…) et sur leur
propre page (`/activites/<catégorie>/<adresse>`). À ne pas confondre avec
les **actualités** (annonces datées) ni avec le **planning** de la semaine,
qui vient de Grist.

La liste a **une section par catégorie** (Parcours, Ateliers…, voir
[plus bas](#les-catégories)), dans l'ordre du site. Chaque ligne montre la vignette,
le titre (lien vers la fiche en ligne) et des pastilles :

| Pastille | Signification |
| :--- | :--- |
| **brouillon** | Fiche enregistrée mais absente du site (titre grisé) |
| *niveau* (ex. « Initiation ») | Pastille affichée sur la carte de l'activité |
| **sans inscription** | Bouton « S'inscrire » masqué sur la fiche |

Une catégorie vide indique « Aucune activité » : sa page affiche alors
« bientôt ».

Dans la liste, un clic sur le **titre** d'une fiche ou d'une catégorie (ou
le crayon) ouvre sa modification ; l'icône 👁 l'ouvre sur le site (pas
d'icône pour un brouillon, absent du site).

#### Créer une activité

1. **+ Nouvelle activité** (ou le **+** dans l'en-tête d'une catégorie, qui
   la présélectionne).
2. Remplir le formulaire :
   - **Titre** et **Résumé** (une ou deux phrases, affiché sur la carte et
     dans les moteurs de recherche) — obligatoires ;
   - **Catégorie** — obligatoire ;
   - **Adresse** — déduite du titre (`atelier-photo`), modifiable à la
     création seulement : minuscules, chiffres et tirets ;
   - **Publiée** — décocher pour garder la fiche en **brouillon** ;
   - **Niveau** (facultatif) — ex. *Grand débutant*, *Tous niveaux* ;
   - **Photo de couverture** (facultative, JPEG, PNG ou WebP, 10 Mo max ;
     position GPS et métadonnées retirées) et son **crédit** (sinon
     « Photo : <nom de l'association> ») ;
   - **Texte de la fiche** — en Markdown, obligatoire ; le HTML est accepté
     et nettoyé à l'affichage, comme pour les actualités ; « Insérer un lien
     vers une page du site » ajoute un lien vers une autre page ;
   - **Inscription en ligne** — voir plus bas.
3. **Créer et publier** : le site est reconstruit (encadré « Publication en
   cours », comme pour les actualités). La fiche se place **en dernier** dans
   sa catégorie.

#### Le bouton « S'inscrire »

Chaque fiche publiée a un bouton **S'inscrire** qui ouvre le formulaire
d'inscription en présélectionnant les activités Grist correspondantes :

- **Activité(s) Grist visée(s)** — un nom par ligne, tel qu'il est écrit dans
  la colonne « Nom » de la table *Activite* de Grist. Un `*` final vise
  tous les noms qui commencent ainsi (`Initiation*`). Vide = le titre de la
  fiche.
- **Type Grist visé** — *Séances*, *Ateliers* ou *Atelier CN*, seul ou avec
  les noms.
- Décocher **Bouton « S'inscrire » sur la fiche** pour le masquer (ex. activité sur
  rendez-vous). Il est aussi masqué partout quand le formulaire
  d'inscription est fermé.

Détail : [inscription.md](inscription.md#présélection).

#### Modifier, réordonner, supprimer

- **✏️** ouvre la fiche, préremplie. **Enregistrer et publier** reconstruit
  le site. La photo se **remplace** ou se **retire**.
- L'**adresse** ne change pas, même si le titre change : les liens déjà
  partagés continuent de fonctionner. **Changer de catégorie** change en
  revanche l'URL (`/activites/<nouvelle-catégorie>/<adresse>`), ce que le
  formulaire signale, et place la fiche en dernier de sa nouvelle catégorie.
- La **poignée ⠿** en début de ligne (à glisser) ou les flèches **↑/↓**
  changent l'ordre dans une catégorie. Un bandeau
  propose alors **Enregistrer et publier** (une seule reconstruction pour
  tous les déplacements), **Enregistrer sans publier** ou **Annuler**. Tant qu'il est affiché, les autres
  actions attendent.
- **🗑** supprime la fiche (photo comprise) après confirmation dans
  l'encadré rouge. Pour la retirer du site sans la perdre, préférez la case
  **Publiée** (brouillon).

Si une reconstruction échoue, rien n'est publié : la fiche (ou l'ordre)
revient à son état précédent et le site reste tel quel.

#### Les catégories

Les catégories (Parcours, Ateliers…) se gèrent dans le même module. Chacune
a sa carte sur l'accueil et sur la page Activités, et sa propre page
(`/activites/<adresse>`) qui liste ses activités.

- **Nouvelle catégorie** (en haut du module) : **nom**, **adresse** (déduite
  du nom, **fixée ensuite**), **icône** (à choisir dans la grille) et
  **description** facultative (une phrase affichée en haut de sa page).
  **Créer et publier** : elle se place en dernier.
- **✏️** dans l'en-tête d'une catégorie : changer son nom, son icône ou sa
  description. L'adresse ne change pas.
- La poignée ⠿ ou les flèches **↑/↓** de l'en-tête changent l'**ordre des
  catégories** (sur
  l'accueil et la page Activités). Comme pour les fiches, un bandeau propose
  **Enregistrer et publier** : déplacements de catégories et de fiches
  partent ensemble, en une seule reconstruction.
- **🗑** n'apparaît que sur une catégorie **vide** (aucune fiche, brouillons
  compris) : déplacez ou supprimez d'abord ses fiches. Il reste toujours au
  moins une catégorie.

Une fiche dont la catégorie a disparu (fichier modifié à la main) est
signalée en rouge en haut du module : ouvrez-la et choisissez-en une autre.

### Informations de l'association (bureau)

Module **🏛 Association**, réservé au bureau, en deux onglets :
**Généralités** et **Charte graphique**. Chaque onglet s'enregistre à part ;
une pastille orange signale un onglet modifié mais pas encore publié.

#### Généralités

Nom, présentation,
coordonnées, réseaux sociaux et mentions légales. Ces informations
apparaissent partout sur le site (en-tête, pied de page, page Contact,
aperçus de partage) et dans le texte des pages grâce aux variables
`{{association.nom}}`, `{{association.email}}`… (liste dans le formulaire
d'une page).

Le formulaire est découpé en blocs : **Identité**, **Coordonnées**,
**Réseaux sociaux**, **Mentions légales** (avec l'hébergeur du site).

- Nom, présentation, email, téléphone et adresse sont **obligatoires**.
- Réseaux sociaux : adresse complète (`https://…`) ; un champ vide masque
  l'icône du pied de page.
- Mentions légales : facultatives ; un champ vide s'affiche
  « [À compléter : …] » dans les pages qui l'utilisent (ex. mentions
  légales). Le responsable de la publication reprend le·la président·e s'il
  est vide.

Dès qu'un champ change, un bandeau **Modifications pas encore enregistrées**
reste en haut du panneau : **Enregistrer et publier** reconstruit le site
(environ une minute), **Enregistrer sans publier** la garde en attente,
**Annuler** remet les valeurs enregistrées. En cas
d'échec de la reconstruction, l'ancienne version est remise en place.

Le fichier modifié est `src/content/association.yaml` : ses commentaires
sont conservés, il reste modifiable à la main.

#### Charte graphique

- **Aperçu** : en-tête, bande de couleurs, lien, bouton et pied de page
  avec les couleurs et le logo en cours de saisie, avant publication.
- **Couleurs** : principale (liens, boutons, titres), secondaire (pied de
  page, survols), d'accent (bouton « Adhérer »). Nuancier ou code
  `#2f7fc1`. Le site écrit en blanc sur ces couleurs : une étiquette
  indique si c'est **lisible**, lisible en **gros caractères seulement**,
  ou **peu lisible**. « couleur d'origine » remet celle du modèle.
- **Bande de couleurs** (sous l'en-tête) : 1 à 12 couleurs, à réordonner
  (glisser-déposer ou flèches), ajouter, retirer ; « bande d'origine ».
- **Logo** : PNG à fond transparent ou SVG de préférence (JPEG, WebP
  acceptés, 5 Mo max). Une très grande image est réduite (1 600 px de
  large).
- **Icône d'onglet** (favicon) : image carrée, SVG ou PNG (512 × 512
  conseillé), ICO accepté. Remplace toutes les icônes actuelles ; un SVG
  donne aussi une version PNG pour les anciens navigateurs.

Un SVG contenant du script ou des liens externes est refusé par sécurité :
l'exporter en « SVG simple » ou en PNG. Fichiers modifiés : `colors:` de
`src/content/reglages.yaml` (autres réglages et commentaires gardés),
`src/content/images/logo.*` et `favicon.*`. Si la reconstruction échoue,
tout est remis comme avant.

### Modifier mes informations

Menu du **nom** (à droite de la barre) → **👤 Mon compte** : la fiche de
votre compte, la même que dans le module **Comptes**. Prénom et nom
(affichés dans la barre et dans le journal) et email facultatif, puis
**Enregistrer**. Vos groupes sont affichés mais ne se changent pas ici :
c'est le bureau qui les règle dans le module **Comptes**. Le mot de passe se
change en bas de la même fiche (voir ci-dessous).

### Changer mon mot de passe

Menu du **nom** (à droite de la barre) → **👤 Mon compte**, section
**Mot de passe** :

1. Saisir le mot de passe actuel.
2. Saisir deux fois le nouveau — **10 caractères minimum**. Une courte phrase
   est idéale et facile à retenir (ex. `le fablab ouvre le lundi`).
3. **Changer mon mot de passe**.

Vos **autres appareils** sont alors déconnectés ; celui-ci reste connecté.

👉 **À faire dès la première connexion** avec un mot de passe provisoire.

### Gérer les comptes (bureau)

Module **👥 Comptes**, réservé au groupe *Bureau / administration*.

#### Créer un compte

1. **+ Nouveau compte**.
2. Renseigner :
   - **Identifiant** — ce que la personne tapera pour se connecter
     (ex. `marie.fruit`) ; il ne pourra plus être changé.
   - **Prénom et nom**, **email** (facultatif).
   - **Groupes** — *Animateur·rice* pour les encadrant·e·s,
     *Rédacteur·rice* (actualités, pages et activités), *Bureau /
     administration* pour les membres du bureau (accès à tout, dont la
     gestion des comptes). Plusieurs groupes peuvent être cochés.
   - **Mot de passe provisoire** — laisser vide pour en générer un.
3. **Créer le compte**.

Un encadré vert affiche le **mot de passe provisoire une seule fois** :
transmettez-le à la personne (de vive voix, SMS…) avec son identifiant, et
demandez-lui de le changer à sa première connexion.

#### Modifier, désactiver

Cliquer sur un compte dans la liste :

- modifier le nom, l'email, les groupes, puis **Enregistrer** ;
- cocher **Compte désactivé** pour bloquer l'accès sans supprimer le
  compte (ex. bénévole en pause) — la personne est déconnectée aussitôt.

#### Mot de passe oublié

Dans la fiche du compte : **Réinitialiser le mot de passe**. Un nouveau mot
de passe provisoire s'affiche une fois ; les sessions de la personne sont
fermées.

#### Supprimer

En bas de la fiche, recopier l'identifiant dans la zone rouge puis
**Supprimer définitivement**. Préférez la désactivation si la personne
peut revenir.

#### Garde-fous

Pour éviter de bloquer l'association hors de son propre site :

- on ne peut pas se retirer ses propres droits bureau, ni se désactiver ou
  se supprimer soi-même ;
- il reste toujours **au moins un compte bureau actif**.

En dernier recours (plus aucun admin ne peut se connecter), la personne qui
gère le serveur utilise `./auth-user.sh reset <login>` (voir Partie 1).

### Se déconnecter

Menu du **nom** (à droite de la barre) → **⏻ Déconnexion**. Indispensable sur un
ordinateur partagé (médiathèque, salle d'atelier…).

---

## Pour les éditeurs : réserver une page

Ranger la page dans `src/content/pages/espace-benevoles/` (son adresse
commence alors par `/espace-benevoles/`). Par défaut, toute personne
connectée y a accès ; `access:` restreint à certains groupes :

```yaml
---
title: "Fiches animateur·rice·s"
access: animateur        # ou : admin, redacteur, [animateur, admin]
---
```

La page n'apparaît pas dans le menu public et figure dans **Pages réservées**
pour les personnes autorisées (module **Pages** pour le bureau et les
rédacteur·rice·s). Comme tout contenu, elle est publiée au
prochain build. Détail : [src/content/README.md](../src/content/README.md).

---
title: "Fiches animateur·rice·s"
access: animateur        # ou : true (toute personne connectée), admin, [animateur, admin]
---
```

La page disparaît du menu public et apparaît dans **Pages réservées** pour
les personnes autorisées (module **Pages** pour le bureau et les
rédacteur·rice·s). Comme tout contenu, elle est publiée au prochain
déploiement. Détail : [src/content/README.md](../src/content/README.md).

---

## Dépannage

| Symptôme | Cause probable | Solution |
| :--- | :--- | :--- |
| « La connexion n'est pas encore configurée sur ce serveur » | `AUTH_SECRET` absent ou trop court dans le `.env` | L'ajouter (≥ 32 caractères), puis `DOCKER_CONFIG=$PWD/.dockercfg docker compose up -d --force-recreate` (voir §3) |
| « Identifiant ou mot de passe incorrect » | Faute de frappe, majuscules, compte inexistant | Vérifier ; sinon réinitialisation par le bureau |
| « Trop de tentatives » | 5 échecs en 15 min | Attendre 15 min (ou redémarrer le conteneur) |
| « Ce compte est désactivé » | Désactivé par le bureau | Le réactiver dans **Comptes** |
| Déconnecté·e sans raison | Mot de passe changé/réinitialisé, compte désactivé, `AUTH_SECRET` changé, 14 jours sans visite | Se reconnecter |
| « Requête refusée » | Requête venant d'un autre site, ou domaine non prévu | Vérifier `SITE_URL` dans le `.env` (puis reconstruire) et l'en-tête `X-Forwarded-Host` de nginx |
| Comptes disparus après un déploiement | Volume `./data` non monté | Vérifier `volumes:` dans `docker-compose.yml`, restaurer la sauvegarde de `data/` |
| `Cannot find package 'yaml'` en lançant `auth-user.mjs` | `node dist/cli/auth-user.mjs` lancé **sur le VPS, hors du conteneur** (chemin `/opt/…`) | Utiliser `./auth-user.sh …` |
| `docker` : erreur de permission / config en lecture seule | `DOCKER_CONFIG` non posé (`/root` en lecture seule) | Passer par `./auth-user.sh` ou `./deploy.sh`, ou préfixer par `DOCKER_CONFIG=$PWD/.dockercfg` |
| Plus aucun admin ne peut se connecter | — | Sur le VPS : `./auth-user.sh reset <login>` |
| Modification enregistrée mais absente du site | Enregistrée **sans publier** (bouton ambre **À publier (N)** dans la barre) | **Publier les modifications** depuis ce bouton ou l'encadré en tête du module |
| Le bouton **À publier** a disparu sans qu'on ait publié | Le site a été reconstruit entre-temps (autre publication, redémarrage, `./update.sh`) : le lot est en ligne | Rien à faire |
