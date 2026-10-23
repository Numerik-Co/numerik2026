/**
 * Ce que le plugin RDV fournit au reste du site — toujours à travers ce
 * fichier ou `pluginActif('rdv')`, pour qu'un plugin inactif n'y laisse
 * aucune trace.
 */
import type { FormToggle } from '../../config/site';
import type { AgendaSession } from '../../lib/agenda';
import { pluginActif } from '..';
import { rdvConfig } from './lib/config';
import { permanences } from './lib/permanences';

/** Permanences pour le planning (`/activites`) : aucune si le plugin est inactif. */
export function permanencesAffichees(): AgendaSession[] {
	return pluginActif('rdv') ? permanences : [];
}

/** Adresse de la page publique (`adresse:` de `rdv.yaml`). */
export const RDV_HREF = rdvConfig.adresse;

/** Nom de la page (menu, liens de l'espace bénévoles…). */
export const RDV_NOM = rdvConfig.textes.nom;

/** Prise de RDV en ligne ouverte (`ouvert:` de `rdv.yaml`) ? Fermée : `<FormGate>` affiche le message. */
export function rdvToggle(): FormToggle {
	const { ouvert, textes } = rdvConfig;
	return { enabled: ouvert, closedTitle: textes.fermeTitre, closedMessage: textes.fermeMessage };
}
