/**
 * Règles d'accès, à la manière du `access:` de Grav.
 *
 * Frontmatter d'une page de contenu :
 *   access: true                  # toute personne connectée
 *   access: animateur             # un groupe
 *   access: [animateur, admin]    # l'un de ces groupes
 * Sans `access:`, la page est publique. `admin` (et `superadmin`) passe toujours.
 */

import { hasAdminRights, isAuthGroup, type AuthGroup } from './groups.ts';
import type { SessionUser } from './session.ts';

/** `null` = page publique ; `'connecte'` = toute personne connectée ; sinon les groupes autorisés. */
export type PageAccess = null | 'connecte' | AuthGroup[];

export function parseAccess(value: unknown): PageAccess {
	if (value === undefined || value === null || value === false) return null;
	if (value === true) return 'connecte';
	const list = (Array.isArray(value) ? value : [value]).map((v) => String(v).trim());
	const unknown = list.filter((v) => !isAuthGroup(v));
	if (unknown.length > 0) {
		// Faute de frappe dans le frontmatter : on refuse plutôt que d'ouvrir la page.
		throw new Error(`Groupe(s) inconnu(s) dans access: ${unknown.join(', ')}`);
	}
	return list as AuthGroup[];
}

export function isAdmin(user: SessionUser | null): boolean {
	return Boolean(user && hasAdminRights(user.groups));
}

export function canAccess(user: SessionUser | null, access: PageAccess): boolean {
	if (access === null) return true;
	if (!user) return false;
	if (access === 'connecte' || isAdmin(user)) return true;
	return access.some((group) => user.groups.includes(group));
}
