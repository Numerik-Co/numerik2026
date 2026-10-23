/**
 * Plugins du modèle : volets du site que chaque association active ou non
 * (`plugins:` de `src/content/reglages.yaml`, tous inactifs par défaut).
 *
 * Module pur (aucun import) : chargé par la config Astro, par
 * `src/config/site.ts` et dans le navigateur. Nouveau plugin = une entrée
 * ici + son dossier `src/plugins/<id>/` + son manifeste dans `manifests.ts`
 * (cf. `src/plugins/README.md`).
 */
export interface PluginInfo {
	label: string;
	description: string;
	/** Icône Font Awesome (module « Plugins » de l'espace bénévoles). */
	icon: string;
	/** Documentation du plugin (chemin dans le projet). */
	doc: string;
	/** Fichiers de `src/content/` sans lesquels le plugin ne peut pas être activé. */
	requis?: { fichier: string; aide: string }[];
	/** Variables d'environnement utiles : signalées si absentes (sans bloquer l'activation). */
	env?: { nom: string; aide: string }[];
}

export const PLUGINS = {
	rdv: {
		label: 'Prise de rendez-vous',
		description:
			'Prise de rendez-vous en ligne : page publique, permanences dans le planning, encart d’accueil (réglages : src/content/rdv.yaml).',
		icon: 'fa-calendar-check',
		doc: 'src/plugins/rdv/README.md',
		requis: [{ fichier: 'rdv.yaml', aide: 'Copier le modèle src/plugins/rdv/rdv.exemple.yaml puis l’adapter (adresse, textes, permanences).' }],
		env: [{ nom: 'GRIST_DOC_ID_RDV', aide: 'Identifiant du document Grist des RDV, dans le .env : sans lui, la page s’affiche mais aucun RDV ne peut être pris.' }],
	},
} as const satisfies Record<string, PluginInfo>;

export type PluginId = keyof typeof PLUGINS;

export const PLUGIN_IDS = Object.keys(PLUGINS) as PluginId[];
