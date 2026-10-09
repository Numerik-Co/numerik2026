/**
 * Version du modèle et dernière version publiée (badge « mise à jour
 * disponible » de l'espace bénévoles, route `/api/admin/version`).
 *
 * `MODEL_VERSION` = `package.json` au moment de la construction : chaque
 * version est construite sur le serveur (`scripts/start.mjs`), c'est donc
 * bien celle qui tourne. La dernière version publiée vient de l'API publique
 * des Releases GitHub (même dépôt que `./update.sh`), gardée en mémoire 6 h
 * (30 min après un échec) : au plus quelques requêtes par jour, sans jeton.
 */

import pkg from '../../package.json';

export const MODEL_VERSION: string = pkg.version;
export const MODEL_REPO = 'Numerik-Co/numerik2026';

export interface ModelVersionInfo {
	current: string;
	/** Dernière version publiée, `null` si GitHub est injoignable. */
	latest: string | null;
	/** Notes de la dernière version (page de la Release). */
	url: string | null;
	updateAvailable: boolean;
}

const CACHE_OK = 6 * 60 * 60 * 1000;
const CACHE_ERROR = 30 * 60 * 1000;

let cache: { at: number; ttl: number; latest: string | null; url: string | null } | undefined;

/** `1.10.0` > `1.9.2` ; tout ce qui n'est pas X.Y.Z compte pour « pas plus récent ». */
export function isNewer(candidate: string, current: string): boolean {
	const parse = (v: string) => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v.trim())?.slice(1).map(Number);
	const a = parse(candidate);
	const b = parse(current);
	if (!a || !b) return false;
	for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
	return false;
}

async function fetchLatestRelease(): Promise<{ latest: string | null; url: string | null }> {
	try {
		const res = await fetch(`https://api.github.com/repos/${MODEL_REPO}/releases/latest`, {
			headers: { Accept: 'application/vnd.github+json', 'User-Agent': `numerik2026/${MODEL_VERSION}` },
			signal: AbortSignal.timeout(5000),
		});
		if (!res.ok) throw new Error(`GitHub ${res.status}`);
		const data = (await res.json()) as { tag_name?: unknown; html_url?: unknown };
		const tag = typeof data.tag_name === 'string' ? data.tag_name.replace(/^v/, '') : null;
		return { latest: tag, url: typeof data.html_url === 'string' ? data.html_url : null };
	} catch (e) {
		console.warn(`[version] dernière version inconnue : ${(e as Error).message}`);
		return { latest: null, url: null };
	}
}

export async function getModelVersionInfo(): Promise<ModelVersionInfo> {
	if (!cache || Date.now() - cache.at > cache.ttl) {
		const found = await fetchLatestRelease();
		cache = { at: Date.now(), ttl: found.latest ? CACHE_OK : CACHE_ERROR, ...found };
	}
	return {
		current: MODEL_VERSION,
		latest: cache.latest,
		url: cache.url,
		updateAvailable: cache.latest !== null && isNewer(cache.latest, MODEL_VERSION),
	};
}
