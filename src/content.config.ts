/**
 * Collections de contenu (Content Layer d'Astro) : tout le contenu éditorial
 * vit dans `src/content/` et est validé au build — `npm run build` produit le
 * site complet. Doc : https://docs.astro.build/en/guides/content-collections/
 *
 * Collections : `news` (actualités), `pages` + `pageGroups` (pages
 * éditoriales et menus déroulants). Les activités et annonces suivront le
 * même modèle.
 */

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { parseAccess } from './lib/auth/access';

/**
 * Actualités : un dossier par article, `src/content/news/<AAAA-MM-JJ-slug>/`
 * contenant `index.md` (+ la photo citée par `cover:`). L'identifiant de
 * l'entrée — et donc l'URL `/actualites/<id>` — est le nom du dossier.
 */
const news = defineCollection({
	loader: glob({
		pattern: '*/index.md',
		base: './src/content/news',
		generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			/** Date de publication (AAAA-MM-JJ) : tri et affichage. */
			publishAt: z.coerce.date(),
			/** Résumé court : cartes, accueil, flux RSS, aperçu de partage. */
			excerpt: z.string(),
			/** `false` = brouillon : absent du site (listes, accueil, RSS, page de détail). */
			isPublish: z.boolean().default(true),
			tag: z.string().optional(),
			author: z.string().optional(),
			/** Photo de couverture, chemin relatif au dossier (`./cover.jpg`). */
			cover: image().optional(),
			/** Légende de la photo sur la page de détail (défaut : « Photo : <association> »). */
			imageCredit: z.string().optional(),
		}),
});

/**
 * Pages éditoriales : `src/content/pages/<chemin>/index.{md,mdx}` → URL
 * `/<chemin>`. Le chemin du dossier pilote l'URL ET le menu (cf.
 * `src/lib/content-pages.ts`, `src/lib/navigation.ts`).
 * Les pages réservées (`access:`) vivent dans `espace-benevoles/` : seule
 * partie rendue à la demande, tout le reste est prérendu.
 */
const pages = defineCollection({
	loader: glob({
		pattern: '**/index.{md,mdx}',
		base: './src/content/pages',
		generateId: ({ entry }) => entry.replace(/\/index\.mdx?$/, ''),
	}),
	schema: ({ image }) =>
		z.object({
			/** Défaut : nom du dossier mis en forme (`notre-histoire` → « Notre Histoire »). */
			title: z.string().optional(),
			description: z.string().optional(),
			/** Absent = page accessible par son URL mais hors du menu. */
			menu: z
				.object({
					show: z.boolean().default(false),
					order: z.number().default(99),
					label: z.string().optional(),
				})
				.optional(),
			cover: image().optional(),
			imageCredit: z.string().optional(),
			/**
			 * Restriction d'accès (pages de `espace-benevoles/` uniquement) :
			 * `true` (toute personne connectée), un groupe ou une liste. Un
			 * groupe inconnu fait échouer le build (cf. `parseAccess`).
			 */
			access: z
				.unknown()
				.optional()
				.transform((value, ctx) => {
					try {
						return parseAccess(value);
					} catch (err) {
						ctx.addIssue({ code: 'custom', message: (err as Error).message });
						return z.NEVER;
					}
				}),
		}),
});

/**
 * Menus déroulants : `src/content/pages/<dossier>/_group.md` (frontmatter
 * seul) donne le libellé et la position du dropdown de ce dossier.
 */
const pageGroups = defineCollection({
	loader: glob({
		pattern: '**/_group.md',
		base: './src/content/pages',
		generateId: ({ entry }) => entry.replace(/\/_group\.md$/, ''),
	}),
	schema: z.object({
		label: z.string().optional(),
		order: z.number().default(50),
	}),
});

export const collections = { news, pages, pageGroups };
