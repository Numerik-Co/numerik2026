/** Brouillon de la photo du bandeau d'accueil (`HomePhotoField.vue`, envoyé par `SitePageForm.vue`). */
export interface HomePhotoDraft {
	/** Photo actuelle (aperçu), `null` sans photo. */
	current: string | null;
	change: { action: 'keep' } | { action: 'remove' } | { action: 'replace'; file: File; url: string };
	error: string;
}
