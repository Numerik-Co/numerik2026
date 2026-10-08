/**
 * Groupes d'utilisateur·rice·s (équivalent du `groups.yaml` de Grav).
 *
 * Un compte appartient à un ou plusieurs groupes ; une page de contenu
 * restreinte liste les groupes autorisés dans son frontmatter `access:`.
 * `admin` passe partout et seul `admin` gère les comptes (module « Comptes »).
 * `superadmin` a tous les droits d'`admin` et seul il consulte le journal des
 * modifications ; il n'est attribué que par le CLI (`auth-user init`), jamais
 * depuis le module « Comptes », qui ne montre ni ne modifie ces comptes.
 * Ajouter un groupe = ajouter une entrée ici.
 *
 * Module sans dépendance à Astro : aussi utilisé par `scripts/auth-user.ts`.
 */

export const AUTH_GROUPS = {
	superadmin: {
		label: 'Super admin',
		description: 'Compte technique créé au déploiement : tous les droits + journal des modifications.',
	},
	admin: {
		label: 'Bureau / administration',
		description: 'Accès à tout, gestion des comptes.',
	},
	animateur: {
		label: 'Animateur·rice',
		description: 'Accès aux pages réservées aux encadrant·e·s.',
	},
	redacteur: {
		label: 'Rédacteur·rice',
		description: 'Publie les actualités depuis la barre d’administration.',
	},
} as const;

export type AuthGroup = keyof typeof AUTH_GROUPS;

/** Groupes attribuables depuis le module « Comptes » (tous sauf `superadmin`). */
export const ASSIGNABLE_GROUPS: readonly AuthGroup[] = (Object.keys(AUTH_GROUPS) as AuthGroup[]).filter((g) => g !== 'superadmin');

/** `admin` ou `superadmin` : passe partout. */
export function hasAdminRights(groups: readonly AuthGroup[]): boolean {
	return groups.includes('admin') || groups.includes('superadmin');
}

export function isAuthGroup(value: unknown): value is AuthGroup {
	return typeof value === 'string' && Object.hasOwn(AUTH_GROUPS, value);
}
