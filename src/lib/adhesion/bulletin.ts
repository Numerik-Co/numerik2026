/**
 * Bulletin d'adhésion en PDF — voir docs/bulletin-pdf.md.
 *
 * Deux responsabilités, toutes deux CÔTÉ SERVEUR uniquement :
 *   - signer / vérifier le jeton d'accès au lien de téléchargement ;
 *   - relayer le HTML (colonne Formule de Grist) à Gotenberg -> PDF.
 *
 * `GOTENBERG_URL` et `BULLETIN_SECRET` ne doivent jamais atteindre le navigateur.
 * Lecture à l'exécution via `process.env` (adaptateur Node), `import.meta.env` en
 * repli — même logique que grist.ts.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const ENV = {
	...(import.meta.env as unknown as Record<string, string | undefined>),
	...(process.env as Record<string, string | undefined>),
};

const GOTENBERG_URL = ENV.GOTENBERG_URL?.replace(/\/+$/, '');
const GOTENBERG_USERNAME = ENV.GOTENBERG_USERNAME;
const GOTENBERG_PASSWORD = ENV.GOTENBERG_PASSWORD;
const BULLETIN_SECRET = ENV.BULLETIN_SECRET;

/** En-tête d'auth HTTP Basic si l'instance Gotenberg en exige une, sinon rien. */
function gotenbergAuthHeaders(): Record<string, string> {
	if (!GOTENBERG_USERNAME || !GOTENBERG_PASSWORD) return {};
	const creds = Buffer.from(`${GOTENBERG_USERNAME}:${GOTENBERG_PASSWORD}`).toString('base64');
	return { Authorization: `Basic ${creds}` };
}

/** Durée de validité du lien de bulletin (le règlement se fait en présentiel, 24 h suffisent). */
const TTL_SECONDS = 60 * 60 * 24;

/** La fonctionnalité n'est active que si les deux variables sont renseignées. */
export function isBulletinEnabled(): boolean {
	return Boolean(GOTENBERG_URL && BULLETIN_SECRET);
}

function sign(payload: string): string {
	return createHmac('sha256', BULLETIN_SECRET as string)
		.update(payload)
		.digest('base64url');
}

/** Jeton opaque `<adhesionId>.<expEpoch>.<hmac>` transmis dans `?t=`. */
export function signBulletinToken(adhesionId: number, ttlSeconds = TTL_SECONDS): string {
	if (!BULLETIN_SECRET) throw new Error('BULLETIN_SECRET manquant.');
	const payload = `${adhesionId}.${Math.floor(Date.now() / 1000) + ttlSeconds}`;
	return `${payload}.${sign(payload)}`;
}

/** Retourne l'`adhesionId` si le jeton est authentique et non expiré, sinon `null`. */
export function verifyBulletinToken(token: string | null | undefined): number | null {
	if (!BULLETIN_SECRET || !token) return null;

	const parts = token.split('.');
	if (parts.length !== 3) return null;
	const [idStr, expStr, sig] = parts;

	const expected = sign(`${idStr}.${expStr}`);
	if (sig.length !== expected.length) return null;
	if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

	const adhesionId = Number(idStr);
	const exp = Number(expStr);
	if (!Number.isInteger(adhesionId) || !Number.isFinite(exp)) return null;
	if (exp * 1000 < Date.now()) return null;

	return adhesionId;
}

export class GotenbergError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GotenbergError';
	}
}

/**
 * Envoie le HTML complet (document, pas fragment) à Gotenberg et renvoie le PDF.
 *
 * Les champs de formulaire préservent la mise en forme du gabarit :
 *  - marges à 0 + `preferCssPageSize` : Gotenberg n'ajoute pas ses ~1 cm et
 *    respecte le `@page` / les dimensions CSS du HTML ;
 *  - `paperWidth`/`paperHeight` = A4 en pouces : filet de sécurité si le HTML
 *    ne déclare pas de `@page` ;
 *  - `printBackground` : imprime les fonds (dégradés, encadrés) ;
 *  - `skipNetworkIdleEvent=false` : attend que le réseau soit calme, sinon le
 *    logo distant peut manquer.
 */
export async function htmlToPdf(html: string): Promise<Buffer> {
	if (!GOTENBERG_URL) throw new GotenbergError('GOTENBERG_URL manquant.');

	const form = new FormData();
	form.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
	form.append('preferCssPageSize', 'true');
	form.append('marginTop', '0');
	form.append('marginBottom', '0');
	form.append('marginLeft', '0');
	form.append('marginRight', '0');
	form.append('paperWidth', '8.27');
	form.append('paperHeight', '11.69');
	form.append('printBackground', 'true');
	form.append('skipNetworkIdleEvent', 'false');

	let res: Response;
	try {
		res = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
			method: 'POST',
			headers: gotenbergAuthHeaders(),
			body: form,
		});
	} catch (cause) {
		throw new GotenbergError(`Gotenberg injoignable : ${String(cause)}`);
	}

	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new GotenbergError(
			`Gotenberg ${res.status}${detail ? ` — ${detail.slice(0, 300)}` : ''}`,
		);
	}

	return Buffer.from(await res.arrayBuffer());
}
