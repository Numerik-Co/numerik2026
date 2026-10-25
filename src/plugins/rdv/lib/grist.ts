/**
 * Client Grist + mapping des colonnes du document des RDV — document Grist
 * DISTINCT de celui de l'adhésion (même instance). Grist ne supporte pas les
 * colonnes Reference/RefList inter-documents : le lien avec `Membres` (doc
 * adhésion) se fait côté applicatif, par email, jamais par contrainte Grist.
 *
 * ⚠️ SEUL ENDROIT à ajuster si ce schéma Grist change : `TABLES`, `COLS`
 * (schéma attendu documenté dans le README du plugin). Les listes de choix
 * (thématiques, genre, tranche d'âge, statut) sont lues dans le document
 * lui-même (`listes.ts`).
 *
 * Adresse de l'instance, document et tables : `grist:` de `src/content/rdv.yaml`
 * (réglables depuis le module « Plugins », lus au build), sinon variables du
 * `.env` lues au DÉMARRAGE du serveur (`astro:env`, cf. `src/lib/adhesion/grist.ts`).
 * La clé d'API vient toujours du `.env` (`GRIST_API_KEY_RDV`, sinon
 * `GRIST_API_KEY`) : jamais figée dans dist/.
 */

import {
	GRIST_API_KEY,
	GRIST_API_KEY_RDV,
	GRIST_BASE_URL,
	GRIST_DOC_ID_RDV,
	GRIST_TABLE_BENEFICIAIRES,
	GRIST_TABLE_DEMARCHES,
	GRIST_TABLE_RDV,
} from 'astro:env/server';
import { GristError } from '../../../lib/adhesion/grist';
import { rdvConfig } from './config';

// `grist:` de `src/content/rdv.yaml` (module « Plugins ») avant le `.env`.
const { grist } = rdvConfig;
const BASE_URL = grist.url ?? GRIST_BASE_URL;
const DOC_ID = grist.document ?? GRIST_DOC_ID_RDV;
/** Clé propre au plugin (limitée au document des RDV) si elle existe, sinon celle de l'adhésion. */
const API_KEY = GRIST_API_KEY_RDV || GRIST_API_KEY;

export const TABLES = {
	beneficiaires: grist.tables.beneficiaires ?? GRIST_TABLE_BENEFICIAIRES,
	rdv: grist.tables.rdv ?? GRIST_TABLE_RDV,
	demarches: grist.tables.demarches ?? GRIST_TABLE_DEMARCHES,
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
		// Compte rendu après le RDV (facultatives : voir `SUIVI` de
		// `admin/suivi.ts`, écrites depuis le module « Rendez-vous ») :
		// Lieu_reel, Materiel_utilise, Sous_thematique_demarche,
		// Niveau_autonomie, Oriente_autre_structure, Notes_accompagnement,
		// Evaluation_satisfaction, Suggestions_beneficiaire.
	},
	demarche: {
		nom: 'Nom',
		thematique: 'Thematique',
		icone: 'Icone',
		description: 'Description',
		documents: 'Documents', // documents à apporter le jour du RDV, facultatif
	},
} as const;

/** Valeurs de la colonne `Statut_rdv` (Choice) — partie du schéma attendu. */
export const STATUT_RDV = {
	confirme: 'Confirmé',
	annule: 'Annulé',
	honore: 'Honoré',
	absent: 'Absent',
} as const;

/** Statuts qui occupent le créneau : tous sauf « Annulé » (seule l'annulation le libère). */
export const STATUTS_OCCUPANTS: string[] = [STATUT_RDV.confirme, STATUT_RDV.honore, STATUT_RDV.absent];

export { GristError };

export function assertGristConfig(): void {
	if (!BASE_URL || !DOC_ID || !API_KEY) {
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
	return `${BASE_URL}/api/docs/${DOC_ID}${path}`;
}

async function gristFetch<T>(path: string, init?: RequestInit): Promise<T> {
	assertGristConfig();
	const res = await fetch(docUrl(path), {
		...init,
		headers: {
			Authorization: `Bearer ${API_KEY}`,
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

export async function deleteRecord(table: string, id: number): Promise<void> {
	await gristFetch(`/tables/${table}/data/delete`, {
		method: 'POST',
		body: JSON.stringify([id]),
	});
}

/** Colonne d'une table : type Grist (`Text`, `Choice`, `ChoiceList`…) et choix éventuels, dans l'ordre défini dans Grist. */
export interface GristColonne {
	id: string;
	type: string;
	choices: string[];
}

export async function listColumns(table: string): Promise<GristColonne[]> {
	const data = await gristFetch<{ columns: { id: string; fields: { type?: string; widgetOptions?: string } }[] }>(`/tables/${table}/columns`);
	return data.columns.map((c) => {
		let choices: string[] = [];
		try {
			const parsed = (JSON.parse(c.fields.widgetOptions || '{}') as { choices?: unknown }).choices;
			if (Array.isArray(parsed)) choices = parsed.filter((x): x is string => typeof x === 'string');
		} catch {
			// widgetOptions illisible : pas de choix
		}
		return { id: c.id, type: c.fields.type ?? '', choices };
	});
}

/** Choix d'une colonne Choice / ChoiceList, dans l'ordre défini dans Grist. */
export async function listChoices(table: string, colonne: string): Promise<string[]> {
	return (await listColumns(table)).find((c) => c.id === colonne)?.choices ?? [];
}
