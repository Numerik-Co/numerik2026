# Rédiger le contenu du site

Ce dossier contient **tout ce qu'un éditeur a besoin de modifier**. Pas besoin
de toucher au code : créer une page = créer un fichier Markdown.

## Où va quoi

| Dossier | Contenu |
| --- | --- |
| `pages/` | Pages « éditoriales » (présentation, statuts, mentions légales…) |
| `news/` | Articles d'actualité (un dossier par article, avec `cover.jpg` optionnel) |
| `activites/` | Fiches d'activité |
| `annonces.md` | Bandeau d'annonce affiché en haut du site |

Le reste de la navigation (Accueil, Activités, Actualités, Contact) et le bouton
**Adhérer** sont configurés une seule fois par l'intégrateur dans
`src/config/site.ts`.

---

## Créer une page

1. Créer un dossier dans `pages/` et y placer un fichier `index.md` :

   ```
   src/contents/pages/notre-projet/index.md   ->  page accessible sur /notre-projet
   ```

2. En tête du fichier, un bloc **frontmatter** (entre `---`) :

   ```md
   ---
   title: "Notre projet"
   description: "Résumé affiché sous le titre et dans les moteurs de recherche."
   menu:
     show: true      # true = la page apparaît dans la barre de navigation
     order: 15        # ordre d'apparition (petit = plus à gauche)
     label: "Projet"  # facultatif : texte du menu s'il doit différer du titre
   ---

   Le contenu de la page, en **Markdown**…
   ```

3. C'est tout. La route et l'entrée de menu sont générées automatiquement au
   déploiement.

### Page accessible mais absente du menu

Ne pas mettre de bloc `menu:`, ou mettre `show: false` :

```md
---
title: "Statuts"
menu:
  show: false
---
```

La page reste consultable via son URL (utile pour les liens de pied de page).

---

## Créer un menu déroulant (sous-menu)

La **structure des dossiers** décide du regroupement. Toutes les pages rangées
dans un même sous-dossier de `pages/` deviennent les entrées d'un même menu
déroulant.

```
pages/
  association/
    _group.md                     <- décrit le menu déroulant
    notre-histoire/index.md        -> /association/notre-histoire
    conseiller-numerique/index.md  -> /association/conseiller-numerique
```

Le fichier `_group.md` donne le **libellé et la position** du menu déroulant :

```md
---
label: "Association"
order: 10
---
```

> Le libellé du menu déroulant **n'est pas cliquable** : seules les pages
> enfants ont un lien. Si `_group.md` est absent, le libellé est déduit du nom
> du dossier (`association` → « Association »).

Chaque page enfant garde son propre bloc `menu:` (`show`, `order`, `label`) qui
contrôle sa présence et sa position **dans le menu déroulant**.

---

## Ordre des entrées

Tout est trié par `order` (les pages de contenu et les pages du template sont
mélangées sur la même échelle). Repères actuels :

| `order` | Entrée |
| --- | --- |
| 0 | Accueil |
| 10 | Association (menu déroulant) |
| 20 | Activités |
| 30 | Actualités |
| 40 | Contact |

Choisir un `order` intermédiaire (ex. `25`) pour intercaler une nouvelle page.

---

## Récapitulatif des champs frontmatter

### Page — `pages/<...>/index.md`

| Champ | Requis | Rôle |
| --- | --- | --- |
| `title` | oui | Titre de la page (onglet, en-tête, fil d'ariane) |
| `description` | non | Chapô sous le titre + méta description SEO |
| `menu.show` | non | `true` pour afficher dans la navigation (défaut : masqué) |
| `menu.order` | non | Position dans son niveau (défaut : `99`) |
| `menu.label` | non | Texte du menu si différent de `title` |

### Menu déroulant — `pages/<dossier>/_group.md`

| Champ | Requis | Rôle |
| --- | --- | --- |
| `label` | non | Libellé du menu déroulant (défaut : nom du dossier) |
| `order` | non | Position du menu déroulant dans la navbar (défaut : `50`) |
