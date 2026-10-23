/**
 * Plugins (`src/plugins/`) : ajoute les routes des plugins actifs
 * (`plugins:` de `src/content/reglages.yaml`). Un plugin inactif n'a aucune
 * route : ses pages et ses API répondent 404.
 *
 * Lit `reglages.yaml` directement (la config Astro ne charge pas `?raw`) ;
 * sa validation complète reste celle de `src/config/site.ts`, au build.
 * Fichiers surveillés (`reglages.yaml`, `rdv.yaml` pour son adresse) : en
 * dev, les modifier relance le serveur.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { parse as parseYaml } from 'yaml';
import { PLUGIN_MANIFESTS } from '../plugins/manifests';

function pluginsActifs(file: URL): Record<string, unknown> {
	try {
		return parseYaml(readFileSync(file, 'utf8'))?.plugins ?? {};
	} catch {
		return {};
	}
}

export default function plugins(): AstroIntegration {
	return {
		name: 'numerik:plugins',
		hooks: {
			'astro:config:setup': ({ config, injectRoute, addWatchFile, logger }) => {
				const reglages = new URL('src/content/reglages.yaml', config.root);
				addWatchFile(reglages);
				addWatchFile(new URL('src/content/rdv.yaml', config.root));
				const actifs = pluginsActifs(reglages);
				for (const plugin of PLUGIN_MANIFESTS) {
					if (actifs[plugin.id] !== true) continue;
					for (const r of plugin.routes(config.root)) {
						injectRoute({ pattern: r.pattern, entrypoint: fileURLToPath(new URL(r.entrypoint, config.root)) });
					}
					logger.info(`Plugin actif : ${plugin.id}`);
				}
			},
		},
	};
}
