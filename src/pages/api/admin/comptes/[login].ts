/**
 * Un compte (groupe `admin`, garde dans `src/middleware.ts`) :
 *  - PATCH  `{ fullname, email?, groups, state }` — modification
 *  - POST   — réinitialise le mot de passe (provisoire renvoyé une seule fois)
 *  - DELETE `{ confirm: <login> }` — suppression
 * Garde-fous : on ne peut ni se retirer ses droits admin, ni se désactiver ou
 * se supprimer soi-même, ni retirer le dernier admin actif.
 */
import type { APIRoute } from 'astro';
import { deleteAccount, readAccount, saveAccount } from '../../../../lib/auth/accounts';
import { accountView, readAccountFields, wouldRemoveLastAdmin } from '../../../../lib/auth/admin-forms';
import { json, jsonError, readJson } from '../../../../lib/auth/api';
import { generatePassword, hashPassword } from '../../../../lib/auth/password';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request, locals }) => {
	const account = await readAccount(String(params.login ?? ''));
	if (!account) return jsonError('Compte introuvable.', 404);
	const self = account.login === locals.user!.login;

	const body = (await readJson(request)) ?? {};
	const { fields, errors } = readAccountFields(body);
	const state = body.state === 'disabled' ? 'disabled' : 'enabled';
	if (self && state === 'disabled') errors.push('Vous ne pouvez pas désactiver votre propre compte.');
	if (self && !fields.groups.includes('admin')) errors.push('Vous ne pouvez pas retirer vos propres droits admin.');
	if (errors.length === 0 && (await wouldRemoveLastAdmin(account.login, { groups: fields.groups, state }))) {
		errors.push('Il doit rester au moins un compte admin actif.');
	}
	if (errors.length > 0) return jsonError(errors.join(' '));

	Object.assign(account, fields, { state });
	if (!fields.email) delete account.email;
	await saveAccount(account);
	return json({ account: accountView(account) });
};

export const POST: APIRoute = async ({ params }) => {
	const account = await readAccount(String(params.login ?? ''));
	if (!account) return jsonError('Compte introuvable.', 404);
	const password = generatePassword();
	account.hashedPassword = await hashPassword(password);
	await saveAccount(account);
	return json({ password });
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
	const account = await readAccount(String(params.login ?? ''));
	if (!account) return jsonError('Compte introuvable.', 404);
	const body = (await readJson(request)) ?? {};
	if (account.login === locals.user!.login) return jsonError('Vous ne pouvez pas supprimer votre propre compte.');
	if (body.confirm !== account.login) return jsonError("Recopiez l'identifiant pour confirmer la suppression.");
	if (await wouldRemoveLastAdmin(account.login, null)) return jsonError('Il doit rester au moins un compte admin actif.');
	await deleteAccount(account.login);
	return json({ ok: true });
};
