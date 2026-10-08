/**
 * Bibliothèque des pages du site : pages communes à tous les sites du
 * template (Accueil, Activités…), écrites dans le code (`src/pages/*.astro`)
 * mais réglées par chaque association depuis le module « Pages » :
 *  - activée ou non (désactivée = absente du menu ET introuvable, 404 ;
 *    l'accueil reste toujours actif) ;
 *  - lien dans le menu de navigation : libellé, position, visibilité ;
 *  - textes (titres, accroches…), variables `{{association.nom}}` admises.
 *
 * Seuls les écarts aux valeurs par défaut ci-dessous sont enregistrés, dans
 * `src/content/pages/_pages-site.md` (collection `sitePages`, frontmatter
 * `pages: { <id>: { active, label, order, show, textes } }`).
 *
 * Ajouter une page = une entrée dans `SITE_PAGES` (+ lecture de ses textes
 * avec `getSitePage()` dans la page `.astro`, et suppression du HTML
 * prérendu si désactivée : `src/integrations/site-pages.ts`).
 *
 * Module sans dépendance à Astro ni à Node : aussi utilisé par l'îlot Vue.
 */

import { applyPageVariablesText } from './page-variables.ts';

export interface SitePageText {
	name: string;
	label: string;
	default: string;
	/** Zone de texte sur plusieurs lignes. */
	multiline?: boolean;
	help?: string;
}

export interface SitePageDef {
	id: string;
	label: string;
	href: string;
	/** Position par défaut dans le menu ; se mélange avec celle des pages de contenu. */
	order: number;
	/** `false` = toujours active (accueil). */
	canDisable: boolean;
	/** Une phrase pour la bibliothèque du module. */
	summary: string;
	sections: { title: string; texts: SitePageText[] }[];
}

const SEO_HELP = 'Résultats des moteurs de recherche et partages ; pas affiché sur la page.';

export const SITE_PAGES: SitePageDef[] = [
	{
		id: 'accueil',
		label: 'Accueil',
		href: '/',
		order: 0,
		canDisable: false,
		summary: "Page d'entrée du site : bandeau, dernières actualités, activités, appel à adhérer.",
		sections: [
			{
				title: 'Bandeau',
				texts: [
					{ name: 'hero-titre', label: 'Titre', default: 'Le numérique, ensemble et pour toutes et tous' },
					{
						name: 'hero-mot',
						label: 'Mot mis en couleur',
						default: 'ensemble',
						help: 'Doit figurer tel quel dans le titre ; vide = aucun.',
					},
					{
						name: 'hero-accroche',
						label: 'Accroche',
						multiline: true,
						default:
							"{{association.nom}} accompagne les habitant·e·s, les associations et les écoles dans la découverte et l'appropriation des outils numériques.",
					},
					{ name: 'hero-bouton-1', label: 'Bouton principal (vers Activités)', default: 'Découvrir nos activités' },
					{ name: 'hero-bouton-2', label: 'Second bouton (vers Adhérer)', default: 'Nous rejoindre' },
				],
			},
			{
				title: 'Section Actualités',
				texts: [
					{ name: 'actus-surtitre', label: 'Surtitre', default: 'Actualités' },
					{ name: 'actus-titre', label: 'Titre', default: "Les dernières actus de l'association" },
					{ name: 'actus-lien', label: 'Lien vers la page Actualités', default: 'Voir toutes les actualités' },
				],
			},
			{
				title: 'Section Activités',
				texts: [
					{ name: 'activites-titre', label: 'Titre', default: 'Nos activités' },
					{ name: 'activites-lien', label: 'Lien vers la page Activités', default: 'Accéder à la page' },
				],
			},
			{
				title: 'Appel à nous rejoindre',
				texts: [
					{ name: 'rejoindre-titre', label: 'Titre', default: 'Envie de nous rejoindre ?' },
					{
						name: 'rejoindre-texte',
						label: 'Texte',
						multiline: true,
						default: 'Bénévoles, adhérent·e·s ou partenaires : chacun·e a sa place chez {{association.nom}}.',
					},
					{ name: 'rejoindre-bouton', label: 'Bouton (vers Adhérer)', default: "Adhérer à l'association" },
				],
			},
		],
	},
	{
		id: 'activites',
		label: 'Activités',
		href: '/activites',
		order: 20,
		canDisable: true,
		summary: 'Catégories d’activités et planning de la semaine.',
		sections: [
			{
				title: 'En-tête',
				texts: [
					{ name: 'titre', label: 'Titre', default: 'Activités' },
					{
						name: 'accroche',
						label: 'Accroche',
						multiline: true,
						default: 'Des parcours, des ateliers et des temps de médiation numérique pour tous les niveaux.',
					},
					{
						name: 'description',
						label: 'Description pour les moteurs de recherche',
						multiline: true,
						help: SEO_HELP,
						default: 'Découvrez les parcours, ateliers et actions de médiation numérique proposés par {{association.nom}}.',
					},
				],
			},
			{
				title: 'Bas de page',
				texts: [
					{ name: 'bas-titre', label: 'Titre', default: 'Une activité à envisager avec nous ?' },
					{
						name: 'bas-texte',
						label: 'Texte',
						multiline: true,
						default: 'Vous portez un projet associatif, scolaire ou de quartier en lien avec le numérique ? Parlons-en.',
					},
				],
			},
		],
	},
	{
		id: 'actualites',
		label: 'Actualités',
		href: '/actualites',
		order: 30,
		canDisable: true,
		summary: 'Liste de toutes les actualités, filtrables par thème, avec flux RSS.',
		sections: [
			{
				title: 'En-tête',
				texts: [
					{ name: 'titre', label: 'Titre', default: 'Actualités' },
					{
						name: 'accroche',
						label: 'Accroche',
						multiline: true,
						default: "Les dernières nouvelles de l'association et de ses actions sur le terrain.",
					},
					{
						name: 'description',
						label: 'Description pour les moteurs de recherche',
						multiline: true,
						help: SEO_HELP,
						default: "Les dernières actualités de l'association {{association.nom}} : ateliers, partenariats et temps forts.",
					},
				],
			},
		],
	},
	{
		id: 'contact',
		label: 'Contact',
		href: '/contact',
		order: 40,
		canDisable: true,
		summary: 'Coordonnées de l’association et formulaire de contact.',
		sections: [
			{
				title: 'En-tête',
				texts: [
					{ name: 'titre', label: 'Titre', default: 'Contactez-nous' },
					{
						name: 'accroche',
						label: 'Accroche',
						multiline: true,
						default: 'Une question, un projet, une envie de vous impliquer ? Écrivez-nous.',
					},
					{
						name: 'description',
						label: 'Description pour les moteurs de recherche',
						multiline: true,
						help: SEO_HELP,
						default: "Contactez l'association {{association.nom}} pour toute question, demande de partenariat ou d'accompagnement.",
					},
				],
			},
			{
				title: 'Coordonnées',
				texts: [
					{ name: 'coordonnees-titre', label: 'Titre', default: 'Nos coordonnées' },
					{
						name: 'coordonnees-texte',
						label: 'Texte sous les coordonnées',
						multiline: true,
						default: 'Vous pouvez aussi nous retrouver directement lors de nos permanences en atelier.',
					},
				],
			},
		],
	},
];

export const SITE_PAGE_IDS: string[] = SITE_PAGES.map((p) => p.id);

/** Noms des textes d'une page. */
export function sitePageTextNames(id: string): string[] {
	return SITE_PAGES.find((p) => p.id === id)?.sections.flatMap((s) => s.texts.map((t) => t.name)) ?? [];
}

/** Réglages enregistrés d'une page (écarts aux valeurs par défaut). */
export interface SitePageSettings {
	active?: boolean;
	label?: string;
	order?: number;
	show?: boolean;
	textes?: Record<string, string>;
}

/** Page de la bibliothèque avec ses réglages appliqués (textes bruts, variables non remplacées). */
export interface SitePageState {
	id: string;
	href: string;
	label: string;
	order: number;
	show: boolean;
	active: boolean;
	canDisable: boolean;
	defaultLabel: string;
	defaultOrder: number;
	textes: Record<string, string>;
}

export function sitePagesState(settings: Record<string, SitePageSettings> = {}): SitePageState[] {
	return SITE_PAGES.map((page) => {
		const s = settings[page.id] ?? {};
		const textes: Record<string, string> = {};
		for (const section of page.sections) {
			for (const t of section.texts) textes[t.name] = s.textes?.[t.name] ?? t.default;
		}
		return {
			id: page.id,
			href: page.href,
			label: s.label?.trim() || page.label,
			order: typeof s.order === 'number' && Number.isFinite(s.order) ? s.order : page.order,
			show: s.show !== false,
			active: !page.canDisable || s.active !== false,
			canDisable: page.canDisable,
			defaultLabel: page.label,
			defaultOrder: page.order,
			textes,
		};
	});
}

/** Textes d'une page prêts à afficher (variables remplacées, texte brut : Astro échappe à l'affichage). */
export function resolvedTexts(state: SitePageState): Record<string, string> {
	return Object.fromEntries(Object.entries(state.textes).map(([name, value]) => [name, applyPageVariablesText(value)]));
}
