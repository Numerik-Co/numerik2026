import type { APIRoute } from 'astro';
import { readAccount, saveAccount } from '../../../lib/auth/accounts';
import { json, jsonError, readJson } from '../../../lib/auth/api';
import { hashPassword, passwordProblem, verifyPassword } from '../../../lib/auth/password';
import { openSession } from '../../../lib/auth/session';
import { logEvent } from '../../../lib/journal';

export const prerender = false;

/**
 * Module « Mon mot de passe » (et changement imposé d'un mot de passe
 * provisoire) : `{ current, next }`. Ferme les autres sessions, garde celle-ci.
 */
export const POST: APIRoute = async ({ request, cookies, locals }) => {
	const body = await readJson(request);
	const current = String(body?.current ?? '');
	const next = String(body?.next ?? '');
	const account = await readAccount(locals.user!.login);

	if (!account || !(await verifyPassword(current, account.hashedPassword))) {
		return jsonError('Le mot de passe actuel est incorrect.');
	}
	if (next === current) return jsonError("Le nouveau mot de passe doit être différent de l'actuel.");
	const problem = passwordProblem(next);
	if (problem) return jsonError(problem);

	const wasProvisional = Boolean(account.mustChangePassword);
	account.hashedPassword = await hashPassword(next);
	delete account.mustChangePassword;
	await saveAccount(account);
	openSession(cookies, account);
	await logEvent({ by: account, action: 'mot-de-passe', label: account.login, message: wasProvisional ? 'mot de passe provisoire remplacé' : undefined });
	return json({ ok: true });
};
