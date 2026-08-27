import type { Heading } from './headings';

export interface StaticPage {
	slug: string;
	title: string;
	description?: string;
	headings: Heading[];
	Content: any;
}

const pageFiles = import.meta.glob('../contents/pages/*/index.{md,mdx}', { eager: true }) as Record<
	string,
	{ frontmatter: Record<string, any>; Content: any; getHeadings: () => Heading[] }
>;

function slugFromPath(path: string) {
	return path.split('/').slice(-2, -1)[0];
}

export function getPageBySlug(slug: string): StaticPage {
	const entry = Object.entries(pageFiles).find(([path]) => slugFromPath(path) === slug);

	if (!entry) {
		throw new Error(`Page introuvable dans src/contents/pages/ pour le slug "${slug}"`);
	}

	const [, mod] = entry;
	const { frontmatter, Content, getHeadings } = mod;

	return {
		slug,
		title: frontmatter.title,
		description: frontmatter.description,
		headings: getHeadings(),
		Content,
	};
}
