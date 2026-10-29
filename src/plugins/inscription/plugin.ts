/**
 * Manifeste du plugin inscription (lu par la config Astro, cf. `../manifests.ts`).
 * Requiert le plugin adhésion (catalogue) : même document Grist, routes
 * `/api/adhesion/membre` et `/api/adhesion/inscription`.
 */
import type { PluginManifest } from '../manifests';

const route = (pattern: string, fichier: string) => ({ pattern, entrypoint: `src/plugins/inscription/${fichier}` });

export default {
	id: 'inscription',
	routes: () => [
		route('/inscription', 'pages/inscription.astro'),
		route('/api/inscription/offre', 'api/offre.ts'),
		route('/api/inscription/preinscription', 'api/preinscription.ts'),
		route('/api/inscription/participant-exterieur', 'api/participant-exterieur.ts'),
	],
	env: {},
} satisfies PluginManifest;
