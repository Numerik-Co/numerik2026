/**
 * Démarrage du site en production (Node seul ou Docker) :
 *
 *   node --env-file-if-exists=.env scripts/start.mjs     (= npm start)
 *
 * 1. compare l'empreinte de l'état courant (version du modèle, SITE_URL,
 *    contenu de src/content/ — cf. releases.mjs) à celle du site en place
 *    (`dist/build-info.json`) ;
 * 2. si elles diffèrent (premier démarrage, mise à jour du modèle, domaine ou
 *    contenu changés hors publication) : `npm run build` dans
 *    `.releases/<horodatage>`, puis `dist` pointe dessus. Pendant ce temps le
 *    site ne répond pas (le serveur n'est pas encore lancé) ;
 * 3. lance le serveur (`dist/server/entry.mjs`).
 *
 * Build en échec : l'ancien site est servi s'il existe (message d'erreur
 * dans les logs), sinon arrêt avec le code 1. Les publications depuis
 * l'espace bénévoles construisent elles-mêmes (src/lib/site-build.ts) : leur
 * build-info.json correspond, le redémarrage qui suit ne reconstruit pas.
 *
 * `SITE_ROOT` : dossier du projet (défaut : dossier courant), comme la publication.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RELEASES_DIR, computeFingerprint, pruneReleases, readBuildInfo, releaseStamp, swapDist } from './releases.mjs';

const root = resolve(process.env.SITE_ROOT || process.cwd());
const log = (message) => console.log(`[démarrage] ${message}`);

async function buildIfNeeded() {
	const current = await computeFingerprint(root, process.env.SITE_URL);
	const built = await readBuildInfo(root);
	const serverEntry = join(root, 'dist/server/entry.mjs');

	if (built?.fingerprint === current.fingerprint && existsSync(serverEntry)) {
		log(`site à jour (version ${built.version}, construit le ${built.builtAt}).`);
		return;
	}

	const reason = !built
		? 'aucun site construit'
		: built.version !== current.version
			? `nouvelle version du modèle (${built.version} → ${current.version})`
			: built.siteUrl !== current.siteUrl
				? `adresse du site changée (${built.siteUrl || '—'} → ${current.siteUrl || '—'})`
				: 'contenu modifié';
	log(`construction du site : ${reason}…`);

	const release = releaseStamp();
	const outDir = join(RELEASES_DIR, release);
	await mkdir(join(root, RELEASES_DIR), { recursive: true });
	const started = Date.now();
	const result = spawnSync('npm', ['run', '-s', 'build'], {
		cwd: root,
		env: { ...process.env, ASTRO_OUT_DIR: outDir },
		stdio: 'inherit',
	});

	if (result.status !== 0) {
		await rm(join(root, outDir), { recursive: true, force: true });
		if (existsSync(serverEntry)) {
			console.error(`[démarrage] ÉCHEC de la construction : l'ancienne version du site reste en ligne. Corriger l'erreur ci-dessus puis redémarrer.`);
			return;
		}
		console.error('[démarrage] ÉCHEC de la construction et aucun site existant : arrêt.');
		process.exit(1);
	}

	await swapDist(root, release);
	await pruneReleases(root).catch(() => {});
	log(`site construit en ${Math.round((Date.now() - started) / 1000)} s.`);
}

await buildIfNeeded();
await import(pathToFileURL(join(root, 'dist/server/entry.mjs')).href);
