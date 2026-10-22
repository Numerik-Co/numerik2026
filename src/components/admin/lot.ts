/**
 * Modifications enregistrées sans publier (lot en attente, cf.
 * src/lib/publication-lot.ts), partagées par la barre d'administration et
 * les modules : bouton « À publier (N) » de la barre, encadré des modules
 * (`PublishStatus.vue`), badge « À publier » des listes (`isPendingHref`).
 * Relu après chaque enregistrement et chaque publication.
 */
import { computed, ref } from 'vue';
import { lotApi, type LotChange } from './client';

export const lot = ref<LotChange[]>([]);

/** Une publication est suivie (depuis un module ou la barre) : bouton « Publier » masqué en attendant. */
export const publishing = ref(false);

/** Pages concernées par une modification en attente. */
const pendingHrefs = computed(() => new Set(lot.value.map((c) => c.href).filter(Boolean)));

export function isPendingHref(href: string | null | undefined): boolean {
	return Boolean(href) && pendingHrefs.value.has(href!);
}

export async function loadLot(): Promise<void> {
	try {
		lot.value = (await lotApi.list()).changes;
	} catch {
		// Pas les droits (simple animateur·rice) ou serveur injoignable : rien en attente à montrer.
		lot.value = [];
	}
}

/** Bouton « Enregistrer sans publier » des formulaires (`PublishButtons.vue`) : `data-sans-publier`. */
export function isDeferredSubmit(event: Event): boolean {
	return Boolean((event as SubmitEvent).submitter?.hasAttribute('data-sans-publier'));
}
