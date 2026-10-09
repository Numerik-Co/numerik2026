/**
 * Déduction de la zone géographique du bénéficiaire à partir de la commune
 * choisie (autocomplétion API Adresse, cf. `/api/adhesion/adresse`).
 *
 * Les zones sont propres à chaque association (`src/content/zones-geographiques.yaml`,
 * lu côté serveur par `./zones.ts`) et passées en paramètre : ce module reste
 * sans dépendance, utilisable par l'îlot Vue sans embarquer le YAML.
 */

import { normalize } from '../adhesion/http';

/** Une zone proposée au bénéficiaire ; `label` = choix de la colonne Grist `Zone_geographique`. */
export interface ZoneGeographiqueConfig {
	label: string;
	communes: string[];
	codePostal?: string;
}

/**
 * Suggestion de zone à partir de la commune (et du code postal en repli) —
 * modifiable ensuite par le bénéficiaire, ne fait jamais foi seule.
 */
export function deduireZone(zones: ZoneGeographiqueConfig[], commune: string, codePostal?: string): string {
	const c = normalize(commune);
	if (!c) return '';
	const parCommune = zones.find((z) => z.communes.some((m) => normalize(m) === c));
	if (parCommune) return parCommune.label;
	const cp = codePostal?.trim() ?? '';
	return zones.find((z) => z.codePostal && cp.startsWith(z.codePostal))?.label ?? '';
}
