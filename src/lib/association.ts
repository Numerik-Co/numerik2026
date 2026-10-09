/**
 * Informations de l'association (nom, coordonnées, mentions légales), propres
 * à chaque déploiement : lues dans `src/content/association.yaml`, fichier qui
 * appartient à l'association et qu'une mise à jour du modèle ne remplace pas.
 *
 * Fichier importé tel quel (`?raw`, suivi par Vite : modifié en dev, il est
 * relu à chaud) puis validé ici : un champ manquant fait échouer le build avec
 * le chemin du champ. Lecture synchrone volontaire — `association` est utilisé
 * partout (composants, `page-variables.ts`, `content.config.ts` via
 * `site-pages.ts`), y compris dans l'îlot Vue de l'admin : pas de
 * `getCollection` ni de `fs` ici.
 */

import { z } from 'astro/zod';
import { parse as parseYaml } from 'yaml';
import raw from '../content/association.yaml?raw';

/** Champ facultatif : absent ou `null` dans le YAML = chaîne vide. */
const optional = z
	.string()
	.nullish()
	.transform((v) => v ?? '');

const required = z.string({ error: 'champ obligatoire' }).trim().min(1, 'champ obligatoire');

const schema = z.object({
	name: required,
	description: required,
	email: required,
	phone: required,
	address: z.object({
		street: required,
		postalCode: required,
		city: required,
	}),
	social: z
		.record(z.string(), optional)
		.nullish()
		.transform((v) => v ?? {}),
	legal: z
		.object({
			registrationNumber: optional,
			siretNumber: optional,
			president: optional,
			publicationManager: optional,
			publicationManagerRole: optional,
			hosting: z
				.object({ name: optional, address: optional, phone: optional })
				.nullish()
				.transform((v) => v ?? { name: '', address: '', phone: '' }),
		})
		.nullish()
		.transform(
			(v) =>
				v ?? {
					registrationNumber: '',
					siretNumber: '',
					president: '',
					publicationManager: '',
					publicationManagerRole: '',
					hosting: { name: '', address: '', phone: '' },
				},
		),
});

export type Association = z.infer<typeof schema>;

function load(): Association {
	const result = schema.safeParse(parseYaml(raw));
	if (result.success) return result.data;
	const details = result.error.issues.map((i) => `  - ${i.path.join('.') || '(fichier)'} : ${i.message}`).join('\n');
	throw new Error(`src/content/association.yaml invalide :\n${details}`);
}

export const association = load();

export function getFullAddress(): string {
	return `${association.address.street}, ${association.address.postalCode} ${association.address.city}`;
}
