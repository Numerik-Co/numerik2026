/**
 * Partenaires de l'association, propres à chaque déploiement : lus dans
 * `src/content/partenaires.yaml` (fichier de l'association, jamais remplacé
 * par une mise à jour du modèle). Même principe que `association.ts` (`?raw`,
 * validation au chargement, lecture synchrone).
 *
 * Module serveur : l'îlot Vue de l'adhésion reçoit les noms des relais en
 * prop (`relaisAdhesion`), pour ne pas embarquer le parseur YAML côté visiteur.
 */

import { z } from 'astro/zod';
import { parse as parseYaml } from 'yaml';
import raw from '../content/partenaires.yaml?raw';

const text = z.string({ error: 'champ obligatoire' }).trim().min(1, 'champ obligatoire');
const optional = z
	.string({ error: 'texte attendu' })
	.trim()
	.nullish()
	.transform((v) => v || undefined);

const schema = z.strictObject({
	partenaires: z
		.array(
			z.strictObject({
				name: text,
				role: text,
				url: z.url({ error: 'adresse web invalide (https://…)' }).nullish().transform((v) => v || undefined),
				relais: z.boolean({ error: 'true ou false attendu' }).default(false),
				avantage: optional,
			}),
		)
		.nullish()
		.transform((v) => v ?? []),
});

export type Partenaire = z.infer<typeof schema>['partenaires'][number];

function load(): Partenaire[] {
	const result = schema.safeParse(parseYaml(raw) ?? {});
	if (result.success) return result.data.partenaires;
	const details = result.error.issues
		.map((i) => {
			const [, index, ...field] = i.path;
			const where = typeof index === 'number' ? `partenaire n°${index + 1}${field.length ? ` · ${field.join('.')}` : ''}` : i.path.join('.') || '(fichier)';
			const message = i.code === 'unrecognized_keys' ? `clé inconnue « ${i.keys.join(' », « ')} »` : i.message;
			return `  - ${where} : ${message}`;
		})
		.join('\n');
	throw new Error(`src/content/partenaires.yaml invalide :\n${details}`);
}

export const partenaires = load();

/** Partenaires où l'on retire la fiche d'adhésion et règle sa cotisation (`relais: true`). */
export const relaisAdhesion = partenaires.filter((p) => p.relais).map((p) => p.name);

function escapeHtml(t: string): string {
	return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** `**texte**` → gras ; tout le reste échappé (à rendre avec `set:html`). */
export function avantageHtml(avantage: string): string {
	return escapeHtml(avantage).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
