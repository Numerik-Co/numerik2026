import { site, type FormToggle } from '../config/site';

/** Clés valides pour `<FormGate form="…">` — dérivées de `site.forms`. */
export type FormName = keyof typeof site.forms;

/** Configuration d'un formulaire (valeurs par défaut + `src/content/reglages.yaml`). */
export function getFormToggle(name: FormName): FormToggle {
	return site.forms[name];
}

/** `true` si le formulaire est ouvert. Pratique pour masquer un bouton d'accès. */
export function isFormOpen(name: FormName): boolean {
	return getFormToggle(name).enabled;
}
