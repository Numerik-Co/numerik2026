import type { APIRoute } from 'astro';
import { readAccount, saveAccount } from '../../../lib/auth/accounts';
import { json, jsonError, readJson } from '../../../lib/auth/api';
import { hashPassword, passwordProblem, verifyPassword } from '../../../lib/auth/password';
import { openSession } from '../../../lib/auth/session';

export const prerender = false;

/** Module « Mon mot de passe » : `{ current, next }`. Ferme les autres sessions, garde celle-ci. */
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

	account.hashedPassword = await hashPassword(next);
	await saveAccount(account);
	openSession(cookies, account);
	return json({ ok: true });
};
