/**
 * Fichier `.md` d'une annonce de la bannière (navigateur) : téléchargé depuis
 * le formulaire en modification, puis rechargé pour le remplir
 * (`EditFileBar`), ou déposé dans « Ajouter un contenu » pour créer une
 * annonce (modèle : `downloadAnnonceTemplate`).
 * En-tête = mêmes clés qu'une entrée de `src/content/annonces.yaml` (sauf
 * `id`, fixé à la création) ; texte = message. Le serveur revalide tout à
 * l'enregistrement (src/lib/annonce-writer.ts).
 */
import { ANNONCE_ICON, ANNONCE_TONES, type AnnonceToneValue } from '../../../../lib/annonce-options';
import type { AnnonceInput } from '../../client';
import { contentKindProblem } from '../../content-import';
import { buildMarkdownFile, downloadMarkdown, keyWarnings, parseMarkdownFile, textField } from '../../markdown-file';

const KNOWN = ['title', 'startDate', 'endDate', 'tone', 'icon', 'ctaLabel', 'ctaHref', 'active'];
/** Clés des sources réglées ailleurs : ignorées sans remarque (`null`) ou avec. */
const IGNORED: Record<string, string | null> = {
	id: null,
	message: 'le message est le texte sous l’en-tête',
};
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function annonceMarkdownFile(a: AnnonceInput): string {
	return buildMarkdownFile(
		'annonce',
		{
			title: a.title,
			startDate: a.startDate,
			endDate: a.endDate,
			tone: a.tone,
			icon: a.icon,
			ctaLabel: a.ctaLabel,
			ctaHref: a.ctaHref,
			active: a.active ? undefined : false,
		},
		a.message,
	);
}

/**
 * Lit un fichier chargé. Valeur absente ou invalide (date, couleur, icône) :
 * `undefined` = valeur du formulaire gardée, avec une remarque si invalide.
 */
export function parseAnnonceMarkdown(source: string): { fields?: Partial<AnnonceInput>; warnings: string[]; error?: string } {
	const { data, body, error } = parseMarkdownFile(source);
	if (!data) return { warnings: [], error };
	const wrongKind = contentKindProblem(data, 'annonce');
	if (wrongKind) return { warnings: [], error: wrongKind };
	const warnings = keyWarnings(data, KNOWN, IGNORED);

	const day = (key: 'startDate' | 'endDate', label: string) => {
		const v = textField(data[key]);
		if (v && !DAY.test(v)) warnings.push(`${label} « ${v} » illisible (attendu : AAAA-MM-JJ) : date du formulaire gardée.`);
		return DAY.test(v) ? v : undefined;
	};
	const tone = textField(data.tone);
	if (tone && !(ANNONCE_TONES as readonly string[]).includes(tone)) {
		warnings.push(`Couleur « ${tone} » inconnue (attendu : ${ANNONCE_TONES.join(', ')}) : couleur du formulaire gardée.`);
	}
	const icon = textField(data.icon);
	if (icon && !ANNONCE_ICON.test(icon)) warnings.push(`Icône « ${icon} » invalide (attendu : fa-…) : icône du formulaire gardée.`);

	const fields: Partial<AnnonceInput> = {
		title: textField(data.title),
		message: body.replace(/\s*\n\s*/g, ' ').trim(),
		startDate: day('startDate', 'Date de début'),
		endDate: day('endDate', 'Date de fin'),
		tone: (ANNONCE_TONES as readonly string[]).includes(tone) ? (tone as AnnonceToneValue) : undefined,
		icon: icon && ANNONCE_ICON.test(icon) ? icon : undefined,
		ctaLabel: textField(data.ctaLabel),
		ctaHref: textField(data.ctaHref),
		active: data.active !== false,
	};
	if (!fields.title) warnings.unshift('Titre absent du fichier : à saisir.');
	if (!fields.message) warnings.unshift('Message absent (texte sous l’en-tête) : à saisir.');
	return { fields: Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)), warnings };
}

/** Modèle d'annonce à compléter (généré dans le navigateur). */
export function downloadAnnonceTemplate(): void {
	downloadMarkdown(
		'modele-annonce.md',
		`---
contenu: annonce
title: "Titre court de l'annonce"
startDate: "2026-01-15"   # premier jour d'affichage (AAAA-MM-JJ)
endDate: "2026-01-31"     # dernier jour d'affichage, inclus
tone: "info"              # info (couleur principale), accent ou urgent (ambre)
icon: "fa-bullhorn"       # icône Font Awesome solid (https://fontawesome.com/search?ic=free&s=solid)
# Facultatif — retirer le « # » en début de ligne pour activer :
# ctaLabel: "Voir les détails"   # texte du lien…
# ctaHref: "/actualites"         # …et son adresse (les deux, ou aucun)
# active: false                  # brouillon : jamais affiché
---

Le message de l'annonce : une à deux phrases, sur une seule ligne de la bannière.
`,
	);
}
