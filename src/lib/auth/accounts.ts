/**
 * Comptes « à plat », à la manière de Grav : un fichier YAML par compte dans
 * `<AUTH_DATA_DIR>/accounts/<login>.yaml` (défaut `./data/accounts`), aucune
 * base de données. Exemple :
 *
 *   fullname: Marie Fruit
 *   email: marie@exemple.fr
 *   groups: [animateur]
 *   state: enabled
 *   hashed_password: scrypt$16384$8$1$…
 *   created: 2026-10-06T10:00:00.000Z
 *   updated: 2026-10-06T10:00:00.000Z
 *
 * Le login n'est pas stocké dans le fichier : c'est son nom. Il est validé par
 * `LOGIN_PATTERN` avant tout accès disque (pas de traversée de chemin).
 *
 * Module sans dépendance à Astro : aussi utilisé par `scripts/auth-user.ts`.
 */

import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import { isAuthGroup, type AuthGroup } from './groups.ts';

export interface Account {
	login: string;
	fullname: string;
	email?: string;
	groups: AuthGroup[];
	/** `disabled` = connexion refusée, sessions en cours coupées. */
	state: 'enabled' | 'disabled';
	hashedPassword: string;
	created: string;
	updated: string;
}

/** 2 à 32 caractères : minuscules, chiffres, `.`, `-`, `_` ; commence par une lettre ou un chiffre. */
export const LOGIN_PATTERN = /^[a-z0-9][a-z0-9._-]{1,31}$/;

export function normalizeLogin(value: string): string {
	return value.trim().toLowerCase();
}

export function isValidLogin(login: string): boolean {
	return LOGIN_PATTERN.test(login);
}

export function dataDir(): string {
	return resolve(process.env.AUTH_DATA_DIR || join(process.cwd(), 'data'));
}

function accountsDir(): string {
	return join(dataDir(), 'accounts');
}

function accountPath(login: string): string {
	if (!isValidLogin(login)) throw new Error(`Login invalide : "${login}"`);
	return join(accountsDir(), `${login}.yaml`);
}

function fromYaml(login: string, raw: Record<string, unknown>): Account {
	return {
		login,
		fullname: String(raw.fullname ?? login),
		email: raw.email ? String(raw.email) : undefined,
		groups: Array.isArray(raw.groups) ? raw.groups.filter(isAuthGroup) : [],
		state: raw.state === 'disabled' ? 'disabled' : 'enabled',
		hashedPassword: String(raw.hashed_password ?? ''),
		created: String(raw.created ?? ''),
		updated: String(raw.updated ?? ''),
	};
}

export async function readAccount(login: string): Promise<Account | null> {
	if (!isValidLogin(login)) return null;
	try {
		const raw = parse(await readFile(accountPath(login), 'utf8'));
		return raw && typeof raw === 'object' ? fromYaml(login, raw) : null;
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw err;
	}
}

export async function listAccounts(): Promise<Account[]> {
	let files: string[];
	try {
		files = await readdir(accountsDir());
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw err;
	}
	const logins = files
		.filter((f) => f.endsWith('.yaml'))
		.map((f) => f.slice(0, -'.yaml'.length))
		.filter(isValidLogin);
	const accounts = await Promise.all(logins.map(readAccount));
	return accounts
		.filter((a): a is Account => a !== null)
		.sort((a, b) => a.fullname.localeCompare(b.fullname, 'fr'));
}

/** Écriture atomique (fichier temporaire puis renommage), lisible par le seul propriétaire. */
export async function saveAccount(account: Account): Promise<void> {
	await mkdir(accountsDir(), { recursive: true, mode: 0o700 });
	const doc: Record<string, unknown> = {
		fullname: account.fullname,
		...(account.email ? { email: account.email } : {}),
		groups: account.groups,
		state: account.state,
		hashed_password: account.hashedPassword,
		created: account.created,
		updated: new Date().toISOString(),
	};
	const target = accountPath(account.login);
	const tmp = `${target}.${process.pid}.tmp`;
	await writeFile(tmp, stringify(doc), { mode: 0o600 });
	await rename(tmp, target);
}

export async function deleteAccount(login: string): Promise<void> {
	await rm(accountPath(login), { force: true });
}

export function isAdminAccount(account: Pick<Account, 'groups' | 'state'>): boolean {
	return account.state === 'enabled' && account.groups.includes('admin');
}
