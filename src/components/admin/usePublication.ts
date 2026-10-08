/**
 * Suivi d'une publication (reconstruction du site, cf. src/lib/site-build.ts)
 * par un module de l'espace bénévoles : état affiché par `PublishStatus.vue`,
 * interrogation de `/api/admin/publication` jusqu'à la mise en ligne (y
 * compris pendant le bref redémarrage du serveur), fermeture définitive de
 * l'encadré du dernier résultat.
 */
import { onBeforeUnmount, ref } from 'vue';
import { ApiError, newsApi, type PublishStatus } from './client';

const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export function usePublication(options: {
	/** Publication terminée (ou abandon du suivi) : recharger la liste du module. */
	onSettled: () => void | Promise<void>;
	onError: (e: unknown) => void;
}) {
	const status = ref<PublishStatus>({ state: 'idle' });
	/** Vrai pendant qu'on suit une publication lancée depuis ce module (ou trouvée en cours). */
	const following = ref(false);
	let pollTimer: ReturnType<typeof setTimeout> | undefined;

	/** Nouvel état reçu du serveur (liste du module) : suit la publication si elle est en cours. */
	function receive(next: PublishStatus) {
		status.value = next;
		if (next.state === 'running' && !following.value) follow();
	}

	/** Publication lancée depuis le module : encadré « en cours » puis suivi. */
	function started(label: string | undefined) {
		status.value = { state: 'running', label };
		follow();
	}

	function follow() {
		following.value = true;
		const startedAt = Date.now();
		const tick = async () => {
			try {
				status.value = await newsApi.status();
			} catch (e) {
				if (e instanceof ApiError && e.status === 401) return options.onError(e);
				// Serveur en cours de redémarrage sur la nouvelle version : on réessaie.
			}
			if (status.value.state === 'running' && Date.now() - startedAt < POLL_TIMEOUT_MS) {
				pollTimer = setTimeout(tick, POLL_MS);
				return;
			}
			following.value = false;
			if (status.value.state === 'running') {
				options.onError(new Error('La publication prend plus de temps que prévu. Rouvrez ce module dans quelques minutes pour voir le résultat.'));
			}
			await options.onSettled();
		};
		// Premier point d'étape presque immédiat (en dev, la publication est déjà finie).
		pollTimer = setTimeout(tick, 400);
	}

	/**
	 * Ferme définitivement l'encadré du dernier résultat (pour tout le monde,
	 * cf. `dismissStatus` côté serveur) ; il reste consultable dans le journal.
	 */
	async function dismiss() {
		const previous = status.value;
		status.value = { state: 'idle' };
		try {
			await newsApi.dismissStatus();
		} catch (e) {
			status.value = previous;
			options.onError(e);
		}
	}

	onBeforeUnmount(() => clearTimeout(pollTimer));

	return { status, following, receive, started, dismiss };
}
