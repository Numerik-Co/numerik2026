/**
 * Modules de l'espace bénévoles : chacun apparaît comme un bouton de la
 * barre d'administration et s'ouvre dans le panneau latéral.
 *
 * Ajouter un module = un composant dans `./modules/` + une entrée ici
 * (+ ses routes `/api/admin/<…>`, gardées dans `src/middleware.ts` si elles
 * sont réservées à un groupe). `groups` vide = toute personne connectée ;
 * le groupe `admin` voit tous les modules. Le contrôle réel est côté serveur.
 */
import { defineAsyncComponent, type Component } from 'vue';
import type { AuthGroup } from '../../lib/auth/groups';

export interface AdminModule {
	id: string;
	label: string;
	/** Icône Font Awesome (solid). */
	icon: string;
	groups: AuthGroup[];
	component: Component;
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
		id: 'comptes',
		label: 'Comptes',
		icon: 'fa-users',
		groups: ['admin'],
		component: defineAsyncComponent(() => import('./modules/AccountsModule.vue')),
	},
	{
		id: 'mot-de-passe',
		label: 'Mon mot de passe',
		icon: 'fa-key',
		groups: [],
		component: defineAsyncComponent(() => import('./modules/PasswordModule.vue')),
	},
];

export function modulesFor(groups: AuthGroup[]): AdminModule[] {
	return ADMIN_MODULES.filter(
		(m) => m.groups.length === 0 || groups.includes('admin') || m.groups.some((g) => groups.includes(g)),
	);
}
