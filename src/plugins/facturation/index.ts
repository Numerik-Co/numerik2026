/**
 * Ce que le plugin facturation fournit au reste du site — toujours à travers
 * ce fichier ou `pluginActif('facturation')`.
 */
import type { FormToggle } from '../../config/site';
import { facturationConfig } from './lib/config';

/** Adresse de la page publique « Demander un devis ». */
export const DEVIS_HREF = facturationConfig.adresse;
export const DEVIS_NOM = facturationConfig.textes.titre;

/** Demandes en ligne ouvertes (`ouvert:` de `facturation.yaml`) ? Fermées : `<FormGate>` affiche le message. */
export function devisToggle(): FormToggle {
	const { ouvert, textes } = facturationConfig;
	return { enabled: ouvert, closedTitle: textes.fermeTitre, closedMessage: textes.fermeMessage };
}
