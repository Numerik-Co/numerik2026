/**
 * Actualités : collection `news` (`src/content.config.ts`), un dossier par
 * article dans `src/content/news/`. Tout est résolu au build : les pages
 * qui les affichent sont prérendues.
 */

import { getCollection, render, type CollectionEntry } from 'astro:content';
import { association } from './association';
import { estimateReadingTime } from './reading-time';

export type NewsEntry = CollectionEntry<'news'>;

export interface NewsArticle {
	slug: string;
	href: string;
	/** Date affichée, ex. « 6 octobre 2026 ». */
	date: string;
	/** Date de publication au format AAAA-MM-JJ. */
	publishAt: string;
	author?: string;
	title: string;
	excerpt: string;
	tag?: string;
	image?: NewsEntry['data']['cover'];
	imageCredit: string;
	readingTime: number;
	/** Entrée brute de la collection (pour `render()` sur la page de détail). */
	entry: NewsEntry;
}

function toArticle(entry: NewsEntry): NewsArticle {
	const { data } = entry;
	return {
		slug: entry.id,
		href: `/actualites/${entry.id}`,
		date: data.publishAt.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC',
		}),
		publishAt: data.publishAt.toISOString().slice(0, 10),
		author: data.author,
		title: data.title,
		excerpt: data.excerpt,
		tag: data.tag,
		image: data.cover,
		imageCredit: data.imageCredit || `Photo : ${association.name}`,
		readingTime: estimateReadingTime(entry.body ?? ''),
		entry,
	};
}

/** Actualités publiées (`isPublish` ≠ false), plus récentes d'abord. */
export async function getAllNews(): Promise<NewsArticle[]> {
	const entries = await getCollection('news', ({ data }) => data.isPublish);
	return entries
		.map(toArticle)
		.sort((a, b) => b.publishAt.localeCompare(a.publishAt) || a.slug.localeCompare(b.slug));
}

/** Contenu rendu d'une actualité : composant `Content` et titres (sommaire). */
export async function renderNews(article: NewsArticle) {
	return render(article.entry);
}
