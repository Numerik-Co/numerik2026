/**
 * État du mode maintenance partagé par la barre (pastille « Maintenance »)
 * et le module « Site ». Lu sur `/__maintenance` (public, servi par la porte
 * de `scripts/maintenance.mjs`), mis à jour par le module après chaque action.
 */
import { ref } from 'vue';

/** `true` quand le site est en maintenance (les membres connectés le voient quand même). */
export const enMaintenance = ref(false);

export async function chargerMaintenance(): Promise<void> {
	try {
		const res = await fetch('/__maintenance', { cache: 'no-store' });
		const etat = res.ok ? ((await res.json()) as { etat: string }) : null;
		enMaintenance.value = Boolean(etat && etat.etat !== 'aucune');
	} catch {
		// Information seulement : rien à signaler.
	}
}
