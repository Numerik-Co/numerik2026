/**
 * Groupes d'utilisateur·rice·s (équivalent du `groups.yaml` de Grav).
 *
 * Un compte appartient à un ou plusieurs groupes ; une page de contenu
 * restreinte liste les groupes autorisés dans son frontmatter `access:`.
 * `admin` passe partout et seul `admin` gère les comptes (module « Comptes »).
 * Ajouter un groupe = ajouter une entrée ici.
 *
 * Module sans dépendance à Astro : aussi utilisé par `scripts/auth-user.ts`.
 */

export const AUTH_GROUPS = {
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

export function isAuthGroup(value: unknown): value is AuthGroup {
	return typeof value === 'string' && Object.hasOwn(AUTH_GROUPS, value);
}
