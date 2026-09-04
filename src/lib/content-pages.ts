import type { Heading } from './headings';

/**
 * Découverte automatique des pages de contenu.
 *
 * Toute page rangée dans `src/contents/pages/<...>/index.{md,mdx}` devient
 * automatiquement une route (`/<...>`) grâce à `src/pages/[...slug].astro`,
 * et peut apparaître dans la navigation via son frontmatter `menu:`.
 *
 * L'arborescence de dossiers pilote l'URL ET le menu :
 *   src/contents/pages/statuts/index.md               -> /statuts
 *   src/contents/pages/association/_group.md           -> libellé du menu déroulant « Association »
 *   src/contents/pages/association/notre-histoire/...  -> /association/notre-histoire (dans le dropdown)
 */

export interface PageMenuMeta {
	/** `true` = la page apparaît dans la barre de navigation. */
	show: boolean;
	/** Position relative dans son niveau (navbar ou dropdown). Défaut : 99. */
	order: number;
	/** Libellé affiché dans le menu. Défaut : le `title` de la page. */
	label: string;
}

export interface ContentPage {
	/** Chemin sans slash initial, ex. `association/notre-histoire`. */
	slug: string;
	/** Segments du slug, ex. `['association', 'notre-histoire']`. */
	segments: string[];
	/** URL absolue, ex. `/association/notre-histoire`. */
	url: string;
	title: string;
	description?: string;
	/** `null` si le frontmatter ne contient pas de bloc `menu:`. */
	menu: PageMenuMeta | null;
	/** Image de couverture, si un fichier `cover.*` existe dans le dossier de la page. */
	image?: any;
	imageCredit?: string;
	headings: Heading[];
	Content: any;
}

export interface GroupMeta {
	label: string;
	order: number;
}

interface PageModule {
	frontmatter: Record<string, any>;
	Content: any;
	getHeadings: () => Heading[];
}

interface GroupModule {
	frontmatter: { label?: string; order?: number };
}

const PAGES_DIR = '../contents/pages/';

const pageModules = import.meta.glob('../contents/pages/**/index.{md,mdx}', {
	eager: true,
}) as Record<string, PageModule>;

const groupModules = import.meta.glob('../contents/pages/**/_group.{md,mdx}', {
	eager: true,
}) as Record<string, GroupModule>;

const pageImages = import.meta.glob('../contents/pages/**/cover.*', {
	eager: true,
	import: 'default',
}) as Record<string, any>;

function titleCase(segment: string): string {
	return segment
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

function relativePath(path: string): string {
	return path.slice(path.indexOf(PAGES_DIR) + PAGES_DIR.length);
}

function slugFromPagePath(path: string): string {
	return relativePath(path).replace(/\/index\.mdx?$/, '');
}

/** Dossier contenant le fichier, pour associer une page à son éventuel `cover.*`. */
function dirFromPath(path: string): string {
	return path.slice(0, path.lastIndexOf('/'));
}

function folderFromGroupPath(path: string): string {
	const withoutFile = relativePath(path).replace(/\/_group\.mdx?$/, '');
	return withoutFile.split('/').pop() ?? withoutFile;
}

/** Métadonnées des menus déroulants, indexées par nom de dossier. */
const groups: Record<string, GroupMeta> = {};
for (const [path, mod] of Object.entries(groupModules)) {
	const folder = folderFromGroupPath(path);
	groups[folder] = {
		label: mod.frontmatter.label ?? titleCase(folder),
		order: mod.frontmatter.order ?? 50,
	};
}

/** Libellé + ordre d'un dropdown ; valeurs déduites du nom de dossier si aucun `_group.md`. */
export function getGroupMeta(folder: string): GroupMeta {
	return groups[folder] ?? { label: titleCase(folder), order: 50 };
}

export function getGroupLabel(folder: string): string {
	return getGroupMeta(folder).label;
}

let cache: ContentPage[] | null = null;

/** Toutes les pages de contenu, triées par slug. Résultat mémoïsé. */
export function getContentPages(): ContentPage[] {
	if (cache) return cache;

	cache = Object.entries(pageModules)
		.map(([path, mod]) => {
			const slug = slugFromPagePath(path);
			const segments = slug.split('/');
			const leaf = segments[segments.length - 1];
			const title = mod.frontmatter.title ?? titleCase(leaf);
			const rawMenu = mod.frontmatter.menu;
			const imagePath = Object.keys(pageImages).find((p) => dirFromPath(p) === dirFromPath(path));

			const menu: PageMenuMeta | null = rawMenu
				? {
						show: rawMenu.show === true,
						order: typeof rawMenu.order === 'number' ? rawMenu.order : 99,
						label: rawMenu.label ?? title,
					}
				: null;

			return {
				slug,
				segments,
				url: `/${slug}`,
				title,
				description: mod.frontmatter.description,
				menu,
				image: imagePath ? pageImages[imagePath] : undefined,
				imageCredit: mod.frontmatter.imageCredit,
				headings: mod.getHeadings(),
				Content: mod.Content,
			} satisfies ContentPage;
		})
		.sort((a, b) => a.slug.localeCompare(b.slug));

	return cache;
}

export function getContentPage(slug: string): ContentPage {
	const page = getContentPages().find((entry) => entry.slug === slug);
	if (!page) {
		throw new Error(`Page de contenu introuvable pour le slug "${slug}"`);
	}
	return page;
}
