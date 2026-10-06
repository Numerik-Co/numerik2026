import type { APIRoute } from 'astro';
import { normalizeLogin, readAccount } from '../../../lib/auth/accounts';
import { json, jsonError, publicUser, readJson } from '../../../lib/auth/api';
import { verifyPassword } from '../../../lib/auth/password';
import { clearFailures, lockedMinutes, recordFailure } from '../../../lib/auth/rate-limit';
import { isAuthConfigured, openSession } from '../../../lib/auth/session';

export const prerender = false;

// Empreinte factice : un login inconnu coûte le même temps qu'un mauvais mot de passe.
const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

/** Connexion depuis la modale : `{ login, password }` → `{ user }` + cookie de session. */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
	if (!isAuthConfigured()) {
		return jsonError("La connexion n'est pas encore configurée sur ce serveur (AUTH_SECRET manquant).", 503);
	}
	const body = await readJson(request);
	const login = normalizeLogin(String(body?.login ?? ''));
	const password = String(body?.password ?? '');
	const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress;
	const keys = [`login:${login}`, `ip:${ip}`];

	const wait = lockedMinutes(...keys);
	if (wait > 0) return jsonError(`Trop de tentatives. Réessayez dans ${wait} minute${wait > 1 ? 's' : ''}.`, 429);

	const account = await readAccount(login);
	const ok = await verifyPassword(password, account?.hashedPassword || DUMMY_HASH);
	if (!account || !ok || account.state !== 'enabled') {
		recordFailure(...keys);
		return jsonError(account && ok ? 'Ce compte est désactivé.' : 'Identifiant ou mot de passe incorrect.', 401);
	}

	clearFailures(...keys);
	openSession(cookies, account);
	return json({ user: publicUser(account) });
};
