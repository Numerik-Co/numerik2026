# Partager une actualité ou une page (Facebook…)

Chaque actualité (`/actualites/<slug>`) et chaque page de contenu
(`src/content/pages/…`) affiche un petit encart de partage :

- **sur ordinateur** : dans la colonne de droite, juste sous « X min de
  lecture » pour une actualité, au-dessus du sommaire pour une page ;
- **sur mobile / tablette** (colonne de droite masquée) : sous le texte.

L'encart a une bordure complète et des coins arrondis. Il ne contient que des
icônes : l'icône « partage » (couleur du texte, `text-gray-700`) à gauche, puis à
droite une icône cliquable par réseau. Premier outil disponible : **Facebook**.

Aucune action n'est nécessaire côté éditeur : l'encart apparaît
automatiquement sur toute nouvelle actualité ou page.

## Ce que voit la personne qui partage

Un clic sur l'icône Facebook ouvre la fenêtre de partage de Facebook dans un
nouvel onglet, avec l'adresse de la page déjà renseignée. Facebook affiche un aperçu construit à partir de :

| Aperçu Facebook | Provient de |
| :--- | :--- |
| Titre | titre de la page (`title` du frontmatter) + nom de l'association |
| Texte | `excerpt` (actualité) ou `description` (page) du frontmatter |
| Image | image de couverture (`cover.jpg/png/webp`), recadrée au format paysage 1,91:1 (1200×630 au plus) |
| Adresse | URL publique de la page |

Pour un bel aperçu, il suffit donc de soigner le résumé et de fournir une
image de couverture (voir [actualites.md](actualites.md) et
[pages.md](pages.md)). Sans image, Facebook affiche un aperçu texte seul.

**Taille de la couverture** : prévoir au moins **1200 × 630 px** (format
paysage). Le site ne l'agrandit jamais : une image de moins de 600 px de
large donne une petite vignette, et sous 200 px Facebook l'ignore et
publie le lien sans image.

> Facebook garde l'aperçu en cache. Après avoir modifié le titre, le résumé
> ou l'image d'un contenu déjà partagé, forcer la mise à jour via le
> [débogueur de partage Facebook](https://developers.facebook.com/tools/debug/)
> (« Récupérer à nouveau »).

## Réglages par déploiement

### Activer / désactiver un outil — `src/config/site.ts`

```ts
share: {
	facebook: true,
},
```

`false` masque l'icône correspondante. Si tous les outils sont à `false`,
l'encart disparaît entièrement.

### Domaine public — `astro.config.mjs`

Les adresses envoyées à Facebook (lien partagé, `og:url`, `og:image`) sont
construites à partir de `site` :

```js
site: 'https://www.clubmicrosaintpierre.fr',
```

**Chaque structure qui déploie le template doit y mettre son propre
domaine**, sinon les partages pointeront vers le mauvais site.

## Fonctionnement technique

- **Composant** : `src/components/article/ShareTools.astro`.
  Props : `title` (obligatoire, titre du contenu), `url` (facultatif, défaut =
  URL publique de la page courante), `class`.
- **Partage Facebook** : simple lien vers
  `https://www.facebook.com/sharer/sharer.php?u=<url>`. Aucun SDK Facebook
  n'est chargé et aucun cookie n'est déposé tant que la personne ne clique
  pas — pas besoin de bandeau de consentement pour cet encart. Le lien
  s'ouvre dans un **onglet normal** (`target="_blank"`), jamais en popup :
  une popup (`window.open`) bloquait la publication au nom de certaines
  Pages Facebook (attente sans fin, sans message d'erreur), alors que le
  même lien fonctionne dans un onglet.
- **Accessibilité** : les icônes n'ont pas de texte visible ; chaque lien
  porte un `aria-label` (« Partager « … » sur Facebook (nouvel onglet) »)
  et un `title` (bulle au survol). L'icône « partage » de gauche est
  décorative (`aria-hidden`).
- **Icônes** : l'icône « partage » est un SVG au trait fin (la version
  gratuite de Font Awesome ne la propose qu'en plein) ; les icônes de réseau
  sont celles de Font Awesome (`fa-brands`). Toutes font 24 px et sont
  centrées verticalement.
- **Placement** : dans le slot `sidebar` de `ArticleLayout`, dans
  `src/pages/actualites/[slug].astro` et `src/pages/[...slug].astro`, plus une
  seconde instance `lg:hidden` sous le contenu pour le mobile. Conséquence :
  ces pages ont toujours une colonne de droite, même sans sommaire.
- **Balises Open Graph** : ajoutées dans `src/layouts/ArticleLayout.astro`
  (`og:title`, `og:description`, `og:url`, `og:type`, `og:image` +
  type, dimensions et texte alternatif, `og:site_name`, `og:locale`, plus
  `<link rel="canonical">`).
  Props du layout : `image` et `ogType` (`article` pour une actualité,
  `website` par défaut). L'image de couverture est convertie en JPEG recadré
  en 1,91:1, 1200×630 au plus, sans agrandissement ; elle est envoyée
  entière si le recadrage ferait moins de 600 px de large.
  `og:image:width`/`height` reprennent les dimensions **réelles** du fichier
  produit : les déclarer fausses fait publier le lien sans image. Ces balises
  profitent aussi aux autres réseaux et messageries (LinkedIn,
  WhatsApp, Signal…) qui lisent le même protocole.

## Ajouter un outil (LinkedIn, e-mail, copier le lien…)

1. Ajouter une entrée dans le tableau `tools` de `ShareTools.astro` :

   ```ts
   {
   	key: 'linkedin',
   	label: 'LinkedIn',
   	icon: 'fa-brands fa-linkedin',
   	href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
   	ariaLabel: `Partager « ${title} » sur LinkedIn (nouvel onglet)`,
   	classes: 'text-[#0A66C2] hover:text-[#004182]',
   },
   ```

2. Ajouter la clé correspondante dans `site.share` (`src/config/site.ts`) :
   `linkedin: true`.

Les icônes s'alignent automatiquement à droite, à côté de Facebook.
