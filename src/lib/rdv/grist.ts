/**
 * Client Grist + mapping des colonnes du document « RDV Conseiller
 * Numérique » — document Grist DISTINCT de celui de l'adhésion (même
 * instance). Grist ne supporte pas les colonnes Reference/RefList
 * inter-documents : le lien avec `Membres` (doc adhésion) se fait côté
 * applicatif, par email, jamais par contrainte Grist.
 *
 * ⚠️ SEUL ENDROIT à ajuster si ce schéma Grist change : `TABLES`, `COLS`.
 * Les valeurs de listes de choix vivent dans `./choices.ts` (module pur,
 * chargeable côté navigateur).
 *
 * Lecture à l'EXÉCUTION via `process.env` (adaptateur Node) : `import.meta.env`
 * est figé au build. Voir `src/lib/adhesion/grist.ts` pour le même pattern.
 */

import { GristError } from '../adhesion/grist';

const ENV = {
	...(import.meta.env as unknown as Record<string, string | undefined>),
	...(process.env as Record<string, string | undefined>),
};

const { GRIST_BASE_URL, GRIST_DOC_ID_RDV, GRIST_API_KEY, GRIST_TABLE_BENEFICIAIRES, GRIST_TABLE_RDV, GRIST_TABLE_DEMARCHES } =
	ENV;

export const TABLES = {
	beneficiaires: GRIST_TABLE_BENEFICIAIRES || 'Beneficiaires',
	rdv: GRIST_TABLE_RDV || 'RDV',
	demarches: GRIST_TABLE_DEMARCHES || 'Demarches',
} as const;

export const COLS = {
	beneficiaire: {
		nom: 'Nom',
		prenom: 'Prenom',
		email: 'Email',
		telephone: 'Telephone',
		commune: 'Commune',
		codePostal: 'Code_postal',
		zoneGeographique: 'Zone_geographique',
		genre: 'Genre',
		trancheAge: 'Tranche_age',
		statut: 'Statut',
		consentement: 'Consentement',
		creeLe: 'Cree_le',
	},
	rdv: {
		beneficiaire: 'Beneficiaire', // Ref:Beneficiaires
		date: 'Date',
		heure: 'Heure', // Text "09:00" — durée fixe 30 min, jamais stockée
		lieu: 'Lieu',
		demarche: 'Demarche', // RefList:Demarches — choisi par le bénéficiaire
		thematiques: 'Thematiques', // ChoiceList — déduit des démarches choisies, cf. reservation.ts
		commentaire: 'Commentaire_beneficiaire',
		statut: 'Statut_rdv',
		creeLe: 'Cree_le',
		// Demarche_nom : ancien champ libre, remplacé par `demarche` (catalogue
		// structuré) — colonne conservée dans Grist mais plus jamais écrite.
		// Colonnes complétées ensuite par la conseillère directement dans
		// Grist (jamais écrites par ce code) : Materiel_utilise,
		// Sous_thematique_demarche, Niveau_autonomie, Oriente_autre_structure,
		// Notes_accompagnement, Lieu_reel, Evaluation_satisfaction,
		// Suggestions_beneficiaire.
	},
	demarche: {
		nom: 'Nom',
		thematique: 'Thematique',
		icone: 'Icone',
		description: 'Description',
		documents: 'Documents', // documents à apporter le jour du RDV, facultatif
	},
} as const;

export { GristError };

export function assertGristConfig(): void {
	if (!GRIST_BASE_URL || !GRIST_DOC_ID_RDV || !GRIST_API_KEY) {
		throw new GristError('Configuration Grist (RDV) manquante côté serveur.', 500);
	}
}

/** yyyy-mm-dd -> secondes depuis l'epoch (minuit UTC), format attendu par Grist. */
export function dateToEpochSeconds(iso: string): number | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
	const ms = Date.parse(`${iso}T00:00:00Z`);
	return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

/** Secondes depuis l'epoch (minuit UTC) -> yyyy-mm-dd. */
export function epochSecondsToDate(epoch: number): string {
	return new Date(epoch * 1000).toISOString().slice(0, 10);
}

/** Encodage d'une Ref/ChoiceList Grist pour l'écriture. */
export function refList(...values: (string | number)[]): (string | number)[] {
	return ['L', ...values];
}

function docUrl(path: string): string {
	return `${GRIST_BASE_URL}/api/docs/${GRIST_DOC_ID_RDV}${path}`;
}

async function gristFetch<T>(path: string, init?: RequestInit): Promise<T> {
	assertGristConfig();
	const res = await fetch(docUrl(path), {
		...init,
		headers: {
			Authorization: `Bearer ${GRIST_API_KEY}`,
			'Content-Type': 'application/json',
			...init?.headers,
		},
	});
	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new GristError(
			`Grist ${res.status} sur ${path}${detail ? ` — ${detail.slice(0, 300)}` : ''}`,
			502,
		);
	}
	return (await res.json()) as T;
}

export interface GristRecord<F = Record<string, unknown>> {
	id: number;
	fields: F;
}

export async function listRecords<F = Record<string, unknown>>(
	table: string,
	filter?: Record<string, (string | number | boolean)[]>,
): Promise<GristRecord<F>[]> {
	const qs = filter ? `?filter=${encodeURIComponent(JSON.stringify(filter))}` : '';
	const data = await gristFetch<{ records: GristRecord<F>[] }>(`/tables/${table}/records${qs}`);
	return data.records;
}

export async function createRecord(
	table: string,
	fields: Record<string, unknown>,
): Promise<number> {
	const data = await gristFetch<{ records: { id: number }[] }>(`/tables/${table}/records`, {
		method: 'POST',
		body: JSON.stringify({ records: [{ fields }] }),
	});
	const id = data.records[0]?.id;
	if (typeof id !== 'number') {
		throw new GristError('Grist n’a pas renvoyé d’identifiant de record.', 502);
	}
	return id;
}

export async function updateRecord(
	table: string,
	id: number,
	fields: Record<string, unknown>,
): Promise<void> {
	await gristFetch(`/tables/${table}/records`, {
		method: 'PATCH',
		body: JSON.stringify({ records: [{ id, fields }] }),
	});
}
