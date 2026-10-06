/**
 * Annonces de la bannière : collection `annonces` (`src/content.config.ts`,
 * fichier `src/content/annonces.yaml`), validée au build.
 */

import { getCollection, type CollectionEntry } from 'astro:content';

export type AnnonceTone = CollectionEntry<'annonces'>['data']['tone'];

export interface Annonce {
	id: string;
	title: string;
	message: string;
	startDate: string; // AAAA-MM-JJ
	endDate: string; // AAAA-MM-JJ (inclus)
	tone: AnnonceTone;
	icon: string;
	ctaLabel?: string;
	ctaHref?: string;
}

/**
 * Toutes les annonces de `src/content/annonces.yaml`, hors brouillons
 * (`active: false`), dans l'ordre du fichier (`position`). Le filtrage par date de validité
 * est fait côté navigateur par `AnnonceBanner.astro`, afin de rester juste
 * même sans reconstruction du site. Le lien d'action n'est gardé que si
 * `ctaLabel` ET `ctaHref` sont renseignés.
 */
export async function getAnnonces(): Promise<Annonce[]> {
	const entries = await getCollection('annonces', ({ data }) => data.active);
	return entries
		.sort((a, b) => a.data.position - b.data.position)
		.map(({ data }) => {
			const cta = data.ctaLabel && data.ctaHref;
			return {
				id: data.id,
				title: data.title,
				message: data.message,
				startDate: data.startDate,
				endDate: data.endDate,
				tone: data.tone,
				icon: data.icon,
				ctaLabel: cta ? data.ctaLabel : undefined,
				ctaHref: cta ? data.ctaHref : undefined,
			} satisfies Annonce;
		});
}
