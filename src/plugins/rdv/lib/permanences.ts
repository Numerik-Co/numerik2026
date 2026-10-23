/**
 * Permanences (créneaux de RDV possibles), lues dans `permanences:` de
 * `src/content/rdv.yaml` (`config.ts`). Une par jour au plus (`creneaux.ts`
 * cherche par jour), heures « 09h00 » piles ou demies dans 09h00–20h00
 * (grille de `WeeklyAgenda`), triées dans l'ordre de la semaine.
 * Le reste du site passe par `permanencesAffichees()` (`../index.ts`) :
 * liste vide quand le plugin est inactif.
 */
import type { AgendaSession } from '../../../lib/agenda';
import { rdvConfig } from './config';

export const permanences: AgendaSession[] = rdvConfig.permanences.map((p) => ({
	...p,
	title: rdvConfig.planning.titre,
	kind: 'rdv' as const,
	legend: rdvConfig.planning.legende,
}));
