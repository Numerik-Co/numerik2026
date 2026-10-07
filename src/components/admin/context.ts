/** Contexte partagé par `AdminRoot.vue` avec les modules (provide/inject). */
import type { InjectionKey, Ref } from 'vue';
import type { AdminUser, ReservedPage } from './client';

export interface AdminContext {
	user: Ref<AdminUser | null>;
	pages: Ref<ReservedPage[]>;
	/** À appeler sur une erreur 401 : la session a expiré, on repasse en mode visiteur. */
	sessionExpired: () => void;
	/**
	 * Le module ouvert peut intercepter la fermeture du panneau (✕, Échap,
	 * clic sur le fond) : la fonction renvoie `true` si elle l'a traitée
	 * (ex. retour à la liste depuis un formulaire), `false` pour fermer.
	 * Renvoie de quoi se désinscrire (à appeler au démontage du module).
	 */
	onCloseRequest: (handler: () => boolean) => () => void;
}

export const ADMIN_CONTEXT: InjectionKey<AdminContext> = Symbol('admin-context');

/**
 * Module à rouvrir au prochain chargement de page. En dev, écrire dans
 * src/content déclenche un rechargement automatique de la page (Vite) : le
 * module le note avant d'enregistrer pour réapparaître avec le résultat.
 */
const REOPEN_KEY = 'numerik-admin-reopen';

export function rememberOpenModule(id: string): void {
	if (!import.meta.env.DEV) return;
	try {
		sessionStorage.setItem(REOPEN_KEY, id);
	} catch {
		// sessionStorage indisponible : tant pis, la modification est faite quand même.
	}
}

export function takeModuleToReopen(): string | null {
	try {
		const id = sessionStorage.getItem(REOPEN_KEY);
		sessionStorage.removeItem(REOPEN_KEY);
		return id;
	} catch {
		return null;
	}
}

/** Classes Tailwind des champs de formulaire de l'espace bénévoles. */
export const inputClass =
	'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
