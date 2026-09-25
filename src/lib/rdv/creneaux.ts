/**
 * Créneaux de RDV avec le Conseiller Numérique : dérivés des blocs
 * `conseillerNumerique` (`src/lib/agenda.ts`, 09h–12h Lundi→Vendredi,
 * jamais dans Grist), découpés en tranches de 30 min fixes — ni le·la
 * conseiller·ère ni le bénéficiaire ne peuvent choisir une autre durée.
 *
 * Les créneaux déjà pris (ligne `RDV` non annulée à la même Date+Heure)
 * sont retournés avec `disponible: false` pour être grisés côté formulaire,
 * pas masqués.
 */

import { conseillerNumerique } from '../agenda';
import { COLS, dateToEpochSeconds, epochSecondsToDate, listRecords, TABLES } from './grist';
import { STATUT_RDV } from './choices';
import type { Creneau } from './types';

const FUSEAU = 'Europe/Paris';
const DUREE_MIN = 30;
/** Fenêtre de réservation glissante. */
const FENETRE_JOURS = 21;
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

/** Créneaux candidats (sans distinction disponible/pris) sur la fenêtre de réservation. */
function genererCandidats(depuis: Date): Creneau[] {
	const aujourdhui = dateDuJourIso(depuis);
	const minutesMaintenant = minutesActuelles(depuis);
	const candidats: Creneau[] = [];

	for (let offset = 0; offset < FENETRE_JOURS; offset++) {
		const dateIso = addDaysIso(depuis, offset);
		const jour = jourSemaineLabel(dateIso);
		const session = conseillerNumerique.find((s) => s.day === jour);
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
			});
		}
	}
	return candidats;
}

/** Clé de correspondance Date+Heure entre un créneau candidat et une ligne RDV. */
function cle(date: string, heure: string): string {
	return `${date}_${heure}`;
}

/** Créneaux de la fenêtre de réservation, `disponible: false` pour ceux déjà pris. */
export async function fetchCreneauxDisponibles(depuis = new Date()): Promise<Creneau[]> {
	const candidats = genererCandidats(depuis);
	if (candidats.length === 0) return candidats;

	const rdvsConfirmes = await listRecords(TABLES.rdv, { [COLS.rdv.statut]: [STATUT_RDV.confirme] });
	const pris = new Set(
		rdvsConfirmes.map((r) => {
			const dateIso = epochSecondsToDate(Number(r.fields[COLS.rdv.date]));
			return cle(dateIso, String(r.fields[COLS.rdv.heure] ?? ''));
		}),
	);

	return candidats.map((c) => ({ ...c, disponible: !pris.has(cle(c.date, c.heure)) }));
}

/** Lieu de la permanence pour une date donnée, déduit du jour (`conseillerNumerique`). */
export function lieuPourDate(dateIso: string): string | null {
	const jour = jourSemaineLabel(dateIso);
	return conseillerNumerique.find((s) => s.day === jour)?.location ?? null;
}

/** Un créneau précis (date+heure) est-il toujours libre ? Revérifié à l'écriture. */
export async function creneauEstLibre(date: string, heure: string): Promise<boolean> {
	const dateEpoch = dateToEpochSeconds(date);
	if (dateEpoch === null) return false;
	const rdvs = await listRecords(TABLES.rdv, {
		[COLS.rdv.date]: [dateEpoch],
		[COLS.rdv.heure]: [heure],
		[COLS.rdv.statut]: [STATUT_RDV.confirme],
	});
	return rdvs.length === 0;
}
