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

### 4. Créer le premier compte administrateur

Le premier compte se crée en ligne de commande, avec le script
`./auth-user.sh` (à côté de `deploy.sh`) ; ensuite, tout se fait depuis le site :

```bash
cd /opt/numerik2026
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

et de vérifier que le domaine public figure dans `security.allowedDomains`
(`astro.config.mjs`, aujourd'hui `www.clubmicrosaintpierre.fr`). Si le site
répond aussi sur un autre domaine (sans `www`, autre nom…), l'y ajouter.

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
┌────────────────────────────────────────────────────────────────────┐
│ ⚙ Espace bénévoles  🔒 Pages réservées  👥 Comptes  🔑 Mon mot de passe     Marie  ⏻ Déconnexion │
└────────────────────────────────────────────────────────────────────┘
```

- Chaque bouton ouvre un **module** dans un **panneau à droite**, par-dessus
  la page (plein écran sur téléphone, où seules les icônes s'affichent).
- Pour fermer un panneau : la croix ✕, la touche **Échap**, ou un clic sur
  la partie assombrie de la page.
- Vous naviguez normalement sur le site : la barre vous suit sur toutes les pages.

Les modules visibles dépendent de votre groupe :

| Module | Bureau (`admin`) | Rédacteur·rice | Animateur·rice |
| :--- | :---: | :---: | :---: |
| Pages réservées | ✅ | ✅ | ✅ |
| Actualités | ✅ | ✅ | — |
| Comptes | ✅ | — | — |
| Mon mot de passe | ✅ | ✅ | ✅ |

### Pages réservées

Liste les pages du site qui ne sont visibles qu'une fois connecté·e
(fiches pratiques, documents internes…). Un clic ouvre la page.

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
   l'avancement, puis affiche le lien vers l'actualité en ligne. On peut
   fermer le panneau pendant ce temps.

Refusés à l'envoi, avec un message qui indique la ligne en cause : le
**HTML** dans le texte, les liens autres que `http(s)`, `mailto:`, `tel:` ou
internes, et les images dans le texte (seule la photo de couverture se
dépose). Si la reconstruction échoue, rien n'est publié et le site reste tel
quel.

> Le titre et la date forment l'adresse de la page
> (`/actualites/2026-10-15-atelier-retouche-photo`) : deux actualités ne
> peuvent pas avoir la même date et le même titre.

**Supprimer une actualité** : icône 🗑 au bout de sa ligne, puis
**Supprimer** dans l'encadré rouge qui apparaît (ou **Annuler**). Le site est
reconstruit comme pour un ajout ; l'actualité disparaît de la page
Actualités, de l'accueil et du flux RSS. Si la reconstruction échoue, rien
n'est supprimé. Pour **corriger** une actualité : la supprimer puis la
redéposer corrigée (l'édition directe depuis le module viendra plus tard).

> Supprimer à la main le dossier dans `src/content/news/` ne retire
> l'actualité du site qu'à la prochaine reconstruction : passez par le
> module.

Côté serveur, la publication a des prérequis (sources du site, gestionnaire
de process) : voir [publication.md](publication.md).

### Changer mon mot de passe

Module **🔑 Mon mot de passe** :

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
     *Rédacteur·rice* (publication des actualités), *Bureau /
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

Bouton **⏻ Déconnexion** à droite de la barre. Indispensable sur un
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
pour les personnes autorisées. Comme tout contenu, elle est publiée au
prochain build. Détail : [src/content/README.md](../src/content/README.md).

---
title: "Fiches animateur·rice·s"
access: animateur        # ou : true (toute personne connectée), admin, [animateur, admin]
---
```

La page disparaît du menu public et apparaît dans **Pages réservées** pour
les personnes autorisées. Comme tout contenu, elle est publiée au prochain
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
| « Requête refusée » | Requête venant d'un autre site, ou domaine non prévu | Vérifier le domaine dans `astro.config.mjs` (`security.allowedDomains`) et l'en-tête `X-Forwarded-Host` de nginx |
| Comptes disparus après un déploiement | Volume `./data` non monté | Vérifier `volumes:` dans `docker-compose.yml`, restaurer la sauvegarde de `data/` |
| `Cannot find package 'yaml'` en lançant `auth-user.mjs` | `node dist/cli/auth-user.mjs` lancé **sur le VPS, hors du conteneur** (chemin `/opt/…`) | Utiliser `./auth-user.sh …` |
| `docker` : erreur de permission / config en lecture seule | `DOCKER_CONFIG` non posé (`/root` en lecture seule) | Passer par `./auth-user.sh` ou `./deploy.sh`, ou préfixer par `DOCKER_CONFIG=$PWD/.dockercfg` |
| Plus aucun admin ne peut se connecter | — | Sur le VPS : `./auth-user.sh reset <login>` |
