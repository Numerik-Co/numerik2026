/** Appels du module « Rendez-vous » (routes `/api/admin/rdv*`, `api/` de ce dossier). */
import { request } from '../../../components/admin/client';
import type { Creneau, Demarche } from '../lib/types';

/** Cf. `RdvAdmin` (`gestion.ts`). */
export interface RdvItem {
	id: number;
	date: string;
	heure: string;
	lieu: string;
	statut: string;
	commentaire: string;
	demarcheIds: number[];
	demarches: string[];
	creeLe: string | null;
	suivi: Record<string, string | string[]>;
	beneficiaire: { id: number | null; nom: string; prenom: string; email: string; telephone: string; commune: string };
}

export interface RdvModification {
	date: string;
	heure: string;
	demarcheId: number;
	commentaire: string;
	statut: string;
	suivi: Record<string, string | string[]>;
}

/** Colonne de compte rendu disponible (cf. `ChampSuiviDispo`, `suivi.ts`). */
export interface ChampSuivi {
	cle: string;
	label: string;
	groupe: 'compte-rendu' | 'avis';
	type: 'choix' | 'choix-multiples' | 'texte';
	affichage?: 'smileys';
	choix: string[];
}

/**
 * Visages (Font Awesome Free, CC BY 4.0) d'une échelle de satisfaction, de la
 * meilleure réponse à la pire. Échelle de 5 : un visage par choix ; autre
 * longueur : réparti sur l'échelle.
 */
const VISAGES = [
	{ icone: 'fa-face-laugh-beam', couleur: 'text-green-400', fond: 'bg-green-50 border-green-200' },
	{ icone: 'fa-face-smile', couleur: 'text-lime-400', fond: 'bg-lime-50 border-lime-200' },
	{ icone: 'fa-face-meh', couleur: 'text-gray-400', fond: 'bg-gray-50 border-gray-200' },
	{ icone: 'fa-face-frown', couleur: 'text-orange-300', fond: 'bg-orange-50 border-orange-200' },
	{ icone: 'fa-face-sad-tear', couleur: 'text-red-300', fond: 'bg-red-50 border-red-200' },
];

export function visage(index: number, total: number) {
	const pos = total <= 1 ? 0 : Math.round((index * (VISAGES.length - 1)) / (total - 1));
	return VISAGES[pos];
}

export const rdvAdminApi = {
	list: () =>
		request<{ rdvs: RdvItem[]; demarches: Demarche[]; statuts: string[]; suivi: ChampSuivi[]; creneaux: Creneau[] }>('GET', '/api/admin/rdv'),
	update: (id: number, m: RdvModification) => request<{ ok: true }>('PUT', `/api/admin/rdv/${id}`, m),
};

/** Couleurs du badge de statut (valeurs de la colonne Grist `Statut_rdv`). */
export function classeStatut(statut: string): string {
	switch (statut) {
		case 'Confirmé':
			return 'bg-sky-100 text-sky-800';
		case 'Honoré':
			return 'bg-green-100 text-green-800';
		case 'Absent':
			return 'bg-amber-100 text-amber-800';
		case 'Annulé':
			return 'bg-gray-100 text-gray-500 line-through';
		default:
			return 'bg-gray-100 text-gray-700';
	}
}

/** « 2026-10-26 » → « Lundi 26 octobre 2026 ». */
export function libelleDate(iso: string): string {
	const d = new Date(`${iso}T12:00:00Z`);
	const texte = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
	return texte.charAt(0).toUpperCase() + texte.slice(1);
}

export const aujourdhui = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
