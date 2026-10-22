/**
 * Suivi d'une publication (reconstruction du site, cf. src/lib/site-build.ts)
 * par un module de l'espace bénévoles : état affiché par `PublishStatus.vue`,
 * interrogation de `/api/admin/publication` jusqu'à la mise en ligne (y
 * compris pendant le bref redémarrage du serveur), fermeture définitive de
 * l'encadré du dernier résultat.
 *
 * Publication suivie réussie : compte à rebours (`reloadIn`, annulable par
 * `cancelReload`) puis rechargement de la page pour voir le site à jour, le
 * module étant rouvert ensuite (`reopenAfterReload`). Page disparue (404 :
 * actualité supprimée, adresse changée) : page publiée, sinon l'accueil.
 *
 * Enregistrement sans publier (`saved`) : rien à suivre, la liste du module
 * et le lot en attente (`lot.ts`) sont relus, l'encadré le rappelle ;
 * `publishLot` publie tout le lot en une reconstruction, suivie de même.
 */
import { onBeforeUnmount, ref } from 'vue';
import { ApiError, lotApi, newsApi, type PublishStatus } from './client';
import { reopenAfterReload } from './context';
import { loadLot, publishing } from './lot';

const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const RELOAD_DELAY_S = 3;

export function usePublication(options: {
	/** Identifiant du module (`ADMIN_MODULES`), rouvert après le rechargement de la page (barre : module ouvert, s'il y en a un). */
	module: string | (() => string | null);
	/** Publication terminée (ou abandon du suivi) : recharger la liste du module. */
	onSettled: () => void | Promise<void>;
	onError: (e: unknown) => void;
}) {
	const status = ref<PublishStatus>({ state: 'idle' });
	/** Vrai pendant qu'on suit une publication lancée depuis ce module (ou trouvée en cours). */
	const following = ref(false);
	let pollTimer: ReturnType<typeof setTimeout> | undefined;
	/** Secondes avant le rechargement de la page (0 = en cours), `null` = pas de rechargement prévu. */
	const reloadIn = ref<number | null>(null);
	let reloadTimer: ReturnType<typeof setTimeout> | undefined;
	/** Dernière modification enregistrée sans publier depuis ce module (rappel dans l'encadré). */
	const savedLabel = ref<string | null>(null);

	/** Nouvel état reçu du serveur (liste du module) : suit la publication si elle est en cours. */
	function receive(next: PublishStatus) {
		status.value = next;
		if (next.state === 'running' && !following.value) follow();
	}

	/** Publication lancée depuis le module : encadré « en cours » puis suivi. */
	function started(label: string | undefined) {
		savedLabel.value = null;
		status.value = { state: 'running', label };
		follow();
	}

	/** Modification enregistrée sans publier : rien à suivre, liste et lot relus. */
	async function saved(label: string) {
		savedLabel.value = label;
		await Promise.all([loadLot(), options.onSettled()]);
	}

	/** Réponse d'un enregistrement : suivi de la publication, ou simple rappel si elle attend dans le lot. */
	function afterSave(label: string, result: { deferred?: true }) {
		if (result.deferred) void saved(label);
		else started(label);
	}

	/** Publie en une fois toutes les modifications en attente. */
	async function publishLot() {
		try {
			const { label } = await lotApi.publish();
			started(label);
		} catch (e) {
			options.onError(e);
			void loadLot();
		}
	}

	function follow() {
		following.value = true;
		publishing.value = true;
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
			publishing.value = false;
			if (status.value.state === 'running') {
				options.onError(new Error('La publication prend plus de temps que prévu. Rouvrez ce module dans quelques minutes pour voir le résultat.'));
			}
			await Promise.all([options.onSettled(), loadLot()]);
			if (status.value.state === 'succeeded') scheduleReload();
		};
		// Premier point d'étape presque immédiat (en dev, la publication est déjà finie).
		pollTimer = setTimeout(tick, 400);
	}

	function scheduleReload() {
		reloadIn.value = RELOAD_DELAY_S;
		const step = () => {
			if (reloadIn.value === null) return;
			reloadIn.value--;
			if (reloadIn.value > 0) reloadTimer = setTimeout(step, 1000);
			else void reloadPage();
		};
		reloadTimer = setTimeout(step, 1000);
	}

	function cancelReload() {
		clearTimeout(reloadTimer);
		reloadIn.value = null;
	}

	async function reloadPage() {
		const module = typeof options.module === 'function' ? options.module() : options.module;
		if (module) reopenAfterReload(module);
		let target: string | null = null;
		try {
			const res = await fetch(location.pathname + location.search, { method: 'HEAD', cache: 'no-store' });
			if (res.status === 404) target = status.value.href ?? '/';
		} catch {
			// Vérification impossible : simple rechargement.
		}
		if (target && target !== location.pathname) location.assign(target);
		else location.reload();
	}

	/**
	 * Ferme définitivement l'encadré du dernier résultat (pour tout le monde,
	 * cf. `dismissStatus` côté serveur) ; il reste consultable dans le journal.
	 */
	async function dismiss() {
		cancelReload();
		const previous = status.value;
		status.value = { state: 'idle' };
		try {
			await newsApi.dismissStatus();
		} catch (e) {
			status.value = previous;
			options.onError(e);
		}
	}

	onBeforeUnmount(() => {
		if (following.value) publishing.value = false;
		clearTimeout(pollTimer);
		clearTimeout(reloadTimer);
	});

	return { status, following, receive, started, saved, afterSave, publishLot, savedLabel, dismiss, reloadIn, cancelReload };
}
