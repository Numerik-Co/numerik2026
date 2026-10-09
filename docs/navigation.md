# Navigation (menu et pied de page)

## Menu principal

Le menu du header est **construit automatiquement au build** par
`src/lib/navigation.ts` (`getNavTree()`), à partir de deux sources :

1. **Les pages du site actives** — bibliothèque `src/lib/site-pages.ts`
   (Accueil, Activités, Actualités, Contact) ; activation, libellé, position,
   visibilité et textes se règlent depuis le module « Pages »
   (`src/content/pages/_pages-site.md`, cf. [pages.md](pages.md)). Le bouton
   CTA « Adhérer » se règle dans `src/content/reglages.yaml` (`cta`, jamais une entrée
   de menu).
2. **Les pages de `src/content/pages/`** dont le frontmatter porte
   `menu.show: true` — voir [pages.md](pages.md) et le guide éditeur
   [`src/content/README.md`](../src/content/README.md).

`src/components/layout/Header.astro` consomme `getNavTree()` : le rendu
(desktop + menu mobile) et le bouton « Adhérer » sont inchangés, seule la
source des données a changé. Le tableau `navLinks` codé en dur a disparu.

### Ajouter / retirer / réordonner une entrée

| Cas | Où agir |
| --- | --- |
| Page éditoriale (contenu) | Frontmatter `menu:` de `src/content/pages/<...>/index.md` |
| Page du site (Accueil, Activités…) | Module « Pages » (libellé, masquer, activer/désactiver, flèches ↑/↓ pour l'ordre) ; nouvelle page : `SITE_PAGES` de `src/lib/site-pages.ts` |
| Bouton « Adhérer » | `cta` dans `src/content/reglages.yaml` (`enabled: false` le masque) |
| Ordre | Champ `order` — builtin et contenu sont triés sur la **même échelle** |

Repères d'`order` actuels : Accueil `0`, Association `10`, Activités `20`,
Actualités `30`, Contact `40`.

## Un dossier de pages **crée** désormais un sous-menu

Contrairement à l'ancienne version : ranger des pages de contenu dans un
sous-dossier de `src/content/pages/` les regroupe automatiquement dans un
menu déroulant.

```
src/content/pages/
  association/
    _group.md                     -> libellé + ordre du menu déroulant
    notre-histoire/index.md        -> /association/notre-histoire (enfant, menu.show:true)
    conseiller-numerique/index.md  -> /association/conseiller-numerique
```

- `_group.md` (`label`, `order`) décrit le dropdown. Absent → libellé déduit du
  nom de dossier (`association` → « Association »).
- Le **libellé du dropdown n'est pas cliquable** : seules les pages enfants
  (avec `menu.show: true`) ont un lien.
- Chaque enfant garde son propre `menu.order` / `menu.label` pour sa position
  et son texte **dans** le dropdown.

## Menu déroulant (rendu)

`getNavTree()` produit soit `{ label, href }` (lien simple), soit
`{ label, children: NavLink[] }` (dropdown). `Header.astro` gère les deux :

- **Desktop** : un `<button>` (`aria-haspopup`, `aria-expanded`) ouvre un
  panneau (`data-dropdown-panel`) au clic. Le script de `Header.astro` gère
  l'ouverture/fermeture, ferme les autres dropdowns, et ferme au clic extérieur
  ou à `Échap`.
- **Mobile** : le libellé s'affiche en texte simple, suivi de ses enfants
  indentés (`pl-3`).

⚠️ Un libellé de dropdown n'ayant pas de page « hub » propre, tout fil d'Ariane
qui le mentionne doit omettre son `href` — c'est ce que fait automatiquement
`src/components/article/ContentPageView.astro` (`{ label: groupMetaOf(groups, folder).label }` sans `href`).
`Breadcrumb.astro` affiche alors ce libellé en texte simple.

## Fil d'Ariane

Chaque page interne (tout sauf l'accueil `/` et la 404) affiche un fil d'Ariane
généré par `src/components/layout/Breadcrumb.astro`, positionné **sous le
bandeau de titre** (`PageHeader`) via un slot nommé dans `Layout.astro` /
`ArticleLayout.astro` :

```astro
<main class="flex-1">
	<slot name="page-header" />
	{breadcrumbs && <Breadcrumb items={breadcrumbs} />}
	<slot />
</main>
```

Pour une page « libre » (`.astro` dans `src/pages/`), deux choses :

1. Passer un tableau `breadcrumbs` en prop au layout (pas de génération
   automatique depuis l'URL).
2. Ajouter `slot="page-header"` sur son `<PageHeader>`.

Pour une page de contenu (`src/content/pages/`), le fil d'Ariane est **construit
automatiquement** par `src/pages/[...slug].astro` à partir du chemin :
`Accueil` → (libellé du dossier parent, si sous-dossier) → titre de la page.

Convention : « Accueil » toujours en premier avec `href: '/'`, chaque étape
intermédiaire a un `href` (sauf un libellé de dropdown), et le **dernier
élément (page courante) n'a jamais de `href`** — il s'affiche en texte simple
avec `aria-current="page"`. Un `breadcrumbs` absent ou à un seul élément
n'affiche rien (accueil, 404).

## Pied de page

`src/components/layout/Footer.astro` affiche :
- le logo et la description de l'association,
- les coordonnées (email, téléphone, adresse) depuis `src/content/association.yaml`,
- les liens réseaux sociaux, générés à partir de `association.social` (seuls les
  réseaux renseignés s'affichent — voir [composants.md](composants.md)),
- le copyright (année automatique),
- une ligne de liens légaux codée en dur : « Mentions légales »
  (`/mentions-legales`), « Statuts » (`/statuts`), « Règlement intérieur »
  (`/reglement-interieur`).

Ces trois pages sont des pages de contenu ordinaires
(`src/content/pages/<slug>/index.md`) avec `menu.show: false` : accessibles par
leur URL, liées uniquement depuis le pied de page. Passer leur `menu.show` à
`true` les ajouterait aussi à la navbar.
