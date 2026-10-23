/**
 * Activation des plugins depuis le module « Plugins » de l'espace bénévoles
 * (super admin seul) : `plugins.<id>` de `src/content/reglages.yaml`, changé
 * en place (`yaml` Document : commentaires et autres réglages gardés), fichier
 * revalidé par `parseReglages()`. La publication (reconstruction du site,
 * qui ajoute ou retire les routes du plugin) est faite par `site-build.ts`,
 * via `admin-publish.ts` ; texte d'origine remis si elle échoue.
 *
 * Code serveur uniquement.
 */
import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getSecret } from 'astro:env/server';
import { parseDocument, YAMLMap } from 'yaml';
import { parseReglages } from '../config/site';
import { PLUGIN_IDS, PLUGINS, type PluginId } from '../plugins/catalogue';
import { pluginActif } from '../plugins';
import type { Applied } from './content-transaction';
import { siteRoot } from './news-writer';

const contentDir = () => join(siteRoot(), 'src', 'content');
const reglagesFile = () => join(contentDir(), 'reglages.yaml');

export interface PluginState {
	id: PluginId;
	label: string;
	description: string;
	icon: string;
	doc: string;
	/** État enregistré dans `reglages.yaml` (sources). */
	actif: boolean;
	/** État du site en ligne (construit), différent tant que la modification n'est pas publiée. */
	enLigne: boolean;
	/** Fichiers requis absents : activation impossible. */
	manquants: { fichier: string; aide: string }[];
	/** Variables d'environnement absentes : signalées seulement. */
	avertissements: { nom: string; aide: string }[];
}

const existe = (fichier: string) =>
	access(join(contentDir(), fichier)).then(
		() => true,
		() => false,
	);

export async function readPluginsSource(): Promise<PluginState[]> {
	const { plugins } = parseReglages(await readFile(reglagesFile(), 'utf8').catch(() => ''));
	return Promise.all(
		PLUGIN_IDS.map(async (id) => {
			const info = PLUGINS[id];
			const requis = 'requis' in info ? info.requis : [];
			const env = 'env' in info ? info.env : [];
			const manquants = [];
			for (const r of requis) if (!(await existe(r.fichier))) manquants.push({ ...r, fichier: `src/content/${r.fichier}` });
			return {
				id,
				label: info.label,
				description: info.description,
				icon: info.icon,
				doc: info.doc,
				actif: plugins[id],
				enLigne: pluginActif(id),
				manquants,
				avertissements: env.filter((e) => !getSecret(e.nom)).map((e) => ({ ...e })),
			};
		}),
	);
}

export type PluginResult = { applied?: Applied; label: string; errors: string[] };

export async function savePlugin(id: unknown, actif: unknown): Promise<PluginResult> {
	if (typeof id !== 'string' || !(PLUGIN_IDS as string[]).includes(id)) return { label: '', errors: ['Plugin inconnu.'] };
	if (typeof actif !== 'boolean') return { label: '', errors: ['État attendu : actif ou non.'] };
	const pluginId = id as PluginId;
	const label = `Plugin « ${PLUGINS[pluginId].label} » ${actif ? 'activé' : 'désactivé'}`;

	const state = (await readPluginsSource()).find((p) => p.id === pluginId)!;
	if (state.actif === actif) return { label, errors: ["Rien n'a changé."] };
	if (actif && state.manquants.length) {
		return { label, errors: [`Activation impossible : ${state.manquants.map((m) => `${m.fichier} absent (${m.aide})`).join(' ')}`] };
	}

	const original = await readFile(reglagesFile(), 'utf8').catch(() => null);
	const doc = parseDocument(original ?? '');
	if (doc.errors.length) return { label, errors: [`reglages.yaml illisible : ${doc.errors[0].message}`] };
	if (doc.contents === null) doc.contents = new YAMLMap() as never;
	doc.setIn(['plugins', pluginId], actif);
	const text = doc.toString({ lineWidth: 0, flowCollectionPadding: false });
	parseReglages(text);
	await writeFile(reglagesFile(), text, 'utf8');

	return {
		label,
		errors: [],
		applied: {
			restore: async () => {
				if (original !== null) await writeFile(reglagesFile(), original, 'utf8');
			},
			purge: async () => {},
		},
	};
}
