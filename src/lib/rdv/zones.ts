/**
 * Zones géographiques des bénéficiaires, propres à chaque déploiement : lues
 * dans `src/content/zones-geographiques.yaml` (fichier de l'association,
 * jamais remplacé par une mise à jour du modèle ; même principe que
 * `association.ts`). Module serveur : la page `/rdv-conseiller-numerique`
 * passe `zonesGeographiques` en prop à `RdvForm.vue`, `/api/rdv/prendre`
 * valide la zone reçue avec `estZoneConnue()`.
 */

import { z } from 'astro/zod';
import { parse as parseYaml } from 'yaml';
import raw from '../../content/zones-geographiques.yaml?raw';
import type { ZoneGeographiqueConfig } from './geographie';

const text = z.string({ error: 'champ obligatoire' }).trim().min(1, 'champ obligatoire');

const schema = z.strictObject({
	zones: z
		.array(
			z.strictObject({
				label: text,
				communes: z
					.array(text, { error: 'liste de communes attendue' })
					.nullish()
					.transform((v) => v ?? []),
				// `40` (nombre YAML) accepté comme '40'.
				codePostal: z
					.preprocess(
						(v) => (typeof v === 'number' ? String(v) : v),
						z.string({ error: 'début de code postal attendu (ex. 40)' }).regex(/^\d{1,5}$/, 'chiffres seulement (ex. 40)').nullish(),
					)
					.transform((v) => v || undefined),
			}),
		)
		.nullish()
		.transform((v) => v ?? [])
		.refine((list) => new Set(list.map((zone) => zone.label)).size === list.length, 'deux zones ont le même label'),
});

function load(): ZoneGeographiqueConfig[] {
	const result = schema.safeParse(parseYaml(raw) ?? {});
	if (result.success) return result.data.zones;
	const details = result.error.issues
		.map((i) => {
			const [, index, ...field] = i.path;
			const where = typeof index === 'number' ? `zone n°${index + 1}${field.length ? ` · ${field.join('.')}` : ''}` : i.path.join('.') || '(fichier)';
			const message = i.code === 'unrecognized_keys' ? `clé inconnue « ${i.keys.join(' », « ')} »` : i.message;
			return `  - ${where} : ${message}`;
		})
		.join('\n');
	throw new Error(`src/content/zones-geographiques.yaml invalide :\n${details}`);
}

export const zonesGeographiques = load();

/** La zone reçue du formulaire fait-elle partie des zones configurées ? */
export function estZoneConnue(label: string): boolean {
	return zonesGeographiques.some((zone) => zone.label === label);
}
