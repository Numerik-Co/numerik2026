/**
 * Catalogue des démarches proposées au bloc 1 du formulaire (table Grist
 * `Demarches` : Nom, Thematique, Icone, Description). Alimenté et tenu à
 * jour directement dans Grist par l'association — aucune interface
 * d'administration côté site.
 */

import { COLS, listRecords, TABLES } from './grist';
import type { Demarche, Thematique } from './types';

export async function fetchDemarches(): Promise<Demarche[]> {
	const c = COLS.demarche;
	const records = await listRecords(TABLES.demarches);
	return records.map((r) => ({
		id: r.id,
		nom: String(r.fields[c.nom] ?? ''),
		thematique: String(r.fields[c.thematique] ?? '') as Thematique,
		icone: String(r.fields[c.icone] ?? ''),
		description: String(r.fields[c.description] ?? ''),
	}));
}

/** Démarches valides parmi `ids` — sert à revalider côté serveur avant écriture. */
export async function demarchesParIds(ids: number[]): Promise<Demarche[]> {
	const toutes = await fetchDemarches();
	const parId = new Map(toutes.map((d) => [d.id, d]));
	return ids.map((id) => parId.get(id)).filter((d): d is Demarche => d !== undefined);
}
