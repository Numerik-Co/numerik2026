/**
 * Variables utilisables dans le texte des pages de contenu `.md` :
 * `{{association.nom}}` est remplacé à l'affichage par la valeur de
 * `src/lib/association.ts` (configuration propre à chaque déploiement).
 * Évite de recopier nom, adresse, responsable… dans les pages (ex.
 * mentions légales). Une valeur non renseignée affiche un repère
 * « [À compléter : …] » plutôt qu'un vide.
 *
 * Module sans dépendance à Astro ni à Node : aussi utilisé par l'îlot Vue
 * (aide du formulaire).
 */

import { association, getFullAddress } from './association.ts';

const missing = (what: string) => `[À compléter : ${what}]`;

export const PAGE_VARIABLES: Record<string, { label: string; value: () => string }> = {
	'association.nom': { label: "Nom de l'association", value: () => association.name },
	'association.email': { label: 'Email de contact', value: () => association.email },
	'association.telephone': { label: 'Téléphone', value: () => association.phone },
	'association.adresse': { label: 'Adresse du siège', value: () => getFullAddress() },
	'association.numero': {
		label: "Numéro d'enregistrement (SIRET ou RNA)",
		value: () => association.legal.registrationNumber || association.legal.siretNumber || missing('numéro SIRET ou RNA'),
	},
	'association.president': { label: 'Président·e', value: () => association.legal.president || missing('président·e') },
	'association.responsable-publication': {
		label: 'Responsable de la publication',
		value: () => association.legal.publicationManager || association.legal.president || missing('responsable de la publication'),
	},
	'association.fonction-responsable': {
		label: 'Fonction du·de la responsable de la publication',
		value: () => association.legal.publicationManagerRole || missing("fonction dans l'association"),
	},
	'hebergeur.nom': { label: "Nom de l'hébergeur", value: () => association.legal.hosting.name || missing("nom de l'hébergeur") },
	'hebergeur.adresse': { label: "Adresse de l'hébergeur", value: () => association.legal.hosting.address || missing("adresse de l'hébergeur") },
	'hebergeur.telephone': { label: "Téléphone de l'hébergeur", value: () => association.legal.hosting.phone || missing("téléphone de l'hébergeur") },
};

const VARIABLE = /\{\{\s*([a-z.-]+)\s*\}\}/g;

function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Remplace les variables connues dans du HTML (valeurs échappées) ; les inconnues restent telles quelles. */
export function applyPageVariables(html: string): string {
	return html.replace(VARIABLE, (whole, name: string) => {
		const variable = PAGE_VARIABLES[name];
		return variable ? escapeHtml(variable.value()) : whole;
	});
}

/** Variables inconnues citées dans un texte (contrôle avant écriture). */
export function unknownPageVariables(text: string): string[] {
	return [...new Set([...text.matchAll(VARIABLE)].map((m) => m[1]).filter((name) => !PAGE_VARIABLES[name]))];
}
