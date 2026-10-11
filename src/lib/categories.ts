/**
 * Catégories d'activités (Parcours, Ateliers…), propres à chaque association :
 * lues dans `src/content/activites/_categories.yaml` (liste, ordre = ordre du
 * site), gérée depuis le module « Activités » de l'espace bénévoles
 * (`src/lib/category-writer.ts`). Sans ce fichier (site installé avant la
 * gestion des catégories), les catégories par défaut du modèle s'appliquent.
 *
 * Même principe qu'`association.ts` : fichier importé tel quel (`?raw`, via
 * `import.meta.glob` pour qu'il puisse manquer), validé ici, lecture
 * synchrone (utilisé par `content.config.ts`) ; fichier invalide = build en
 * échec avec un message clair.
 */

import { z } from 'astro/zod';
import { parse as parseYaml } from 'yaml';

export interface Category {
	/** Adresse de la page de la catégorie (`/activites/<slug>`), valeur de `category:` dans les fiches. */
	slug: string;
	label: string;
	/** Icône Font Awesome (style « solid »), ex. `fa-route`. */
	icon: string;
	/** Texte du bandeau de la page de la catégorie (facultatif). */
	description: string;
}

export const CATEGORY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CATEGORY_ICON = /^fa-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const CATEGORY_LABEL_MAX = 40;
export const CATEGORY_DESCRIPTION_MAX = 300;

/** Catégories du modèle, quand l'association n'a pas (encore) de `_categories.yaml`. */
export const DEFAULT_CATEGORIES: Category[] = [
	{
		slug: 'parcours',
		label: 'Parcours',
		icon: 'fa-route',
		description: "Des parcours d'apprentissage progressifs, du grand débutant au perfectionnement.",
	},
	{
		slug: 'ateliers',
		label: 'Ateliers',
		icon: 'fa-screwdriver-wrench',
		description: 'Des ateliers pratiques pour prendre en main vos usages numériques du quotidien.',
	},
	{
		slug: 'mediation-numerique',
		label: 'Médiation numérique',
		icon: 'fa-people-group',
		description: 'Un accompagnement individuel ou collectif animé par notre conseiller·ère numérique.',
	},
	{
		slug: 'fablab',
		label: 'FabLab',
		icon: 'fa-cubes',
		description: 'Un espace de fabrication numérique pour créer, prototyper et apprendre en faisant.',
	},
];

const schema = z
	.array(
		z.object({
			slug: z.string().regex(CATEGORY_SLUG, 'adresse invalide (minuscules, chiffres et tirets)'),
			label: z.string().trim().min(1, 'champ obligatoire').max(CATEGORY_LABEL_MAX, `${CATEGORY_LABEL_MAX} caractères au plus`),
			icon: z.string().regex(CATEGORY_ICON, 'icône Font Awesome attendue (ex. fa-route)'),
			description: z
				.string()
				.max(CATEGORY_DESCRIPTION_MAX, `${CATEGORY_DESCRIPTION_MAX} caractères au plus`)
				.nullish()
				.transform((v) => v?.trim() ?? ''),
		}),
		{ error: 'liste de catégories attendue' },
	)
	.min(1, 'au moins une catégorie')
	.superRefine((list, ctx) => {
		const seen = new Set<string>();
		list.forEach((c, i) => {
			if (seen.has(c.slug)) ctx.addIssue({ code: 'custom', path: [i, 'slug'], message: `adresse « ${c.slug} » en double` });
			seen.add(c.slug);
		});
	});

/** Contenu de `_categories.yaml` → catégories ; erreur claire si le fichier est invalide. */
export function parseCategories(text: string): Category[] {
	const result = schema.safeParse(parseYaml(text));
	if (result.success) return result.data;
	const details = result.error.issues.map((i) => `  - ${i.path.join('.') || '(fichier)'} : ${i.message}`).join('\n');
	throw new Error(`src/content/activites/_categories.yaml invalide :\n${details}`);
}

const files = import.meta.glob<string>('../content/activites/_categories.yaml', { eager: true, query: '?raw', import: 'default' });
const raw = Object.values(files)[0];

export const categories: Category[] = raw === undefined ? DEFAULT_CATEGORIES : parseCategories(raw);

export function getCategory(slug: string): Category | undefined {
	return categories.find((category) => category.slug === slug);
}
