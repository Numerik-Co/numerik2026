/**
 * Zones géographiques des bénéficiaires : `zones:` de `src/content/rdv.yaml`
 * (`config.ts`). Module serveur : la page du plugin passe `zonesGeographiques`
 * en prop à `RdvForm.vue`, `/api/rdv/prendre` valide la zone reçue avec
 * `estZoneConnue()`.
 */
import { rdvConfig } from './config';
import type { ZoneGeographiqueConfig } from './geographie';

export const zonesGeographiques: ZoneGeographiqueConfig[] = rdvConfig.zones;

/** La zone reçue du formulaire fait-elle partie des zones configurées ? */
export function estZoneConnue(label: string): boolean {
	return zonesGeographiques.some((zone) => zone.label === label);
}
