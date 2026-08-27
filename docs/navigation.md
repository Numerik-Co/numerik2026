# Navigation (menu et pied de page)

## Menu principal

Le menu du header est une liste codée en dur dans `src/components/Header.astro` :

```js
const navLinks = [
	{ href: '/', label: 'Accueil' },
	{
		label: 'Association',
		children: [
			{ href: '/association/historique', label: 'Historique' },
			{ href: '/association/ethique-du-logiciel-libre', label: 'Éthique du logiciel libre' },
			{ href: '/association/conseiller-numerique', label: 'Conseiller numérique' },
		],
	},
	{ href: '/activites', label: 'Activités' },
	{ href: '/actualites', label: 'Actualités' },
	{ href: '/contact', label: 'Contact' },
];
```

Pour ajouter, retirer ou réordonner une entrée : modifier ce tableau. Le rendu (desktop + menu mobile) et le bouton "Adhérer" s'ajustent automatiquement.

Une entrée avec `children` (comme "Association" ci-dessus) n'a pas de `href` propre : ce n'est qu'un déclencheur de menu déroulant, pas un lien. Une entrée sans `children` garde un simple `href`.

## ⚠️ Un dossier de pages ne crée pas un sous-menu automatiquement

Astro transforme la structure de `src/pages/` en routes (voir [pages.md](pages.md)), mais **ne génère aucun menu** à partir de cette arborescence. Créer `src/pages/activites/ateliers.astro` fait exister `/activites/ateliers`, mais ne fait *rien* apparaître dans la navbar : il faut explicitement ajouter l'entrée (et ses `children` le cas échéant) dans `navLinks`.

## Menu déroulant (dropdown)

Une entrée `navLinks` avec un tableau `children: { href, label }[]` fait apparaître un menu déroulant dans `Header.astro` :

- **Desktop** : un `<button>` (`aria-haspopup="true"`, `aria-expanded`) ouvre un panneau (`data-dropdown-panel`) au clic. Un script dans `Header.astro` gère l'ouverture/fermeture (`classList.toggle('hidden', ...)` sur le panneau, comme pour le menu mobile), ferme les autres dropdowns ouverts, et ferme au clic en dehors ou à la touche `Échap`.
- **Mobile** : pas de second niveau de repli — le libellé s'affiche en texte simple, suivi de ses `children` indentés (`pl-3`), toujours visibles dans le menu mobile déjà dépliable.

Si un jour la liste de sous-pages devient longue ou gérée par quelqu'un d'autre que le développeur, une alternative est de générer le tableau `children` depuis une [content collection](https://docs.astro.build/en/guides/content-collections/) (champ `order`, `getCollection()`) plutôt que de le coder en dur — plus flexible, mais plus de mise en place.

⚠️ Une entrée avec `children` n'ayant pas de page "hub" propre (ex. "Association" ne mène plus à `/association`, supprimée), toute page qui construit un fil d'Ariane mentionnant ce libellé intermédiaire doit omettre son `href` :

```js
breadcrumbs={[
	{ label: 'Accueil', href: '/' },
	{ label: 'Association' }, // pas de href : pas de page à lier
	{ label: page.title },
]}
```

`Breadcrumb.astro` affiche alors ce libellé en texte simple (pas de lien), et seul le tout dernier élément reçoit `aria-current="page"`.

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
