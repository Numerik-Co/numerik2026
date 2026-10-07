/**
 * Dossier des données vivantes du site, hors du code et du build : comptes
 * (`accounts/`), actualités publiées depuis l'admin (`news/`)…
 * `DATA_DIR` (ou l'ancien nom `AUTH_DATA_DIR`), défaut `./data`. En Docker,
 * monté en volume (`docker-compose.yml`) pour survivre aux redéploiements.
 *
 * Module sans dépendance à Astro : aussi utilisé par `scripts/auth-user.ts`.
 */

import { join, resolve } from 'node:path';

export function dataDir(): string {
	return resolve(process.env.DATA_DIR || process.env.AUTH_DATA_DIR || join(process.cwd(), 'data'));
}
