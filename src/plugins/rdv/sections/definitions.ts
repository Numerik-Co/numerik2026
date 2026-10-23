/**
 * Ce que le plugin RDV ajoute aux catalogues du site : module d'accueil
 * (`src/lib/home-modules.ts`) et bloc de page enrichie (`src/lib/blocs.ts`),
 * tous deux rendus par `RdvCtaSection.astro`. `plugin: 'rdv'` : masqués
 * dans l'éditeur et au rendu quand le plugin est inactif (`disponible()`).
 * Champs vides = textes de `encart:` (`src/content/rdv.yaml`).
 */
import type { BlocTypeDef } from '../../../lib/blocs.ts';
import type { HomeModuleDef } from '../../../lib/home-modules.ts';

const VIDE = 'Vide = texte de l’encart réglé dans rdv.yaml.';

export const RDV_HOME_MODULES = {
	rdv: {
		label: 'Prise de rendez-vous',
		description: 'Permanences et bouton de prise de rendez-vous en ligne.',
		plugin: 'rdv',
		icon: 'fa-headset',
		fields: [
			{ name: 'surtitre', label: 'Surtitre', type: 'text', default: '', help: VIDE },
			{ name: 'titre', label: 'Titre', type: 'text', default: '', help: VIDE },
			{ name: 'texte', label: 'Texte', type: 'textarea', default: '', help: VIDE },
			{ name: 'bouton-texte', label: 'Bouton', type: 'text', default: '', help: VIDE },
		],
	},
} satisfies Record<string, HomeModuleDef>;

export const RDV_BLOCS = {
	rdv: {
		label: 'Prise de rendez-vous',
		description: 'Encart des permanences avec bouton de prise de rendez-vous en ligne.',
		plugin: 'rdv',
		icon: 'fa-calendar-check',
		fields: [
			{ name: 'titre', label: 'Titre', type: 'text', help: VIDE },
			{ name: 'texte', label: 'Texte', type: 'textarea', help: VIDE },
		],
	},
} satisfies Record<string, BlocTypeDef>;

/** Anciens noms de type encore acceptés à la lecture du contenu (enregistrés avant le plugin). */
export const RDV_TYPES_RENOMMES: Record<string, 'rdv'> = { 'rdv-conseiller': 'rdv' };
