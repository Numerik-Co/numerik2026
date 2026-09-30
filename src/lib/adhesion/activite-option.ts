import { COLS, type GristRecord } from './grist';
import { toNumberOrNull } from './http';
import type { ActiviteOption } from './types';

/** Ligne `Activite` → option affichable (tarif à 0 si l'activité n'est pas payante). */
export function toActiviteOption(r: GristRecord): ActiviteOption {
	const c = COLS.activite;
	return {
		id: r.id,
		label: String(r.fields[c.nom] ?? `Activité ${r.id}`),
		prix: r.fields[c.payant] === false ? 0 : toNumberOrNull(r.fields[c.prix]),
		adhesionRequise: r.fields[c.adhesionRequise] === true,
		placesRestantes: toNumberOrNull(r.fields[c.placesRestantes]),
	};
}
