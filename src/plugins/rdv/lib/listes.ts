/**
 * Listes de choix du formulaire, lues dans les colonnes Choice du document
 * Grist de l'association (pas dans le code : une autre association a
 * d'autres listes). Thématiques = colonne `Thematique` de `Demarches` ;
 * genre, tranche d'âge, statut = colonnes de `Beneficiaires`.
 *
 * Gardées 5 minutes en mémoire : servies au formulaire (`/api/rdv/listes`)
 * et revérifiées à l'envoi (`/api/rdv/prendre`).
 */
import { COLS, listChoices, TABLES } from './grist';
import type { ListesRdv } from './types';

const DUREE_CACHE_MS = 5 * 60 * 1000;
let cache: { listes: ListesRdv; expire: number } | null = null;

export async function fetchListes(): Promise<ListesRdv> {
	if (cache && cache.expire > Date.now()) return cache.listes;
	const c = COLS.beneficiaire;
	const [thematiques, genres, tranchesAge, statuts] = await Promise.all([
		listChoices(TABLES.demarches, COLS.demarche.thematique),
		listChoices(TABLES.beneficiaires, c.genre),
		listChoices(TABLES.beneficiaires, c.trancheAge),
		listChoices(TABLES.beneficiaires, c.statut),
	]);
	const listes = { thematiques, genres, tranchesAge, statuts };
	cache = { listes, expire: Date.now() + DUREE_CACHE_MS };
	return listes;
}
