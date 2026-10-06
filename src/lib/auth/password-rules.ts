/**
 * Règles de mot de passe partagées serveur / navigateur (aucune dépendance
 * Node, contrairement à `password.ts`).
 */

/** Longueur minimale d'un mot de passe choisi par l'utilisateur·rice. */
export const PASSWORD_MIN_LENGTH = 10;

/** Message d'erreur si le mot de passe est trop faible, sinon `null`. */
export function passwordProblem(password: string): string | null {
	if (password.length < PASSWORD_MIN_LENGTH) {
		return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
	}
	return null;
}
