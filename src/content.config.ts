/**
 * Collections de contenu (Content Layer d'Astro) : tout le contenu éditorial
 * vit dans `src/content/` et est validé au build — `npm run build` produit le
 * site complet. Doc : https://docs.astro.build/en/guides/content-collections/
 *
 * Collections : `news` (actualités). Les pages, activités et annonces
 * suivront le même modèle.
 */

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

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

export const collections = { news };
