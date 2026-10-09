import { z } from 'astro/zod';
import { parse as parseYaml } from 'yaml';
import permanencesRaw from '../content/conseiller-numerique.yaml?raw';

export type AgendaKind =
	| 'parcours'
	| 'fablab'
	| 'espace-jeune'
	| 'bidouille-repair'
	| 'ateliers'
	| 'conseiller-numerique';

export interface AgendaSession {
	/** Jour de la semaine (libellé affiché). */
	day: string;
	/** Heure de début, format « 14h00 ». */
	start: string;
	/** Heure de fin, format « 16h00 ». */
	end: string;
	/** Intitulé de la séance. */
	title: string;
	/** Personne(s) qui anime(nt) la séance. Facultatif (ex. permanence sur RDV). */
	animators?: string;
	/** Lieu de la séance, s'il diffère du lieu habituel. */
	location?: string;
	/** Famille d'activité, sert au code couleur. */
	kind: AgendaKind;
	/** Précision optionnelle (fréquence, salle…). */
	note?: string;
}

/** Ordre d'affichage des jours dans l'agenda. */
export const AGENDA_DAYS = [
	'Lundi',
	'Mardi',
	'Mercredi',
	'Jeudi',
	'Vendredi',
	'Samedi',
	'Dimanche',
] as const;

export const AGENDA_KIND_META: Record<
	AgendaKind,
	/** `hex` : couleur CSS de la bordure (variable du thème pour les couleurs de l'association). */
	{ label: string; icon: string; dot: string; text: string; hex: string }
> = {
	parcours: {
		label: 'Parcours initiation',
		icon: 'fa-route',
		dot: 'bg-primary',
		text: 'text-primary',
		hex: 'var(--color-primary)',
	},
	fablab: {
		label: 'FabLab',
		icon: 'fa-cubes',
		dot: 'bg-accent',
		text: 'text-accent',
		hex: 'var(--color-accent)',
	},
	'espace-jeune': {
		label: 'Espace Jeune',
		icon: 'fa-gamepad',
		dot: 'bg-secondary',
		text: 'text-secondary',
		hex: 'var(--color-secondary)',
	},
	'bidouille-repair': {
		label: 'Bidouille & Repair',
		icon: 'fa-screwdriver-wrench',
		dot: 'bg-amber-500',
		text: 'text-amber-600',
		hex: '#f59e0b',
	},
	ateliers: {
		label: 'Ateliers',
		icon: 'fa-calendar-check',
		dot: 'bg-violet-500',
		text: 'text-violet-600',
		hex: '#8b5cf6',
	},
	'conseiller-numerique': {
		label: 'Conseiller·ère Numérique',
		icon: 'fa-calendar-check',
		dot: 'bg-violet-500',
		text: 'text-violet-600',
		hex: '#8b5cf6',
	},

};

/**
 * Permanences du Conseiller Numérique, propres à chaque déploiement : lues
 * dans `src/content/conseiller-numerique.yaml` (fichier de l'association,
 * jamais remplacé par une mise à jour du modèle ; même principe que
 * `association.ts`). Une par jour au plus (`rdv/creneaux.ts` cherche par
 * jour), heures « 09h00 » piles ou demies dans 09h00–20h00 (grille de
 * `WeeklyAgenda`), triées dans l'ordre de la semaine.
 */
const heureSchema = z
	.string({ error: 'heure attendue, ex. 09h00' })
	.regex(/^\d{2}h\d{2}$/, 'heure au format 09h00')
	// Contrôles suivants seulement si le format est bon (un message à la fois).
	.refine((h) => !/^\d{2}h\d{2}$/.test(h) || /h(00|30)$/.test(h), 'heure pile ou demie (09h00, 09h30…)')
	.refine((h) => {
		if (!/^\d{2}h\d{2}$/.test(h)) return true;
		const n = Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
		return n >= 9 * 60 && n <= 20 * 60;
	}, 'entre 09h00 et 20h00');

const permanencesSchema = z.strictObject({
	title: z.string({ error: 'champ obligatoire' }).trim().min(1, 'champ obligatoire'),
	permanences: z
		.array(
			z
				.strictObject({
					day: z.enum(AGENDA_DAYS, { error: `jour attendu : ${AGENDA_DAYS.join(', ')}` }),
					start: heureSchema,
					end: heureSchema,
					location: z
						.string({ error: 'texte attendu' })
						.trim()
						.nullish()
						.transform((v) => v || undefined),
				})
				.refine((p) => !/^\d{2}h\d{2}$/.test(p.start) || !/^\d{2}h\d{2}$/.test(p.end) || p.start < p.end, {
					message: 'fin avant le début',
					path: ['end'],
				}),
		)
		.nullish()
		.transform((v) => v ?? [])
		.refine((list) => new Set(list.map((p) => p.day)).size === list.length, 'deux permanences le même jour'),
});

function loadConseillerNumerique(): AgendaSession[] {
	const result = permanencesSchema.safeParse(parseYaml(permanencesRaw) ?? {});
	if (!result.success) {
		const details = result.error.issues
			.map((i) => {
				const [, index, ...field] = i.path;
				const where =
					i.path[0] === 'permanences' && typeof index === 'number'
						? `permanence n°${index + 1}${field.length ? ` · ${field.join('.')}` : ''}`
						: i.path.join('.') || '(fichier)';
				const message = i.code === 'unrecognized_keys' ? `clé inconnue « ${i.keys.join(' », « ')} »` : i.message;
				return `  - ${where} : ${message}`;
			})
			.join('\n');
		throw new Error(`src/content/conseiller-numerique.yaml invalide :\n${details}`);
	}
	const { title, permanences } = result.data;
	return permanences
		.toSorted((a, b) => AGENDA_DAYS.indexOf(a.day) - AGENDA_DAYS.indexOf(b.day))
		.map((p) => ({ ...p, title, kind: 'conseiller-numerique' as const }));
}

export const conseillerNumerique: AgendaSession[] = loadConseillerNumerique();

/**
 * Regroupe les séances par jour, dans l'ordre de `AGENDA_DAYS`. Les jours
 * sans séance sont omis, sauf ceux listés dans `keepDays` (colonne vide).
 */
export function groupByDay(sessions: AgendaSession[], keepDays: readonly string[] = []) {
	return AGENDA_DAYS.map((day) => ({
		day,
		sessions: sessions
			.filter((session) => session.day === day)
			.sort((a, b) => a.start.localeCompare(b.start)),
	})).filter((group) => group.sessions.length > 0 || keepDays.includes(group.day));
}
