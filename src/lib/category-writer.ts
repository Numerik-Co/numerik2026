/**
 * Écriture des catégories d'activités (`src/content/activites/_categories.yaml`,
 * lu par `src/lib/categories.ts`) depuis le module « Activités » de l'espace
 * bénévoles : création, modification, suppression, ordre. La publication
 * (reconstruction du site) est faite par `site-build.ts`, via
 * `admin-publish.ts`.
 *
 * La liste entière est revalidée (`parseCategories`, même règles qu'au
 * build) avant d'écrire. Le YAML est modifié en place (`yaml` Document) : les
 * commentaires d'un fichier écrit à la main sont conservés. Sans fichier
 * (site installé avant la gestion des catégories), la première modification
 * l'écrit à partir des catégories par défaut.
 *
 * L'adresse (`slug`, = `category:` des fiches et `/activites/<slug>`) est
 * fixée à la création. Une catégorie ne se supprime que vide (aucune fiche,
 * brouillons compris), et il en reste toujours une.
 *
 * Transaction sur tout `src/content/activites/` (`activitiesTransaction`),
 * partagée avec les fiches : un nouvel ordre des catégories et des fiches
 * part en une seule publication (`saveCatalogOrder`).
 *
 * Code serveur uniquement.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Document, isMap, isSeq, parseDocument, YAMLMap, YAMLSeq } from 'yaml';
import {
	activitiesTransaction,
	activitesSourceDir,
	activityOrderChanges,
	listActivitySources,
	writeActivityOrder,
	type Applied,
} from './activity-writer';
import {
	CATEGORY_DESCRIPTION_MAX,
	CATEGORY_ICON,
	CATEGORY_LABEL_MAX,
	CATEGORY_SLUG,
	DEFAULT_CATEGORIES,
	parseCategories,
	type Category,
} from './categories';
import { slugify } from './news-writer';

const FILE = '_categories.yaml';
const SLUG_MAX = 40;

const HEADER = [
	" Catégories d'activités, dans l'ordre du site (accueil, /activites).",
	" Gérées depuis l'espace bénévoles (module « Activités »).",
	' slug : adresse de la page (/activites/<slug>) et valeur de « category: »',
	"        dans les fiches ; ne pas la changer à la main si des fiches l'utilisent.",
	' icon : icône Font Awesome, style « solid » (https://fontawesome.com/search?ic=free&s=solid).',
	' description : texte du bandeau de la page de la catégorie (facultatif).',
].join('\n');

export type CategoryInput = Category;

// --- Lecture ---------------------------------------------------------------

async function readFileText(): Promise<string | null> {
	try {
		return await readFile(join(activitesSourceDir(), FILE), 'utf8');
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw err;
	}
}

/** Catégories telles qu'elles sont dans les sources (défauts du modèle sans fichier). */
export async function readCategorySources(): Promise<Category[]> {
	const text = await readFileText();
	return text === null ? DEFAULT_CATEGORIES : parseCategories(text);
}

/** Document YAML à modifier : le fichier existant, ou un nouveau tiré des défauts. */
async function readDocument(): Promise<{ doc: Document; seq: YAMLSeq<YAMLMap> }> {
	const text = await readFileText();
	let doc: Document;
	if (text === null) {
		doc = new Document(DEFAULT_CATEGORIES);
		doc.commentBefore = HEADER;
	} else {
		doc = parseDocument(text);
		if (doc.errors.length) throw new Error(`${FILE} illisible : ${doc.errors[0].message}`);
	}
	if (!isSeq(doc.contents)) throw new Error(`${FILE} : une liste de catégories est attendue.`);
	return { doc, seq: doc.contents as YAMLSeq<YAMLMap> };
}

const slugOf = (item: unknown) => (isMap(item) ? String(item.get('slug') ?? '') : '');

/** Écrit le fichier après revalidation de la liste entière (mêmes règles qu'au build). */
async function writeDocument(root: string, doc: Document): Promise<void> {
	const text = doc.toString({ lineWidth: 0 });
	parseCategories(text);
	await writeFile(join(root, FILE), text, 'utf8');
}

// --- Écriture --------------------------------------------------------------

export type CategoryResult = { slug?: string; label?: string; applied?: Applied; errors: string[] };

function validate(input: CategoryInput): string[] {
	const errors: string[] = [];
	const label = input.label.trim();
	if (!label) errors.push('Le nom de la catégorie est obligatoire.');
	else if (label.length > CATEGORY_LABEL_MAX) errors.push(`Le nom est trop long (${CATEGORY_LABEL_MAX} caractères max).`);
	if (!CATEGORY_ICON.test(input.icon)) errors.push('Choisissez une icône.');
	if (input.description.trim().length > CATEGORY_DESCRIPTION_MAX) {
		errors.push(`La description est trop longue (${CATEGORY_DESCRIPTION_MAX} caractères max).`);
	}
	return errors;
}

/** Crée (`currentSlug` null, en dernière position) ou modifie une catégorie. */
export async function saveCategory(input: CategoryInput, currentSlug: string | null): Promise<CategoryResult> {
	const errors = validate(input);
	const { doc, seq } = await readDocument();
	const current = currentSlug ? seq.items.find((item) => slugOf(item) === currentSlug) : undefined;
	if (currentSlug && !current) return { errors: ['Catégorie introuvable dans les sources.'] };

	let slug = currentSlug ?? '';
	if (!currentSlug) {
		slug = (input.slug.trim() || slugify(input.label)).slice(0, SLUG_MAX).replace(/-+$/, '');
		if (!CATEGORY_SLUG.test(slug)) errors.push('Adresse invalide : minuscules, chiffres et tirets seulement (ex. jeux-video).');
		else if (seq.items.some((item) => slugOf(item) === slug)) errors.push(`Une catégorie utilise déjà l'adresse « ${slug} ».`);
	}
	if (errors.length) return { errors };

	const label = input.label.trim();
	const description = input.description.trim();
	const item = current ?? (doc.createNode({ slug }) as YAMLMap);
	item.set('label', label);
	item.set('icon', input.icon);
	if (description) item.set('description', description);
	else item.delete('description');
	if (!current) seq.items.push(item);

	const applied = await activitiesTransaction((root) => writeDocument(root, doc));
	return { slug, label, applied, errors: [] };
}

/** Supprime une catégorie vide (aucune fiche, brouillons compris) ; il en reste toujours une. */
export async function deleteCategory(slug: string): Promise<CategoryResult> {
	const { doc, seq } = await readDocument();
	const index = seq.items.findIndex((item) => slugOf(item) === slug);
	if (index < 0) return { errors: ['Catégorie introuvable dans les sources (déjà supprimée ?).'] };
	const label = String(seq.items[index].get('label') ?? slug);
	const used = (await listActivitySources()).filter((a) => a.category === slug).length;
	if (used) {
		return {
			errors: [
				`« ${label} » contient ${used > 1 ? `${used} activités` : 'une activité'} (brouillons compris) : changez-${used > 1 ? 'les' : 'la'} de catégorie ou supprimez-${used > 1 ? 'les' : 'la'} d'abord.`,
			],
		};
	}
	if (seq.items.length === 1) return { errors: ['Il faut au moins une catégorie : créez-en une autre avant de supprimer celle-ci.'] };
	seq.items.splice(index, 1);
	const applied = await activitiesTransaction((root) => writeDocument(root, doc));
	return { slug, label, applied, errors: [] };
}

/**
 * Nouvel ordre, en une seule publication : des catégories (`categoryOrder`,
 * toutes les adresses dans le nouvel ordre, ou `null`) et/ou des fiches dans
 * leurs catégories (`levels`, cf. `activityOrderChanges`).
 */
export async function saveCatalogOrder(
	levels: Record<string, string[]>,
	categoryOrder: string[] | null,
): Promise<{ applied?: Applied; categoriesMoved: boolean; errors: string[] }> {
	const { changes, errors } = await activityOrderChanges(levels);
	if (errors.length) return { categoriesMoved: false, errors };

	const { doc, seq } = await readDocument();
	let categoriesMoved = false;
	if (categoryOrder) {
		const current = seq.items.map(slugOf);
		const same =
			categoryOrder.length === current.length &&
			new Set(categoryOrder).size === categoryOrder.length &&
			categoryOrder.every((s) => current.includes(s));
		if (!same) return { categoriesMoved: false, errors: ['La liste a changé entre-temps : rechargez le module puis recommencez.'] };
		categoriesMoved = categoryOrder.some((s, i) => s !== current[i]);
		if (categoriesMoved) seq.items = categoryOrder.map((s) => seq.items[current.indexOf(s)]);
	}
	if (!changes.length && !categoriesMoved) return { categoriesMoved, errors: ["L'ordre n'a pas changé."] };

	const applied = await activitiesTransaction(async (root) => {
		await writeActivityOrder(root, changes);
		if (categoriesMoved) await writeDocument(root, doc);
	});
	return { applied, categoriesMoved, errors: [] };
}

/** Corps JSON du formulaire → `CategoryInput` (types forcés, rien n'est validé ici). */
export function readCategoryInput(raw: unknown): CategoryInput {
	const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	const text = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : '');
	return { slug: text('slug'), label: text('label'), icon: text('icon'), description: text('description') };
}
