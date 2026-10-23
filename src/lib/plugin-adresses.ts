/**
 * Adresses des pages publiques des plugins (`adresse` du catalogue,
 * `src/plugins/catalogue.ts`), lues dans les **sources** de `src/content/`
 * (pas le site construit) : pour qu'une page de contenu ne prenne pas
 * l'adresse d'un plugin actif (`page-writer.ts`) et que le module « Plugins »
 * affiche et modifie la bonne valeur (`plugin-writer.ts`).
 *
 * Code serveur uniquement.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { parseReglages } from '../config/site';
import { PLUGIN_IDS, PLUGINS, type PluginId, type PluginInfo } from '../plugins/catalogue';
import type { ChampPlugin } from '../plugins/champs';
import { siteRoot } from './news-writer';

export const contentDir = () => join(siteRoot(), 'src', 'content');

/** Champ « adresse de la page » d'un plugin (`reglages.champs` du catalogue, `type: 'adresse'`) et son fichier. */
export function champAdresse(id: PluginId): { fichier: string; champ: ChampPlugin } | null {
	const info: PluginInfo = PLUGINS[id];
	const champ = info.reglages?.champs.find((c) => c.type === 'adresse');
	return champ && info.reglages ? { fichier: info.reglages.fichier, champ } : null;
}

/** Valeur d'une clé à points (`grist.tables.rdv`) dans un objet YAML lu. */
export function valeurA(data: unknown, cle: string): unknown {
	return cle.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), data);
}

/** Adresse enregistrée d'un plugin (défaut du catalogue si le fichier ou la clé manque), `null` s'il n'en a pas. */
export async function adressePlugin(id: PluginId): Promise<string | null> {
	const a = champAdresse(id);
	if (!a) return null;
	const defaut = a.champ.defaut ?? '';
	try {
		const valeur = valeurA(parseYaml(await readFile(join(contentDir(), a.fichier), 'utf8')), a.champ.cle);
		return typeof valeur === 'string' && valeur ? valeur : defaut;
	} catch {
		return defaut;
	}
}

/** Adresses des plugins actifs dans les sources (`reglages.yaml`), sauf `sauf`. */
export async function adressesPluginsActifs(sauf?: PluginId): Promise<{ id: PluginId; adresse: string }[]> {
	const { plugins } = parseReglages(await readFile(join(contentDir(), 'reglages.yaml'), 'utf8').catch(() => ''));
	const out: { id: PluginId; adresse: string }[] = [];
	for (const id of PLUGIN_IDS) {
		if (id === sauf || !plugins[id]) continue;
		const adresse = await adressePlugin(id);
		if (adresse) out.push({ id, adresse });
	}
	return out;
}
