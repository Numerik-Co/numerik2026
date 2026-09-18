/**
 * Déduction de la zone géographique du bénéficiaire à partir de la commune
 * choisie (autocomplétion API Adresse, cf. `/api/adhesion/adresse`).
 *
 * Communes de Mont-de-Marsan Agglomération au 2026-01-01 (18 communes,
 * Saint-Pierre-du-Mont exclue ici car traitée comme sa propre catégorie —
 * source : data.gouv.fr / Banatic). À ajuster si le périmètre de
 * l'intercommunalité change.
 */

import { normalize } from '../adhesion/http';
import { ZONE_GEOGRAPHIQUE_CHOICES } from './choices';

export type ZoneGeographique = (typeof ZONE_GEOGRAPHIQUE_CHOICES)[number];

const SAINT_PIERRE_DU_MONT = 'Saint-Pierre-du-Mont';

const COMMUNES_AGGLO_MARSAN = [
	'Benquet',
	'Bostens',
	'Bougue',
	'Bretagne-de-Marsan',
	'Campagne',
	'Campet-et-Lamolère',
	'Gaillères',
	'Geloux',
	'Laglorieuse',
	'Lucbardez-et-Bargues',
	'Mazerolles',
	'Mont-de-Marsan',
	'Pouydesseaux',
	'Saint-Avit',
	"Saint-Martin-d'Oney",
	'Saint-Perdon',
	'Uchacq-et-Parentis',
];

/**
 * Suggestion de zone à partir de la commune (et du code postal en repli) —
 * modifiable ensuite par le bénéficiaire, ne fait jamais foi seule.
 */
export function deduireZone(commune: string, codePostal?: string): ZoneGeographique | '' {
	const c = normalize(commune);
	if (!c) return '';
	if (c === normalize(SAINT_PIERRE_DU_MONT)) return 'Saint-Pierre-du-Mont';
	if (COMMUNES_AGGLO_MARSAN.some((m) => normalize(m) === c)) return 'Agglo du Marsan';
	if (codePostal?.trim().startsWith('40')) return 'Département';
	return '';
}
