/**
 * Pages du site vers lesquelles un texte peut pointer, pour le bloc
 * « Insérer un lien vers une page du site » des formulaires d'actualité,
 * de page et d'activité (`src/components/admin/LinkPicker.vue`, route
 * `GET /api/admin/liens`).
 *
 * Lu dans les **sources** (pas dans le site construit) : une page tout
 * juste créée apparaît aussitôt. Brouillons, actualités à paraître et pages
 * réservées sont listés avec une mention (`note`) : le lien est valable mais
 * pas encore (ou pas pour tout le monde) consultable.
 *
 * Code serveur uniquement.
 */

import { readdir } from 'node:fs/promises';
import { site } from '../config/site';
import { listActivitySources } from './activity-writer';
import { readCategorySources } from './category-writer';
import { NEWS_SLUG, newsSourceDir, readNewsSource } from './news-writer';
import { listPagesSource } from './page-writer';
import { pluginActif } from '../plugins';
import { RDV_HREF, RDV_NOM, rdvToggle } from '../plugins/rdv';

export interface SiteLink {
	title: string;
	href: string;
	/** Précision affichée à côté du titre (catégorie, date, « brouillon »…). */
	note?: string;
}

export interface SiteLinkGroup {
	id: string;
	label: string;
	links: SiteLink[];
}

/** Pages applicatives du modèle (formulaires, services) : `form` = clé de `site.forms`, `closed` = fermée (plugin) ; signalées. */
const SERVICE_PAGES: { title: string; href: string; form?: keyof typeof site.forms; closed?: boolean }[] = [
	{ title: 'Adhérer', href: '/adherer' },
	{ title: "Formulaire d'adhésion", href: '/adherer/formulaire', form: 'adhesion' },
	{ title: 'Inscription à une activité', href: '/inscription', form: 'inscription' },
	...(pluginActif('rdv') ? [{ title: RDV_NOM, href: RDV_HREF, closed: !rdvToggle().enabled }] : []),
	{ title: 'Je participe', href: '/je-participe' },
];

const frenchDate = (iso: string) => {
	const [y, m, d] = iso.split('-');
	return y && m && d ? `${d}/${m}/${y}` : iso;
};

export async function listSiteLinks(): Promise<SiteLinkGroup[]> {
	const { sitePages, pages } = await listPagesSource();
	const reserved = (path: string) => path.startsWith('espace-benevoles/');

	const groups: SiteLinkGroup[] = [
		{
			id: 'site',
			label: 'Pages du site',
			links: [
				...sitePages
					.filter((p) => p.active)
					.sort((a, b) => a.order - b.order)
					.map((p) => ({ title: p.label, href: p.href })),
				...SERVICE_PAGES.map(({ title, href, form, closed }) => ({
					title,
					href,
					...(closed || (form && !site.forms[form].enabled) ? { note: 'formulaire fermé' } : {}),
				})),
			],
		},
		{
			id: 'pages',
			label: 'Pages',
			links: pages.map((p) => ({
				title: p.title,
				href: `/${p.path}`,
				...(reserved(p.path) ? { note: 'réservée aux bénévoles' } : {}),
			})),
		},
	];

	const categories = await readCategorySources();
	const activities = await listActivitySources();
	groups.push({
		id: 'activites',
		label: 'Activités',
		links: categories.flatMap((c) => [
			{ title: c.label, href: `/activites/${c.slug}`, note: 'catégorie' },
			...activities
				.filter((a) => a.category === c.slug)
				.map((a) => ({
					title: a.title,
					href: `/activites/${c.slug}/${a.slug}`,
					note: a.isPublish ? c.label : `${c.label} · brouillon`,
				})),
		]),
	});

	const names = (await readdir(newsSourceDir()).catch(() => [] as string[])).filter((n) => NEWS_SLUG.test(n));
	const today = new Date().toISOString().slice(0, 10);
	const news = (await Promise.all(names.map((n) => readNewsSource(n)))).filter((n) => n !== null);
	news.sort((a, b) => b.publishAt.localeCompare(a.publishAt) || b.slug.localeCompare(a.slug));
	groups.push({
		id: 'actualites',
		label: 'Actualités',
		links: news.map((n) => ({
			title: n.title || n.slug,
			href: `/actualites/${n.slug}`,
			note: !n.isPublish ? 'brouillon' : n.publishAt > today ? `à paraître le ${frenchDate(n.publishAt)}` : frenchDate(n.publishAt),
		})),
	});

	return groups.filter((g) => g.links.length);
}
