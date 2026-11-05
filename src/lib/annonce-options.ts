/**
 * Réglages des annonces sans dépendance (aussi chargés dans le navigateur par
 * le module « Annonces ») : couleurs, icônes proposées, longueurs maximales.
 * Schéma de validation : `annonce-schema.ts`.
 */

export const ANNONCE_TONES = ['info', 'accent', 'urgent'] as const;
export type AnnonceToneValue = (typeof ANNONCE_TONES)[number];

/** Libellés des couleurs, dans l'ordre du formulaire (classes = celles de `AnnonceBanner.astro`). */
export const ANNONCE_TONE_LABELS: Record<AnnonceToneValue, { label: string; className: string }> = {
	info: { label: 'Couleur principale', className: 'bg-primary text-white' },
	accent: { label: "Couleur d'accent", className: 'bg-accent text-white' },
	urgent: { label: 'Urgent (ambre)', className: 'bg-amber-400 text-amber-950' },
};

export const ANNONCE_DEFAULT_ICON = 'fa-bullhorn';
export const ANNONCE_TITLE_MAX = 80;
export const ANNONCE_MESSAGE_MAX = 250;
export const ANNONCE_CTA_LABEL_MAX = 40;
/** Identifiant : minuscules, chiffres et tirets. */
export const ANNONCE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Icône Font Awesome solid, avec ou sans le préfixe `fa-solid` écrit à la main. */
export const ANNONCE_ICON = /^(?:fa-solid\s+)?fa-[a-z0-9-]+$/;

/** Icônes proposées dans le formulaire (Font Awesome gratuit, style solid). */
export const ANNONCE_ICONS: { icon: string; label: string }[] = [
	{ icon: 'fa-bullhorn', label: 'Annonce' },
	{ icon: 'fa-calendar-days', label: 'Agenda' },
	{ icon: 'fa-hand-holding-heart', label: 'Bénévolat' },
	{ icon: 'fa-triangle-exclamation', label: 'Attention' },
	{ icon: 'fa-circle-info', label: 'Information' },
	{ icon: 'fa-door-closed', label: 'Fermeture' },
	{ icon: 'fa-people-group', label: 'Rassemblement' },
	{ icon: 'fa-champagne-glasses', label: 'Fête' },
	{ icon: 'fa-gift', label: 'Cadeau' },
	{ icon: 'fa-star', label: 'Nouveauté' },
	{ icon: 'fa-graduation-cap', label: 'Formation' },
	{ icon: 'fa-laptop', label: 'Atelier' },
	{ icon: 'fa-envelope', label: 'Courrier' },
	{ icon: 'fa-sun', label: 'Vacances' },
	{ icon: 'fa-snowflake', label: 'Hiver' },
	{ icon: 'fa-heart', label: 'Solidarité' },
	{ icon: 'fa-id-card', label: 'Adhésion' },
	{ icon: 'fa-location-dot', label: 'Lieu' },
];
