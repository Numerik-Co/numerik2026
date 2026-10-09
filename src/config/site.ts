/**
 * Réglages du site : bouton « Adhérer », lien « Je participe », outils de
 * partage, ouverture/fermeture des formulaires.
 *
 * Les valeurs ci-dessous (`DEFAULTS`) sont celles du modèle. Chaque
 * association les remplace dans `src/content/reglages.yaml`, fichier qui lui
 * appartient et qu'une mise à jour du modèle ne remplace pas. Tout y est
 * facultatif : une clé absente garde la valeur par défaut — un formulaire
 * ajouté par une mise à jour fonctionne donc sans toucher au YAML. Une clé
 * inconnue (faute de frappe) fait échouer le build avec son chemin.
 *
 * Même principe que `src/lib/association.ts` (`?raw`, lecture synchrone).
 * Pages du site (Accueil, Activités…) : module « Pages », pas ici.
 */

import { z } from 'astro/zod';
import { parse as parseYaml } from 'yaml';
import raw from '../content/reglages.yaml?raw';

export interface FormToggle {
	/** `false` masque le formulaire et affiche `closedTitle` + `closedMessage` à la place. */
	enabled: boolean;
	/** Titre du bloc affiché quand le formulaire est fermé. */
	closedTitle: string;
	/** Message affiché quand le formulaire est fermé. */
	closedMessage: string;
}

interface LinkToggle {
	label: string;
	href: string;
	enabled: boolean;
}

const DEFAULTS = {
	/**
	 * Bouton d'appel à l'action affiché à droite de la barre de navigation.
	 * Ce n'est jamais une entrée de menu. `enabled: false` le masque complètement.
	 */
	cta: {
		label: 'Adhérer',
		href: '/adherer',
		enabled: true,
	} as LinkToggle,

	/**
	 * Lien rapide vers le dispositif de présence (« Je participe »).
	 * Pensé pour un usage « téléphone en main » pendant un atelier : affiché
	 * uniquement sur mobile/tablette (`lg:hidden` dans `Header.astro`), jamais
	 * dans la navbar desktop ni dans le menu déroulant mobile. Ce n'est pas
	 * une page du menu de navigation.
	 */
	presence: {
		label: 'Je participe',
		href: '/je-participe',
		enabled: true,
	} as LinkToggle,

	/**
	 * Outils de partage affichés en bas des actualités et des pages de
	 * contenu (`src/components/article/ShareTools.astro`). `false` masque
	 * l'outil ; si tous sont à `false`, l'encart disparaît.
	 */
	share: {
		facebook: true,
	},

	/**
	 * Ouverture/fermeture des formulaires du site.
	 *
	 * `enabled: false` → le formulaire est remplacé par un encart informatif
	 * (`closedTitle` + `closedMessage`) via le composant `<FormGate form="…">`
	 * (voir `src/components/forms/FormGate.astro`).
	 *
	 * Pour un futur formulaire : ajouter une clé ici, puis entourer le
	 * formulaire de `<FormGate form="<clé>">…</FormGate>`.
	 */
	forms: {
		adhesion: {
			enabled: true,
			closedTitle: 'Adhésions en ligne momentanément fermées',
			closedMessage:
				"Le formulaire d'adhésion en ligne n'est pas ouvert actuellement. " +
				'Vous pouvez adhérer sur place ou nous écrire, nous vous répondrons rapidement.',
		},
		contact: {
			enabled: true,
			closedTitle: 'Formulaire de contact indisponible',
			closedMessage:
				"Le formulaire de contact n'est pas ouvert actuellement. " +
				'Vous pouvez nous joindre par téléphone ou par e-mail (coordonnées ci-contre).',
		},
		inscription: {
			enabled: true,
			closedTitle: 'Inscriptions en ligne momentanément fermées',
			closedMessage:
				"Le formulaire d'inscription en ligne n'est pas ouvert actuellement. " +
				'Vous pouvez nous contacter directement pour vous inscrire à une activité.',
		},
		rdvConseillerNumerique: {
			enabled: true,
			closedTitle: 'Prise de RDV en ligne momentanément fermée',
			closedMessage:
				"La prise de rendez-vous en ligne avec le·la Conseiller·ère Numérique n'est pas ouverte actuellement. " +
				'Vous pouvez vous présenter directement à ses permanences ou nous contacter.',
		},
	} satisfies Record<string, FormToggle>,
};

type FormKey = keyof typeof DEFAULTS.forms;
type ShareKey = keyof typeof DEFAULTS.share;

const text = z.string({ error: 'texte attendu' }).trim().min(1, 'texte vide');
const bool = z.boolean({ error: 'true ou false attendu' });

const linkSchema = z.strictObject({ label: text, href: text, enabled: bool }).partial();
const formSchema = z.strictObject({ enabled: bool, closedTitle: text, closedMessage: text }).partial();

/** Réglages de l'association : tout facultatif, clés inconnues refusées. */
const overridesSchema = z
	.strictObject({
		cta: linkSchema,
		presence: linkSchema,
		share: z.strictObject(Object.fromEntries(Object.keys(DEFAULTS.share).map((k) => [k, bool])) as Record<ShareKey, z.ZodBoolean>).partial(),
		forms: z.strictObject(Object.fromEntries(Object.keys(DEFAULTS.forms).map((k) => [k, formSchema])) as Record<FormKey, typeof formSchema>).partial(),
	})
	.partial()
	.nullish()
	.transform((v) => v ?? {});

function load() {
	const result = overridesSchema.safeParse(parseYaml(raw));
	if (!result.success) {
		const details = result.error.issues
			.map((i) => {
				const where = i.path.join('.') || '(fichier)';
				const message = i.code === 'unrecognized_keys' ? `clé inconnue « ${i.keys.join(' », « ')} »` : i.message;
				return `  - ${where} : ${message}`;
			})
			.join('\n');
		throw new Error(`src/content/reglages.yaml invalide :\n${details}`);
	}
	const o = result.data;
	return {
		cta: { ...DEFAULTS.cta, ...o.cta },
		presence: { ...DEFAULTS.presence, ...o.presence },
		share: { ...DEFAULTS.share, ...o.share },
		forms: Object.fromEntries(
			Object.entries(DEFAULTS.forms).map(([k, d]) => [k, { ...d, ...o.forms?.[k as FormKey] }]),
		) as Record<FormKey, FormToggle>,
	};
}

export const site = load();
