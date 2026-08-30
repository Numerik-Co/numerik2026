import { site, type FormToggle } from '../config/site';

/** Clés valides pour `<FormGate form="…">` — dérivées de `site.forms`. */
export type FormName = keyof typeof site.forms;

const FALLBACK: FormToggle = {
	enabled: true,
	closedTitle: 'Formulaire indisponible',
	closedMessage:
		"Ce formulaire n'est pas ouvert actuellement. Merci de nous contacter directement en attendant.",
};

/** Configuration d'un formulaire, complétée par des valeurs par défaut. */
export function getFormToggle(name: FormName): FormToggle {
	return { ...FALLBACK, ...site.forms[name] };
}

/** `true` si le formulaire est ouvert. Pratique pour masquer un bouton d'accès. */
export function isFormOpen(name: FormName): boolean {
	return getFormToggle(name).enabled;
}
