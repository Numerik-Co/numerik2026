/**
 * Écrit `build-info.json` à la racine de chaque site construit : version du
 * modèle, adresse du site et empreinte du contenu au moment du build (cf.
 * `scripts/releases.mjs`). `scripts/start.mjs` le compare à l'état courant au
 * démarrage pour ne reconstruire que si nécessaire.
 *
 * L'empreinte est calculée au DÉBUT du build : un contenu modifié pendant la
 * construction donnera une empreinte différente au prochain démarrage.
 */

import type { AstroIntegration } from 'astro';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { BUILD_INFO, computeFingerprint } from '../../scripts/releases.mjs';

export default function buildInfo(): AstroIntegration {
	let pending: Promise<{ version: string; siteUrl: string; fingerprint: string }> | undefined;
	let building = false;
	return {
		name: 'numerik:build-info',
		hooks: {
			'astro:config:setup': ({ command }) => {
				building = command === 'build';
			},
			'astro:config:done': ({ config }) => {
				if (building) pending = computeFingerprint(fileURLToPath(config.root), config.site);
			},
			'astro:build:done': async ({ dir, logger }) => {
				if (!pending) return;
				const info = { ...(await pending), builtAt: new Date().toISOString() };
				// `dir` = dist/client en mode serveur : build-info.json va à la racine de outDir.
				await writeFile(new URL(`../${BUILD_INFO}`, dir), JSON.stringify(info, null, 2) + '\n');
				logger.info(`${BUILD_INFO} : version ${info.version}, ${info.siteUrl || 'SITE_URL absente'}`);
			},
		},
	};
}
