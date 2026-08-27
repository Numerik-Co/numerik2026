import { association } from './association';
import type { Heading } from './headings';
import { estimateReadingTime } from './reading-time';

export interface Activity {
	slug: string;
	category: string;
	href: string;
	title: string;
	excerpt: string;
	level?: string;
	image?: any;
	imageCredit?: string;
	order: number;
	headings: Heading[];
	readingTime: number;
	Content: any;
}

const activityFiles = import.meta.glob('../contents/activites/*/index.md', {
	eager: true,
}) as Record<
	string,
	{
		frontmatter: Record<string, any>;
		Content: any;
		getHeadings: () => Heading[];
		rawContent: () => string;
	}
>;

const activityImages = import.meta.glob('../contents/activites/*/cover.*', {
	eager: true,
	import: 'default',
}) as Record<string, any>;

function slugFromPath(path: string) {
	return path.split('/').slice(-2, -1)[0];
}

export function getAllActivities(): Activity[] {
	return Object.entries(activityFiles)
		.filter(([, mod]) => mod.frontmatter.isPublish !== false)
		.map(([path, mod]) => {
			const { frontmatter, Content, getHeadings, rawContent } = mod;
			const slug = slugFromPath(path);
			const imagePath = Object.keys(activityImages).find((p) => slugFromPath(p) === slug);

			return {
				slug,
				category: frontmatter.category,
				href: `/activites/${frontmatter.category}/${slug}`,
				title: frontmatter.title,
				excerpt: frontmatter.excerpt,
				level: frontmatter.level,
				image: imagePath ? activityImages[imagePath] : undefined,
				imageCredit: frontmatter.imageCredit || `Photo : ${association.name}`,
				order: frontmatter.order ?? 999,
				headings: getHeadings(),
				readingTime: estimateReadingTime(rawContent()),
				Content,
			};
		})
		.sort((a, b) => a.order - b.order);
}

export function getActivitiesByCategory(categorySlug: string): Activity[] {
	return getAllActivities().filter((activity) => activity.category === categorySlug);
}
