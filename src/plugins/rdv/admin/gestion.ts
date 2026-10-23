/**
 * Gestion des RDV depuis l'espace bénévoles (module « Rendez-vous » du
 * plugin, bureau et animateur·rice·s) : liste des RDV avec la fiche du
 * bénéficiaire, et modification d'un RDV (créneau, démarche, statut,
 * compte rendu : `suivi.ts`). Écrit directement dans Grist : pas de reconstruction du site.
 *
 * Code serveur uniquement.
 */
import { creneauEstLibre, lieuPourDate } from '../lib/creneaux';
import { demarchesParIds, fetchDemarches } from '../lib/demarches';
import { COLS, dateToEpochSeconds, epochSecondsToDate, listRecords, refList, STATUT_RDV, TABLES, updateRecord } from '../lib/grist';
import type { Demarche } from '../lib/types';
import { champsSuivi, ecrireSuivi, lireSuivi, type ChampSuiviDispo } from './suivi';

export type StatutRdv = (typeof STATUT_RDV)[keyof typeof STATUT_RDV];
export const STATUTS: StatutRdv[] = Object.values(STATUT_RDV);

/** Un RDV tel que le montre le module (jamais écrit tel quel). */
export interface RdvAdmin {
	id: number;
	date: string; // yyyy-mm-dd
	heure: string; // "09:30"
	lieu: string;
	statut: string;
	commentaire: string;
	demarcheIds: number[];
	demarches: string[]; // noms, dans l'ordre
	creeLe: string | null;
	/** Compte rendu : colonne Grist → valeur (texte, ou liste pour un choix multiple). */
	suivi: Record<string, string | string[]>;
	beneficiaire: {
		id: number | null;
		nom: string;
		prenom: string;
		email: string;
		telephone: string;
		commune: string;
	};
}

const texte = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** `['L', 1, 2]` (RefList Grist) ou id seul → liste d'ids. */
function ids(v: unknown): number[] {
	if (Array.isArray(v)) return v.filter((x): x is number => typeof x === 'number');
	return typeof v === 'number' && v > 0 ? [v] : [];
}

export async function listerRdv(): Promise<{ rdvs: RdvAdmin[]; demarches: Demarche[]; statuts: StatutRdv[]; suivi: ChampSuiviDispo[] }> {
	const [records, beneficiaires, demarches, suivi] = await Promise.all([
		listRecords(TABLES.rdv),
		listRecords(TABLES.beneficiaires),
		fetchDemarches(),
		champsSuivi(),
	]);
	const b = COLS.beneficiaire;
	const parBeneficiaire = new Map(beneficiaires.map((r) => [r.id, r.fields]));
	const nomDemarche = new Map(demarches.map((d) => [d.id, d.nom]));
	const c = COLS.rdv;
	const rdvs = records
		.map((r): RdvAdmin => {
			const f = r.fields;
			const benefId = typeof f[c.beneficiaire] === 'number' && (f[c.beneficiaire] as number) > 0 ? (f[c.beneficiaire] as number) : null;
			const fiche = benefId ? parBeneficiaire.get(benefId) : undefined;
			const demarcheIds = ids(f[c.demarche]);
			return {
				id: r.id,
				date: typeof f[c.date] === 'number' ? epochSecondsToDate(f[c.date] as number) : '',
				heure: texte(f[c.heure]),
				lieu: texte(f[c.lieu]),
				statut: texte(f[c.statut]),
				commentaire: texte(f[c.commentaire]),
				demarcheIds,
				demarches: demarcheIds.map((id) => nomDemarche.get(id) ?? `Démarche n°${id}`),
				creeLe: typeof f[c.creeLe] === 'number' ? epochSecondsToDate(f[c.creeLe] as number) : null,
				suivi: Object.fromEntries(suivi.map((s) => [s.cle, lireSuivi(s, f[s.cle])])),
				beneficiaire: {
					id: benefId,
					nom: texte(fiche?.[b.nom]),
					prenom: texte(fiche?.[b.prenom]),
					email: texte(fiche?.[b.email]),
					telephone: texte(fiche?.[b.telephone]),
					commune: texte(fiche?.[b.commune]),
				},
			};
		})
		.filter((r) => r.date)
		.sort((x, y) => `${x.date} ${x.heure}`.localeCompare(`${y.date} ${y.heure}`));
	return { rdvs, demarches, statuts: STATUTS, suivi };
}

export interface ModificationRdv {
	date: string;
	heure: string;
	demarcheId: number;
	commentaire: string;
	statut: string;
	/** Compte rendu saisi : colonne → texte ou liste (champs absents = inchangés). */
	suivi: Record<string, unknown>;
}

/** Corps JSON → modification (types vérifiés, valeurs contrôlées par `modifierRdv`). */
export function lireModification(raw: unknown): ModificationRdv | null {
	const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return null;
	if (typeof r.heure !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.heure)) return null;
	if (typeof r.demarcheId !== 'number' || !Number.isInteger(r.demarcheId) || r.demarcheId <= 0) return null;
	if (typeof r.statut !== 'string') return null;
	const suivi = r.suivi && typeof r.suivi === 'object' && !Array.isArray(r.suivi) ? (r.suivi as Record<string, unknown>) : {};
	return { date: r.date, heure: r.heure, demarcheId: r.demarcheId, commentaire: typeof r.commentaire === 'string' ? r.commentaire.trim() : '', statut: r.statut, suivi };
}

export type ResultatModification = { ok: true; changements: string[] } | { ok: false; erreur: string; status: number };

/**
 * Modifie un RDV. Créneau changé (ou RDV annulé remis en place) : revérifié
 * libre (hors ce RDV), lieu recalculé d'après le jour. Démarche changée :
 * thématiques recalculées. Compte rendu : choix contrôlés contre la colonne
 * Grist. Seuls les champs changés sont écrits.
 */
export async function modifierRdv(id: number, m: ModificationRdv): Promise<ResultatModification> {
	if (!(STATUTS as string[]).includes(m.statut)) return { ok: false, erreur: 'Statut inconnu.', status: 400 };
	const liste = await listerRdv();
	const actuel = liste.rdvs.find((r) => r.id === id);
	if (!actuel) return { ok: false, erreur: 'Rendez-vous introuvable (supprimé dans Grist ?).', status: 404 };

	const c = COLS.rdv;
	const champs: Record<string, unknown> = {};
	const changements: string[] = [];

	const creneauChange = m.date !== actuel.date || m.heure !== actuel.heure;
	if (creneauChange) {
		const lieu = lieuPourDate(m.date);
		if (lieu === null) return { ok: false, erreur: 'Aucune permanence ce jour-là.', status: 400 };
		champs[c.date] = dateToEpochSeconds(m.date);
		champs[c.heure] = m.heure;
		champs[c.lieu] = lieu;
		changements.push(`créneau ${m.date} ${m.heure}`);
	}
	// Le RDV occupera le créneau (tout statut sauf « Annulé ») : il doit être libre, hors ce RDV.
	if ((creneauChange || actuel.statut === STATUT_RDV.annule) && m.statut !== STATUT_RDV.annule) {
		if (!(await creneauEstLibre(m.date, m.heure, id))) {
			return { ok: false, erreur: 'Ce créneau est déjà pris par un autre rendez-vous.', status: 409 };
		}
	}
	if (m.demarcheId !== actuel.demarcheIds[0] || actuel.demarcheIds.length !== 1) {
		const [demarche] = await demarchesParIds([m.demarcheId]);
		if (!demarche) return { ok: false, erreur: 'Démarche inconnue.', status: 400 };
		champs[c.demarche] = refList(demarche.id);
		champs[c.thematiques] = refList(demarche.thematique);
		changements.push(`démarche ${demarche.nom}`);
	}
	if (m.commentaire !== actuel.commentaire) {
		champs[c.commentaire] = m.commentaire;
		changements.push('commentaire');
	}
	if (m.statut !== actuel.statut) {
		champs[c.statut] = m.statut;
		changements.push(`statut ${m.statut}`);
	}
	for (const champ of liste.suivi) {
		if (!(champ.cle in m.suivi)) continue;
		const ecrit = ecrireSuivi(champ, m.suivi[champ.cle]);
		if ('erreur' in ecrit) return { ok: false, erreur: ecrit.erreur, status: 400 };
		if (JSON.stringify(ecrit.lu) === JSON.stringify(actuel.suivi[champ.cle])) continue;
		champs[champ.cle] = ecrit.valeur;
		changements.push(champ.label.toLowerCase());
	}
	if (!changements.length) return { ok: false, erreur: "Rien n'a changé.", status: 400 };

	await updateRecord(TABLES.rdv, id, champs);
	return { ok: true, changements };
}
