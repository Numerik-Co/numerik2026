import { association } from './association';
import type { Heading } from './headings';
import { estimateReadingTime } from './reading-time';

export interface NewsArticle {
	slug: string;
	href: string;
	date: string;
	publishAt: string;
	author?: string;
	title: string;
	excerpt: string;
	tag?: string;
	image?: any;
	imageCredit?: string;
	headings: Heading[];
	readingTime: number;
	Content: any;
}

const newsFiles = import.meta.glob('../contents/news/*/index.md', { eager: true }) as Record<
	string,
	{
		frontmatter: Record<string, any>;
		Content: any;
		getHeadings: () => Heading[];
		rawContent: () => string;
	}
>;

const newsImages = import.meta.glob('../contents/news/*/cover.*', {
	eager: true,
	import: 'default',
}) as Record<string, any>;

function slugFromPath(path: string) {
	return path.split('/').slice(-2, -1)[0];
}

export function getAllNews(): NewsArticle[] {
	return Object.entries(newsFiles)
		.filter(([, mod]) => mod.frontmatter.isPublish !== false)
		.map(([path, mod]) => {
			const { frontmatter, Content, getHeadings, rawContent } = mod;
			const slug = slugFromPath(path);
			const imagePath = Object.keys(newsImages).find((p) => slugFromPath(p) === slug);

			return {
				slug,
				href: `/actualites/${slug}`,
				date: new Date(frontmatter.publishAt).toLocaleDateString('fr-FR', {
					day: 'numeric',
					month: 'long',
					year: 'numeric',
				}),
				publishAt: frontmatter.publishAt,
				author: frontmatter.author,
				title: frontmatter.title,
				excerpt: frontmatter.excerpt,
				tag: frontmatter.tag,
				image: imagePath ? newsImages[imagePath] : undefined,
				imageCredit: frontmatter.imageCredit || `Photo : ${association.name}`,
				headings: getHeadings(),
				readingTime: estimateReadingTime(rawContent()),
				Content,
			};
		})
		.sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime());
}
