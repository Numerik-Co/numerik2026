/**
 * Créneaux de RDV : dérivés des `permanences` (`permanences.ts`, lues dans
 * `src/content/rdv.yaml`, jamais dans Grist), découpés en tranches de durée
 * fixe (`creneaux.duree` de `rdv.yaml`, 30 min par défaut) — ni l'équipe ni
 * le bénéficiaire ne peuvent choisir une autre durée.
 *
 * Les créneaux déjà pris (ligne `RDV` non annulée à la même Date+Heure : `STATUTS_OCCUPANTS`)
 * sont retournés avec `disponible: false` pour être grisés côté formulaire,
 * pas masqués.
 *
 * `creneaux.urgence: true` : le premier créneau de chaque permanence est
 * réservé aux urgences — affiché à tou·te·s, réservable seulement par une
 * personne connectée à l'espace bénévoles (`reservable`, revérifié par
 * `/api/rdv/prendre`).
 */

import { rdvConfig } from './config';
import { permanences } from './permanences';
import { COLS, dateToEpochSeconds, epochSecondsToDate, listRecords, TABLES, STATUTS_OCCUPANTS } from './grist';
import type { Creneau } from './types';

const FUSEAU = 'Europe/Paris';
const DUREE_MIN = rdvConfig.creneaux.duree;
/** Fenêtre de réservation glissante. */
const FENETRE_JOURS = rdvConfig.creneaux.semaines * 7;
/** Marge avant un créneau du jour même en dessous de laquelle il n'est plus proposé. */
const MARGE_AVANT_MIN = 30;

function capitaliser(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/** yyyy-mm-dd (fuseau association) pour `date + offsetJours`. */
function addDaysIso(date: Date, offsetJours: number): string {
	const decale = new Date(date.getTime() + offsetJours * 24 * 60 * 60 * 1000);
	return new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU }).format(decale);
}

function jourSemaineLabel(dateIso: string): string {
	// Midi UTC pour éviter tout glissement de jour selon le fuseau de calcul.
	const d = new Date(`${dateIso}T12:00:00Z`);
	return capitaliser(new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, weekday: 'long' }).format(d));
}

function minutesActuelles(date: Date): number {
	const parts = new Intl.DateTimeFormat('fr-FR', {
		timeZone: FUSEAU,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).formatToParts(date);
	const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
	const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
	return h * 60 + m;
}

function dateDuJourIso(date: Date): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU }).format(date);
}

/** "09h00" -> 540 (minutes depuis minuit). */
function parseHeureAgenda(s: string): number {
	const m = /^(\d{2})h(\d{2})$/.exec(s);
	if (!m) return 0;
	return Number(m[1]) * 60 + Number(m[2]);
}

function minutesToHeure(min: number): string {
	const h = Math.floor(min / 60)
		.toString()
		.padStart(2, '0');
	const m = (min % 60).toString().padStart(2, '0');
	return `${h}:${m}`;
}

/**
 * Horaires de la permanence d'une date (`"09:00"`…, urgence = premier si
 * `creneaux.urgence`), lieu compris ; `null` sans permanence ce jour-là.
 */
export function horairesDuJour(dateIso: string): { lieu: string; horaires: { heure: string; urgence: boolean }[] } | null {
	const session = permanences.find((s) => s.day === jourSemaineLabel(dateIso));
	if (!session) return null;
	const debut = parseHeureAgenda(session.start);
	const fin = parseHeureAgenda(session.end);
	const horaires: { heure: string; urgence: boolean }[] = [];
	for (let t = debut; t + DUREE_MIN <= fin; t += DUREE_MIN) {
		horaires.push({ heure: minutesToHeure(t), urgence: rdvConfig.creneaux.urgence && t === debut });
	}
	return { lieu: session.location ?? '', horaires };
}

/** Créneaux candidats (sans distinction disponible/pris) sur la fenêtre de réservation. */
function genererCandidats(depuis: Date): Creneau[] {
	const aujourdhui = dateDuJourIso(depuis);
	const minutesMaintenant = minutesActuelles(depuis);
	const candidats: Creneau[] = [];

	for (let offset = 0; offset < FENETRE_JOURS; offset++) {
		const dateIso = addDaysIso(depuis, offset);
		const jour = jourSemaineLabel(dateIso);
		const session = permanences.find((s) => s.day === jour);
		if (!session) continue;

		const debut = parseHeureAgenda(session.start);
		const fin = parseHeureAgenda(session.end);
		for (let t = debut; t + DUREE_MIN <= fin; t += DUREE_MIN) {
			if (dateIso === aujourdhui && t < minutesMaintenant + MARGE_AVANT_MIN) continue;
			candidats.push({
				date: dateIso,
				jour,
				heure: minutesToHeure(t),
				lieu: session.location ?? '',
				disponible: true,
				urgence: rdvConfig.creneaux.urgence && t === debut,
				reservable: true,
			});
		}
	}
	return candidats;
}

/** Clé de correspondance Date+Heure entre un créneau candidat et une ligne RDV. */
function cle(date: string, heure: string): string {
	return `${date}_${heure}`;
}

/**
 * Créneaux de la fenêtre de réservation, `disponible: false` pour ceux déjà
 * pris ; `connecte` ouvre la réservation des créneaux d'urgence.
 */
export async function fetchCreneauxDisponibles(connecte: boolean, depuis = new Date()): Promise<Creneau[]> {
	const candidats = genererCandidats(depuis);
	if (candidats.length === 0) return candidats;

	const rdvsConfirmes = await listRecords(TABLES.rdv, { [COLS.rdv.statut]: STATUTS_OCCUPANTS });
	const pris = new Set(
		rdvsConfirmes.map((r) => {
			const dateIso = epochSecondsToDate(Number(r.fields[COLS.rdv.date]));
			return cle(dateIso, String(r.fields[COLS.rdv.heure] ?? ''));
		}),
	);

	return candidats.map((c) => {
		const disponible = !pris.has(cle(c.date, c.heure));
		return { ...c, disponible, reservable: disponible && (!c.urgence || connecte) };
	});
}

/** Lieu de la permanence pour une date donnée, déduit du jour (`permanences`). */
export function lieuPourDate(dateIso: string): string | null {
	const jour = jourSemaineLabel(dateIso);
	return permanences.find((s) => s.day === jour)?.location ?? null;
}

/** `heure` ("09:00") est-elle le premier créneau — réservé aux urgences — de la permanence de cette date ? */
export function estCreneauUrgence(dateIso: string, heure: string): boolean {
	if (!rdvConfig.creneaux.urgence) return false;
	const session = permanences.find((s) => s.day === jourSemaineLabel(dateIso));
	return session !== undefined && minutesToHeure(parseHeureAgenda(session.start)) === heure;
}

/**
 * Un créneau précis (date+heure) est-il toujours libre ? Revérifié à
 * l'écriture. `sauf` : RDV à ne pas compter (celui qu'on déplace, depuis
 * l'espace bénévoles).
 */
export async function creneauEstLibre(date: string, heure: string, sauf?: number): Promise<boolean> {
	const dateEpoch = dateToEpochSeconds(date);
	if (dateEpoch === null) return false;
	const rdvs = await listRecords(TABLES.rdv, {
		[COLS.rdv.date]: [dateEpoch],
		[COLS.rdv.heure]: [heure],
		[COLS.rdv.statut]: STATUTS_OCCUPANTS,
	});
	return rdvs.every((r) => r.id === sauf);
}
