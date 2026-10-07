/**
 * Publication depuis l'espace bénévoles : reconstruit le site (`npm run
 * build`) après une modification de contenu dans `src/content/`, sur le
 * serveur Node lui-même. Tout le contenu restant dans les sources, le site
 * publié est toujours le produit d'un build complet (cf. docs/publication.md).
 *
 * Déroulé d'une publication :
 *  1. build dans un dossier neuf `.releases/<horodatage>/` (le site en ligne
 *     n'est pas touché pendant ce temps) ;
 *  2. bascule atomique : `dist` devient un lien vers cette version ;
 *  3. commande `PUBLISH_HOOK` facultative (ex. copie vers un hébergement statique) ;
 *  4. arrêt du process : le gestionnaire (Docker `restart`, PM2, systemd)
 *     le relance sur la nouvelle version (~1 s d'interruption).
 * En cas d'échec du build, `onFailure` défait la modification de contenu et
 * le site reste tel quel ; en cas de succès, `onSuccess` la rend définitive
 * (ex. effacer le dossier d'une actualité supprimée, gardé de côté jusque-là).
 *
 * En développement (`astro dev`), rien à construire : le contenu est relu à chaud.
 * Une seule publication à la fois ; l'état est gardé dans
 * `<DATA_DIR>/publication/status.json` pour survivre au redémarrage.
 *
 * Code serveur uniquement.
 */

import { PUBLISH_HOOK, PUBLISH_RESTART, SITE_ROOT } from 'astro:env/server';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { access, constants, lstat, mkdir, readdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { dataDir } from './data-dir';

export interface BuildStatus {
	state: 'idle' | 'running' | 'succeeded' | 'failed';
	/** Ce qui a déclenché la publication (titre de l'actualité…). */
	label?: string;
	/** Page à ouvrir une fois publiée. */
	href?: string;
	startedAt?: string;
	finishedAt?: string;
	/** Message d'erreur, ou avertissement (hook en échec…). */
	message?: string;
}

/** Publication en cours dans ce process, ou `null`. */
let current: Promise<void> | null = null;

/** Nombre de versions gardées dans `.releases/` (l'active + la précédente). */
const KEEP_RELEASES = 2;
const RELEASES_DIR = '.releases';

function root(): string {
	return resolve(SITE_ROOT || process.cwd());
}

function statusDir(): string {
	return join(dataDir(), 'publication');
}

async function writeStatus(status: BuildStatus): Promise<void> {
	await mkdir(statusDir(), { recursive: true });
	await writeFile(join(statusDir(), 'status.json'), JSON.stringify(status, null, 2));
}

/** État de la dernière publication. Un « en cours » sans build actif = interrompu (serveur arrêté pendant le build). */
export async function readStatus(): Promise<BuildStatus> {
	let status: BuildStatus;
	try {
		status = JSON.parse(await readFile(join(statusDir(), 'status.json'), 'utf8'));
	} catch {
		return { state: 'idle' };
	}
	if (status.state === 'running' && !current) {
		return { ...status, state: 'failed', message: 'La publication a été interrompue (serveur arrêté pendant la reconstruction). Relancez-la.' };
	}
	return status;
}

/**
 * La publication est-elle possible sur ce serveur ? Il faut les sources du
 * site et ses dépendances (pas seulement `dist/`), en écriture.
 */
export async function canPublish(): Promise<{ ok: boolean; reason?: string }> {
	if (import.meta.env.DEV) return { ok: true };
	const base = root();
	try {
		await access(join(base, 'package.json'));
		await access(join(base, 'node_modules', 'astro', 'package.json'));
		await access(join(base, 'src', 'content', 'news'), constants.W_OK);
		await access(base, constants.W_OK);
	} catch {
		return {
			ok: false,
			reason:
				"La publication en ligne n'est pas disponible sur ce serveur : les sources du site (src/, node_modules/) sont absentes ou en lecture seule. Voir docs/publication.md.",
		};
	}
	return { ok: true };
}

export function isPublishing(): boolean {
	return current !== null;
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv, log: NodeJS.WritableStream): Promise<void> {
	return new Promise((resolvePromise, reject) => {
		log.write(`\n$ ${command} ${args.join(' ')}\n`);
		const child = spawn(command, args, { cwd: root(), env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
		child.stdout.pipe(log, { end: false });
		child.stderr.pipe(log, { end: false });
		child.on('error', reject);
		child.on('close', (code) => (code === 0 ? resolvePromise() : reject(new Error(`${command} a échoué (code ${code})`))));
	});
}

/** Fait pointer `dist` sur la nouvelle version, sans instant où `dist` n'existe pas. */
async function swapDist(release: string): Promise<void> {
	const base = root();
	const dist = join(base, 'dist');
	const info = await lstat(dist).catch(() => null);
	if (info && !info.isSymbolicLink()) {
		// Premier passage : le `dist` d'origine (dossier réel) est rangé comme version précédente.
		await rename(dist, join(base, RELEASES_DIR, `${release}-avant`));
	}
	const tmpLink = join(base, `dist.${process.pid}.tmp`);
	await rm(tmpLink, { force: true });
	await symlink(join(RELEASES_DIR, release), tmpLink);
	await rename(tmpLink, dist);
}

/** Supprime les anciennes versions (garde les `KEEP_RELEASES` plus récentes). */
async function pruneReleases(): Promise<void> {
	const dir = join(root(), RELEASES_DIR);
	const names = (await readdir(dir)).sort().reverse();
	for (const name of names.slice(KEEP_RELEASES)) await rm(join(dir, name), { recursive: true, force: true });
}

/** Heure UTC compacte, triable : `20261006T221530Z`. */
function stamp(): string {
	return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}

export interface PublishRequest {
	label: string;
	href?: string;
	/** Annule la modification de contenu si la reconstruction échoue. */
	onFailure?: () => Promise<void>;
	/** Rend la modification définitive une fois le site reconstruit (avant le redémarrage). */
	onSuccess?: () => Promise<void>;
}

/**
 * Lance la reconstruction en arrière-plan. Refusée si une publication est
 * déjà en cours (`{ started: false }`).
 */
export async function publish(request: PublishRequest): Promise<{ started: boolean; reason?: string }> {
	if (current) return { started: false, reason: 'Une publication est déjà en cours, réessayez dans une minute.' };
	const startedAt = new Date().toISOString();

	if (import.meta.env.DEV) {
		await request.onSuccess?.().catch(() => {});
		await writeStatus({ state: 'succeeded', label: request.label, href: request.href, startedAt, finishedAt: startedAt, message: 'Mode développement : contenu relu à chaud, aucun build.' });
		return { started: true };
	}

	await writeStatus({ state: 'running', label: request.label, href: request.href, startedAt });
	current = (async () => {
		const release = stamp();
		const outDir = join(RELEASES_DIR, release);
		await mkdir(statusDir(), { recursive: true });
		const log = createWriteStream(join(statusDir(), 'build.log'));
		try {
			await run('npm', ['run', '-s', 'build'], { ASTRO_OUT_DIR: outDir }, log);
			await swapDist(release);
			await request.onSuccess?.().catch(() => {});
			let message: string | undefined;
			if (PUBLISH_HOOK) {
				try {
					await run('sh', ['-c', PUBLISH_HOOK], {}, log);
				} catch (err) {
					message = `Site reconstruit, mais la commande PUBLISH_HOOK a échoué : ${(err as Error).message}.`;
				}
			}
			await pruneReleases().catch(() => {});
			await writeStatus({ state: 'succeeded', label: request.label, href: request.href, startedAt, finishedAt: new Date().toISOString(), message });
			if (PUBLISH_RESTART) {
				// Le gestionnaire de process relance le serveur sur la nouvelle version.
				log.write('\nPublication terminée : redémarrage du serveur.\n');
				setTimeout(() => process.exit(0), 500);
			}
		} catch (err) {
			await request.onFailure?.().catch(() => {});
			await rm(join(root(), outDir), { recursive: true, force: true });
			await writeStatus({
				state: 'failed',
				label: request.label,
				startedAt,
				finishedAt: new Date().toISOString(),
				message: `La reconstruction du site a échoué, rien n'a été publié (${(err as Error).message}). Détail : ${join(statusDir(), 'build.log')}`,
			});
		} finally {
			log.end();
			current = null;
		}
	})();
	return { started: true };
}
