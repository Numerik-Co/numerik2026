export type AgendaKind =
	| 'parcours'
	| 'fablab'
	| 'espace-jeune'
	| 'bidouille-repair'
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
	{ label: string; icon: string; dot: string; text: string; hex: string }
> = {
	parcours: {
		label: 'Parcours initiation',
		icon: 'fa-route',
		dot: 'bg-primary',
		text: 'text-primary',
		hex: '#2f7fc1',
	},
	fablab: {
		label: 'FabLab',
		icon: 'fa-cubes',
		dot: 'bg-accent',
		text: 'text-accent',
		hex: '#7cb93f',
	},
	'espace-jeune': {
		label: 'Espace Jeune',
		icon: 'fa-gamepad',
		dot: 'bg-secondary',
		text: 'text-secondary',
		hex: '#1fa39e',
	},
	'bidouille-repair': {
		label: 'Bidouille & Repair',
		icon: 'fa-screwdriver-wrench',
		dot: 'bg-amber-500',
		text: 'text-amber-600',
		hex: '#f59e0b',
	},
	'conseiller-numerique': {
		label: 'Conseiller Numérique',
		icon: 'fa-calendar-check',
		dot: 'bg-violet-500',
		text: 'text-violet-600',
		hex: '#8b5cf6',
	},
};

/** Permanences du Conseiller Numérique : chaque matin de semaine, 09h–12h. */
const conseillerNumerique: AgendaSession[] = (
	['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'] as const
).map((day) => ({
	day,
	start: '09h00',
	end: '12h00',
	title: 'RDV du Conseiller Numérique',
	location: day === 'Mercredi' ? 'Quartier de la Moustey' : 'Ancienne mairie',
	kind: 'conseiller-numerique' as const,
}));

/** Planning hebdomadaire par défaut de l'association. */
export const weeklyAgenda: AgendaSession[] = [
	...conseillerNumerique,
	{
		day: 'Lundi',
		start: '14h00',
		end: '16h00',
		title: 'Parcours initiation « Amandier »',
		animators: 'Marie',
		kind: 'parcours',
	},
	{
		day: 'Lundi',
		start: '18h00',
		end: '20h00',
		title: 'FabLab',
		animators: 'Luc et Adrien',
		kind: 'fablab',
	},
	{
		day: 'Mardi',
		start: '16h30',
		end: '18h00',
		title: 'Parcours initiation',
		animators: 'Marie et Jean-Luc',
		kind: 'parcours',
	},
	{
		day: 'Mardi',
		start: '18h00',
		end: '19h30',
		title: 'Parcours initiation',
		animators: 'Xavier',
		kind: 'parcours',
	},
	{
		day: 'Mercredi',
		start: '16h30',
		end: '18h00',
		title: 'Espace Jeune',
		animators: 'Marie',
		kind: 'espace-jeune',
	},
	{
		day: 'Jeudi',
		start: '16h30',
		end: '18h00',
		title: 'Parcours initiation',
		animators: 'Marie',
		kind: 'parcours',
	},
	{
		day: 'Jeudi',
		start: '18h00',
		end: '19h30',
		title: 'Parcours initiation',
		animators: 'Adrien',
		kind: 'parcours',
	},
	{
		day: 'Samedi',
		start: '09h00',
		end: '12h00',
		title: 'Espace « Bidouille & Repair »',
		animators: "Équipe de l'atelier",
		kind: 'bidouille-repair',
		note: 'Un samedi sur deux (bimensuel)',
	},
];

/** Regroupe les séances par jour, dans l'ordre de `AGENDA_DAYS`. */
export function groupByDay(sessions: AgendaSession[]) {
	return AGENDA_DAYS.map((day) => ({
		day,
		sessions: sessions
			.filter((session) => session.day === day)
			.sort((a, b) => a.start.localeCompare(b.start)),
	})).filter((group) => group.sessions.length > 0);
}
