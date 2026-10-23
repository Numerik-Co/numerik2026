/**
 * Modules de l'espace bénévoles : chacun apparaît comme un bouton de la
 * barre d'administration (ou du menu du nom, `placement: 'user'`) et s'ouvre
 * dans le panneau latéral.
 *
 * Ajouter un module = un composant dans `./modules/` + une entrée ici
 * (+ ses routes `/api/admin/<…>`, gardées par `GUARDS` dans
 * `src/middleware.ts` si elles sont réservées à un groupe). `groups` vide = toute personne connectée ;
 * `admin` et `superadmin` voient tous les modules, sauf `exclusive` (réservé
 * aux seuls `groups`). Le contrôle réel est côté serveur. `menu` range le
 * bouton dans un menu déroulant de la barre (`ADMIN_MENUS`, sous-liens côte à
 * côte), seulement si au moins deux de ses modules sont visibles.
 */
import { defineAsyncComponent, type Component } from 'vue';
import { hasAdminRights, type AuthGroup } from '../../lib/auth/groups';

/** Menus déroulants de la barre : libellé et icône du bouton qui regroupe les modules. */
export const ADMIN_MENUS = {
	contenu: { label: 'Contenu', icon: 'fa-pen-to-square' },
} as const;
export type AdminMenuId = keyof typeof ADMIN_MENUS;

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
	/** Menu déroulant de la barre qui contient ce module. */
	menu?: AdminMenuId;
	/** Masqué pour qui voit aussi ce module-là, qui le contient déjà (ex. pages réservées → module « Pages »). */
	replacedBy?: string;
	/** Props passées au composant (ex. module « Comptes » ouvert sur son propre compte). */
	props?: Record<string, unknown>;
}

export const ADMIN_MODULES: AdminModule[] = [
	{
		id: 'pages',
		label: 'Pages réservées',
		icon: 'fa-lock',
		groups: [],
		replacedBy: 'pages-site',
		component: defineAsyncComponent(() => import('./modules/PagesModule.vue')),
	},
	{
		id: 'actualites',
		label: 'Actualités',
		icon: 'fa-newspaper',
		groups: ['redacteur'],
		menu: 'contenu',
		component: defineAsyncComponent(() => import('./modules/NewsModule.vue')),
	},
	{
		id: 'pages-site',
		label: 'Pages',
		icon: 'fa-sitemap',
		groups: ['redacteur'],
		menu: 'contenu',
		component: defineAsyncComponent(() => import('./modules/SitePagesModule.vue')),
	},
	{
		id: 'activites',
		label: 'Activités',
		icon: 'fa-person-chalkboard',
		groups: ['redacteur'],
		component: defineAsyncComponent(() => import('./modules/ActivitiesModule.vue')),
	},
	{
		id: 'association',
		label: 'Association',
		icon: 'fa-landmark',
		groups: ['admin'],
		component: defineAsyncComponent(() => import('./modules/AssociationModule.vue')),
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
		id: 'plugins',
		label: 'Plugins',
		icon: 'fa-puzzle-piece',
		groups: ['superadmin'],
		exclusive: true,
		component: defineAsyncComponent(() => import('./modules/PluginsModule.vue')),
	},
	{
		id: 'mon-compte',
		label: 'Mon compte',
		icon: 'fa-user-pen',
		groups: [],
		placement: 'user',
		props: { self: true },
		component: defineAsyncComponent(() => import('./modules/AccountsModule.vue')),
	},
];

export function modulesFor(groups: AuthGroup[]): AdminModule[] {
	const visible = ADMIN_MODULES.filter(
		(m) =>
			m.groups.length === 0 ||
			(hasAdminRights(groups) && !m.exclusive) ||
			m.groups.some((g) => groups.includes(g)),
	);
	return visible.filter((m) => !m.replacedBy || !visible.some((other) => other.id === m.replacedBy));
}

/** Entrée de la barre : un module seul, ou un menu déroulant qui en regroupe plusieurs. */
export type BarEntry =
	| { kind: 'module'; module: AdminModule }
	| { kind: 'menu'; id: AdminMenuId; label: string; icon: string; modules: AdminModule[] };

/** Boutons de la barre (hors menu du nom), dans l'ordre du registre ; un menu prend la place de son premier module. */
export function barEntries(modules: AdminModule[]): BarEntry[] {
	const bar = modules.filter((m) => m.placement !== 'user');
	const entries: BarEntry[] = [];
	for (const m of bar) {
		const grouped = m.menu ? bar.filter((o) => o.menu === m.menu) : [];
		if (grouped.length < 2) entries.push({ kind: 'module', module: m });
		else if (grouped[0] === m) entries.push({ kind: 'menu', id: m.menu!, ...ADMIN_MENUS[m.menu!], modules: grouped });
	}
	return entries;
}
