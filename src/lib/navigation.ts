import { getContentPages, getGroupMeta } from './content-pages';
import { site } from '../config/site';

/** Lien simple de la barre de navigation. */
export interface NavLink {
	label: string;
	href: string;
}

/** Menu déroulant : le libellé n'est pas cliquable, seuls les enfants le sont. */
export interface NavDropdown {
	label: string;
	children: NavLink[];
}

export type NavEntry = NavLink | NavDropdown;

interface OrderedEntry {
	order: number;
	entry: NavEntry;
}

interface Bucket {
	order: number;
	label: string;
	children: Array<{ order: number; link: NavLink }>;
}

/**
 * Construit l'arbre de navigation au build, à partir de :
 *  1. `site.builtinNav` — les pages applicatives du template ;
 *  2. les pages de `src/contents/pages/` dont le frontmatter porte `menu.show: true`.
 *
 * L'arborescence de dossiers produit les menus déroulants : une page rangée
 * dans un sous-dossier (`association/notre-histoire`) devient un enfant du
 * dropdown de ce dossier. Tout est trié par `order` (builtin et contenu mélangés).
 */
export function getNavTree(): NavEntry[] {
	const ordered: OrderedEntry[] = [];

	// 1. Pages applicatives déclarées dans src/config/site.ts
	for (const item of site.builtinNav) {
		ordered.push({ order: item.order, entry: { label: item.label, href: item.href } });
	}

	// 2. Pages de contenu marquées `menu.show: true`
	const buckets = new Map<string, Bucket>();

	for (const page of getContentPages()) {
		if (!page.menu?.show) continue;

		// Page à la racine -> lien de premier niveau
		if (page.segments.length === 1) {
			ordered.push({
				order: page.menu.order,
				entry: { label: page.menu.label, href: page.url },
			});
			continue;
		}

		// Page dans un sous-dossier -> enfant du dropdown de ce dossier
		const folder = page.segments[0];
		if (!buckets.has(folder)) {
			const meta = getGroupMeta(folder);
			buckets.set(folder, { order: meta.order, label: meta.label, children: [] });
		}
		buckets.get(folder)!.children.push({
			order: page.menu.order,
			link: { label: page.menu.label, href: page.url },
		});
	}

	// 3. Ajoute les dropdowns non vides, enfants triés
	for (const bucket of buckets.values()) {
		if (bucket.children.length === 0) continue;
		ordered.push({
			order: bucket.order,
			entry: {
				label: bucket.label,
				children: bucket.children
					.sort((a, b) => a.order - b.order)
					.map((child) => child.link),
			},
		});
	}

	return ordered.sort((a, b) => a.order - b.order).map((item) => item.entry);
}
