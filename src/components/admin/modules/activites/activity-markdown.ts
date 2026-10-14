/**
 * Fichier `.md` d'une fiche d'activité (navigateur) : téléchargé depuis le
 * formulaire en modification, puis rechargé pour le remplir (`EditFileBar`).
 * Mêmes clés que `src/content/activites/<adresse>/index.md` (cf.
 * src/lib/activity-writer.ts) ; l'adresse, l'ordre et la photo restent dans
 * le formulaire. Le serveur revalide tout à l'enregistrement.
 */
import { TYPES_ACTIVITE_INSCRIPTION } from '../../../../lib/adhesion/choices';
import { buildMarkdownFile, keyWarnings, parseMarkdownFile, textField } from '../../markdown-file';

export interface ActivityFileFields {
	title: string;
	excerpt: string;
	category: string;
	isPublish: boolean;
	level: string;
	inscription: boolean;
	activiteGrist: string[];
	typeGrist: string;
	imageCredit: string;
	body: string;
}

const KNOWN = ['title', 'excerpt', 'category', 'isPublish', 'level', 'inscription', 'activiteGrist', 'typeGrist', 'imageCredit'];
/** Clés des sources réglées ailleurs : ignorées sans remarque (`null`) ou avec. */
const IGNORED: Record<string, string | null> = {
	order: null,
	cover: "la photo se change dans l'onglet « Image »",
};

export function activityMarkdownFile(a: ActivityFileFields): string {
	return buildMarkdownFile(
		{
			title: a.title,
			isPublish: a.isPublish,
			excerpt: a.excerpt,
			category: a.category,
			level: a.level,
			inscription: a.inscription ? undefined : false,
			activiteGrist: a.activiteGrist.length === 1 ? a.activiteGrist[0] : a.activiteGrist,
			typeGrist: a.typeGrist,
			imageCredit: a.imageCredit,
		},
		a.body,
	);
}

/** Lit un fichier chargé ; catégorie ou type Grist inconnus = remarque, valeur du formulaire gardée (`undefined`). */
export function parseActivityMarkdown(
	source: string,
	categories: string[],
): { fields?: Omit<ActivityFileFields, 'category' | 'typeGrist'> & { category?: string; typeGrist?: string }; warnings: string[]; error?: string } {
	const { data, body, error } = parseMarkdownFile(source);
	if (!data) return { warnings: [], error };
	const warnings = keyWarnings(data, KNOWN, IGNORED);

	const category = textField(data.category);
	if (category && !categories.includes(category)) warnings.push(`Catégorie « ${category} » inconnue : catégorie actuelle gardée.`);
	const typeGrist = textField(data.typeGrist);
	if (typeGrist && !(TYPES_ACTIVITE_INSCRIPTION as readonly string[]).includes(typeGrist)) {
		warnings.push(`Type Grist « ${typeGrist} » inconnu (attendu : ${TYPES_ACTIVITE_INSCRIPTION.join(', ')}) : ignoré.`);
	}
	const grist = data.activiteGrist;

	return {
		fields: {
			title: textField(data.title),
			excerpt: textField(data.excerpt),
			category: category && categories.includes(category) ? category : undefined,
			isPublish: data.isPublish !== false,
			level: textField(data.level),
			inscription: data.inscription !== false,
			activiteGrist: (Array.isArray(grist) ? grist : grist ? [grist] : []).map(textField).filter(Boolean),
			typeGrist: (TYPES_ACTIVITE_INSCRIPTION as readonly string[]).includes(typeGrist) ? typeGrist : typeGrist ? undefined : '',
			imageCredit: textField(data.imageCredit),
			body,
		},
		warnings,
	};
}
