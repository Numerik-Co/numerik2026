/**
 * Manifeste du plugin facturation (lu par la config Astro, cf. `../manifests.ts`).
 * Le reste du plugin : `README.md` de ce dossier.
 */
import { readFileSync } from 'node:fs';
import { envField } from 'astro/config';
import { parse as parseYaml } from 'yaml';
import type { PluginManifest } from '../manifests';
import { ADRESSE_DEFAUT, ADRESSE_RE } from './lib/adresse';

const route = (pattern: string, fichier: string) => ({ pattern, entrypoint: `src/plugins/facturation/${fichier}` });

/** `adresse:` de `src/content/facturation.yaml` (validée en entier au build par `lib/config.ts`). */
function adresse(root: URL): string {
	let valeur: unknown;
	try {
		valeur = parseYaml(readFileSync(new URL('src/content/facturation.yaml', root), 'utf8'))?.adresse;
	} catch {
		return ADRESSE_DEFAUT;
	}
	if (valeur === undefined || valeur === null) return ADRESSE_DEFAUT;
	if (typeof valeur !== 'string' || !ADRESSE_RE.test(valeur)) {
		throw new Error(`src/content/facturation.yaml invalide :\n  - adresse : adresse au format /devis (minuscules, chiffres, tirets), reçu « ${String(valeur)} »`);
	}
	return valeur;
}

export default {
	id: 'facturation',
	routes: (root) => [
		route(adresse(root), 'pages/devis.astro'),
		route('/api/facturation/prestations', 'api/prestations.ts'),
		route('/api/facturation/demande', 'api/demande.ts'),
		// Module « Facturation » de l'Espace Admin (garde : src/middleware.ts).
		route('/api/admin/facturation', 'admin/api/index.ts'),
		route('/api/admin/facturation/clients', 'admin/api/clients.ts'),
		route('/api/admin/facturation/devis', 'admin/api/devis.ts'),
		route('/api/admin/facturation/factures', 'admin/api/factures.ts'),
		route('/api/admin/facturation/pdf', 'admin/api/pdf.ts'),
	],
	env: {
		// Document Grist de la facturation (GRIST_BASE_URL partagé). Clé propre au
		// plugin, facultative si GRIST_API_KEY existe.
		GRIST_DOC_ID_FACTURATION: envField.string({ context: 'server', access: 'secret', optional: true }),
		GRIST_API_KEY_FACTURATION: envField.string({ context: 'server', access: 'secret', optional: true }),
	},
} satisfies PluginManifest;
