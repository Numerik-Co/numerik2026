/**
 * Plugins du modèle : volets du site que chaque association active ou non
 * (`plugins:` de `src/content/reglages.yaml`, tous inactifs par défaut).
 *
 * Module pur (aucun import) : chargé par la config Astro, par
 * `src/config/site.ts` et dans le navigateur. Nouveau plugin = une entrée
 * ici + son dossier `src/plugins/<id>/` + son manifeste dans `manifests.ts`
 * (cf. `src/plugins/README.md`).
 */
export const PLUGINS = {
	rdv: {
		label: 'Prise de rendez-vous',
		description:
			'Prise de rendez-vous en ligne : page publique, permanences dans le planning, encart d’accueil (réglages : src/content/rdv.yaml).',
	},
} as const satisfies Record<string, { label: string; description: string }>;

export type PluginId = keyof typeof PLUGINS;

export const PLUGIN_IDS = Object.keys(PLUGINS) as PluginId[];
