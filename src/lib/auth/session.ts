/**
 * Session sans stockage serveur : un cookie signé HMAC-SHA256 avec
 * `AUTH_SECRET`. Il ne contient que le login, une empreinte du mot de passe
 * et une date d'expiration — le compte est relu sur disque à chaque requête,
 * donc désactiver un compte ou changer son mot de passe coupe immédiatement
 * ses sessions. Changer `AUTH_SECRET` déconnecte tout le monde.
 */

import type { AstroCookies } from 'astro';
import { getSecret } from 'astro:env/server';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readAccount, type Account } from './accounts.ts';
import type { AuthGroup } from './groups.ts';
const COOKIE_NAME = 'numerik_session';
/**
 * Indicateur lisible en JavaScript, sans aucune donnée : signale aux pages
 * statiques qu'il faut charger la barre d'administration (`/api/auth/me`).
 * Le vrai contrôle reste le cookie signé ci-dessus (HttpOnly).
 */
export const HINT_COOKIE_NAME = 'numerik_connecte';
/** Durée de vie d'une session, renouvelée tant que la personne revient. */
const TTL_SECONDS = 60 * 60 * 24 * 14;
/** Le cookie est réémis (nouvelle échéance) au plus une fois par jour. */
const REFRESH_AFTER_SECONDS = 60 * 60 * 24;

/** Ce que les pages voient de la personne connectée (`Astro.locals.user`). */
export interface SessionUser {
	login: string;
	fullname: string;
	email?: string;
	groups: AuthGroup[];
	/** Mot de passe provisoire à remplacer avant toute autre action. */
	mustChangePassword: boolean;
}

interface Payload {
	/** login */
	u: string;
	/** empreinte du mot de passe : un changement invalide le cookie */
	v: string;
	/** expiration (secondes Unix) */
	e: number;
}

/**
 * `AUTH_SECRET`, lu à chaque usage et non à l'import : en dev, ce module est
 * chargé par le middleware AVANT qu'Astro n'ait chargé le `.env`, un import
 * nommé y serait figé à `undefined`.
 */
function authSecret(): string | undefined {
	return getSecret('AUTH_SECRET');
}

/** L'authentification n'est active que si `AUTH_SECRET` est renseigné (≥ 32 caractères). */
export function isAuthConfigured(): boolean {
	const secret = authSecret();
	return Boolean(secret && secret.length >= 32);
}

function sign(data: string): string {
	return createHmac('sha256', authSecret()!).update(data).digest('base64url');
}

function passwordVersion(account: Account): string {
	return createHash('sha256').update(account.hashedPassword).digest('base64url').slice(0, 16);
}

function toSessionUser(account: Account): SessionUser {
	return {
		login: account.login,
		fullname: account.fullname,
		email: account.email,
		groups: account.groups,
		mustChangePassword: Boolean(account.mustChangePassword),
	};
}

function writeCookie(cookies: AstroCookies, account: Account): void {
	const payload: Payload = {
		u: account.login,
		v: passwordVersion(account),
		e: Math.floor(Date.now() / 1000) + TTL_SECONDS,
	};
	const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
	const options = { path: '/', sameSite: 'lax', secure: import.meta.env.PROD, maxAge: TTL_SECONDS } as const;
	cookies.set(COOKIE_NAME, `${data}.${sign(data)}`, { ...options, httpOnly: true });
	cookies.set(HINT_COOKIE_NAME, '1', options);
}

export function openSession(cookies: AstroCookies, account: Account): void {
	if (!isAuthConfigured()) throw new Error('AUTH_SECRET manquant ou trop court (32 caractères minimum).');
	writeCookie(cookies, account);
}

export function closeSession(cookies: AstroCookies): void {
	cookies.delete(COOKIE_NAME, { path: '/' });
	cookies.delete(HINT_COOKIE_NAME, { path: '/' });
}

/** Compte désigné par un cookie valide (signature, échéance, empreinte du mot de passe), sinon `null`. */
async function verifyCookie(value: string): Promise<{ account: Account; expires: number } | null> {
	const [data, signature] = value.split('.');
	if (!data || !signature) return null;
	const expected = Buffer.from(sign(data));
	const given = Buffer.from(signature);
	if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

	let payload: Payload;
	try {
		payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
	} catch {
		return null;
	}
	if (typeof payload.e !== 'number' || payload.e < Math.floor(Date.now() / 1000)) return null;

	const account = await readAccount(String(payload.u));
	if (!account || account.state !== 'enabled' || payload.v !== passwordVersion(account)) return null;
	return { account, expires: payload.e };
}

/**
 * Personne connectée d'après le cookie, ou `null` (pas de cookie, signature
 * invalide, expiré, compte supprimé/désactivé, mot de passe changé). Un
 * cookie refusé est effacé, avec l'indicateur `HINT_COOKIE_NAME`.
 */
export async function readSession(cookies: AstroCookies): Promise<SessionUser | null> {
	const value = cookies.get(COOKIE_NAME)?.value;
	const session = value && isAuthConfigured() ? await verifyCookie(value) : null;
	if (!session) {
		if (cookies.has(COOKIE_NAME) || cookies.has(HINT_COOKIE_NAME)) closeSession(cookies);
		return null;
	}
	const now = Math.floor(Date.now() / 1000);
	if (session.expires - now < TTL_SECONDS - REFRESH_AFTER_SECONDS) writeCookie(cookies, session.account);
	return toSessionUser(session.account);
}
