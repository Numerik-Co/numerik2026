/**
 * Secrets saisis à l'installation (`<DATA_DIR>/installation/secrets.env`,
 * `scripts/installation.mjs`) en développement (`astro dev`) : en production,
 * `scripts/start.mjs` les charge avant de lancer le serveur. Le `.env`
 * l'emporte, comme en production (Vite donnerait sinon la priorité à
 * `process.env`).
 */

import type { AstroIntegration } from 'astro';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defini, lireSecrets } from '../../scripts/installation.mjs';

export default function installation(): AstroIntegration {
	return {
		name: 'numerik:installation',
		hooks: {
			'astro:config:setup': ({ command, config, logger }) => {
				if (command !== 'dev') return;
				const root = fileURLToPath(config.root);
				const dataDir = resolve(process.env.DATA_DIR || process.env.AUTH_DATA_DIR || join(root, 'data'));
				const fichiers = loadEnv('development', root, '');
				const charges: string[] = [];
				for (const [nom, valeur] of Object.entries(lireSecrets(dataDir))) {
					if (defini(fichiers, nom) || defini(process.env, nom)) continue;
					process.env[nom] = valeur;
					charges.push(nom);
				}
				if (charges.length) logger.info(`secrets de l'installation chargés : ${charges.join(', ')}`);
			},
		},
	};
}
