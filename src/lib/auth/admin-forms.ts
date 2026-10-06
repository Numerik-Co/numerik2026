/**
 * Validation des données de gestion des comptes (module « Comptes »,
 * routes `/api/admin/comptes*`).
 */

import { isAdminAccount, listAccounts, type Account } from './accounts.ts';
import { isAuthGroup, type AuthGroup } from './groups.ts';

export interface AccountFields {
	fullname: string;
	email?: string;
	groups: AuthGroup[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Champs communs création / modification (corps JSON), et la liste des erreurs. */
export function readAccountFields(body: Record<string, unknown>): { fields: AccountFields; errors: string[] } {
	const fullname = String(body.fullname ?? '').trim();
	const email = String(body.email ?? '').trim();
	const groups = [...new Set(Array.isArray(body.groups) ? body.groups.filter(isAuthGroup) : [])];
	const errors: string[] = [];
	if (!fullname) errors.push('Le nom est obligatoire.');
	if (email && !EMAIL_PATTERN.test(email)) errors.push("L'adresse email n'est pas valide.");
	if (groups.length === 0) errors.push('Choisissez au moins un groupe.');
	return { fields: { fullname, email: email || undefined, groups }, errors };
}

/**
 * Vrai si appliquer `next` au compte `login` laisserait le site sans aucun
 * admin actif (on refuse alors la modification ou la suppression).
 */
export async function wouldRemoveLastAdmin(login: string, next: Pick<Account, 'groups' | 'state'> | null): Promise<boolean> {
	if (next && isAdminAccount(next)) return false;
	const admins = (await listAccounts()).filter(isAdminAccount);
	return admins.length === 1 && admins[0].login === login;
}

/** Vue d'un compte pour le module « Comptes » (jamais l'empreinte du mot de passe). */
export function accountView(a: Account) {
	return {
		login: a.login,
		fullname: a.fullname,
		email: a.email ?? null,
		groups: a.groups,
		state: a.state,
		created: a.created,
		updated: a.updated,
	};
}
