/// <reference types="astro/client" />

// Variables d'environnement : déclarées (et typées) dans `astro.config.mjs`
// (`env.schema`), lues via `astro:env/server`. `DATA_DIR` (ex-`AUTH_DATA_DIR`)
// est lue par `process.env` dans `src/lib/data-dir.ts`, partagé avec le CLI.

declare namespace App {
	interface Locals {
		/** Personne connectée (`src/middleware.ts`), `null` sinon. Absent sur les pages prérendues. */
		user: import('./lib/auth/session').SessionUser | null;
	}
}
