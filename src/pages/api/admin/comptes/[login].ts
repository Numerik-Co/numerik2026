/**
 * Un compte (groupe `admin`, garde dans `src/middleware.ts`) :
 *  - PATCH  `{ fullname, email?, groups, state }` — modification
 *  - POST   — réinitialise le mot de passe (provisoire renvoyé une seule fois)
 *  - DELETE `{ confirm: <login> }` — suppression
 * Garde-fous : on ne peut ni se retirer ses droits admin, ni se désactiver ou
 * se supprimer soi-même, ni retirer le dernier admin actif. Un compte super
 * admin n'est jamais modifiable ici (CLI `auth-user` seulement) : 404.
 */
import type { APIRoute } from 'astro';
import { deleteAccount, isSuperadminAccount, readAccount, saveAccount, type Account } from '../../../../lib/auth/accounts';
import { accountView, readAccountFields, wouldRemoveLastAdmin } from '../../../../lib/auth/admin-forms';
import { json, jsonError, readJson } from '../../../../lib/auth/api';
import { generatePassword, hashPassword } from '../../../../lib/auth/password';
import { logEvent } from '../../../../lib/journal';

export const prerender = false;

/** Compte gérable depuis le module, ou `null` (inexistant ou super admin). */
async function managedAccount(login: unknown): Promise<Account | null> {
	const account = await readAccount(String(login ?? ''));
	return account && !isSuperadminAccount(account) ? account : null;
}

/** Résumé des changements pour le journal. */
function changes(before: Account, after: Account): string | undefined {
	const parts: string[] = [];
	if (before.fullname !== after.fullname) parts.push(`nom : ${before.fullname} → ${after.fullname}`);
	if ((before.email ?? '') !== (after.email ?? '')) parts.push(`email : ${before.email ?? '—'} → ${after.email ?? '—'}`);
	if (before.groups.join(',') !== after.groups.join(',')) parts.push(`groupes : ${before.groups.join(', ')} → ${after.groups.join(', ')}`);
	if (before.state !== after.state) parts.push(after.state === 'disabled' ? 'désactivé' : 'réactivé');
	return parts.join(' · ') || undefined;
}

export const PATCH: APIRoute = async ({ params, request, locals }) => {
	const account = await managedAccount(params.login);
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

	const before = { ...account };
	Object.assign(account, fields, { state });
	if (!fields.email) delete account.email;
	await saveAccount(account);
	await logEvent({ by: locals.user, action: 'compte.modification', label: account.login, message: changes(before, account) });
	return json({ account: accountView(account) });
};

export const POST: APIRoute = async ({ params, locals }) => {
	const account = await managedAccount(params.login);
	if (!account) return jsonError('Compte introuvable.', 404);
	const password = generatePassword();
	account.hashedPassword = await hashPassword(password);
	await saveAccount(account);
	await logEvent({ by: locals.user, action: 'compte.reinitialisation', label: account.login });
	return json({ password });
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
	const account = await managedAccount(params.login);
	if (!account) return jsonError('Compte introuvable.', 404);
	const body = (await readJson(request)) ?? {};
	if (account.login === locals.user!.login) return jsonError('Vous ne pouvez pas supprimer votre propre compte.');
	if (body.confirm !== account.login) return jsonError("Recopiez l'identifiant pour confirmer la suppression.");
	if (await wouldRemoveLastAdmin(account.login, null)) return jsonError('Il doit rester au moins un compte admin actif.');
	await deleteAccount(account.login);
	await logEvent({ by: locals.user, action: 'compte.suppression', label: account.login, message: account.fullname });
	return json({ ok: true });
};
