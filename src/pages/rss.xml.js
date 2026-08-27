import rss from '@astrojs/rss';
import { getAllNews } from '../lib/news';
import { association } from '../lib/association';

export async function GET(context) {
	const articles = getAllNews();

	return rss({
		title: `Actualités · ${association.name}`,
		description: `Les dernières actualités de l'association ${association.name}.`,
		site: context.site,
		items: articles.map((article) => ({
			title: article.title,
			description: article.excerpt,
			pubDate: new Date(article.publishAt),
			link: article.href,
			categories: article.tag ? [article.tag] : [],
		})),
	});
}
