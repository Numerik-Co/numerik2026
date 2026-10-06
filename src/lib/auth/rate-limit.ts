/**
 * Freine le cassage de mot de passe : au-delà de `MAX_FAILURES` échecs en
 * `WINDOW_MS` pour une même clé (login, ou adresse IP), les tentatives sont
 * refusées jusqu'à la fin de la fenêtre. En mémoire : remis à zéro au
 * redémarrage du serveur, suffisant pour une poignée de comptes.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

const failures = new Map<string, { count: number; resetAt: number }>();

function entry(key: string) {
	const now = Date.now();
	const current = failures.get(key);
	if (current && current.resetAt > now) return current;
	const fresh = { count: 0, resetAt: now + WINDOW_MS };
	failures.set(key, fresh);
	return fresh;
}

/** Minutes restantes avant de pouvoir réessayer, ou 0 si autorisé. */
export function lockedMinutes(...keys: string[]): number {
	const now = Date.now();
	let wait = 0;
	for (const key of keys) {
		const e = entry(key);
		if (e.count >= MAX_FAILURES) wait = Math.max(wait, e.resetAt - now);
	}
	return Math.ceil(wait / 60000);
}

export function recordFailure(...keys: string[]): void {
	for (const key of keys) entry(key).count += 1;
}

export function clearFailures(...keys: string[]): void {
	for (const key of keys) failures.delete(key);
}
