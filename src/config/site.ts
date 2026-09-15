/**
 * Configuration propre à chaque structure qui déploie ce template.
 *
 * C'est le SEUL fichier hors de `src/contents/` qu'un intégrateur doit
 * ajuster pour mettre en route une nouvelle plateforme. Toutes les autres
 * pages de contenu se déclarent elles-mêmes via leur frontmatter
 * (voir `src/contents/README.md`).
 */

export interface BuiltinNavItem {
	label: string;
	href: string;
	/** Position dans la navbar ; se mélange avec le `menu.order` des pages de contenu. */
	order: number;
}

export interface FormToggle {
	/** `false` masque le formulaire et affiche `closedTitle` + `closedMessage` à la place. */
	enabled: boolean;
	/** Titre du bloc affiché quand le formulaire est fermé. */
	closedTitle: string;
	/** Message affiché quand le formulaire est fermé. */
	closedMessage: string;
}

export const site = {
	/**
	 * Bouton d'appel à l'action affiché à droite de la barre de navigation.
	 * Ce n'est jamais une entrée de menu. `enabled: false` le masque complètement.
	 */
	cta: {
		label: 'Adhérer',
		href: '/adherer',
		enabled: true,
	},

	/**
	 * Lien rapide vers le dispositif de présence (« Je participe »).
	 * Pensé pour un usage « téléphone en main » pendant un atelier : affiché
	 * uniquement sur mobile/tablette (`lg:hidden` dans `Header.astro`), jamais
	 * dans la navbar desktop ni dans le menu déroulant mobile. Ce n'est pas
	 * une entrée de `builtinNav`.
	 */
	presence: {
		label: 'Je participe',
		href: '/je-participe',
		enabled: true,
	},

	/**
	 * Pages applicatives fournies par le template (listing d'activités,
	 * liste d'actualités, formulaire de contact…). Elles n'ont pas de
	 * frontmatter éditable : on les déclare ici.
	 *
	 * Retirer une ligne masque l'entrée du menu (la page reste accessible).
	 * Modifier `order` permet de la repositionner par rapport aux pages de contenu.
	 */
	builtinNav: [
		{ label: 'Accueil', href: '/', order: 0 },
		{ label: 'Activités', href: '/activites', order: 20 },
		{ label: 'Actualités', href: '/actualites', order: 30 },
		{ label: 'Contact', href: '/contact', order: 40 },
	] satisfies BuiltinNavItem[],

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
	} satisfies Record<string, FormToggle>,
};
