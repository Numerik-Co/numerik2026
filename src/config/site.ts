/**
 * Configuration propre à chaque structure qui déploie ce template.
 *
 * C'est le SEUL fichier hors de `src/content/` qu'un intégrateur doit
 * ajuster pour mettre en route une nouvelle plateforme. Toutes les autres
 * pages de contenu se déclarent elles-mêmes via leur frontmatter
 * (voir `src/content/README.md`).
 */

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
	 * une page du menu de navigation.
	 */
	presence: {
		label: 'Je participe',
		href: '/je-participe',
		enabled: true,
	},

	// Pages du site (Accueil, Activités, Actualités, Contact…) : bibliothèque
	// `src/lib/site-pages.ts`, activées et réglées depuis le module « Pages »
	// (`src/content/pages/_pages-site.md`), plus ici.

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
