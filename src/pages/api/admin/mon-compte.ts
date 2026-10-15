import type { APIRoute } from 'astro';
import { readAccount, saveAccount } from '../../../lib/auth/accounts';
import { accountView, readProfileFields } from '../../../lib/auth/admin-forms';
import { json, jsonError, publicUser, readJson } from '../../../lib/auth/api';
import { logEvent } from '../../../lib/journal';

export const prerender = false;

/**
 * « Mon compte » (module « Comptes » ouvert sur son propre compte, toute
 * personne connectée) : lecture du compte connecté, puis `{ fullname, email }`.
 * Groupes, état et identifiant ne se changent pas ici (module « Comptes », CLI).
 */
export const GET: APIRoute = async ({ locals }) => {
	const account = await readAccount(locals.user!.login);
	if (!account) return jsonError('Compte introuvable.', 404);
	return json({ account: accountView(account) });
};

export const PUT: APIRoute = async ({ request, locals }) => {
	const account = await readAccount(locals.user!.login);
	if (!account) return jsonError('Compte introuvable.', 404);
	const { fields, errors } = readProfileFields((await readJson(request)) ?? {});
	if (errors.length > 0) return jsonError(errors.join(' '));

	const changes = [
		fields.fullname !== account.fullname && 'nom',
		(fields.email ?? '') !== (account.email ?? '') && 'email',
	].filter(Boolean);
	if (changes.length > 0) {
		account.fullname = fields.fullname;
		account.email = fields.email;
		await saveAccount(account);
		await logEvent({ by: account, action: 'mon-compte', label: account.login, message: changes.join(', ') });
	}
	return json({ account: accountView(account), user: publicUser(account) });
};
