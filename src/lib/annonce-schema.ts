/**
 * Règles des annonces de la bannière (`src/content/annonces.yaml`),
 * partagées par la collection `annonces` (`src/content.config.ts`) et le
 * module « Annonces » de l'Espace Admin (`src/lib/annonce-writer.ts`,
 * formulaire `AnnonceForm.vue`). Sans dépendance à Astro hors `astro/zod`.
 */

import { z } from 'astro/zod';
import { ANNONCE_DEFAULT_ICON, ANNONCE_TONES } from './annonce-options';

export * from './annonce-options';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format attendu : "AAAA-MM-JJ".');

/** Champs d'une annonce telle qu'écrite dans le fichier (défauts appliqués). */
export const annonceFields = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	message: z.string().min(1),
	startDate: date,
	/** Dernier jour d'affichage, inclus. */
	endDate: date,
	tone: z.enum(ANNONCE_TONES).default('info'),
	/** Icône Font Awesome (solid). */
	icon: z.string().default(ANNONCE_DEFAULT_ICON),
	ctaLabel: z.string().optional(),
	ctaHref: z.string().optional(),
	/** `false` = brouillon, jamais affiché. */
	active: z.boolean().default(true),
});

export const endAfterStart = (a: { startDate: string; endDate: string }) => a.endDate >= a.startDate;
export const END_AFTER_START = '`endDate` doit être postérieure ou égale à `startDate`.';

export const annonceSchema = annonceFields.refine(endAfterStart, { message: END_AFTER_START });
export type AnnonceSource = z.infer<typeof annonceFields>;

/** Liste entière (fichier) : mêmes règles qu'au build, identifiants uniques. */
export function parseAnnonceList(data: unknown): AnnonceSource[] {
	const list = z.array(annonceSchema).parse(data ?? []);
	const seen = new Set<string>();
	for (const a of list) {
		if (seen.has(a.id)) throw new Error(`Deux annonces ont l'identifiant « ${a.id} ».`);
		seen.add(a.id);
	}
	return list;
}
