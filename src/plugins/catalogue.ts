/**
 * Plugins du modèle : volets du site que chaque association active ou non
 * (`plugins:` de `src/content/reglages.yaml` ; inactifs par défaut, sauf
 * `actifParDefaut`).
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
	/**
	 * Actif sans rien écrire dans `reglages.yaml` (volet que la plupart des
	 * associations utilisent) ; `plugins: { <id>: false }` le désactive.
	 */
	actifParDefaut?: boolean;
	/**
	 * Plugins dont celui-ci se sert (routes, code) : il n'est actif que s'ils le
	 * sont tous, et c'est le seul dossier d'un autre plugin qu'il peut importer.
	 */
	requiert?: readonly string[];
	/** Icône Font Awesome (module « Plugins » de l'Espace Admin). */
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
	adhesion: {
		label: 'Adhésion et activités',
		description:
			'Adhésion en ligne et bulletin PDF, présence (« Je participe »), planning des activités lu dans Grist.',
		actifParDefaut: true,
		icon: 'fa-id-card',
		doc: 'src/plugins/adhesion/README.md',
		env: [
			{ nom: 'GRIST_API_KEY', aide: 'Clé d’API Grist du document de l’adhésion, dans le .env. Sans clé, les formulaires (adhésion, inscription, présence) et le planning Grist ne fonctionnent pas.' },
			{ nom: 'GRIST_DOC_ID', aide: 'Identifiant du document Grist de l’adhésion, dans le .env.' },
		],
	},
	inscription: {
		label: 'Inscription aux activités',
		description:
			'Page /inscription et bouton « S’inscrire » des fiches d’activité : adhérent·e ou personne extérieure, liste d’attente, préinscription. Requiert le plugin Adhésion (même document Grist).',
		actifParDefaut: true,
		requiert: ['adhesion'],
		icon: 'fa-clipboard-list',
		doc: 'src/plugins/inscription/README.md',
	},
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

/** État d'un plugin quand `reglages.yaml` n'en dit rien. */
export function actifParDefaut(id: PluginId): boolean {
	return (PLUGINS[id] as PluginInfo).actifParDefaut === true;
}

/** Plugins requis par `id` (`requiert`). */
export function requis(id: PluginId): PluginId[] {
	return [...((PLUGINS[id] as PluginInfo).requiert ?? [])] as PluginId[];
}

/**
 * Plugins réellement actifs d'après `plugins:` de `reglages.yaml` : valeur
 * écrite, sinon `actifParDefaut` ; puis inactif si un plugin requis l'est.
 */
export function resoudrePlugins(lus: Partial<Record<string, unknown>>): Record<PluginId, boolean> {
	const voulu = (id: PluginId) => (typeof lus[id] === 'boolean' ? (lus[id] as boolean) : actifParDefaut(id));
	const actif = (id: PluginId, vus: PluginId[] = []): boolean =>
		voulu(id) && requis(id).every((r) => !vus.includes(r) && actif(r, [...vus, id]));
	return Object.fromEntries(PLUGIN_IDS.map((id) => [id, actif(id)])) as Record<PluginId, boolean>;
}
