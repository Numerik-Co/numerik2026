/**
 * Manifeste du plugin RDV (lu par la config Astro, cf. `../manifests.ts`).
 * Le reste du plugin : `README.md` de ce dossier.
 */
import { readFileSync } from 'node:fs';
import { envField } from 'astro/config';
import { parse as parseYaml } from 'yaml';
import type { PluginManifest } from '../manifests';
import { ADRESSE_DEFAUT, ADRESSE_RE } from './lib/adresse';

const route = (pattern: string, fichier: string) => ({ pattern, entrypoint: `src/plugins/rdv/${fichier}` });

/** `adresse:` de `src/content/rdv.yaml` (validée en entier au build par `lib/config.ts`). */
function adresse(root: URL): string {
	let valeur: unknown;
	try {
		valeur = parseYaml(readFileSync(new URL('src/content/rdv.yaml', root), 'utf8'))?.adresse;
	} catch {
		return ADRESSE_DEFAUT; // fichier absent ou illisible : message clair de lib/config.ts au build
	}
	if (valeur === undefined || valeur === null) return ADRESSE_DEFAUT;
	if (typeof valeur !== 'string' || !ADRESSE_RE.test(valeur)) {
		throw new Error(`src/content/rdv.yaml invalide :\n  - adresse : adresse au format /rendez-vous (minuscules, chiffres, tirets), reçu « ${String(valeur)} »`);
	}
	return valeur;
}

export default {
	id: 'rdv',
	routes: (root) => [
		route(adresse(root), 'pages/rendez-vous.astro'),
		route('/api/rdv/beneficiaires', 'api/beneficiaires.ts'),
		route('/api/rdv/commune', 'api/commune.ts'),
		route('/api/rdv/creneaux', 'api/creneaux.ts'),
		route('/api/rdv/demarches', 'api/demarches.ts'),
		route('/api/rdv/ics', 'api/ics.ts'),
		route('/api/rdv/listes', 'api/listes.ts'),
		route('/api/rdv/prendre', 'api/prendre.ts'),
		// Module « Rendez-vous » de l'espace bénévoles (garde : src/middleware.ts).
		route('/api/admin/rdv', 'admin/api/index.ts'),
		route('/api/admin/rdv/[id]', 'admin/api/[id].ts'),
	],
	env: {
		// Grist — document des RDV (GRIST_BASE_URL / GRIST_API_KEY partagés avec l'adhésion).
		// Clé d'API propre au plugin, facultative (sinon GRIST_API_KEY) : une clé limitée
		// au document des RDV n'expose pas celui de l'adhésion.
		GRIST_API_KEY_RDV: envField.string({ context: 'server', access: 'secret', optional: true }),
		GRIST_DOC_ID_RDV: envField.string({ context: 'server', access: 'secret', optional: true }),
		GRIST_TABLE_BENEFICIAIRES: envField.string({ context: 'server', access: 'secret', default: 'Beneficiaires' }),
		GRIST_TABLE_RDV: envField.string({ context: 'server', access: 'secret', default: 'RDV' }),
		GRIST_TABLE_DEMARCHES: envField.string({ context: 'server', access: 'secret', default: 'Demarches' }),
	},
} satisfies PluginManifest;
