/**
 * Modules de l'espace bénévoles : chacun apparaît comme un bouton de la
 * barre d'administration (ou du menu du nom, `placement: 'user'`) et s'ouvre
 * dans le panneau latéral.
 *
 * Ajouter un module = un composant dans `./modules/` + une entrée ici
 * (+ ses routes `/api/admin/<…>`, gardées par `GUARDS` dans
 * `src/middleware.ts` si elles sont réservées à un groupe). `groups` vide = toute personne connectée ;
 * `admin` et `superadmin` voient tous les modules, sauf `exclusive` (réservé
 * aux seuls `groups`). Le contrôle réel est côté serveur.
 */
import { defineAsyncComponent, type Component } from 'vue';
import { hasAdminRights, type AuthGroup } from '../../lib/auth/groups';

export interface AdminModule {
	id: string;
	label: string;
	/** Icône Font Awesome (solid). */
	icon: string;
	groups: AuthGroup[];
	component: Component;
	/** `user` = rangé dans le menu déroulant du nom (compte personnel) plutôt que dans la barre. */
	placement?: 'bar' | 'user';
	/** Réservé aux seuls `groups`, même pour `admin` (ex. journal → `superadmin`). */
	exclusive?: true;
}

export const ADMIN_MODULES: AdminModule[] = [
	{
		id: 'pages',
		label: 'Pages réservées',
		icon: 'fa-lock',
		groups: [],
		component: defineAsyncComponent(() => import('./modules/PagesModule.vue')),
	},
	{
		id: 'actualites',
		label: 'Actualités',
		icon: 'fa-newspaper',
		groups: ['redacteur'],
		component: defineAsyncComponent(() => import('./modules/NewsModule.vue')),
	},
	{
		id: 'comptes',
		label: 'Comptes',
		icon: 'fa-users',
		groups: ['admin'],
		component: defineAsyncComponent(() => import('./modules/AccountsModule.vue')),
	},
	{
		id: 'journal',
		label: 'Journal',
		icon: 'fa-clock-rotate-left',
		groups: ['superadmin'],
		exclusive: true,
		component: defineAsyncComponent(() => import('./modules/JournalModule.vue')),
	},
	{
		id: 'mot-de-passe',
		label: 'Mon mot de passe',
		icon: 'fa-key',
		groups: [],
		placement: 'user',
		component: defineAsyncComponent(() => import('./modules/PasswordModule.vue')),
	},
];

export function modulesFor(groups: AuthGroup[]): AdminModule[] {
	return ADMIN_MODULES.filter(
		(m) =>
			m.groups.length === 0 ||
			(hasAdminRights(groups) && !m.exclusive) ||
			m.groups.some((g) => groups.includes(g)),
	);
}
