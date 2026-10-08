import type { APIRoute } from 'astro';
import {
	isSuperadminAccount,
	isValidLogin,
	listAccounts,
	normalizeLogin,
	readAccount,
	saveAccount,
	type Account,
} from '../../../../lib/auth/accounts';
import { accountView, readAccountFields } from '../../../../lib/auth/admin-forms';
import { json, jsonError, readJson } from '../../../../lib/auth/api';
import { generatePassword, hashPassword, passwordProblem } from '../../../../lib/auth/password';
import { logEvent } from '../../../../lib/journal';

export const prerender = false;

/** Liste des comptes (groupe `admin`, garde dans `src/middleware.ts`), hors comptes super admin. */
export const GET: APIRoute = async () => {
	const accounts = (await listAccounts()).filter((a) => !isSuperadminAccount(a));
	return json({ accounts: accounts.map(accountView) });
};

/**
 * Création : `{ login, fullname, email?, groups, password? }`. Sans mot de
 * passe saisi, un mot de passe provisoire est généré et renvoyé une seule fois.
 */
export const POST: APIRoute = async ({ request, locals }) => {
	const body = (await readJson(request)) ?? {};
	const login = normalizeLogin(String(body.login ?? ''));
	const typed = String(body.password ?? '');
	const { fields, errors } = readAccountFields(body);
	if (!isValidLogin(login)) {
		errors.unshift("L'identifiant doit faire 2 à 32 caractères : minuscules, chiffres, « . », « - » ou « _ ».");
	} else if (await readAccount(login)) {
		errors.unshift(`L'identifiant « ${login} » est déjà pris.`);
	}
	const problem = typed ? passwordProblem(typed) : null;
	if (problem) errors.push(problem);
	if (errors.length > 0) return jsonError(errors.join(' '));

	const password = typed || generatePassword();
	const now = new Date().toISOString();
	const account: Account = {
		login,
		...fields,
		state: 'enabled',
		hashedPassword: await hashPassword(password),
		created: now,
		updated: now,
	};
	await saveAccount(account);
	await logEvent({ by: locals.user, action: 'compte.creation', label: login, message: `${account.fullname} · ${account.groups.join(', ')}` });
	return json({ account: accountView(account), password: typed ? null : password }, 201);
};
