import { frontmatter } from '../contents/annonces.md';

export type AnnonceTone = 'info' | 'accent' | 'urgent';

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

const TONES: AnnonceTone[] = ['info', 'accent', 'urgent'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Toutes les annonces déclarées dans src/contents/annonces.md, hors brouillons
 * (`active: false`). Le filtrage par date de validité est fait côté navigateur
 * par le composant AnnoncesIlot afin de rester juste même sans reconstruction
 * du site.
 */
export function getAnnonces(): Annonce[] {
	const raw = (frontmatter?.annonces ?? []) as Record<string, unknown>[];

	return raw
		.filter((entry) => entry.active !== false)
		.map((entry, index) => {
			const id = String(entry.id ?? '').trim();
			const title = String(entry.title ?? '').trim();
			const message = String(entry.message ?? '').trim();
			const startDate = String(entry.startDate ?? '').trim();
			const endDate = String(entry.endDate ?? '').trim();

			if (!id) throw new Error(`annonces.md : l'annonce #${index + 1} n'a pas d'\`id\`.`);
			if (!title || !message) {
				throw new Error(`annonces.md : l'annonce "${id}" doit avoir un \`title\` et un \`message\`.`);
			}
			if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
				throw new Error(
					`annonces.md : l'annonce "${id}" doit avoir \`startDate\` et \`endDate\` au format "AAAA-MM-JJ".`,
				);
			}

			const tone = TONES.includes(entry.tone as AnnonceTone)
				? (entry.tone as AnnonceTone)
				: 'info';

			const ctaLabel = entry.ctaLabel ? String(entry.ctaLabel).trim() : undefined;
			const ctaHref = entry.ctaHref ? String(entry.ctaHref).trim() : undefined;

			return {
				id,
				title,
				message,
				startDate,
				endDate,
				tone,
				icon: entry.icon ? String(entry.icon).trim() : 'fa-bullhorn',
				ctaLabel: ctaLabel && ctaHref ? ctaLabel : undefined,
				ctaHref: ctaLabel && ctaHref ? ctaHref : undefined,
			} satisfies Annonce;
		});
}
