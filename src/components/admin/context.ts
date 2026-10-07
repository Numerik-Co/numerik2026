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

/** Classes Tailwind des champs de formulaire de l'espace bénévoles. */
export const inputClass =
	'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
