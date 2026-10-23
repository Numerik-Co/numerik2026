/**
 * Plugins du modèle : volets du site que chaque association active ou non
 * (`plugins:` de `src/content/reglages.yaml`, tous inactifs par défaut).
 *
 * Module pur (seulement des modules purs importés) : chargé par la config Astro, par
 * `src/config/site.ts` et dans le navigateur. Nouveau plugin = une entrée
 * ici + son dossier `src/plugins/<id>/` + son manifeste dans `manifests.ts`
 * (cf. `src/plugins/README.md`).
 */
import type { ChampPlugin } from './champs';
import { ADRESSE_DEFAUT as RDV_ADRESSE_DEFAUT } from './rdv/lib/adresse';

export interface PluginInfo {
	label: string;
	description: string;
	/** Icône Font Awesome (module « Plugins » de l'espace bénévoles). */
	icon: string;
	/** Documentation du plugin (chemin dans le projet). */
	doc: string;
	/** Fichiers de `src/content/` sans lesquels le plugin ne peut pas être activé. */
	requis?: { fichier: string; aide: string }[];
	/**
	 * Secrets du `.env` (jamais réglables depuis le site) : signalés si absents
	 * (`repli` compris), sans bloquer l'activation ; la page de configuration
	 * dit lequel est utilisé.
	 */
	env?: { nom: string; aide: string; repli?: string }[];
	/**
	 * Réglages modifiables dans la page de configuration du module « Plugins »,
	 * écrits dans `fichier` (de `src/content/`). Un champ `type: 'adresse'` est
	 * l'adresse de la page publique (contrôlée contre les pages du site).
	 */
	reglages?: { fichier: string; champs: ChampPlugin[] };
}

export const PLUGINS = {
	rdv: {
		label: 'Prise de rendez-vous',
		description:
			'Prise de rendez-vous en ligne : page publique, permanences dans le planning, encart d’accueil (réglages : src/content/rdv.yaml).',
		icon: 'fa-calendar-check',
		doc: 'src/plugins/rdv/README.md',
		requis: [{ fichier: 'rdv.yaml', aide: 'Copier le modèle src/plugins/rdv/rdv.exemple.yaml puis l’adapter (adresse, textes, permanences).' }],
		env: [
			{
				nom: 'GRIST_API_KEY_RDV',
				repli: 'GRIST_API_KEY',
				aide: 'Clé d’API Grist, dans le .env : GRIST_API_KEY_RDV (clé limitée au document des RDV, conseillé) ou, à défaut, GRIST_API_KEY (celle de l’adhésion). Sans clé, aucun RDV ne peut être pris.',
			},
		],
		reglages: {
			fichier: 'rdv.yaml',
			champs: [
				{
					cle: 'adresse',
					label: 'Adresse de la page',
					groupe: 'Page publique',
					type: 'adresse',
					defaut: RDV_ADRESSE_DEFAUT,
					aide: 'Les liens déjà écrits vers l’ancienne adresse (actualités, pages) ne sont pas modifiés.',
				},
				{
					cle: 'grist.url',
					label: 'Adresse de l’instance Grist',
					groupe: 'Document Grist',
					type: 'url',
					env: 'GRIST_BASE_URL',
					obligatoire: true,
					aide: 'Ex. https://grist.exemple.fr — vide : celle du .env, partagée avec l’adhésion.',
				},
				{
					cle: 'grist.document',
					label: 'Identifiant du document',
					groupe: 'Document Grist',
					type: 'identifiant',
					env: 'GRIST_DOC_ID_RDV',
					obligatoire: true,
					aide: 'Dans l’adresse du document Grist : https://…/o/…/<identifiant>/…',
				},
				{ cle: 'grist.tables.beneficiaires', label: 'Table des bénéficiaires', groupe: 'Document Grist', type: 'table', env: 'GRIST_TABLE_BENEFICIAIRES', defaut: 'Beneficiaires' },
				{ cle: 'grist.tables.rdv', label: 'Table des rendez-vous', groupe: 'Document Grist', type: 'table', env: 'GRIST_TABLE_RDV', defaut: 'RDV' },
				{ cle: 'grist.tables.demarches', label: 'Table des démarches', groupe: 'Document Grist', type: 'table', env: 'GRIST_TABLE_DEMARCHES', defaut: 'Demarches' },
			],
		},
	},
} as const satisfies Record<string, PluginInfo>;

export type PluginId = keyof typeof PLUGINS;

export const PLUGIN_IDS = Object.keys(PLUGINS) as PluginId[];
