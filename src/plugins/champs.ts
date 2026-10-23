/**
 * Champs de réglage d'un plugin, modifiables depuis le module « Plugins » de
 * l'espace bénévoles (`reglages.champs` du catalogue). Module pur : partagé
 * par le catalogue, les manifestes (config Astro), la validation au build
 * (`lib/config.ts` du plugin), l'écriture (`src/lib/plugin-writer.ts`) et
 * l'îlot d'administration.
 */

/** `/rendez-vous`, `/services/rdv`… : minuscules, chiffres, tirets, sans « / » final. */
export const ADRESSE_RE = /^(\/[a-z0-9]+(-[a-z0-9]+)*)+$/;

export type TypeChamp = 'adresse' | 'url' | 'identifiant' | 'table';

/** Format de chaque type de champ et message si la valeur ne le respecte pas. */
export const FORMATS: Record<TypeChamp, { re: RegExp; message: string }> = {
	adresse: { re: ADRESSE_RE, message: 'adresse au format /rendez-vous : commence par « / », minuscules, chiffres et tirets' },
	url: { re: /^https?:\/\/[^\s/?#]+(\/[^\s?#]*)?$/, message: 'adresse web au format https://grist.exemple.fr' },
	identifiant: { re: /^[A-Za-z0-9_-]+$/, message: 'lettres, chiffres, « - » et « _ » seulement' },
	table: { re: /^[A-Za-z][A-Za-z0-9_]*$/, message: 'nom de table Grist : lettres, chiffres et « _ », commence par une lettre' },
};

export interface ChampPlugin {
	/** Chemin de la clé dans le fichier de réglages, séparé par des points (ex. `grist.tables.rdv`). */
	cle: string;
	label: string;
	/** Rubrique de la page de configuration (ex. « Page publique », « Document Grist »). */
	groupe: string;
	type: TypeChamp;
	aide?: string;
	/** Valeur du modèle quand le champ est vide (et sans variable `env`). */
	defaut?: string;
	/** Variable du `.env` utilisée quand le champ est vide. */
	env?: string;
	/** Signalé si vide partout (fichier, `.env`, défaut) : le plugin ne peut pas fonctionner. */
	obligatoire?: boolean;
}
