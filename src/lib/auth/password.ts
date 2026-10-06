/**
 * Hachage des mots de passe (scrypt, intégré à Node — aucune dépendance).
 *
 * Format stocké dans le YAML du compte (champ `hashed_password`) :
 *   scrypt$<N>$<r>$<p>$<sel base64>$<empreinte base64>
 * Les paramètres sont stockés avec l'empreinte : on peut les durcir plus tard
 * sans invalider les comptes existants.
 *
 * Module sans dépendance à Astro : aussi utilisé par `scripts/auth-user.ts`.
 */

import { randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

export { PASSWORD_MIN_LENGTH, passwordProblem } from './password-rules.ts';

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		scrypt(password.normalize('NFC'), salt, KEY_LENGTH, options, (err, key) =>
			err ? reject(err) : resolve(key),
		);
	});
}

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const key = await derive(password, salt, { N, r: R, p: P });
	return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [algo, n, r, p, salt, hash] = stored.split('$');
	if (algo !== 'scrypt' || !salt || !hash) return false;
	const expected = Buffer.from(hash, 'base64');
	const key = await derive(password, Buffer.from(salt, 'base64'), {
		N: Number(n),
		r: Number(r),
		p: Number(p),
	});
	return key.length === expected.length && timingSafeEqual(key, expected);
}

/**
 * Mot de passe provisoire lisible (sans caractères ambigus 0/O, 1/l/I),
 * en blocs : `k7mp-q3zt-h9wx`. Remis par l'admin, à changer à la connexion.
 */
export function generatePassword(): string {
	const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
	const block = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join('');
	return [block(), block(), block()].join('-');
}
