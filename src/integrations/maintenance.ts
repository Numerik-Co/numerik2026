/**
 * Mode maintenance en développement (`astro dev`) : même porte qu'en
 * production (`scripts/maintenance.mjs`, placée par `scripts/start.mjs`),
 * posée sur le serveur Vite. Le middleware d'Astro ne convient pas : en dev,
 * les requêtes des pages prérendues lui arrivent sans cookies, et les membres
 * connectés doivent passer.
 */

import type { AstroIntegration } from 'astro';
import { join, resolve } from 'node:path';
import { nomAssociation, reponseMaintenance } from '../../scripts/maintenance.mjs';

/** Fichiers servis par Vite (modules, client HMR) : jamais bloqués. */
const VITE = /^\/(?:@|src\/|node_modules\/|\.astro\/)/;

export default function maintenance(): AstroIntegration {
	return {
		name: 'numerik:maintenance',
		hooks: {
			'astro:server:setup': ({ server }) => {
				const root = server.config.root;
				const dataDir = () => resolve(process.env.DATA_DIR || process.env.AUTH_DATA_DIR || join(root, 'data'));
				server.middlewares.use((req, res, next) => {
					const url = req.url || '/';
					if (VITE.test(url)) return next();
					const r = reponseMaintenance({ url, method: req.method, cookie: req.headers.cookie, dataDir: dataDir(), nom: () => nomAssociation(root) });
					if (!r) return next();
					res.writeHead(r.status, r.headers);
					res.end(r.body);
				});
			},
		},
	};
}
