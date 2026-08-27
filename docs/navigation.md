# Navigation (menu et pied de page)

## Menu principal

Le menu du header est une liste codée en dur dans `src/components/Header.astro` :

```js
const navLinks = [
	{ href: '/', label: 'Accueil' },
	{ href: '/activites', label: 'Activités' },
	{ href: '/actualites', label: 'Actualités' },
	{ href: '/contact', label: 'Contact' },
];
```

Pour ajouter, retirer ou réordonner une entrée : modifier ce tableau. Le rendu (desktop + menu mobile) et le bouton "Adhérer" s'ajustent automatiquement.

## ⚠️ Un dossier de pages ne crée pas un sous-menu automatiquement

Astro transforme la structure de `src/pages/` en routes (voir [pages.md](pages.md)), mais **ne génère aucun menu** à partir de cette arborescence. Créer `src/pages/activites/ateliers.astro` fait exister `/activites/ateliers`, mais ne fait *rien* apparaître dans la navbar.

Pour un menu déroulant (dropdown) sur une entrée existante, deux approches :

- **Liste codée en dur avec enfants (recommandé pour un nombre limité de sous-pages)** — étendre `navLinks` :

  ```js
  const navLinks = [
  	{ href: '/', label: 'Accueil' },
  	{
  		label: 'Activités',
  		href: '/activites',
  		children: [
  			{ href: '/activites/les-parcours', label: 'Les parcours' },
  			{ href: '/activites/les-ateliers-du-samedi', label: 'Les ateliers du samedi' },
  		],
  	},
  	...
  ];
  ```

  Puis adapter le template de `Header.astro` pour afficher un sous-menu au survol/clic quand `children` existe (avec `aria-haspopup` / `aria-expanded` pour l'accessibilité).

- **Génération automatique via une Content Collection** — si la liste de sous-pages devient longue ou gérée par quelqu'un d'autre que le développeur, définir une vraie [content collection](https://docs.astro.build/en/guides/content-collections/) avec un champ `order`, puis construire le sous-menu avec `getCollection()` dans `Header.astro`. Plus flexible, mais plus de mise en place (schéma, tri).

Ce chantier n'est **pas encore fait** — le menu actuel est une simple liste plate à un niveau.

## Fil d'Ariane

Chaque page interne (tout sauf l'accueil `/` et la page 404) affiche un fil d'Ariane généré par `src/components/Breadcrumb.astro`, positionné **sous le bandeau de titre** (`PageHeader`) et au-dessus du reste du contenu de la page.

Ce positionnement est géré par un slot nommé dans `src/layouts/Layout.astro` :

```astro
<main class="flex-1">
	<slot name="page-header" />
	{breadcrumbs && <Breadcrumb items={breadcrumbs} />}
	<slot />
</main>
```

Pour qu'une page bénéficie de ce placement, deux choses :

1. Passer un tableau `breadcrumbs` en prop à `<Layout>` (pas de génération automatique depuis l'URL — chaque page le construit à partir des données qu'elle a déjà : catégorie, activité, article...).
2. Ajouter `slot="page-header"` sur son `<PageHeader>` (ou tout autre bloc de titre), pour qu'il s'affiche avant le fil d'Ariane plutôt qu'après :

```astro
<Layout
	title="..."
	description="..."
	breadcrumbs={[
		{ label: 'Accueil', href: '/' },
		{ label: 'Activités', href: '/activites' },
		{ label: category.label }, // page courante : pas de href
	]}
>
	<PageHeader slot="page-header" title={category.label} description={category.description} />

	<!-- reste du contenu, dans le slot par défaut -->
</Layout>
```

Convention : "Accueil" toujours en premier avec `href: '/'`, chaque étape intermédiaire a un `href`, et le **dernier élément (page courante) n'a jamais de `href`** — il s'affiche en texte simple avec `aria-current="page"`. Si `breadcrumbs` n'est pas fourni à `<Layout>`, ou contient un seul élément, rien ne s'affiche (cas de l'accueil et de la 404).

Pour une nouvelle page, voir l'exemple de squelette dans [pages.md](pages.md).

## Pied de page

`src/components/Footer.astro` affiche :
- le logo et la description de l'association,
- les coordonnées (email, téléphone, adresse) depuis `src/lib/association.ts`,
- les liens réseaux sociaux, générés dynamiquement à partir de `association.social` — seuls les réseaux renseignés (valeur non vide) s'affichent, voir [composants.md](composants.md),
- le copyright (année générée automatiquement),
- une ligne de liens légaux codée en dur : "Mentions légales" (`/mentions-legales`), "Statuts" (`/statuts`) et "Règlement intérieur" (`/reglement-interieur`).

Ces trois pages légales sont des pages statiques classiques dans `src/pages/` (voir [pages.md](pages.md)) — elles ne sont volontairement liées que depuis le pied de page, pas depuis le menu principal.
