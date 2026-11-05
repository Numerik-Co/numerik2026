/**
 * Conditions de la restauration d'une sauvegarde depuis l'Espace Admin
 * (module « Sauvegardes », `scripts/sauvegarde.mjs`). Code serveur uniquement.
 */
import { readLot } from './publication-lot';
import { canPublish, isPublishing } from './site-build';

/** Raison qui empêche de restaurer maintenant, sinon `null`. */
export async function restaurationBloquee(): Promise<string | null> {
	const availability = await canPublish();
	if (!availability.ok) return availability.reason ?? 'Publication impossible sur ce serveur.';
	if (isPublishing()) return 'Une publication est en cours : réessayez dans une minute.';
	const lot = await readLot();
	if (lot.length) return `${lot.length} modification(s) enregistrée(s) sans publier : publiez-les ou annulez-les avant de restaurer.`;
	return null;
}
