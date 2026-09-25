/**
 * Événement d'agenda (iCalendar, RFC 5545) pour un RDV avec le Conseiller
 * Numérique : utilisé par le bouton « Ajouter à mon agenda » (fichier .ics)
 * et par le QR code de l'écran de confirmation de `RdvForm.vue`.
 */

import type { Demarche } from './types';

const FUSEAU = 'Europe/Paris';
const DUREE_MINUTES = 30;

export interface EvenementRdv {
	date: string; // ISO yyyy-mm-dd, heure locale de l'association
	heure: string; // "09:30"
	lieu: string;
	titre: string;
	description: string;
}

/**
 * Documents à apporter, une ligne par document, toutes démarches confondues.
 * Une puce saisie dans Grist (« - », « • », « * ») est retirée : l'affichage met la sienne.
 */
export function documentsDemarches(demarches: Pick<Demarche, 'documents'>[]): string[] {
	return demarches
		.flatMap((d) => d.documents.split('\n'))
		.map((ligne) => ligne.trim().replace(/^[-•*]\s*/, ''))
		.filter(Boolean);
}

/** Compose l'événement d'un RDV — partagé par le QR code (client) et la route `/api/rdv/ics`. */
export function evenementRdv(
	date: string,
	heure: string,
	lieu: string,
	demarches: Pick<Demarche, 'nom' | 'documents'>[],
): EvenementRdv {
	const documents = documentsDemarches(demarches);
	const description = [
		...(demarches.length ? [`Démarche : ${demarches.map((d) => d.nom).join(', ')}`] : []),
		...(documents.length ? ['', 'À apporter :', ...documents.map((d) => `- ${d}`)] : []),
	].join('\n');
	return { date, heure, lieu, titre: 'RDV Conseiller Numérique', description };
}

/** Heure locale Europe/Paris -> instant UTC (gère l'heure d'été). */
function versUtc(dateIso: string, heure: string): Date {
	const [a, mo, j] = dateIso.split('-').map(Number);
	const [h, mi] = heure.split(':').map(Number);
	const approx = Date.UTC(a, mo - 1, j, h, mi);
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone: FUSEAU,
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
		})
			.formatToParts(new Date(approx))
			.map((p) => [p.type, Number(p.value)]),
	);
	const vuAParis = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
	return new Date(approx - (vuAParis - approx));
}

/** Date -> 20260930T073000Z */
function horodatage(d: Date): string {
	return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Échappement des valeurs texte iCalendar. */
function texte(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function lignesEvenement(e: EvenementRdv): string[] {
	const debut = versUtc(e.date, e.heure);
	const fin = new Date(debut.getTime() + DUREE_MINUTES * 60_000);
	return [
		'BEGIN:VEVENT',
		`SUMMARY:${texte(e.titre)}`,
		`DTSTART:${horodatage(debut)}`,
		`DTEND:${horodatage(fin)}`,
		...(e.lieu ? [`LOCATION:${texte(e.lieu)}`] : []),
		...(e.description ? [`DESCRIPTION:${texte(e.description)}`] : []),
		'END:VEVENT',
	];
}

/** Fichier .ics complet, pour le téléchargement. */
export function fichierIcs(e: EvenementRdv): string {
	const debut = versUtc(e.date, e.heure);
	return [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Numerik//RDV Conseiller Numerique//FR',
		'METHOD:PUBLISH',
		...lignesEvenement(e).flatMap((l) =>
			l === 'BEGIN:VEVENT'
				? [l, `UID:rdv-${horodatage(debut)}-${Math.random().toString(36).slice(2)}@numerik`, `DTSTAMP:${horodatage(new Date())}`]
				: [l],
		),
		'END:VCALENDAR',
	].join('\r\n');
}

/**
 * Contenu du QR code : un VEVENT seul, forme reconnue par l'appareil photo
 * de l'iPhone et par Google Lens (« Ajouter à l'agenda »).
 */
export function contenuQrCode(e: EvenementRdv): string {
	return lignesEvenement(e).join('\n');
}
